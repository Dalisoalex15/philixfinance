import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// GET /api/dashboard/kpis
router.get("/kpis", async (req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    activeLoans,
    overdueLoans,
    defaultedLoans,
    todayLoans,
    monthLoans,
    pendingApprovals,
    totalCollateral,
    totalOutstanding,
    totalDisbursed,
    totalCollected,
    upcomingCollections,
  ] = await Promise.all([
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.count({ where: { status: "OVERDUE" } }),
    prisma.loan.count({ where: { status: "DEFAULTED" } }),
    prisma.loan.count({ where: { disbursementDate: { gte: todayStart } } }),
    prisma.loan.count({ where: { disbursementDate: { gte: monthStart } } }),
    prisma.loan.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.collateral.count({ where: { status: "HELD" } }),
    prisma.loan.aggregate({
      where: { status: { in: ["ACTIVE", "OVERDUE", "DEFAULTED"] } },
      _sum: { outstandingBalance: true },
    }),
    prisma.loan.aggregate({
      _sum: { principal: true },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
    }),
    prisma.loanSchedule.aggregate({
      where: {
        dueDate: { gte: now, lte: next7Days },
        status: "PENDING",
      },
      _sum: { totalDue: true },
      _count: true,
    }),
  ]);

  const totalLoans = activeLoans + overdueLoans + defaultedLoans + (await prisma.loan.count({ where: { status: "PAID" } }));
  const defaultRate = totalLoans > 0 ? ((defaultedLoans / totalLoans) * 100).toFixed(2) : "0";

  const recoveredAmount = await prisma.recoveryRecord.aggregate({
    _sum: { recoveryAmount: true },
  });
  const totalDefault = await prisma.loan.aggregate({
    where: { status: "DEFAULTED" },
    _sum: { outstandingBalance: true },
  });
  const defaultAmount = totalDefault._sum.outstandingBalance || 0;
  const recovered = recoveredAmount._sum.recoveryAmount || 0;
  const recoveryRate = defaultAmount > 0 ? ((recovered / defaultAmount) * 100).toFixed(2) : "100";

  res.json({
    activeLoans,
    overdueLoans,
    defaultedLoans,
    todayLoans,
    monthLoans,
    pendingApprovals,
    totalCollateral,
    totalOutstanding: totalOutstanding._sum.outstandingBalance || 0,
    totalDisbursed: totalDisbursed._sum.principal || 0,
    totalCollected: totalCollected._sum.amount || 0,
    next7DaysCollections: upcomingCollections._sum.totalDue || 0,
    upcomingCount: upcomingCollections._count,
    defaultRate: parseFloat(defaultRate as string),
    recoveryRate: parseFloat(recoveryRate as string),
  });
});

// GET /api/dashboard/loan-status-chart
router.get("/loan-status-chart", async (_req: Request, res: Response) => {
  const statuses = ["ACTIVE", "OVERDUE", "PAID", "DEFAULTED", "PENDING_APPROVAL"];
  const counts = await Promise.all(
    statuses.map((s) => prisma.loan.count({ where: { status: s as any } }))
  );
  res.json(statuses.map((s, i) => ({ status: s, count: counts[i] })));
});

// GET /api/dashboard/monthly-disbursements
router.get("/monthly-disbursements", async (_req: Request, res: Response) => {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const result = await prisma.loan.aggregate({
      where: {
        disbursementDate: { gte: start, lte: end },
        status: { notIn: ["DRAFT", "REJECTED", "CANCELLED"] },
      },
      _sum: { principal: true },
      _count: true,
    });
    months.push({
      month: start.toLocaleString("default", { month: "short", year: "numeric" }),
      amount: result._sum.principal || 0,
      count: result._count,
    });
  }
  res.json(months);
});

// GET /api/dashboard/repayment-trend
router.get("/repayment-trend", async (_req: Request, res: Response) => {
  const weeks = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = await prisma.payment.aggregate({
      where: { paymentDate: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: true,
    });
    weeks.push({
      week: `W${12 - i}`,
      amount: result._sum.amount || 0,
      count: result._count,
    });
  }
  res.json(weeks);
});

