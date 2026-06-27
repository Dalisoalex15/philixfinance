// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";

const router = Router();
router.use(authenticate, isManagerOrAbove);

router.get("/", async (_req: Request, res: Response) => {
  const records = await prisma.recoveryRecord.findMany({
    include: {
      loan: { include: { client: { select: { firstName: true, lastName: true, phone: true } } } },
      collateral: { select: { vaultId: true, type: true, brand: true, model: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(records);
});

router.post("/", async (req: Request, res: Response) => {
  const { loanId, collateralId, status, notes, repossessionDate } = req.body;
  const record = await prisma.recoveryRecord.create({
    data: {
      loanId, collateralId, status, notes,
      repossessionDate: repossessionDate ? new Date(repossessionDate) : undefined,
      recoveredById: req.user!.id,
    },
  });
  res.status(201).json(record);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const { status, auctionDate, auctionPrice, recoveryAmount, auctioneer, notes } = req.body;
  const record = await prisma.recoveryRecord.update({
    where: { id: req.params.id },
    data: {
      status, auctioneer, notes,
      auctionDate: auctionDate ? new Date(auctionDate) : undefined,
      auctionPrice, recoveryAmount,
    },
  });
  res.json(record);
});

router.get("/stats", async (_req: Request, res: Response) => {
  const [total, recovered, pending] = await Promise.all([
    prisma.recoveryRecord.count(),
    prisma.recoveryRecord.aggregate({
      where: { status: { in: ["AUCTIONED", "RECOVERED_FULL", "RECOVERED_PARTIAL"] } },
      _sum: { recoveryAmount: true },
      _count: true,
    }),
    prisma.recoveryRecord.count({ where: { status: { in: ["REPOSSESSED", "LISTED_FOR_AUCTION"] } } }),
  ]);

  const defaultedTotal = await prisma.loan.aggregate({
    where: { status: "DEFAULTED" },
    _sum: { outstandingBalance: true },
  });

  res.json({
    totalCases: total,
    pendingCases: pending,
    recoveredCount: recovered._count,
    totalRecovered: recovered._sum.recoveryAmount || 0,
    totalDefaulted: defaultedTotal._sum.outstandingBalance || 0,
    recoveryRate: defaultedTotal._sum.outstandingBalance
      ? ((recovered._sum.recoveryAmount || 0) / defaultedTotal._sum.outstandingBalance * 100).toFixed(1)
      : "0",
  });
});

export default router;