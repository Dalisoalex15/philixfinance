import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";

const router = Router();
router.use(authenticate, isManagerOrAbove);

router.get("/loans-issued", async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const where: any = {};
  if (from) where.disbursementDate = { gte: new Date(from as string) };
  if (to) where.disbursementDate = { ...where.disbursementDate, lte: new Date(to as string) };

  const loans = await prisma.loan.findMany({
    where,
    include: {
      client: { select: { firstName: true, lastName: true, clientNumber: true } },
      loanOfficer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { disbursementDate: "desc" },
  });

  const summary = {
    count: loans.length,
    totalPrincipal: loans.reduce((s, l) => s + l.principal, 0),
    totalDue: loans.reduce((s, l) => s + l.totalDue, 0),
  };

  res.json({ loans, summary });
});

router.get("/collections", async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const where: any = {};
  if (from) where.paymentDate = { gte: new Date(from as string) };
  if (to) where.paymentDate = { ...where.paymentDate, lte: new Date(to as string) };

  const [payments, totals] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        loan: { include: { client: { select: { firstName: true, lastName: true } } } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.payment.aggregate({ where, _sum: { amount: true, interestAmount: true, penaltyAmount: true } }),
  ]);

  res.json({ payments, totals });
});

router.get("/outstanding", async (_req: Request, res: Response) => {
  const loans = await prisma.loan.findMany({
    where: { status: { in: ["ACTIVE", "OVERDUE", "DEFAULTED"] } },
    include: {
      client: { select: { firstName: true, lastName: true, phone: true } },
      collateral: { select: { vaultId: true, type: true, brand: true, model: true } },
    },
    orderBy: { outstandingBalance: "desc" },
  });

  const total = loans.reduce((s, l) => s + l.outstandingBalance, 0);
  res.json({ loans, total });
});

router.get("/portfolio-at-risk", async (_req: Request, res: Response) => {
  const now = new Date();
  const totalResult = await prisma.loan.aggregate({
    where: { status: { in: ["ACTIVE", "OVERDUE", "DEFAULTED"] } },
    _sum: { outstandingBalance: true },
  });
  const total = totalResult._sum.outstandingBalance || 1;

  const parLevels = [1, 7, 30, 60, 90];
  const par = await Promise.all(parLevels.map(async (days) => {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.loan.findMany({
      where: { status: { in: ["OVERDUE", "DEFAULTED"] }, lastPaymentDate: { lt: cutoff } },
      select: { outstandingBalance: true, loanNumber: true, daysLate: true },
    });
    const amount = result.reduce((s, l) => s + l.outstandingBalance, 0);
    return { days, count: result.length, amount, percentage: parseFloat(((amount / total) * 100).toFixed(2)) };
  }));

  res.json(par);
});

router.get("/collateral-inventory", async (_req: Request, res: Response) => {
  const items = await prisma.collateral.findMany({
    where: { status: "HELD" },
    include: {
      client: { select: { firstName: true, lastName: true } },
      loans: { where: { status: "ACTIVE" }, select: { loanNumber: true } },
    },
    orderBy: { receivedAt: "desc" },
  });

  const summary = {
    count: items.length,
    totalMarketValue: items.reduce((s, i) => s + i.marketValue, 0),
    totalForcedSale: items.reduce((s, i) => s + i.forcedSaleValue, 0),
  };

  res.json({ items, summary });
});

router.get("/interest-revenue", async (req: Request, res: Response) => {
  const { from, to } = req.query;
  const where: any = {};
  if (from) where.paymentDate = { gte: new Date(from as string) };
  if (to) where.paymentDate = { ...where.paymentDate, lte: new Date(to as string) };

  const revenue = await prisma.payment.aggregate({
    where,
    _sum: { interestAmount: true, penaltyAmount: true, amount: true },
  });

  const processingFees = await prisma.loan.aggregate({
    where: { disbursementDate: where.paymentDate, status: { notIn: ["DRAFT", "CANCELLED"] } },
    _sum: { processingFeeAmount: true },
  });

  res.json({
    interestCollected: revenue._sum.interestAmount || 0,
    penaltiesCollected: revenue._sum.penaltyAmount || 0,
    processingFeesCollected: processingFees._sum.processingFeeAmount || 0,
    totalRevenue: (revenue._sum.interestAmount || 0) + (revenue._sum.penaltyAmount || 0) + (processingFees._sum.processingFeeAmount || 0),
  });
});