// GET /api/dashboard/top-officers
router.get("/top-officers", async (_req: Request, res: Response) => {
  const officers = await prisma.user.findMany({
    where: { role: { in: ["LOAN_OFFICER", "MANAGER"] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      loansCreated: {
        where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
        select: { id: true, status: true, totalPaid: true, totalDue: true },
      },
    },
  });

  const leaderboard = officers.map((o) => {
    const active = o.loansCreated.filter((l) => l.status === "ACTIVE").length;
    const collected = o.loansCreated.reduce((sum, l) => sum + l.totalPaid, 0);
    const totalDue = o.loansCreated.reduce((sum, l) => sum + l.totalDue, 0);
    const collectionRate = totalDue > 0 ? ((collected / totalDue) * 100).toFixed(1) : "0";
    return {
      id: o.id,
      name: `${o.firstName} ${o.lastName}`,
      role: o.role,
      loansIssued: o.loansCreated.length,
      activeLoans: active,
      collectionRate: parseFloat(collectionRate as string),
      totalCollected: collected,
    };
  }).sort((a, b) => b.loansIssued - a.loansIssued);

  res.json(leaderboard.slice(0, 10));
});

// GET /api/dashboard/upcoming-collections
router.get("/upcoming-collections", async (_req: Request, res: Response) => {
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const items = await prisma.loanSchedule.findMany({
    where: {
      dueDate: { lte: next7Days, gte: new Date() },
      status: { in: ["PENDING", "OVERDUE"] },
    },
    include: {
      loan: {
        include: {
          client: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
  res.json(items);
});

// GET /api/dashboard/par
router.get("/par", async (_req: Request, res: Response) => {
  const now = new Date();
  const totalOutstanding = await prisma.loan.aggregate({
    where: { status: { in: ["ACTIVE", "OVERDUE", "DEFAULTED"] } },
    _sum: { outstandingBalance: true },
  });
  const total = totalOutstanding._sum.outstandingBalance || 1;

  const parData = await Promise.all([1, 7, 30, 60, 90].map(async (days) => {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.loan.aggregate({
      where: {
        status: { in: ["OVERDUE", "DEFAULTED"] },
        lastPaymentDate: { lt: cutoff },
      },
      _sum: { outstandingBalance: true },
    });
    const amount = result._sum.outstandingBalance || 0;
    return { days, amount, percentage: parseFloat(((amount / total) * 100).toFixed(2)) };
  }));

  res.json(parData);
});

// GET /api/dashboard/capital-utilization
router.get("/capital-utilization", async (_req: Request, res: Response) => {
  const [totalInvestments, activeLoansTotal] = await Promise.all([
    prisma.investment.aggregate({ _sum: { amount: true } }),
    prisma.loan.aggregate({
      where: { status: { in: ["ACTIVE", "OVERDUE"] } },
      _sum: { outstandingBalance: true },
    }),
  ]);

  const totalCapital = totalInvestments._sum.amount || 500000;
  const loaned = activeLoansTotal._sum.outstandingBalance || 0;
  const available = totalCapital - loaned;
  const utilization = totalCapital > 0 ? ((loaned / totalCapital) * 100).toFixed(1) : "0";

  res.json({
    totalCapital,
    capitalLoaned: loaned,
    availableCapital: available,
    utilizationPct: parseFloat(utilization as string),
  });
});

// GET /api/dashboard/alerts — last 24h critical events for CEO feed
router.get("/alerts", async (_req, res: Response) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [overdueLoans, newPortalApps, newPayments, newAccounts, fraudFlags] = await Promise.all([
    // Loans that went overdue recently
    prisma.loan.findMany({
      where: { status: "OVERDUE", updatedAt: { gte: since } },
      select: { id: true, loanNumber: true, outstandingBalance: true, updatedAt: true,
        client: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" }, take: 10,
    }),
    // New portal loan applications
    prisma.portalLoanApplication.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, reference: true, amountRequested: true, createdAt: true, status: true, riskCategory: true,
        account: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" }, take: 10,
    }),
    // Payment submissions from portal clients
    prisma.loanPaymentSubmission.findMany({
      where: { createdAt: { gte: since }, status: "PENDING" },
      select: { id: true, amount: true, createdAt: true,
        application: { select: { reference: true, account: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" }, take: 10,
    }),
    // New portal account registrations
    prisma.clientPortalAccount.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, clientNumber: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 10,
    }),
    // High-risk applications
    prisma.portalLoanApplication.findMany({
      where: { riskCategory: { in: ["HIGH", "VERY_HIGH"] }, status: "SUBMITTED", createdAt: { gte: since } },
      select: { id: true, reference: true, amountRequested: true, riskCategory: true, createdAt: true,
        account: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
  ]);

  const alerts: { id: string; type: string; severity: "critical" | "warning" | "info" | "success"; title: string; detail: string; amount?: number; timestamp: string; link?: string }[] = [];

  overdueLoans.forEach(l => alerts.push({
    id: `overdue-${l.id}`, type: "OVERDUE_LOAN", severity: "critical",
    title: `Loan overdue — ${l.client ? `${l.client.firstName} ${l.client.lastName}` : "Unknown"}`,
    detail: `${l.loanNumber} · K${l.outstandingBalance.toLocaleString()} outstanding`,
    amount: l.outstandingBalance, timestamp: l.updatedAt.toISOString(), link: `/loans/${l.id}`,
  }));

  fraudFlags.forEach(a => alerts.push({
    id: `fraud-${a.id}`, type: "HIGH_RISK_APP", severity: "critical",
    title: `High-risk application — ${a.account ? `${a.account.firstName} ${a.account.lastName}` : "Unknown"}`,
    detail: `${a.reference} · K${a.amountRequested.toLocaleString()} · Risk: ${a.riskCategory}`,
    amount: a.amountRequested, timestamp: a.createdAt.toISOString(), link: `/online-applications`,
  }));

  newPortalApps.forEach(a => alerts.push({
    id: `app-${a.id}`, type: "NEW_APPLICATION", severity: a.riskCategory === "HIGH" || a.riskCategory === "VERY_HIGH" ? "warning" : "info",
    title: `New application — ${a.account ? `${a.account.firstName} ${a.account.lastName}` : "Unknown"}`,
    detail: `${a.reference} · K${a.amountRequested.toLocaleString()} · ${a.status}`,
    amount: a.amountRequested, timestamp: a.createdAt.toISOString(), link: `/online-applications`,
  }));

  newPayments.forEach(p => alerts.push({
    id: `pay-${p.id}`, type: "PAYMENT_SUBMITTED", severity: "success",
    title: `Payment submitted — ${p.application?.account ? `${p.application.account.firstName} ${p.application.account.lastName}` : "Unknown"}`,
    detail: `${p.application?.reference ?? ""} · K${(p.amount ?? 0).toLocaleString()} · awaiting confirmation`,
    amount: p.amount ?? 0, timestamp: p.createdAt.toISOString(), link: `/online-applications`,
  }));

  newAccounts.forEach(a => alerts.push({
    id: `acct-${a.id}`, type: "NEW_ACCOUNT", severity: "info",
    title: `New client registered — ${a.firstName} ${a.lastName}`,
    detail: `${a.clientNumber} · registered just now`,
    timestamp: a.createdAt.toISOString(), link: `/portal-clients`,
  }));

  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(alerts.slice(0, 30));
});

export default router;
