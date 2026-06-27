// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate, isManagerOrAbove);

router.get("/", async (_req: Request, res: Response) => {
  const investors = await prisma.investor.findMany({
    include: {
      _count: { select: { investments: true, payouts: true } },
      investments: { orderBy: { date: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(investors);
});

router.get("/:id", async (req: Request, res: Response) => {
  const investor = await prisma.investor.findUnique({
    where: { id: req.params.id },
    include: {
      investments: { orderBy: { date: "desc" } },
      payouts: { orderBy: { date: "desc" } },
    },
  });
  if (!investor) throw new AppError("Investor not found", 404);
  res.json(investor);
});

router.post("/", async (req: Request, res: Response) => {
  const { fullName, phone, email, nationalId, returnRate, contractStart, contractEnd, notes, initialAmount } = req.body;

  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;

  const investor = await prisma.investor.create({
    data: {
      investorNumber: `INV-${year}-${rand}`,
      fullName, phone, email, nationalId, returnRate, notes,
      contractStart: new Date(contractStart),
      contractEnd: contractEnd ? new Date(contractEnd) : undefined,
      totalInvested: initialAmount || 0,
      currentBalance: initialAmount || 0,
    },
  });

  if (initialAmount) {
    await prisma.investment.create({
      data: { investorId: investor.id, amount: initialAmount, date: new Date(), notes: "Initial investment" },
    });
  }

  res.status(201).json(investor);
});

router.post("/:id/invest", async (req: Request, res: Response) => {
  const { amount, date, reference, notes } = req.body;
  const [investment] = await prisma.$transaction([
    prisma.investment.create({
      data: { investorId: req.params.id, amount, date: new Date(date), reference, notes },
    }),
    prisma.investor.update({
      where: { id: req.params.id },
      data: { totalInvested: { increment: amount }, currentBalance: { increment: amount } },
    }),
  ]);
  res.status(201).json(investment);
});

router.post("/:id/payout", async (req: Request, res: Response) => {
  const { amount, date, type, reference, notes } = req.body;
  const [payout] = await prisma.$transaction([
    prisma.investorPayout.create({
      data: { investorId: req.params.id, amount, date: new Date(date), type, reference, notes },
    }),
    prisma.investor.update({
      where: { id: req.params.id },
      data: { currentBalance: { decrement: amount } },
    }),
  ]);
  res.status(201).json(payout);
});

router.get("/stats/summary", async (_req: Request, res: Response) => {
  const [totalInvested, totalPaidOut, activeCount] = await Promise.all([
    prisma.investment.aggregate({ _sum: { amount: true } }),
    prisma.investorPayout.aggregate({ _sum: { amount: true } }),
    prisma.investor.count({ where: { status: "ACTIVE" } }),
  ]);
  res.json({
    totalInvested: totalInvested._sum.amount || 0,
    totalPaidOut: totalPaidOut._sum.amount || 0,
    activeInvestors: activeCount,
    netCapital: (totalInvested._sum.amount || 0) - (totalPaidOut._sum.amount || 0),
  });
});

export default router;