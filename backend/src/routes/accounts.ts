import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";
import { Mailer } from "../lib/mailer";

const router = Router();
router.use(authenticate);

function wrap(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try { await fn(req, res); }
    catch (e: any) { res.status(500).json({ error: e.message ?? "Internal error" }); }
  };
}

const K = (n: number) => `ZMW ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}`;
const fmt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ── GET /api/accounts — all loan accounts with ledger + health ────────────────
router.get("/", wrap(async (req, res) => {
  const { status, search, page = "1", limit = "50" } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (search) {
    where.OR = [
      { reference: { contains: search } },
      { account: { is: { firstName:    { contains: search } } } },
      { account: { is: { lastName:     { contains: search } } } },
      { account: { is: { clientNumber: { contains: search } } } },
      { account: { is: { email:        { contains: search } } } },
    ];
  }

  const [apps, total] = await Promise.all([
    prisma.portalLoanApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
      include: {
        account: {
          select: {
            id: true, clientNumber: true, firstName: true, lastName: true,
            email: true, phone: true, occupation: true, employer: true, city: true,
          },
        },
        paymentSubmissions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, amount: true, status: true, createdAt: true,
            provider: true, paymentMethod: true, reference: true, notes: true,
          },
        },
      },
    }),
    prisma.portalLoanApplication.count({ where }),
  ]);

  const accounts = apps.map(app => {
    const rate    = app.interestRate ?? 20;
    const principal = app.amountRequested;
    const interest  = Math.round(principal * (rate / 100));
    const totalDue  = principal + interest;
    const termWeeks = app.termMonths;
    const weeklyPayment = Math.ceil(totalDue / termWeeks);

    const approvedPayments = app.paymentSubmissions.filter(p => p.status === "APPROVED");
    const totalPaid = approvedPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const remaining = Math.max(0, totalDue - totalPaid);
    const pct = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;

    const startDate = app.reviewedAt ?? app.createdAt;
    const dueDate   = new Date(new Date(startDate).getTime() + termWeeks * 7 * 86400000);
    const daysLeft  = Math.round((dueDate.getTime() - Date.now()) / 86400000);
    const daysOverdue = app.status === "DISBURSED" && daysLeft < 0 ? Math.abs(daysLeft) : 0;

    const health = remaining <= 0 ? "SETTLED"
      : daysOverdue > 30 ? "CRITICAL"
      : daysOverdue > 7  ? "OVERDUE"
      : daysOverdue > 0  ? "LATE"
      : daysLeft <= 3    ? "DUE_SOON"
      : "ON_TRACK";

    // Build ledger from payment history
    const ledger = [];
    let runningBalance = totalDue;

    // Opening entry
    if (app.status !== "SUBMITTED" && app.status !== "UNDER_REVIEW") {
      ledger.push({
        date: fmt(startDate), description: "Loan Disbursed",
        debit: principal, paid: 0, balance: totalDue, type: "DEBIT",
      });
      // Interest entry
      if (interest > 0) {
        ledger.push({
          date: fmt(startDate), description: `Interest Added (${rate}%)`,
          debit: interest, paid: 0, balance: totalDue, type: "INTEREST",
        });
      }
    }

    for (const p of approvedPayments) {
      runningBalance -= (p.amount ?? 0);
      ledger.push({
        date: fmt(p.createdAt),
        description: p.notes ? `PAID — ${p.notes}` : "PAID",
        debit: 0, paid: p.amount ?? 0,
        balance: Math.max(0, runningBalance),
        type: "CREDIT", paymentId: p.id,
      });
    }

    return {
      id: app.id,
      reference: app.reference,
      productType: app.productType,
      status: app.status,
      purpose: app.purpose,
      account: app.account,
      principal, interest, totalDue, weeklyPayment, termWeeks, rate,
      totalPaid, remaining, pct,
      startDate: fmt(startDate), dueDate: fmt(dueDate),
      rawDueDate: dueDate.toISOString(),
      daysLeft, daysOverdue, health,
      createdAt: app.createdAt,
      reviewedAt: app.reviewedAt,
      reviewedBy: app.reviewedBy,
      ledger,
      paymentCount: approvedPayments.length,
      lastPaymentDate: approvedPayments.at(-1)?.createdAt ?? null,
    };
  });

  res.json({ accounts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}));

