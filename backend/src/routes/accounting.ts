import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

type AsyncHandler = (req: Request, res: Response, next: (err?: unknown) => void) => Promise<unknown>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: (err?: unknown) => void) =>
  fn(req, res, next).catch(next);

const router = Router();
router.use(authenticate);

// GET /api/accounting/ledger — synthesized accounting data from real DB records
router.get("/ledger", wrap(async (_req: Request, res: Response) => {
  const [capitals, disbursedLoans, activeLoans] = await Promise.all([
    prisma.capitalEntry.findMany({ orderBy: { entryDate: "asc" } }),
    prisma.portalLoanApplication.findMany({
      where: { status: "DISBURSED" },
      include: { account: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.portalLoanApplication.findMany({
      where: { status: { in: ["APPROVED", "DISBURSED"] } },
    }),
  ]);

  const totalDeposits = capitals.filter(c => c.type === "DEPOSIT").reduce((s, c) => s + c.amount, 0);
  const totalWithdrawals = capitals.filter(c => c.type === "WITHDRAWAL").reduce((s, c) => s + c.amount, 0);
  const loanPortfolio = disbursedLoans.reduce((s, l) => s + l.amountRequested, 0);
  const monthlyRate = 0.04; // 4% / month — typical Zambian microfinance
  const interestReceivable = activeLoans.reduce((s, l) => s + l.amountRequested * monthlyRate, 0);
  const cashBalance = Math.max(0, totalDeposits - totalWithdrawals - loanPortfolio);
  const interestIncome = loanPortfolio * monthlyRate;

  const chartOfAccounts = [
    { id: "1000", code: "1000", name: "Cash & Bank", type: "ASSET", balance: cashBalance },
    { id: "1100", code: "1100", name: "Loan Portfolio (Outstanding)", type: "ASSET", balance: loanPortfolio },
    { id: "1200", code: "1200", name: "Accrued Interest Receivable", type: "ASSET", balance: interestReceivable },
    { id: "2000", code: "2000", name: "Accounts Payable", type: "LIABILITY", balance: 0 },
    { id: "3000", code: "3000", name: "Share Capital / Investor Funds", type: "EQUITY", balance: totalDeposits },
    { id: "4000", code: "4000", name: "Interest Income (Est.)", type: "REVENUE", balance: interestIncome },
    { id: "4100", code: "4100", name: "Application Fee Income", type: "REVENUE", balance: 0 },
    { id: "5000", code: "5000", name: "Operating Expenses", type: "EXPENSE", balance: totalWithdrawals },
  ];

  const loanJournals = disbursedLoans.map((l, i) => ({
    id: `loan-je-${l.id}`,
    reference: `JE-LN-${String(i + 1).padStart(4, "0")}`,
    date: l.updatedAt,
    description: `Loan disbursement — ${l.reference} (${(l as any).account.firstName} ${(l as any).account.lastName})`,
    status: "POSTED",
    totalAmount: l.amountRequested,
    lines: [{ debitAccount: "1100 Loan Portfolio", creditAccount: "1000 Cash & Bank", amount: l.amountRequested }],
  }));

  const capitalJournals = capitals.map((c, i) => ({
    id: c.id,
    reference: `JE-CAP-${String(i + 1).padStart(4, "0")}`,
    date: c.entryDate,
    description: c.description || `${c.type === "DEPOSIT" ? "Capital deposit" : "Withdrawal"} via ${c.source}${c.provider ? ` (${c.provider})` : ""}`,
    status: "POSTED",
    totalAmount: c.amount,
    lines: c.type === "DEPOSIT"
      ? [{ debitAccount: "1000 Cash & Bank", creditAccount: "3000 Share Capital", amount: c.amount }]
      : [{ debitAccount: "5000 Operating Expenses", creditAccount: "1000 Cash & Bank", amount: c.amount }],
  }));

  const journalEntries = [...loanJournals, ...capitalJournals]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalAssets = chartOfAccounts.filter(a => a.type === "ASSET").reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = chartOfAccounts.filter(a => a.type === "LIABILITY").reduce((s, a) => s + a.balance, 0);
  const totalRevenue = chartOfAccounts.filter(a => a.type === "REVENUE").reduce((s, a) => s + a.balance, 0);
  const totalExpenses = chartOfAccounts.filter(a => a.type === "EXPENSE").reduce((s, a) => s + a.balance, 0);

  res.json({
    chartOfAccounts,
    journalEntries,
    summary: { totalAssets, totalLiabilities, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses },
    generatedAt: new Date().toISOString(),
  });
}));

export default router;
