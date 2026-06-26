import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";

const router = Router();
router.use(authenticate, isManagerOrAbove);

// ── FINANCIAL STATEMENTS (prod schema only) ───────────────────────────────────

// GET /api/reports/financials/pl — 12-month P&L using portal data
router.get("/financials/pl", async (_req, res: Response) => {
  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [disbursed, collected, capital] = await Promise.all([
      // Loans approved/disbursed this month
      prisma.portalLoanApplication.findMany({
        where: { status: { in: ["DISBURSED", "REPAID"] }, reviewedAt: { gte: start, lte: end } },
        select: { amountRequested: true, interestRate: true, termMonths: true },
      }),
      // Payments confirmed this month
      prisma.loanPaymentSubmission.aggregate({
        where: { status: "APPROVED", reviewedAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      // Capital inflows this month
      prisma.capitalEntry.aggregate({
        where: { type: "DEPOSIT", entryDate: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const principalDisbursed = disbursed.reduce((s, l) => s + l.amountRequested, 0);
    // Interest earned = principal × rate × (term/12) — flat interest model
    const interestIncome = disbursed.reduce((s, l) => {
      const rate = (l.interestRate || 20) / 100;
      return s + l.amountRequested * rate;
    }, 0);
    const cashIn   = collected._sum.amount ?? 0;
    const cashOut  = principalDisbursed;
    const netProfit = interestIncome - cashOut * 0.03; // ~3% operating cost estimate

    months.push({
      month: start.toLocaleString("default", { month: "short", year: "numeric" }),
      revenue: Math.round(interestIncome + cashIn * 0.2),
      interestIncome: Math.round(interestIncome),
      portalCollections: Math.round(cashIn),
      capitalInflows: Math.round(capital._sum.amount ?? 0),
      principalDisbursed: Math.round(principalDisbursed),
      loansIssued: disbursed.length,
      netProfit: Math.round(netProfit),
    });
  }

  res.json(months);
});

// GET /api/reports/financials/balance-sheet
router.get("/financials/balance-sheet", async (_req, res: Response) => {
  const [
    portalDisbursed, portalCollected,
    capitalDeposits, capitalWithdrawals,
    accountCount, activeLoans,
  ] = await Promise.all([
    prisma.portalLoanApplication.aggregate({
      where: { status: { in: ["DISBURSED", "REPAID"] } },
      _sum: { amountRequested: true },
      _count: { id: true },
    }),
    prisma.loanPaymentSubmission.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    prisma.capitalEntry.aggregate({ where: { type: "DEPOSIT" }, _sum: { amount: true } }),
    prisma.capitalEntry.aggregate({ where: { type: "WITHDRAWAL" }, _sum: { amount: true } }),
    prisma.clientPortalAccount.count(),
    prisma.portalLoanApplication.count({ where: { status: "DISBURSED" } }),
  ]);

  const totalDisbursed = portalDisbursed._sum.amountRequested ?? 0;
  const totalCollected = portalCollected._sum.amount ?? 0;
  const loanPortfolio  = Math.max(0, totalDisbursed - totalCollected);
  const equity = (capitalDeposits._sum.amount ?? 0) - (capitalWithdrawals._sum.amount ?? 0);

  res.json({
    assets: {
      loanPortfolio: Math.round(loanPortfolio),
      cashAndEquivalents: Math.round(totalCollected),
      totalAssets: Math.round(loanPortfolio + totalCollected),
    },
    liabilities: { total: 0 },
    equity: {
      contributedCapital: Math.round(equity),
      retainedEarnings: Math.round(Math.max(0, loanPortfolio - equity)),
      totalEquity: Math.round(equity),
    },
    metrics: {
      totalClientAccounts: accountCount,
      activeLoans,
      totalDisbursed: Math.round(totalDisbursed),
      totalCollected: Math.round(totalCollected),
    },
  });
});

// GET /api/reports/financials/cash-flow — 12-month cash flow
router.get("/financials/cash-flow", async (_req, res: Response) => {
  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [cashIn, cashOut, capitalIn, capitalOut] = await Promise.all([
      prisma.loanPaymentSubmission.aggregate({ where: { status: "APPROVED", reviewedAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.portalLoanApplication.aggregate({ where: { status: { in: ["DISBURSED", "REPAID"] }, reviewedAt: { gte: start, lte: end } }, _sum: { amountRequested: true } }),
      prisma.capitalEntry.aggregate({ where: { type: "DEPOSIT", entryDate: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.capitalEntry.aggregate({ where: { type: "WITHDRAWAL", entryDate: { gte: start, lte: end } }, _sum: { amount: true } }),
    ]);

    const inflow  = (cashIn._sum.amount ?? 0) + (capitalIn._sum.amount ?? 0);
    const outflow = (cashOut._sum.amountRequested ?? 0) + (capitalOut._sum.amount ?? 0);

    months.push({
      month: start.toLocaleString("default", { month: "short", year: "numeric" }),
      cashIn: Math.round(inflow),
      cashOut: Math.round(outflow),
      net: Math.round(inflow - outflow),
      repayments: Math.round(cashIn._sum.amount ?? 0),
      disbursements: Math.round(cashOut._sum.amountRequested ?? 0),
      capitalInflows: Math.round(capitalIn._sum.amount ?? 0),
    });
  }

  res.json(months);
});

// ── CSV EXPORTS ───────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape  = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/"/g, '""');
    return /[,"\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
}

// GET /api/reports/export/applications — CSV of all portal loan applications
router.get("/export/applications", async (_req: Request, res: Response) => {
  const apps = await prisma.portalLoanApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: { account: { select: { firstName: true, lastName: true, email: true, phone: true, clientNumber: true } } },
  });

  const rows = apps.map(a => ({
    reference:       a.reference,
    clientNumber:    a.account.clientNumber,
    clientName:      `${a.account.firstName} ${a.account.lastName}`,
    email:           a.account.email,
    phone:           a.account.phone,
    productType:     a.productType,
    amountRequested: a.amountRequested,
    interestRate:    a.interestRate,
    termMonths:      a.termMonths,
    totalDue:        Math.round(a.amountRequested * (1 + (a.interestRate || 20) / 100)),
    purpose:         a.purpose,
    status:          a.status,
    reviewedBy:      a.reviewedBy ?? "",
    reviewedAt:      a.reviewedAt ? new Date(a.reviewedAt).toISOString().split("T")[0] : "",
    createdAt:       new Date(a.createdAt).toISOString().split("T")[0],
  }));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="philix-applications-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(toCSV(rows));
});

// GET /api/reports/export/clients — CSV of all client portal accounts
router.get("/export/clients", async (_req: Request, res: Response) => {
  const clients = await prisma.clientPortalAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      clientNumber: true, firstName: true, lastName: true, email: true, phone: true,
      dateOfBirth: true, gender: true, address: true, city: true,
      occupation: true, employer: true, monthlyIncome: true,
      kycStatus: true, status: true, emailVerified: true,
      creditScore: true, referralCount: true,
      createdAt: true, lastLoginAt: true,
      _count: { select: { portalLoans: true } },
    },
  });

  const rows = clients.map(c => ({
    clientNumber:  c.clientNumber,
    firstName:     c.firstName,
    lastName:      c.lastName,
    email:         c.email,
    phone:         c.phone,
    dateOfBirth:   c.dateOfBirth ? new Date(c.dateOfBirth).toISOString().split("T")[0] : "",
    gender:        c.gender ?? "",
    address:       c.address ?? "",
    city:          c.city ?? "",
    occupation:    c.occupation ?? "",
    employer:      c.employer ?? "",
    monthlyIncome: c.monthlyIncome ?? "",
    kycStatus:     c.kycStatus,
    status:        c.status,
    emailVerified: c.emailVerified,
    creditScore:   c.creditScore ?? "",
    referralCount: c.referralCount,
    totalLoans:    c._count.portalLoans,
    joinedAt:      new Date(c.createdAt).toISOString().split("T")[0],
    lastLoginAt:   c.lastLoginAt ? new Date(c.lastLoginAt).toISOString().split("T")[0] : "",
  }));

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="philix-clients-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(toCSV(rows));
});

export default router;