// ── GET /api/accounts/summary — portfolio overview stats ─────────────────────
router.get("/summary", wrap(async (_req, res) => {
  const [apps, payments] = await Promise.all([
    prisma.portalLoanApplication.findMany({
      where: { status: { in: ["DISBURSED", "REPAID", "APPROVED"] } },
      include: { paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } },
    }),
    prisma.loanPaymentSubmission.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  let totalPortfolio = 0, totalCollected = 0, activeCount = 0, overdueCount = 0, settledCount = 0;
  for (const app of apps) {
    const principal  = app.amountRequested;
    const interest   = Math.round(principal * ((app.interestRate ?? 20) / 100));
    const totalDue   = principal + interest;
    const paid       = app.paymentSubmissions.reduce((s, p) => s + (p.amount ?? 0), 0);
    const remaining  = Math.max(0, totalDue - paid);
    const dueDate    = new Date((app.reviewedAt ?? app.createdAt).getTime() + app.termMonths * 7 * 86400000);
    const daysLeft   = Math.round((dueDate.getTime() - Date.now()) / 86400000);

    totalPortfolio += principal;
    totalCollected += paid;
    if (remaining <= 0) settledCount++;
    else if (app.status === "DISBURSED") {
      activeCount++;
      if (daysLeft < 0) overdueCount++;
    }
  }

  res.json({
    totalPortfolio, totalCollected,
    outstanding: Math.max(0, totalPortfolio - totalCollected),
    activeCount, overdueCount, settledCount, totalAccounts: apps.length,
    collectionRate: totalPortfolio > 0 ? Math.round((totalCollected / totalPortfolio) * 100) : 0,
  });
}));

// ── POST /api/accounts/:id/send-statement ─────────────────────────────────────
router.post("/:id/send-statement", wrap(async (req, res) => {
  const app = await prisma.portalLoanApplication.findUnique({
    where: { id: req.params.id },
    include: { account: true, paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } },
  });
  if (!app) return res.status(404).json({ error: "Account not found" });

  const rate      = app.interestRate ?? 20;
  const principal = app.amountRequested;
  const interest  = Math.round(principal * (rate / 100));
  const totalDue  = principal + interest;
  const termWeeks = app.termMonths;
  const weekly    = Math.ceil(totalDue / termWeeks);
  const totalPaid = app.paymentSubmissions.reduce((s, p) => s + (p.amount ?? 0), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);
  const startDate  = app.reviewedAt ?? app.createdAt;
  const dueDate    = new Date(new Date(startDate).getTime() + termWeeks * 7 * 86400000);
  const daysLeft   = Math.round((dueDate.getTime() - Date.now()) / 86400000);

  await Mailer.loanDisbursed({
    email: app.account.email, firstName: app.account.firstName,
    reference: app.reference, amountRequested: app.amountRequested,
    interestRate: rate, termMonths: termWeeks, accountId: app.accountId,
  });

  res.json({ ok: true, message: `Statement sent to ${app.account.email}`, outstanding, weekly });
}));

// ── POST /api/accounts/:id/send-reminder ─────────────────────────────────────
router.post("/:id/send-reminder", wrap(async (req, res) => {
  const app = await prisma.portalLoanApplication.findUnique({
    where: { id: req.params.id },
    include: { account: true, paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } },
  });
  if (!app) return res.status(404).json({ error: "Account not found" });

  const rate      = app.interestRate ?? 20;
  const principal = app.amountRequested;
  const interest  = Math.round(principal * (rate / 100));
  const totalDue  = principal + interest;
  const termWeeks = app.termMonths;
  const weekly    = Math.ceil(totalDue / termWeeks);
  const totalPaid = app.paymentSubmissions.reduce((s, p) => s + (p.amount ?? 0), 0);
  const startDate  = app.reviewedAt ?? app.createdAt;
  const dueDate    = new Date(new Date(startDate).getTime() + termWeeks * 7 * 86400000);

  await Mailer.paymentReminder({
    email: app.account.email, firstName: app.account.firstName,
    reference: app.reference, amountDue: weekly,
    dueDate, totalDue, totalPaid, accountId: app.accountId,
  });

  res.json({ ok: true, message: `Reminder sent to ${app.account.email}` });
}));

