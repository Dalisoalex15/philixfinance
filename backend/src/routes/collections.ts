// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// GET /api/collections/overdue
router.get("/overdue", async (req: Request, res: Response) => {
  const { category, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = { status: { in: ["OVERDUE", "DEFAULTED"] } };
  if (category) where.collectionStatus = category;

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true, whatsapp: true } },
        loanOfficer: { select: { firstName: true, lastName: true } },
        collateral: { select: { vaultId: true, type: true, brand: true, model: true } },
        collectionLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, type: true, notes: true, promiseDate: true, promiseAmount: true },
        },
      },
      orderBy: { daysLate: "desc" },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.loan.count({ where }),
  ]);

  res.json({ loans, total });
});

// POST /api/collections/:loanId/log
router.post("/:loanId/log", async (req: Request, res: Response) => {
  const { type, notes, promiseAmount, promiseDate, outcome, nextAction, nextActionDate } = req.body;

  const loan = await prisma.loan.findUnique({ where: { id: req.params.loanId } });
  if (!loan) throw new AppError("Loan not found", 404);

  const log = await prisma.collectionLog.create({
    data: {
      loanId: req.params.loanId,
      officerId: req.user!.id,
      type,
      notes,
      promiseAmount,
      promiseDate: promiseDate ? new Date(promiseDate) : undefined,
      outcome,
      nextAction,
      nextActionDate: nextActionDate ? new Date(nextActionDate) : undefined,
    },
    include: { officer: { select: { firstName: true, lastName: true } } },
  });

  res.status(201).json(log);
});

// GET /api/collections/dashboard
router.get("/dashboard", async (_req: Request, res: Response) => {
  const [current, atRisk, days30, days60, days90, defaulted] = await Promise.all([
    prisma.loan.count({ where: { status: "ACTIVE", collectionStatus: "CURRENT" } }),
    prisma.loan.count({ where: { collectionStatus: "AT_RISK" } }),
    prisma.loan.count({ where: { collectionStatus: "DAYS_30" } }),
    prisma.loan.count({ where: { collectionStatus: "DAYS_60" } }),
    prisma.loan.count({ where: { collectionStatus: "DAYS_90" } }),
    prisma.loan.count({ where: { status: "DEFAULTED" } }),
  ]);

  const overdueAmount = await prisma.loan.aggregate({
    where: { status: { in: ["OVERDUE", "DEFAULTED"] } },
    _sum: { outstandingBalance: true, penaltiesAccrued: true },
  });

  res.json({
    current, atRisk, days30, days60, days90, defaulted,
    totalOverdueAmount: overdueAmount._sum.outstandingBalance || 0,
    totalPenalties: overdueAmount._sum.penaltiesAccrued || 0,
  });
});

// GET /api/collections/promises-to-pay
router.get("/promises-to-pay", async (_req: Request, res: Response) => {
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const promises = await prisma.collectionLog.findMany({
    where: {
      type: "PROMISE",
      promiseDate: { gte: new Date(), lte: next7Days },
    },
    include: {
      loan: { include: { client: { select: { firstName: true, lastName: true, phone: true } } } },
      officer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { promiseDate: "asc" },
  });
  res.json(promises);
});

export default router;