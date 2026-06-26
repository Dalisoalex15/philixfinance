import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// GET /api/dashboard/kpis — portal-based KPIs for the main dashboard
router.get("/kpis", async (_req: Request, res: Response) => {
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

  res.json({
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
  });
});

// GET /api/dashboard/leaderboard?month=YYYY-MM — staff performance vs targets
router.get("/leaderboard", async (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd   = new Date(y, m, 0, 23, 59, 59);

  const [officers, targets, actuals, reviews] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, role: true, employeeId: true, avatarUrl: true },
    }),
    prisma.loanOfficerTarget.findMany({ where: { month } }),
    // Disbursed/repaid loans approved this month, grouped by reviewer
    prisma.portalLoanApplication.groupBy({
      by: ["reviewedBy"],
      where: { status: { in: ["DISBURSED", "REPAID"] }, reviewedAt: { gte: monthStart, lte: monthEnd } },
      _count: { id: true },
      _sum: { amountRequested: true },
    }),
    // All reviewed apps this month (any status change)
    prisma.portalLoanApplication.groupBy({
      by: ["reviewedBy"],
      where: { reviewedAt: { gte: monthStart, lte: monthEnd }, reviewedBy: { not: null } },
      _count: { id: true },
    }),
  ]);

  const targetMap  = new Map(targets.map(t => [t.userId, t]));
  const actualMap  = new Map((actuals as any[]).map((a: any) => [a.reviewedBy, a]));
  const reviewMap  = new Map((reviews as any[]).map((r: any) => [r.reviewedBy, r._count.id]));

  const board = officers.map(o => {
    const target  = targetMap.get(o.id);
    const actual  = actualMap.get(o.id) as any;
    const loansIssued     = actual?._count?.id ?? 0;
    const amountDisbursed = actual?._sum?.amountRequested ?? 0;
    const totalReviewed   = reviewMap.get(o.id) ?? 0;

    const loansPct = target?.loansTarget ? Math.round((loansIssued / target.loansTarget) * 100) : null;
    const disbPct  = target?.disbursementTarget ? Math.round((amountDisbursed / target.disbursementTarget) * 100) : null;

    return {
      userId: o.id, employeeId: o.employeeId,
      name: `${o.firstName} ${o.lastName}`, role: o.role, avatarUrl: o.avatarUrl,
      loansIssued, amountDisbursed: Math.round(amountDisbursed), totalReviewed,
      target: target ? { loans: target.loansTarget, disbursement: target.disbursementTarget } : null,
      loansPct, disbPct,
      score: loansIssued * 10 + Math.round(amountDisbursed / 1000),
    };
  }).sort((a, b) => b.score - a.score);

  res.json({ month, leaderboard: board });
});

// GET /api/dashboard/alerts — recent operational alerts for CEO feed
router.get("/alerts", async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000); // last 48h

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