// ── POST /api/accounts/:id/send-congratulations ───────────────────────────────
router.post("/:id/send-congratulations", wrap(async (req, res) => {
  const app = await prisma.portalLoanApplication.findUnique({
    where: { id: req.params.id },
    include: { account: true, paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } },
  });
  if (!app) return res.status(404).json({ error: "Account not found" });

  const rate      = app.interestRate ?? 20;
  const principal = app.amountRequested;
  const interest  = Math.round(principal * (rate / 100));
  const totalDue  = principal + interest;
  const totalPaid = app.paymentSubmissions.reduce((s, p) => s + (p.amount ?? 0), 0);

  await Mailer.paymentConfirmed({
    email: app.account.email, firstName: app.account.firstName,
    reference: app.reference, amount: totalPaid,
    totalPaid, remaining: 0, totalDue, accountId: app.accountId,
  });

  res.json({ ok: true, message: `Congratulations email sent to ${app.account.email}` });
}));

// ── POST /api/accounts/:id/add-note ──────────────────────────────────────────
router.post("/:id/add-note", wrap(async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return res.status(400).json({ error: "Note required" });

  const app = await prisma.portalLoanApplication.findUnique({
    where: { id: req.params.id }, select: { accountId: true },
  });
  if (!app) return res.status(404).json({ error: "Not found" });

  await prisma.clientNotification.create({
    data: { accountId: app.accountId, subject: "Staff Note", body: note, category: "STAFF_NOTE" },
  }).catch(() => {});

  res.json({ ok: true });
}));

// ── POST /api/accounts/:id/flag ───────────────────────────────────────────────
router.post("/:id/flag", isManagerOrAbove, wrap(async (req, res) => {
  const { flagged, reason } = req.body;
  // Store flag as a notification record (using clientNotification as general log)
  const app = await prisma.portalLoanApplication.findUnique({
    where: { id: req.params.id },
    select: { accountId: true, reference: true },
  });
  if (!app) return res.status(404).json({ error: "Not found" });

  if (flagged) {
    await prisma.clientNotification.create({
      data: {
        accountId: app.accountId,
        subject: "Account Flagged for Review",
        body: reason ?? `Loan ${app.reference} flagged for manual review.`,
        category: "ACCOUNT_FLAG",
      },
    }).catch(() => {});
  }

  res.json({ ok: true, flagged });
}));

// ── POST /api/accounts/bulk-send-statements ───────────────────────────────────
router.post("/bulk-send-statements", isManagerOrAbove, wrap(async (req, res) => {
  const { statusFilter = "DISBURSED" } = req.body;

  const apps = await prisma.portalLoanApplication.findMany({
    where: { status: statusFilter },
    include: { account: true, paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } },
    take: 200,
  });

  let sent = 0, failed = 0;
  for (const app of apps) {
    try {
      await Mailer.loanDisbursed({
        email: app.account.email, firstName: app.account.firstName,
        reference: app.reference, amountRequested: app.amountRequested,
        interestRate: app.interestRate ?? 20, termMonths: app.termMonths,
        accountId: app.accountId,
      });
      sent++;
    } catch { failed++; }
  }

  res.json({ ok: true, sent, failed, total: apps.length });
}));

// ── POST /api/accounts/bulk-send-reminders ────────────────────────────────────
router.post("/bulk-send-reminders", isManagerOrAbove, wrap(async (req, res) => {
  const apps = await prisma.portalLoanApplication.findMany({
    where: { status: "DISBURSED" },
    include: { account: true, paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } },
    take: 200,
  });

  let sent = 0, failed = 0;
  for (const app of apps) {
    const rate = app.interestRate ?? 20;
    const totalDue = app.amountRequested + Math.round(app.amountRequested * (rate / 100));
    const weekly = Math.ceil(totalDue / app.termMonths);
    const totalPaid = app.paymentSubmissions.reduce((s, p) => s + (p.amount ?? 0), 0);
    const startDate = app.reviewedAt ?? app.createdAt;
    const dueDate = new Date(new Date(startDate).getTime() + app.termMonths * 7 * 86400000);

    try {
      await Mailer.paymentReminder({
        email: app.account.email, firstName: app.account.firstName,
        reference: app.reference, amountDue: weekly,
        dueDate, totalDue, totalPaid, accountId: app.accountId,
      });
      sent++;
    } catch { failed++; }
  }

  res.json({ ok: true, sent, failed, total: apps.length });
}));

// ── GET /api/accounts/search-clients — find portal clients for loan creation ──
router.get("/search-clients", wrap(async (req, res) => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) return res.json({ clients: [] });

  const clients = await prisma.clientPortalAccount.findMany({
    where: {
      isBlacklisted: false,
      OR: [
        { firstName:    { contains: q } } as any,
        { lastName:     { contains: q } } as any,
        { email:        { contains: q } } as any,
        { phone:        { contains: q } } as any,
        { clientNumber: { contains: q } } as any,
      ],
    } as any,
    select: { id: true, clientNumber: true, firstName: true, lastName: true, email: true, phone: true, status: true },
    take: 20,
  });

  res.json({ clients });
}));

