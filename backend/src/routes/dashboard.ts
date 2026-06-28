// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isSuperAdmin, isManagerOrAbove } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ── In-memory cache ────────────────────────────────────────────────────────────
const _cache: Record<string, { data: unknown; ts: number }> = {};
function getCached(key: string, ttlSeconds: number) {
  const e = _cache[key];
  if (e && Date.now() - e.ts < ttlSeconds * 1000) return e.data;
  return null;
}
function setCache(key: string, data: unknown) { _cache[key] = { data, ts: Date.now() }; }
export function clearCache(key?: string) { if (key) delete _cache[key]; else Object.keys(_cache).forEach(k => delete _cache[k]); }
export function clearSummaryCache() { delete _cache["summary"]; delete _cache["interest-summary"]; }

// ── GET /api/dashboard/summary — six financial figures (cached 60s) ────────────
router.get("/summary", async (_req: Request, res: Response) => {
  const start = Date.now();
  const cached = getCached("summary", 60);
  if (cached) { res.json({ ...cached as object, from_cache: true }); return; }

  const now = new Date();

  const [
    loansResult,
    principalResult,
    paidResult,
    activeLoansResult,
    overdueResult,
    lastMonthPaid,
    thisMonthPaid,
    allLoansForInterest,
  ] = await Promise.all([
    // Total loans issued (all non-deleted portal applications that were at least submitted)
    prisma.portalLoanApplication.count(),

    // Total principal disbursed
    prisma.portalLoanApplication.aggregate({
      where: { status: { in: ["DISBURSED", "REPAID"] } },
      _sum: { amountRequested: true },
    }),

    // Total amount paid back
    prisma.loanPaymentSubmission.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    }),

    // Active loans for outstanding balance
    prisma.portalLoanApplication.findMany({
      where: { status: { in: ["DISBURSED", "APPROVED"] } },
      select: {
        id: true, amountRequested: true, interestRate: true, termMonths: true,
        paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } },
      },
    }),

    // Overdue loans (disbursed > 30 days ago, not fully paid)
    prisma.portalLoanApplication.findMany({
      where: {
        status: "DISBURSED",
        reviewedAt: { lt: new Date(Date.now() - 30 * 86400000) },
      },
      select: {
        id: true, amountRequested: true, interestRate: true, termMonths: true,
        paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } },
      },
    }),

    // Last month paid (for trend)
    prisma.loanPaymentSubmission.aggregate({
      where: {
        status: "APPROVED",
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
      _sum: { amount: true },
    }),

    // This month paid
    prisma.loanPaymentSubmission.aggregate({
      where: {
        status: "APPROVED",
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { amount: true },
    }),

    // All loans for interest calculation
    prisma.portalLoanApplication.findMany({
      where: { status: { in: ["DISBURSED", "REPAID"] } },
      select: {
        amountRequested: true, interestRate: true, termMonths: true,
        paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } },
      },
    }),
  ]);

  // Compute outstanding balance (sum of unfulfilled portion of active loans)
  let outstandingBalance = 0;
  for (const loan of activeLoansResult) {
    const interest = loan.amountRequested * ((loan.interestRate ?? 0) / 100) * ((loan.termMonths ?? 1) / 12);
    const totalDue = loan.amountRequested + interest;
    const totalPaid = loan.paymentSubmissions.reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0);
    outstandingBalance += Math.max(0, totalDue - totalPaid);
  }

  // Compute total in default + count
  let totalInDefault = 0;
  let defaultLoanCount = 0;
  for (const loan of overdueResult) {
    const interest = loan.amountRequested * ((loan.interestRate ?? 0) / 100) * ((loan.termMonths ?? 1) / 12);
    const totalDue = loan.amountRequested + interest;
    const totalPaid = loan.paymentSubmissions.reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0);
    const remaining = totalDue - totalPaid;
    if (remaining > 0) { totalInDefault += remaining; defaultLoanCount++; }
  }

  // Compute total interest collected
  let interestCollected = 0;
  for (const loan of allLoansForInterest) {
    const interest = loan.amountRequested * ((loan.interestRate ?? 0) / 100) * ((loan.termMonths ?? 1) / 12);
    const totalDue = loan.amountRequested + interest;
    if (totalDue <= 0) continue;
    const totalPaid = loan.paymentSubmissions.reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0);
    interestCollected += interest * Math.min(1, totalPaid / totalDue);
  }

  // Trends (month-over-month for paid back)
  const prevPaid = lastMonthPaid._sum.amount ?? 0;
  const currPaid = thisMonthPaid._sum.amount ?? 0;
  const paidTrend = prevPaid > 0 ? Math.round(((currPaid - prevPaid) / prevPaid) * 100) : 0;

  const result = {
    loans_issued: loansResult,
    principal_disbursed: Math.round(principalResult._sum.amountRequested ?? 0),
    total_paid_back: Math.round(paidResult._sum.amount ?? 0),
    interest_collected: Math.round(interestCollected),
    outstanding_balance: Math.round(outstandingBalance),
    total_in_default: Math.round(totalInDefault),
    default_loan_count: defaultLoanCount,
    paid_trend_pct: paidTrend,
    cached_at: new Date().toISOString(),
    query_ms: Date.now() - start,
  };

  setCache("summary", result);
  console.log(`[dashboard/summary] loaded in ${result.query_ms}ms`);
  res.json(result);
});

