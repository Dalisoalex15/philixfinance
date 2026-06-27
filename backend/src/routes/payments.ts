// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isLoanOfficerOrAbove } from "../middleware/auth";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

function generatePaymentNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `PAY-${year}-${rand}`;
}

// GET /api/payments
router.get("/", async (req: Request, res: Response) => {
  const { loanId, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: any = {};
  if (loanId) where.loanId = loanId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        loan: { select: { loanNumber: true, client: { select: { firstName: true, lastName: true } } } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { paymentDate: "desc" },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({ payments, total });
});

// POST /api/payments
router.post("/", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const { loanId, amount, method, reference, notes, paymentDate } = req.body;

  if (!loanId || !amount) throw new AppError("Loan ID and amount are required", 400);
  if (amount <= 0) throw new AppError("Payment amount must be positive", 400);

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { schedule: { where: { status: { in: ["PENDING", "OVERDUE"] } }, orderBy: { installmentNo: "asc" } } },
  });

  if (!loan) throw new AppError("Loan not found", 404);
  if (loan.status === "PAID") throw new AppError("Loan is already fully paid", 400);
  if (!["ACTIVE", "OVERDUE"].includes(loan.status)) throw new AppError("Loan is not active", 400);

  // Allocate payment to outstanding schedule items
  let remaining = amount;
  let principalPaid = 0;
  let interestPaid = 0;

  for (const installment of loan.schedule) {
    if (remaining <= 0) break;
    const due = installment.totalDue - installment.totalPaid;
    if (due <= 0) continue;

    const applied = Math.min(remaining, due);
    const intApplied = Math.min(applied, installment.interestDue - installment.interestPaid);
    const prinApplied = applied - intApplied;

    interestPaid += intApplied;
    principalPaid += prinApplied;
    remaining -= applied;

    const newTotalPaid = installment.totalPaid + applied;
    const newStatus = newTotalPaid >= installment.totalDue ? "PAID" : "PARTIAL";

    await prisma.loanSchedule.update({
      where: { id: installment.id },
      data: {
        principalPaid: { increment: prinApplied },
        interestPaid: { increment: intApplied },
        totalPaid: { increment: applied },
        status: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : undefined,
      },
    });
  }

  const payment = await prisma.payment.create({
    data: {
      paymentNumber: generatePaymentNumber(),
      loanId,
      recordedById: req.user!.id,
      amount,
      principalAmount: parseFloat(principalPaid.toFixed(2)),
      interestAmount: parseFloat(interestPaid.toFixed(2)),
      method: method || "CASH",
      reference,
      notes,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    },
  });

  // Update loan totals
  const newTotalPaid = loan.totalPaid + amount;
  const newOutstanding = Math.max(0, loan.outstandingBalance - amount);
  const isFullyPaid = newOutstanding <= 0;

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      totalPaid: { increment: amount },
      outstandingBalance: { decrement: amount },
      lastPaymentDate: new Date(),
      status: isFullyPaid ? "PAID" : undefined,
      closureDate: isFullyPaid ? new Date() : undefined,
      daysLate: 0,
      collectionStatus: isFullyPaid ? "CURRENT" : undefined,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "PAYMENT",
    entity: "Payment",
    entityId: payment.id,
    description: `Recorded payment of K${amount.toLocaleString()} on loan ${loan.loanNumber}`,
    req,
  });

  res.status(201).json({ payment, fullyPaid: isFullyPaid });
});

// GET /api/payments/:id
router.get("/:id", async (req: Request, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      loan: { include: { client: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!payment) throw new AppError("Payment not found", 404);
  res.json(payment);
});

export default router;