// GET /api/reports/financials/pl — 12-month P&L
router.get("/financials/pl", async (_req, res: Response) => {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [interestRev, principalIn, capitalOut, portalInterest] = await Promise.all([
      // Interest revenue from staff loan payments
      prisma.payment.aggregate({ where: { paymentDate: { gte: start, lte: end } }, _sum: { interestAmount: true, penaltyAmount: true } }),
      // Principal repayments received
      prisma.payment.aggregate({ where: { paymentDate: { gte: start, lte: end } }, _sum: { principalAmount: true } }),
      // Capital deployed (disbursements)
      prisma.loan.aggregate({ where: { disbursementDate: { gte: start, lte: end }, status: { notIn: ["DRAFT","CANCELLED"] } }, _sum: { principal: true } }),
      // Portal loan interest income
      prisma.loanPaymentSubmission.aggregate({
        where: { status: "APPROVED", reviewedAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const staffInterest = (interestRev._sum.interestAmount || 0) + (interestRev._sum.penaltyAmount || 0);
    const totalRevenue = staffInterest + (portalInterest._sum.amount || 0) * 0.2; // ~20% of portal collections = interest
    const disbursed = capitalOut._sum.principal || 0;
    const netProfit = totalRevenue - disbursed * 0.05; // simplified operating expense estimate

    months.push({
      month: start.toLocaleString("default", { month: "short", year: "numeric" }),
      revenue: Math.round(totalRevenue),
      interestIncome: Math.round(staffInterest),
      portalCollections: Math.round(portalInterest._sum.amount || 0),
      principalRepaid: Math.round(principalIn._sum.principalAmount || 0),
      capitalDeployed: Math.round(disbursed),
      netProfit: Math.round(netProfit),
    });
  }
  res.json(months);
});

// GET /api/reports/financials/balance-sheet
router.get("/financials/balance-sheet", async (_req, res: Response) => {
  const [
    activeLoansTotal, overdueLoansTotal, defaultedLoansTotal,
    capitalDeposits, capitalWithdrawals,
    portalDisbursed, portalCollected,
  ] = await Promise.all([
    prisma.loan.aggregate({ where: { status: "ACTIVE" }, _sum: { outstandingBalance: true } }),
    prisma.loan.aggregate({ where: { status: "OVERDUE" }, _sum: { outstandingBalance: true } }),
    prisma.loan.aggregate({ where: { status: "DEFAULTED" }, _sum: { outstandingBalance: true } }),
    prisma.capitalEntry.aggregate({ where: { type: "DEPOSIT" }, _sum: { amount: true } }),
    prisma.capitalEntry.aggregate({ where: { type: "WITHDRAWAL" }, _sum: { amount: true } }),
    prisma.portalLoanApplication.aggregate({ where: { status: { in: ["DISBURSED","REPAID"] } }, _sum: { amountRequested: true } }),
    prisma.loanPaymentSubmission.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const loanPortfolio = (activeLoansTotal._sum.outstandingBalance || 0) +
    (overdueLoansTotal._sum.outstandingBalance || 0) +
    (defaultedLoansTotal._sum.outstandingBalance || 0);
  const portalPortfolio = (portalDisbursed._sum.amountRequested || 0) - (portalCollected._sum.amount || 0);
  const totalAssets = loanPortfolio + portalPortfolio;

  const equity = (capitalDeposits._sum.amount || 0) - (capitalWithdrawals._sum.amount || 0);

  res.json({
    assets: {
      loanPortfolio: Math.round(loanPortfolio),
      portalLoanPortfolio: Math.round(Math.max(0, portalPortfolio)),
      totalAssets: Math.round(totalAssets),
    },
    liabilities: { total: 0 },
    equity: { totalEquity: Math.round(equity), retainedEarnings: Math.round(totalAssets - equity) },
  });
});

// GET /api/reports/financials/cash-flow — 12-month cash flow
router.get("/financials/cash-flow", async (_req, res: Response) => {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [inflows, outflows, portalIn] = await Promise.all([
      prisma.payment.aggregate({ where: { paymentDate: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.loan.aggregate({ where: { disbursementDate: { gte: start, lte: end }, status: { notIn: ["DRAFT","CANCELLED"] } }, _sum: { principal: true } }),
      prisma.loanPaymentSubmission.aggregate({ where: { status: "APPROVED", reviewedAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    ]);

    const cashIn  = (inflows._sum.amount || 0) + (portalIn._sum.amount || 0);
    const cashOut = outflows._sum.principal || 0;
    months.push({
      month: start.toLocaleString("default", { month: "short", year: "numeric" }),
      cashIn: Math.round(cashIn),
      cashOut: Math.round(cashOut),
      net: Math.round(cashIn - cashOut),
    });
  }
  res.json(months);
});

export default router;
