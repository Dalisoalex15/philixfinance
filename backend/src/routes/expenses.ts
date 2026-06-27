// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const { status, category, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: any = {};
  if (status) where.status = status;
  if (category) where.category = category;

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { submittedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
      skip, take: parseInt(limit as string),
    }),
    prisma.expense.count({ where }),
  ]);
  res.json({ expenses, total });
});

router.post("/", async (req: Request, res: Response) => {
  const { category, description, amount, date, vendorName, notes } = req.body;
  const expense = await prisma.expense.create({
    data: {
      category, description, amount, vendorName, notes,
      date: new Date(date),
      submittedById: req.user!.id,
      branchId: req.user!.branchId,
    },
  });
  res.status(201).json(expense);
});

router.patch("/:id/approve", isManagerOrAbove, async (req: Request, res: Response) => {
  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: { status: "APPROVED", approvedById: req.user!.id, approvedAt: new Date() },
  });
  res.json(expense);
});

router.patch("/:id/reject", isManagerOrAbove, async (req: Request, res: Response) => {
  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: { status: "REJECTED" },
  });
  res.json(expense);
});

router.get("/summary", async (_req: Request, res: Response) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const total = await prisma.expense.aggregate({
    where: { status: "APPROVED", date: { gte: monthStart } },
    _sum: { amount: true },
    _count: true,
  });
  const byCategory = await prisma.expense.groupBy({
    by: ["category"],
    where: { status: "APPROVED", date: { gte: monthStart } },
    _sum: { amount: true },
    _count: true,
  });
  res.json({ monthly: total._sum.amount || 0, count: total._count, byCategory });
});

export default router;