// ── POST /api/accounts/create-loan — staff creates a loan directly ────────────
router.post("/create-loan", wrap(async (req, res) => {
  const {
    accountId, productType = "BUSINESS", amountRequested,
    termWeeks, interestRate = 20, purpose = "Business",
    description, collateralType, collateralDesc, collateralValue,
    status = "SUBMITTED", staffName, disbursedNow = false,
  } = req.body;

  if (!accountId)        return res.status(400).json({ error: "Client account required" });
  if (!amountRequested)  return res.status(400).json({ error: "Amount required" });
  if (!termWeeks)        return res.status(400).json({ error: "Term (weeks) required" });

  const client = await prisma.clientPortalAccount.findUnique({ where: { id: accountId } });
  if (!client) return res.status(404).json({ error: "Client not found" });

  const date   = new Date();
  const yy     = date.getFullYear().toString().slice(2);
  const mm     = String(date.getMonth() + 1).padStart(2, "0");
  const rand   = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  const reference = `PX-STAFF-${yy}${mm}${rand}`;

  const finalStatus = disbursedNow ? "DISBURSED" : status;

  const loan = await prisma.portalLoanApplication.create({
    data: {
      reference, accountId,
      productType, amountRequested, termMonths: termWeeks, interestRate,
      purpose, description, collateralType, collateralDesc, collateralValue,
      status: finalStatus,
      reviewedBy: staffName ?? "Staff",
      reviewedAt: finalStatus !== "SUBMITTED" ? new Date() : null,
    },
  });

  // If disbursing immediately, send statement email
  if (disbursedNow) {
    await Mailer.loanDisbursed({
      email: client.email, firstName: client.firstName,
      reference, amountRequested, interestRate, termMonths: termWeeks,
      accountId: client.id,
    }).catch(() => {});
  }

  res.status(201).json({ ok: true, loan, reference });
}));

// ── PATCH /api/accounts/:id — edit loan details ───────────────────────────────
router.patch("/:id", wrap(async (req, res) => {
  const {
    amountRequested, termWeeks, interestRate, status,
    purpose, description, reviewedBy, collateralType, collateralDesc, collateralValue,
    rejectedReason,
  } = req.body;

  const existing = await prisma.portalLoanApplication.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Loan not found" });

  const wasNotDisbursed = existing.status !== "DISBURSED";
  const isNowDisbursed  = status === "DISBURSED";

  const updated = await prisma.portalLoanApplication.update({
    where: { id: req.params.id },
    data: {
      ...(amountRequested  !== undefined ? { amountRequested }  : {}),
      ...(termWeeks        !== undefined ? { termMonths: termWeeks } : {}),
      ...(interestRate     !== undefined ? { interestRate }     : {}),
      ...(status           !== undefined ? { status }           : {}),
      ...(purpose          !== undefined ? { purpose }          : {}),
      ...(description      !== undefined ? { description }      : {}),
      ...(reviewedBy       !== undefined ? { reviewedBy }       : {}),
      ...(collateralType   !== undefined ? { collateralType }   : {}),
      ...(collateralDesc   !== undefined ? { collateralDesc }   : {}),
      ...(collateralValue  !== undefined ? { collateralValue }  : {}),
      ...(rejectedReason   !== undefined ? { rejectedReason }   : {}),
      ...(isNowDisbursed && wasNotDisbursed ? { reviewedAt: new Date() } : {}),
    },
    include: { account: true },
  });

  // If just disbursed, send statement email
  if (isNowDisbursed && wasNotDisbursed) {
    await Mailer.loanDisbursed({
      email: updated.account.email, firstName: updated.account.firstName,
      reference: updated.reference, amountRequested: updated.amountRequested,
      interestRate: updated.interestRate, termMonths: updated.termMonths,
      accountId: updated.accountId,
    }).catch(() => {});
  }

  res.json({ ok: true, loan: updated });
}));

