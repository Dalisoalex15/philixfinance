// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove, isLoanOfficerOrAbove } from "../middleware/auth";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../middleware/errorHandler";
import { v4 as uuidv4 } from "uuid";

const router = Router();
router.use(authenticate);

function generateLoanNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PF-${year}-${rand}`;
}

function calculateLoanSchedule(
  principal: number,
  interestRate: number,
  totalInstallments: number,
  firstPaymentDate: Date,
  frequency: string
) {
  const monthlyRate = interestRate / 100 / 12;
  let installmentAmount: number;

  if (frequency === "MONTHLY") {
    installmentAmount = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalInstallments));
  } else {
    const weeklyRate = interestRate / 100 / 52;
    installmentAmount = (principal * weeklyRate) / (1 - Math.pow(1 + weeklyRate, -totalInstallments));
  }

  const schedule = [];
  let balance = principal;
  let dueDate = new Date(firstPaymentDate);

  for (let i = 1; i <= totalInstallments; i++) {
    const interestDue = balance * (frequency === "MONTHLY" ? interestRate / 100 / 12 : interestRate / 100 / 52);
    const principalDue = Math.min(installmentAmount - interestDue, balance);
    balance -= principalDue;

    schedule.push({
      installmentNo: i,
      dueDate: new Date(dueDate),
      principalDue: parseFloat(principalDue.toFixed(2)),
      interestDue: parseFloat(interestDue.toFixed(2)),
      totalDue: parseFloat((principalDue + interestDue).toFixed(2)),
    });

    if (frequency === "WEEKLY") {
      dueDate.setDate(dueDate.getDate() + 7);
    } else if (frequency === "BIWEEKLY") {
      dueDate.setDate(dueDate.getDate() + 14);
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
  }

  return { schedule, installmentAmount: parseFloat(installmentAmount.toFixed(2)) };
}

// GET /api/loans
router.get("/", async (req: Request, res: Response) => {
  const { status, clientId, officerId, page = "1", limit = "20", search } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (officerId) where.loanOfficerId = officerId;
  if (req.user!.role === "LOAN_OFFICER") where.loanOfficerId = req.user!.id;
  if (search) {
    where.OR = [
      { loanNumber: { contains: search as string, mode: "insensitive" } },
      { client: { firstName: { contains: search as string, mode: "insensitive" } } },
      { client: { lastName: { contains: search as string, mode: "insensitive" } } },
    ];
  }

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true, clientNumber: true } },
        loanOfficer: { select: { id: true, firstName: true, lastName: true } },
        collateral: { select: { id: true, vaultId: true, type: true, brand: true, model: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.loan.count({ where }),
  ]);

  res.json({ loans, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
});

// GET /api/loans/:id
router.get("/:id", async (req: Request, res: Response) => {
  const loan = await prisma.loan.findUnique({
    where: { id: req.params.id },
    include: {
      client: true,
      loanOfficer: { select: { id: true, firstName: true, lastName: true, email: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
      collateral: { include: { documents: true } },
      schedule: { orderBy: { installmentNo: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      documents: true,
      collectionLogs: {
        include: { officer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!loan) throw new AppError("Loan not found", 404);
  res.json(loan);
});

// POST /api/loans
router.post("/", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const {
    clientId, collateralId, loanType, principal, interestRate,
    processingFee, repaymentFrequency, totalInstallments, firstPaymentDate, purpose,
  } = req.body;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError("Client not found", 404);

  const processingFeeAmount = (principal * (processingFee || 0)) / 100;
  const { schedule, installmentAmount } = calculateLoanSchedule(
    principal, interestRate, totalInstallments,
    new Date(firstPaymentDate), repaymentFrequency
  );

  const totalInterest = schedule.reduce((sum, s) => sum + s.interestDue, 0);
  const totalDue = principal + totalInterest + processingFeeAmount;
  const maturityDate = schedule[schedule.length - 1].dueDate;

  const loan = await prisma.loan.create({
    data: {
      loanNumber: generateLoanNumber(),
      clientId,
      collateralId,
      loanOfficerId: req.user!.id,
      loanType,
      status: "PENDING_APPROVAL",
      principal,
      interestRate,
      processingFee: processingFee || 0,
      processingFeeAmount,
      totalInterest: parseFloat(totalInterest.toFixed(2)),
      totalDue: parseFloat(totalDue.toFixed(2)),
      outstandingBalance: parseFloat(totalDue.toFixed(2)),
      repaymentFrequency,
      totalInstallments,
      installmentAmount,
      firstPaymentDate: new Date(firstPaymentDate),
      maturityDate,
      purpose,
      applicationDate: new Date(),
      schedule: {
        create: schedule,
      },
    },
    include: {
      client: { select: { firstName: true, lastName: true } },
      schedule: true,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    entity: "Loan",
    entityId: loan.id,
    description: `Created loan ${loan.loanNumber} for ${loan.client.firstName} ${loan.client.lastName} — K${principal.toLocaleString()}`,
    req,
  });

  // Update client loan count
  await prisma.client.update({
    where: { id: clientId },
    data: { previousLoans: { increment: 1 } },
  });

  res.status(201).json(loan);
});

// PATCH /api/loans/:id/approve
router.patch("/:id/approve", isManagerOrAbove, async (req: Request, res: Response) => {
  const { notes } = req.body;
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) throw new AppError("Loan not found", 404);
  if (loan.status !== "PENDING_APPROVAL") throw new AppError("Loan is not pending approval", 400);

  const updated = await prisma.loan.update({
    where: { id: req.params.id },
    data: {
      status: "APPROVED",
      approvedById: req.user!.id,
      approvalDate: new Date(),
      approvalNotes: notes,
    },
    include: { client: { select: { firstName: true, lastName: true } } },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "APPROVE",
    entity: "Loan",
    entityId: loan.id,
    description: `Approved loan ${loan.loanNumber}`,
    req,
  });

  res.json(updated);
});

// PATCH /api/loans/:id/reject
router.patch("/:id/reject", isManagerOrAbove, async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason) throw new AppError("Rejection reason is required", 400);

  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) throw new AppError("Loan not found", 404);

  const updated = await prisma.loan.update({
    where: { id: req.params.id },
    data: { status: "REJECTED", rejectionReason: reason },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "REJECT",
    entity: "Loan",
    entityId: loan.id,
    description: `Rejected loan ${loan.loanNumber}: ${reason}`,
    req,
  });

  res.json(updated);
});

// PATCH /api/loans/:id/disburse
router.patch("/:id/disburse", isManagerOrAbove, async (req: Request, res: Response) => {
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) throw new AppError("Loan not found", 404);
  if (loan.status !== "APPROVED") throw new AppError("Loan must be approved before disbursement", 400);

  const updated = await prisma.loan.update({
    where: { id: req.params.id },
    data: {
      status: "ACTIVE",
      disbursementDate: new Date(),
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "DISBURSE",
    entity: "Loan",
    entityId: loan.id,
    description: `Disbursed loan ${loan.loanNumber} — K${loan.principal.toLocaleString()}`,
    req,
  });

  res.json(updated);
});

// GET /api/loans/:id/amortization
router.get("/:id/amortization", async (req: Request, res: Response) => {
  const schedule = await prisma.loanSchedule.findMany({
    where: { loanId: req.params.id },
    orderBy: { installmentNo: "asc" },
  });
  res.json(schedule);
});

// POST /api/loans/calculate
router.post("/calculate", async (req: Request, res: Response) => {
  const { principal, interestRate, totalInstallments, repaymentFrequency, firstPaymentDate, processingFee } = req.body;

  const { schedule, installmentAmount } = calculateLoanSchedule(
    principal, interestRate, totalInstallments,
    new Date(firstPaymentDate), repaymentFrequency
  );

  const totalInterest = schedule.reduce((sum, s) => sum + s.interestDue, 0);
  const processingFeeAmount = (principal * (processingFee || 0)) / 100;
  const totalDue = principal + totalInterest + processingFeeAmount;

  res.json({
    installmentAmount,
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    processingFeeAmount: parseFloat(processingFeeAmount.toFixed(2)),
    totalDue: parseFloat(totalDue.toFixed(2)),
    schedule,
  });
});

export default router;