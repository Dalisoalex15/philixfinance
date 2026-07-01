// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove, isLoanOfficerOrAbove } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// Quick collateral valuation helper (standalone math, no DB)
function assessCollateral(data: {
  type: string; ageYears?: number; condition?: string;
  hasCharger?: boolean; hasBox?: boolean;
}): { marketValue: number; forcedSaleValue: number; maxLoanAmount: number; loanToValue: number } {
  const baseValues: Record<string, number> = {
    LAPTOP: 8000, SMARTPHONE: 4000, TABLET: 5000, GAMING_CONSOLE: 6000,
    TELEVISION: 5000, CAMERA: 7000, SMART_WATCH: 3000, POWER_TOOL: 4000,
    GENERATOR: 15000, OTHER_ELECTRONICS: 2000, OTHER: 1500,
  };
  const conditionMultiplier: Record<string, number> = {
    EXCELLENT: 1.0, GOOD: 0.85, FAIR: 0.65, POOR: 0.45, DAMAGED: 0.25,
  };
  const base = baseValues[data.type] ?? 2000;
  const ageDepreciation = Math.max(0.3, 1 - (data.ageYears ?? 0) * 0.12);
  const condition = conditionMultiplier[data.condition ?? "GOOD"] ?? 0.7;
  let marketValue = base * ageDepreciation * condition;
  if (data.hasCharger) marketValue *= 1.02;
  if (data.hasBox) marketValue *= 1.03;
  const forcedSaleValue = marketValue * 0.7;
  const maxLoanAmount = forcedSaleValue * 0.75;
  return {
    marketValue: Math.round(marketValue),
    forcedSaleValue: Math.round(forcedSaleValue),
    maxLoanAmount: Math.round(maxLoanAmount),
    loanToValue: parseFloat(((maxLoanAmount / marketValue) * 100).toFixed(1)),
  };
}

// POST /api/collateral/assess — standalone valuation tool
router.post("/assess", isLoanOfficerOrAbove, (req: Request, res: Response) => {
  res.json(assessCollateral(req.body));
});

// GET /api/collateral — all loan applications that have collateral submitted
router.get("/", isManagerOrAbove, async (req: Request, res: Response) => {
  const { type, search, appStatus, page = "1", limit = "100" } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {
    collateralType: { not: null },
  };

  if (appStatus && appStatus !== "ALL") where.status = appStatus;
  if (type && type !== "ALL") where.collateralType = { contains: type as string };

  if (search) {
    where.OR = [
      { reference: { contains: search as string } },
      { collateralType: { contains: search as string } },
      { collateralDesc: { contains: search as string } },
      { collateralSerial: { contains: search as string } },
      { account: { firstName: { contains: search as string } } },
      { account: { lastName:  { contains: search as string } } },
      { account: { clientNumber: { contains: search as string } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.portalLoanApplication.findMany({
      where,
      include: {
        account: {
          select: {
            id: true, firstName: true, lastName: true,
            clientNumber: true, email: true, phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    }),
    prisma.portalLoanApplication.count({ where }),
  ]);

  res.json({ items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// GET /api/collateral/:id — single application's collateral details
router.get("/:id", isManagerOrAbove, async (req: Request, res: Response) => {
  const item = await prisma.portalLoanApplication.findFirst({
    where: {
      id: req.params.id,
      collateralType: { not: null },
    },
    include: {
      account: {
        select: {
          id: true, firstName: true, lastName: true,
          clientNumber: true, email: true, phone: true,
          creditScore: true,
        },
      },
    },
  });
  if (!item) throw new AppError("Collateral record not found", 404);
  res.json(item);
});

export default router;