// ── POST /api/accounts/:id/manual-entry — add manual payment or adjustment ───
router.post("/:id/manual-entry", wrap(async (req, res) => {
  const { type = "PAYMENT", amount, notes, paymentMethod = "CASH", provider, reference, staffName } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Amount required" });

  const app = await prisma.portalLoanApplication.findUnique({
    where: { id: req.params.id },
    select: { accountId: true, reference: true, amountRequested: true, interestRate: true, termMonths: true },
  });
  if (!app) return res.status(404).json({ error: "Loan not found" });

  const entry = await prisma.loanPaymentSubmission.create({
    data: {
      applicationId: req.params.id,
      accountId: app.accountId,
      amount, paymentMethod, provider,
      reference: reference ?? `MANUAL-${Date.now()}`,
      notes: notes ?? `Manual ${type.toLowerCase()} by ${staffName ?? "staff"}`,
      status: "APPROVED",
      reviewedBy: staffName ?? "Staff",
      reviewedAt: new Date(),
    },
  });

  res.status(201).json({ ok: true, entry });
}));

// ── DELETE /api/accounts/:id/entry/:entryId — remove a manual payment entry ──
router.delete("/:id/entry/:entryId", isManagerOrAbove, wrap(async (req, res) => {
  const entry = await prisma.loanPaymentSubmission.findUnique({
    where: { id: req.params.entryId },
    select: { applicationId: true },
  });
  if (!entry || entry.applicationId !== req.params.id) {
    return res.status(404).json({ error: "Entry not found" });
  }
  await prisma.loanPaymentSubmission.delete({ where: { id: req.params.entryId } });
  res.json({ ok: true });
}));

// ── PENALTY ENGINE ────────────────────────────────────────────────────────────
// Computes penalties for a loan: 2% per day after 3-day grace period
function computePenalty(app: {
  amountRequested: number;
  interestRate: number;
  termMonths: number;
  reviewedAt: Date | null;
  paymentSubmissions: { amount: number | null; status: string }[];
}) {
  const GRACE = 3;
  const DAILY_RATE = 0.02; // 2%
  const now = new Date();
  const start = app.reviewedAt ? new Date(app.reviewedAt) : now;
  const maturity = new Date(start.getTime() + app.termMonths * 7 * 86400000);
  const totalDue = app.amountRequested * (1 + app.interestRate / 100);
  const totalPaid = app.paymentSubmissions
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + (p.amount ?? 0), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);
  const daysOverall = Math.floor((now.getTime() - maturity.getTime()) / 86400000);
  const daysOverdue = Math.max(0, daysOverall - GRACE);
  const penaltyAmount = daysOverdue > 0 ? outstanding * DAILY_RATE * daysOverdue : 0;
  return { daysOverall, daysOverdue, outstanding, penaltyAmount, maturity, totalDue, totalPaid };
}

// GET /api/accounts/penalties — all active penalties across disbursed loans
router.get("/penalties", wrap(async (req, res) => {
  const { status = "DISBURSED" } = req.query as Record<string, string>;
  const apps = await (prisma as any).portalLoanApplication.findMany({
    where: { status },
    include: {
      account: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, clientNumber: true } },
      paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const results = apps.map((app: any) => {
    const p = computePenalty(app);
    return {
      loanRef: app.reference,
      accountId: app.accountId,
      applicationId: app.id,
      client: app.account,
      productType: app.productType,
      amountRequested: app.amountRequested,
      ...p,
      hasPenalty: p.daysOverdue > 0,
      penaltyRate: 2,
      gracePeriod: 3,
    };
  }).filter((r: any) => r.daysOverall > -3); // only include near-maturity or overdue

  const totalPenaltyAmount = results.filter((r: any) => r.hasPenalty).reduce((s: number, r: any) => s + r.penaltyAmount, 0);
  const overdueCount = results.filter((r: any) => r.daysOverdue > 0).length;

  res.json({ loans: results, totalPenaltyAmount, overdueCount, total: results.length });
}));

// GET /api/accounts/penalties/:loanRef — penalty for a single loan
router.get("/penalties/:loanRef", wrap(async (req, res) => {
  const app = await (prisma as any).portalLoanApplication.findFirst({
    where: { reference: req.params.loanRef },
    include: {
      account: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true, status: true } },
    },
  });
  if (!app) return res.status(404).json({ error: "Loan not found" });
  if (app.status !== "DISBURSED") return res.json({ daysOverdue: 0, penaltyAmount: 0, hasPenalty: false });
  const p = computePenalty(app);
  res.json({ loanRef: app.reference, ...p, hasPenalty: p.daysOverdue > 0, penaltyRate: 2, gracePeriod: 3 });
}));

