// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove, isLoanOfficerOrAbove } from "../middleware/auth";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

function generateVaultId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `VLT-${year}-${rand}`;
}

function assessCollateral(data: {
  type: string; brand: string; model: string; ageYears: number;
  condition: string; hasCharger: boolean; hasBox: boolean;
}): { marketValue: number; forcedSaleValue: number; maxLoanAmount: number; loanToValue: number } {
  const baseValues: Record<string, number> = {
    LAPTOP: 8000, SMARTPHONE: 4000, TABLET: 5000, GAMING_CONSOLE: 6000,
    TELEVISION: 5000, CAMERA: 7000, SMART_WATCH: 3000, POWER_TOOL: 4000,
    GENERATOR: 15000, OTHER_ELECTRONICS: 2000, OTHER: 1500,
  };

  const conditionMultiplier: Record<string, number> = {
    EXCELLENT: 1.0, GOOD: 0.85, FAIR: 0.65, POOR: 0.45, DAMAGED: 0.25,
  };

  let base = baseValues[data.type] || 2000;
  const ageDepreciation = Math.max(0.3, 1 - data.ageYears * 0.12);
  const condition = conditionMultiplier[data.condition] || 0.7;

  let marketValue = base * ageDepreciation * condition;
  if (data.hasCharger) marketValue *= 1.02;
  if (data.hasBox) marketValue *= 1.03;

  const forcedSaleValue = marketValue * 0.7;
  const maxLoanAmount = forcedSaleValue * 0.75;
  const loanToValue = maxLoanAmount / marketValue;

  return {
    marketValue: Math.round(marketValue),
    forcedSaleValue: Math.round(forcedSaleValue),
    maxLoanAmount: Math.round(maxLoanAmount),
    loanToValue: parseFloat((loanToValue * 100).toFixed(1)),
  };
}

// POST /api/collateral/assess
router.post("/assess", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const result = assessCollateral(req.body);
  res.json(result);
});

// GET /api/collateral
router.get("/", async (req: Request, res: Response) => {
  const { status, type, clientId, page = "1", limit = "20", search } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (clientId) where.clientId = clientId;
  if (search) {
    where.OR = [
      { vaultId: { contains: search as string, mode: "insensitive" } },
      { brand: { contains: search as string, mode: "insensitive" } },
      { model: { contains: search as string, mode: "insensitive" } },
      { serialNumber: { contains: search as string, mode: "insensitive" } },
      { imei: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.collateral.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, clientNumber: true } },
        loans: { where: { status: "ACTIVE" }, select: { id: true, loanNumber: true, outstandingBalance: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.collateral.count({ where }),
  ]);

  res.json({ items, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
});

// GET /api/collateral/:id
router.get("/:id", async (req: Request, res: Response) => {
  const item = await prisma.collateral.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      loans: { orderBy: { createdAt: "desc" } },
      documents: true,
      custodyLogs: { orderBy: { createdAt: "desc" } },
      recoveryRecord: true,
    },
  });
  if (!item) throw new AppError("Collateral not found", 404);
  res.json(item);
});

// POST /api/collateral
router.post("/", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const body = req.body;
  const valuation = assessCollateral(body);

  const item = await prisma.collateral.create({
    data: {
      vaultId: generateVaultId(),
      clientId: body.clientId,
      type: body.type,
      brand: body.brand,
      model: body.model,
      serialNumber: body.serialNumber,
      imei: body.imei,
      color: body.color,
      condition: body.condition,
      batteryHealth: body.batteryHealth,
      screenCondition: body.screenCondition,
      accessories: body.accessories || [],
      hasCharger: body.hasCharger || false,
      hasBox: body.hasBox || false,
      ageYears: body.ageYears,
      marketValue: body.marketValue || valuation.marketValue,
      forcedSaleValue: body.forcedSaleValue || valuation.forcedSaleValue,
      maxLoanAmount: body.maxLoanAmount || valuation.maxLoanAmount,
      loanToValue: valuation.loanToValue,
      shelfNumber: body.shelfNumber,
      vaultPosition: body.vaultPosition,
      lockerNumber: body.lockerNumber,
      assessedBy: req.user!.id,
      assessedAt: new Date(),
      assessmentNotes: body.assessmentNotes,
    },
  });

  await prisma.custodyLog.create({
    data: {
      collateralId: item.id,
      action: "INTAKE",
      toLocation: body.vaultPosition || body.shelfNumber || "Main Vault",
      notes: "Item received and logged in vault",
      performedById: req.user!.id,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    entity: "Collateral",
    entityId: item.id,
    description: `Added collateral ${item.vaultId}: ${item.brand} ${item.model}`,
    req,
  });

  res.status(201).json(item);
});

// PATCH /api/collateral/:id/release
router.patch("/:id/release", isManagerOrAbove, async (req: Request, res: Response) => {
  const { releasedTo, notes } = req.body;
  const item = await prisma.collateral.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError("Collateral not found", 404);
  if (item.status !== "HELD") throw new AppError("Collateral is not currently held", 400);

  // Check if linked loan is fully paid
  const activeLoans = await prisma.loan.count({
    where: { collateralId: item.id, status: { in: ["ACTIVE", "OVERDUE"] } },
  });
  if (activeLoans > 0) throw new AppError("Cannot release collateral: linked loan is still active", 400);

  const updated = await prisma.collateral.update({
    where: { id: req.params.id },
    data: {
      status: "RELEASED",
      releasedAt: new Date(),
      releasedBy: req.user!.id,
      releasedTo,
      releaseNotes: notes,
      releaseApprovedBy: req.user!.id,
    },
  });

  await prisma.custodyLog.create({
    data: {
      collateralId: item.id,
      action: "RELEASE",
      fromLocation: item.vaultPosition || item.shelfNumber || "Main Vault",
      notes: `Released to ${releasedTo}. ${notes || ""}`,
      performedById: req.user!.id,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "RELEASE_COLLATERAL",
    entity: "Collateral",
    entityId: item.id,
    description: `Released collateral ${item.vaultId} (${item.brand} ${item.model}) to ${releasedTo}`,
    req,
  });

  res.json(updated);
});

// PATCH /api/collateral/:id/repossess
router.patch("/:id/repossess", isManagerOrAbove, async (req: Request, res: Response) => {
  const { notes } = req.body;
  const item = await prisma.collateral.findUnique({ where: { id: req.params.id } });
  if (!item) throw new AppError("Collateral not found", 404);

  await prisma.collateral.update({
    where: { id: req.params.id },
    data: { status: "AUCTIONED" },
  });

  await prisma.custodyLog.create({
    data: {
      collateralId: item.id,
      action: "REPOSSESSION",
      notes: notes || "Item repossessed for recovery",
      performedById: req.user!.id,
    },
  });

  res.json({ message: "Collateral marked for repossession/auction" });
});

// GET /api/collateral/stats/summary
router.get("/stats/summary", async (_req: Request, res: Response) => {
  const [held, released, auctioned, totalValue] = await Promise.all([
    prisma.collateral.count({ where: { status: "HELD" } }),
    prisma.collateral.count({ where: { status: "RELEASED" } }),
    prisma.collateral.count({ where: { status: "AUCTIONED" } }),
    prisma.collateral.aggregate({
      where: { status: "HELD" },
      _sum: { marketValue: true, forcedSaleValue: true },
    }),
  ]);

  res.json({
    held, released, auctioned,
    totalMarketValue: totalValue._sum.marketValue || 0,
    totalForcedSaleValue: totalValue._sum.forcedSaleValue || 0,
  });
});

export default router;