// ── GET /api/dashboard/interest-summary?months=6 (cached 5min) ────────────────
router.get("/interest-summary", async (req: Request, res: Response) => {
  const months = Math.min(12, Math.max(1, parseInt((req.query.months as string) || "6", 10)));
  const cacheKey = `interest-summary-${months}`;
  const cached = getCached(cacheKey, 300);
  if (cached) { res.json(cached); return; }

  const results: { month: string; interest_billed: number; interest_collected: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    // Loans active during this month
    const activeLoans = await prisma.portalLoanApplication.findMany({
      where: {
        status: { in: ["DISBURSED", "REPAID"] },
        reviewedAt: { lte: mEnd },
      },
      select: {
        amountRequested: true, interestRate: true, termMonths: true,
        paymentSubmissions: {
          where: { status: "APPROVED", createdAt: { gte: mStart, lte: mEnd } },
          select: { amount: true },
        },
      },
    });

    let billed = 0;
    let collected = 0;
    for (const loan of activeLoans) {
      const interest = loan.amountRequested * ((loan.interestRate ?? 0) / 100) * ((loan.termMonths ?? 1) / 12);
      const monthlyInterest = interest / (loan.termMonths ?? 1);
      billed += monthlyInterest;
      const paidThisMonth = loan.paymentSubmissions.reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0);
      const interestPortion = paidThisMonth * ((loan.interestRate ?? 0) / 100 / (1 + (loan.interestRate ?? 0) / 100));
      collected += Math.min(monthlyInterest, interestPortion);
    }

    results.push({
      month: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, "0")}`,
      interest_billed: Math.round(billed),
      interest_collected: Math.round(collected),
    });
  }

  setCache(cacheKey, results);
  res.json(results);
});

// ── GET /api/dashboard/defaults?limit=25&offset=0 — overdue >30 days ──────────
router.get("/defaults", async (req: Request, res: Response) => {
  const limit  = Math.min(100, parseInt((req.query.limit  as string) || "25", 10));
  const offset = parseInt((req.query.offset as string) || "0", 10);

  const overdueApps = await prisma.portalLoanApplication.findMany({
    where: {
      status: "DISBURSED",
      reviewedAt: { lt: new Date(Date.now() - 30 * 86400000) },
    },
    orderBy: { reviewedAt: "asc" },
    include: {
      account: { select: { firstName: true, lastName: true, clientNumber: true, email: true, phone: true } },
      paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true, createdAt: true } },
    },
  });

  // Compute remaining for each and filter
  const defaulted = overdueApps
    .map((loan) => {
      const interest = loan.amountRequested * ((loan.interestRate ?? 0) / 100) * ((loan.termMonths ?? 1) / 12);
      const totalDue = loan.amountRequested + interest;
      const payments = loan.paymentSubmissions as { amount: number; createdAt: Date }[];
      const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
      const remaining = totalDue - totalPaid;
      if (remaining <= 0) return null;
      const daysOverdue = Math.floor((Date.now() - new Date(loan.reviewedAt ?? loan.updatedAt).getTime()) / 86400000) - (loan.termMonths ?? 1) * 30;
      const lastPayment = payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      return {
        id: loan.id,
        reference: loan.reference,
        clientName: `${loan.account.firstName} ${loan.account.lastName}`,
        clientNumber: loan.account.clientNumber,
        email: loan.account.email,
        phone: loan.account.phone,
        productType: loan.productType,
        principal: loan.amountRequested,
        totalDue: Math.round(totalDue),
        totalPaid: Math.round(totalPaid),
        remaining: Math.round(remaining),
        daysOverdue: Math.max(0, daysOverdue),
        lastPaymentDate: lastPayment?.createdAt ?? null,
        disbursedAt: loan.reviewedAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b!.daysOverdue - a!.daysOverdue));

  res.json({
    total: defaulted.length,
    data: defaulted.slice(offset, offset + limit),
    totalAmount: Math.round(defaulted.reduce((s, d) => s + d!.remaining, 0)),
    avgDaysOverdue: defaulted.length > 0
      ? Math.round(defaulted.reduce((s, d) => s + d!.daysOverdue, 0) / defaulted.length)
      : 0,
  });
});

// ── POST /api/dashboard/contact-attempt — log contact on a defaulted loan ──────
router.post("/contact-attempt", async (req: Request, res: Response) => {
  const { loanRef, accountId, method, notes } = req.body as { loanRef: string; accountId: string; method: string; notes?: string };
  if (!loanRef || !accountId || !method) {
    res.status(400).json({ error: "loanRef, accountId, method required" }); return;
  }
  const staffUser = (req as any).user;
  const attempt = await prisma.contactAttempt.create({
    data: {
      loanRef,
      accountId,
      contactedBy: `${staffUser.firstName} ${staffUser.lastName}`,
      method,
      notes: notes ?? "",
    },
  });
  res.json(attempt);
});

// ── GET /api/dashboard/contact-attempts/:loanRef ──────────────────────────────
router.get("/contact-attempts/:loanRef", async (req: Request, res: Response) => {
  const attempts = await prisma.contactAttempt.findMany({
    where: { loanRef: req.params.loanRef },
    orderBy: { createdAt: "desc" },
  });
  res.json(attempts);
});

// ── GET /api/dashboard/kpis — portal-based KPIs (cached 60s) ─────────────────
router.get("/kpis", async (_req: Request, res: Response) => {
  const cached = getCached("kpis", 60);
  if (cached) { res.json({ ...cached as object, from_cache: true }); return; }

  const now       = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalAccounts, activeLoans, pendingApplications,
    approvedToday, submittedToday, submittedMonth,
    disbursedTotal, collectedTotal, pendingKyc,
  ] = await Promise.all([
    prisma.clientPortalAccount.count(),
    prisma.portalLoanApplication.count({ where: { status: "DISBURSED" } }),
    prisma.portalLoanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.portalLoanApplication.count({ where: { status: { in: ["APPROVED", "DISBURSED"] }, reviewedAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.portalLoanApplication.aggregate({
      where: { status: { in: ["DISBURSED", "REPAID"] } },
      _sum: { amountRequested: true },
    }),
    prisma.loanPaymentSubmission.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    prisma.clientPortalAccount.count({ where: { kycStatus: { in: ["NOT_STARTED", "SUBMITTED"] } } }),
  ]);

  const totalDisbursed = disbursedTotal._sum.amountRequested ?? 0;
  const totalCollected = collectedTotal._sum.amount ?? 0;
  const outstanding    = Math.max(0, totalDisbursed - totalCollected);

  const result = {
    totalClientAccounts: totalAccounts,
    activeLoans,
    pendingApplications,
    approvedToday,
    submittedToday,
    submittedMonth,
    totalDisbursed: Math.round(totalDisbursed),
    totalCollected: Math.round(totalCollected),
    outstanding: Math.round(outstanding),
    pendingKyc,
    collectionRate: totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0,
  };
  setCache("kpis", result);
  res.json(result);
});

// ── GET /api/dashboard/leaderboard?month=YYYY-MM (cached 2min) ───────────────
router.get("/leaderboard", async (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const cacheKey = `leaderboard-${month}`;
  const cached = getCached(cacheKey, 120);
  if (cached) { res.json({ ...cached as object, from_cache: true }); return; }

  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd   = new Date(y, m, 0, 23, 59, 59);

  const [officers, targets, actuals, reviews] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["LOAN_OFFICER", "MANAGER", "COLLECTIONS_OFFICER"] } },
      select: { id: true, firstName: true, lastName: true, role: true, branchId: true },
    }),
    prisma.loanOfficerTarget.findMany({ where: { month } }),
    prisma.portalLoanApplication.findMany({
      where: { reviewedAt: { gte: monthStart, lte: monthEnd }, status: { in: ["DISBURSED", "REPAID", "APPROVED"] } },
      select: { reviewedById: true, amountRequested: true, status: true },
    }),
    prisma.loanPaymentSubmission.findMany({
      where: { status: "APPROVED", createdAt: { gte: monthStart, lte: monthEnd } },
      select: { amount: true, application: { select: { reviewedById: true } } },
    }),
  ]);

  const board = officers.map((o) => {
    const target    = targets.find((t) => t.officerId === o.id);
    const myActuals = actuals.filter((a) => a.reviewedById === o.id);
    const myPayments = reviews.filter((r) => r.application?.reviewedById === o.id);
    const amountDisbursed = myActuals.reduce((s, a) => s + (a.amountRequested ?? 0), 0);
    const amountCollected = myPayments.reduce((s, r) => s + (r.amount ?? 0), 0);
    const loansIssued     = myActuals.length;
    return {
      officerId: o.id,
      officerName: `${o.firstName} ${o.lastName}`,
      role: o.role,
      branchId: o.branchId,
      loansIssued,
      amountDisbursed: Math.round(amountDisbursed),
      amountCollected: Math.round(amountCollected),
      disbursementTarget: target?.disbursementTarget ?? 0,
      collectionTarget:   target?.collectionTarget   ?? 0,
      loansTarget:        target?.loansTarget        ?? 0,
      collectionRate: amountDisbursed > 0 ? Math.round((amountCollected / amountDisbursed) * 100) : 0,
      score: loansIssued * 10 + Math.round(amountDisbursed / 1000),
    };
  }).sort((a, b) => b.score - a.score);

  const result = { month, leaderboard: board };
  setCache(cacheKey, result);
  res.json(result);
});

// ── GET /api/dashboard/alerts — real-time operational alerts ─────────────────
router.get("/alerts", async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [recentApps, pendingPayments, overdue] = await Promise.all([
    prisma.portalLoanApplication.findMany({
      where: { updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { account: { select: { firstName: true, lastName: true, clientNumber: true } } },
    }),
    prisma.loanPaymentSubmission.findMany({
      where: { status: "PENDING", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { application: { select: { reference: true } } },
    }),
    prisma.portalLoanApplication.count({
      where: { status: "DISBURSED", reviewedAt: { lt: new Date(Date.now() - 30 * 86400000) } },
    }),
  ]);

  const alerts: { type: string; severity: string; title: string; detail: string; href: string; ts: string }[] = [];

  for (const app of recentApps) {
    const name = `${app.account.firstName} ${app.account.lastName}`;
    const k = (n: number) => `K${n.toLocaleString()}`;
    if (app.status === "SUBMITTED") alerts.push({ type: "NEW_APPLICATION", severity: "info", title: "New Application", detail: `${name} applied for ${k(app.amountRequested)} — ${app.productType.replace(/_/g, " ")}`, href: "/portal-clients", ts: app.createdAt.toISOString() });
    else if (app.status === "DISBURSED") alerts.push({ type: "DISBURSED", severity: "success", title: "Loan Disbursed", detail: `${name} disbursed ${k(app.amountRequested)} (ref ${app.reference})`, href: "/portal-clients", ts: (app.reviewedAt ?? app.updatedAt).toISOString() });
    else if (app.status === "REPAID")   alerts.push({ type: "REPAID", severity: "success", title: "Loan Repaid", detail: `${name} fully repaid ${k(app.amountRequested)} (ref ${app.reference})`, href: "/portal-clients", ts: app.updatedAt.toISOString() });
  }

  for (const pay of pendingPayments) {
    alerts.push({ type: "PAYMENT_PENDING", severity: "warn", title: "Payment Awaiting Review", detail: `Payment for ${pay.application?.reference ?? "loan"} — K${(pay.amount ?? 0).toLocaleString()} submitted`, href: "/portal-clients", ts: pay.createdAt.toISOString() });
  }

  if (overdue > 0) {
    alerts.push({ type: "OVERDUE_LOANS", severity: "danger", title: "Overdue Loans", detail: `${overdue} loan(s) disbursed 30+ days ago with no full repayment`, href: "/portal-clients", ts: new Date().toISOString() });
  }

  alerts.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  res.json(alerts.slice(0, 30));
});

export default router;