// POST /api/accounts/penalties/:loanRef/waive — waive a penalty (manager+)
router.post("/penalties/:loanRef/waive", isManagerOrAbove, wrap(async (req, res) => {
  const { reason } = req.body as { reason: string };
  const staffUser = (req as any).user;
  // Record waiver in ledger
  const app = await (prisma as any).portalLoanApplication.findFirst({ where: { reference: req.params.loanRef } });
  if (!app) return res.status(404).json({ error: "Loan not found" });
  const p = computePenalty({ ...app, paymentSubmissions: [] });
  await (prisma as any).loanLedger.create({
    data: {
      loanRef: req.params.loanRef, accountId: app.accountId,
      description: `Penalty Waiver — ${reason ?? "Waived by manager"}`,
      debit: 0, credit: p.penaltyAmount, balance: p.outstanding,
      entryType: "ADJUSTMENT", performedBy: staffUser?.firstName + " " + staffUser?.lastName,
    },
  });
  res.json({ ok: true, penaltyWaived: p.penaltyAmount });
}));

// ── LOAN LEDGER ───────────────────────────────────────────────────────────────

// GET /api/accounts/ledger/:loanRef — full ledger for a loan
router.get("/ledger/:loanRef", wrap(async (req, res) => {
  const app = await (prisma as any).portalLoanApplication.findFirst({
    where: { reference: req.params.loanRef },
    include: {
      account: { select: { firstName: true, lastName: true, email: true, phone: true, clientNumber: true } },
      paymentSubmissions: {
        where: { status: "APPROVED" },
        select: { id: true, amount: true, paymentMethod: true, provider: true, reference: true, createdAt: true, reviewedAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!app) return res.status(404).json({ error: "Loan not found" });

  const penalty = computePenalty(app);
  const rate = app.interestRate ?? 0;
  const totalInterest = app.amountRequested * (rate / 100);
  const totalDue = app.amountRequested + totalInterest;

  // Build ledger dynamically
  let runningBalance = 0;
  const entries: {
    date: string; txnId: string; description: string; debit: number; credit: number; balance: number; entryType: string; performedBy: string;
  }[] = [];

  // 1. Loan disbursement
  runningBalance = totalDue;
  entries.push({
    date: app.reviewedAt ? new Date(app.reviewedAt).toISOString() : new Date(app.createdAt).toISOString(),
    txnId: `TXN-DISB-${app.reference}`,
    description: "Loan Disbursement",
    debit: app.amountRequested,
    credit: 0,
    balance: runningBalance,
    entryType: "DISBURSEMENT",
    performedBy: app.reviewedBy ?? "System",
  });

  // 2. Interest charge
  if (totalInterest > 0) {
    entries.push({
      date: app.reviewedAt ? new Date(app.reviewedAt).toISOString() : new Date(app.createdAt).toISOString(),
      txnId: `TXN-INT-${app.reference}`,
      description: `Interest Charge (${rate}% flat)`,
      debit: totalInterest,
      credit: 0,
      balance: runningBalance,
      entryType: "INTEREST",
      performedBy: "System",
    });
  }

  // 3. Payments received
  for (const p of app.paymentSubmissions) {
    runningBalance = Math.max(0, runningBalance - (p.amount ?? 0));
    entries.push({
      date: (p.reviewedAt ?? p.createdAt).toISOString(),
      txnId: `TXN-PAY-${p.id}`,
      description: `Repayment Received — ${p.provider ?? p.paymentMethod ?? "Cash"}${p.reference ? " Ref: " + p.reference : ""}`,
      debit: 0,
      credit: p.amount ?? 0,
      balance: runningBalance,
      entryType: "PAYMENT",
      performedBy: "Client",
    });
  }

  // 4. Penalty (if applicable)
  if (penalty.daysOverdue > 0 && penalty.penaltyAmount > 0) {
    entries.push({
      date: new Date().toISOString(),
      txnId: `TXN-PEN-${app.reference}-${penalty.daysOverdue}`,
      description: `Late Payment Penalty — ${penalty.daysOverdue} days overdue @ 2%/day`,
      debit: penalty.penaltyAmount,
      credit: 0,
      balance: runningBalance + penalty.penaltyAmount,
      entryType: "PENALTY",
      performedBy: "System (Auto)",
    });
  }

  // Fetch any manual ledger entries from DB
  const manualEntries = await (prisma as any).loanLedger.findMany({
    where: { loanRef: req.params.loanRef },
    orderBy: { date: "asc" },
  });

  res.json({
    loan: {
      reference: app.reference, productType: app.productType,
      amountRequested: app.amountRequested, interestRate: rate,
      totalInterest, totalDue, totalPaid: penalty.totalPaid,
      outstanding: penalty.outstanding, status: app.status,
      termMonths: app.termMonths,
      startDate: app.reviewedAt ?? app.createdAt,
      maturityDate: penalty.maturity,
      daysOverdue: penalty.daysOverdue, penaltyAmount: penalty.penaltyAmount,
    },
    client: app.account,
    ledger: [...entries, ...manualEntries.map((e: any) => ({
      date: e.date.toISOString(), txnId: e.txnId,
      description: e.description, debit: e.debit, credit: e.credit, balance: e.balance,
      entryType: e.entryType, performedBy: e.performedBy ?? "Staff",
    }))].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  });
}));

// POST /api/accounts/ledger/:loanRef/entry — add manual ledger entry
router.post("/ledger/:loanRef/entry", wrap(async (req, res) => {
  const { description, debit, credit, entryType, notes } = req.body as Record<string, any>;
  const staffUser = (req as any).user;
  const app = await (prisma as any).portalLoanApplication.findFirst({ where: { reference: req.params.loanRef } });
  if (!app) return res.status(404).json({ error: "Loan not found" });
  const entry = await (prisma as any).loanLedger.create({
    data: {
      loanRef: req.params.loanRef, accountId: app.accountId,
      description, debit: debit ?? 0, credit: credit ?? 0, balance: 0,
      entryType: entryType ?? "ADJUSTMENT",
      performedBy: `${staffUser?.firstName ?? ""} ${staffUser?.lastName ?? ""}`.trim(),
      notes,
    },
  });
  res.json({ ok: true, entry });
}));

// ── ACCOUNTS DASHBOARD KPIs ───────────────────────────────────────────────────
router.get("/kpis", wrap(async (_req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [disbursed, allPaid, allSubmitted, todayPayments, weekPayments, monthPayments] = await Promise.all([
    (prisma as any).portalLoanApplication.findMany({
      where: { status: "DISBURSED" },
      include: { paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } },
    }),
    (prisma as any).portalLoanApplication.count({ where: { status: "REPAID" } }),
    (prisma as any).portalLoanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    (prisma as any).loanPaymentSubmission.aggregate({ where: { status: "APPROVED", createdAt: { gte: today } }, _sum: { amount: true } }),
    (prisma as any).loanPaymentSubmission.aggregate({ where: { status: "APPROVED", createdAt: { gte: weekStart } }, _sum: { amount: true } }),
    (prisma as any).loanPaymentSubmission.aggregate({ where: { status: "APPROVED", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
  ]);

  let totalPrincipal = 0, totalInterest = 0, totalPaid = 0, totalPenalty = 0, overdueCount = 0;
  const arrearsBuckets = { current: 0, watchlist: 0, delinquent: 0, serious: 0, default: 0 };

  for (const app of disbursed) {
    const paid = app.paymentSubmissions.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    const interest = app.amountRequested * (app.interestRate / 100);
    const due = app.amountRequested + interest;
    const outstanding = Math.max(0, due - paid);
    totalPrincipal += outstanding;
    totalInterest += interest;
    totalPaid += paid;

    const p = computePenalty(app);
    if (p.daysOverdue > 0) { totalPenalty += p.penaltyAmount; overdueCount++; }

    // Arrears classification
    const d = p.daysOverall;
    if (d <= 0)       arrearsBuckets.current++;
    else if (d <= 7)  arrearsBuckets.watchlist++;
    else if (d <= 30) arrearsBuckets.delinquent++;
    else if (d <= 90) arrearsBuckets.serious++;
    else              arrearsBuckets.default++;
  }

  const par = disbursed.length > 0 ? Math.round((overdueCount / disbursed.length) * 100) : 0;

  res.json({
    totalActiveLoans: disbursed.length,
    totalRepaidLoans: allPaid,
    pendingApplications: allSubmitted,
    totalOutstandingPrincipal: Math.round(totalPrincipal),
    totalInterestReceivable: Math.round(totalInterest),
    totalPortfolio: Math.round(totalPrincipal + totalInterest),
    totalCollectedEver: Math.round(totalPaid),
    totalPenalties: Math.round(totalPenalty),
    overdueCount,
    portfolioAtRisk: par,
    collectionsToday: todayPayments._sum.amount ?? 0,
    collectionsWeek: weekPayments._sum.amount ?? 0,
    collectionsMonth: monthPayments._sum.amount ?? 0,
    arrears: arrearsBuckets,
  });
}));

// GET /api/accounts/repayment-register — all loans in ledger-sheet format (matches Google Sheets)
router.get("/repayment-register", wrap(async (req, res) => {
  const { status, search } = req.query as Record<string, string>;
  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (search) where.OR = [
    { reference: { contains: search } },
    { account: { is: { firstName: { contains: search } } } },
    { account: { is: { lastName: { contains: search } } } },
    { account: { is: { phone: { contains: search } } } },
  ];

  const apps = await (prisma as any).portalLoanApplication.findMany({
    where,
    include: {
      account: { select: { firstName: true, lastName: true, email: true, phone: true, clientNumber: true } },
      paymentSubmissions: {
        where: { status: "APPROVED" },
        select: { amount: true, createdAt: true, paymentMethod: true, provider: true, reference: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows = apps.map((app: any) => {
    const p = computePenalty(app);
    const startDate = app.reviewedAt ?? app.createdAt;
    const maturityDate = new Date(new Date(startDate).getTime() + app.termMonths * 7 * 86400000);
    const interestAmt = app.amountRequested * (app.interestRate / 100);
    const weeklyPayment = Math.round((app.amountRequested + interestAmt) / (app.termMonths || 1));
    const daysUntilMaturity = Math.ceil((maturityDate.getTime() - Date.now()) / 86400000);

    return {
      loanId: app.reference,
      borrowerName: `${app.account.firstName} ${app.account.lastName}`,
      email: app.account.email,
      phoneNumber: app.account.phone,
      loanType: app.productType.replace(/_/g, " "),
      collateralDetails: app.collateralDesc ?? app.collateralType ?? "TRUSTED",
      loanStartDate: new Date(startDate).toLocaleDateString("en-GB"),
      loanMaturityDate: maturityDate.toLocaleDateString("en-GB"),
      loanAmount: app.amountRequested,
      loanDurationWeeks: app.termMonths,
      interestRate: app.interestRate,
      totalInterestAmount: Math.round(interestAmt),
      totalRepaymentAmount: Math.round(app.amountRequested + interestAmt),
      weeklyPayment,
      paidAmount: Math.round(p.totalPaid),
      remainingBalance: Math.round(p.outstanding),
      penaltyAmount: Math.round(p.penaltyAmount),
      daysOverdue: p.daysOverdue,
      paymentStatus: p.outstanding <= 0 ? "PAID" : p.daysOverdue > 0 ? "OVERDUE" : daysUntilMaturity <= 3 ? "DUE SOON" : "ACTIVE",
      daysUntilMaturity,
      status: app.status,
      ledger: app.paymentSubmissions.map((ps: any, i: number) => ({
        date: new Date(ps.createdAt).toLocaleDateString("en-GB"),
        description: "Repayment Received",
        debit: weeklyPayment,
        paid: ps.amount,
        balance: Math.max(0, (app.amountRequested + interestAmt) - app.paymentSubmissions.slice(0, i + 1).reduce((s: number, pp: any) => s + (pp.amount ?? 0), 0)),
        method: ps.provider ?? ps.paymentMethod,
        reference: ps.reference,
      })),
    };
  });

  res.json({ loans: rows, total: rows.length });
}));

// GET /api/accounts/collections-center — who to contact today
router.get("/collections-center", wrap(async (_req, res) => {
  const apps = await (prisma as any).portalLoanApplication.findMany({
    where: { status: "DISBURSED" },
    include: {
      account: { select: { firstName: true, lastName: true, email: true, phone: true, clientNumber: true } },
      paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true, status: true } },
    },
  });

  const today: any[] = [], upcoming: any[] = [], overdue: any[] = [];
  for (const app of apps) {
    const p = computePenalty(app);
    const entry = {
      loanRef: app.reference, client: app.account, productType: app.productType,
      amountRequested: app.amountRequested, outstanding: p.outstanding,
      daysOverall: p.daysOverall, daysOverdue: p.daysOverdue,
      penaltyAmount: p.penaltyAmount, maturityDate: p.maturity.toISOString(),
    };
    if (p.daysOverall === 0) today.push(entry);
    else if (p.daysOverall < 0 && p.daysOverall >= -3) upcoming.push(entry);
    else if (p.daysOverdue > 0) overdue.push(entry);
  }

  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  res.json({ dueToday: today, dueSoon: upcoming, overdue, counts: { today: today.length, upcoming: upcoming.length, overdue: overdue.length } });
}));

export default router;

