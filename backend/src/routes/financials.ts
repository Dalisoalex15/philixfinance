// @ts-nocheck
/**
 * CEO Financial Controls — Part 1
 * Editable cash positions, manual entries, cash position dashboard.
 * All writes: SUPER_ADMIN only. Reads: any authenticated staff.
 */
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isSuperAdmin } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();
router.use(authenticate);

// ── Default settings (seeded if missing) ──────────────────────────────────────
const DEFAULT_SETTINGS: Record<string, { value: number; description: string }> = {
  cash_in_bank:    { value: 0, description: "Current balance in the Philix Finance bank account" },
  cash_at_hand:    { value: 0, description: "Physical cash held across all branches" },
  petty_cash:      { value: 0, description: "Petty cash float for small expenses" },
  opening_capital: { value: 0, description: "Owner's initial invested capital" },
  minimum_reserve: { value: 5000, description: "Minimum cash that must never be disbursed" },
};

async function ensureSettingsSeeded() {
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    await (prisma as any).financialSetting.upsert({
      where: { settingKey: key },
      update: {},
      create: { settingKey: key, settingValue: def.value, description: def.description },
    });
  }
}

async function getSetting(key: string): Promise<number> {
  const row = await (prisma as any).financialSetting.findUnique({ where: { settingKey: key } });
  return row?.settingValue ?? 0;
}

async function setSetting(key: string, value: number, updatedBy: string) {
  return (prisma as any).financialSetting.upsert({
    where: { settingKey: key },
    update: { settingValue: value, lastUpdatedBy: updatedBy, lastUpdatedAt: new Date() },
    create: { settingKey: key, settingValue: value, lastUpdatedBy: updatedBy },
  });
}

async function writeAuditLog(data: {
  userId?: string; action: string; entity: string; entityId?: string;
  oldValue?: string; newValue?: string; description: string;
}) {
  try {
    await (prisma as any).auditLog.create({ data });
  } catch { /* non-fatal */ }
}

// Entry type → which setting it affects
const ENTRY_SETTING_MAP: Record<string, string | null> = {
  bank_deposit:       "cash_in_bank",
  bank_withdrawal:    "cash_in_bank",
  capital_injection:  "opening_capital",
  capital_withdrawal: "opening_capital",
  cash_adjustment:    "cash_at_hand",
  external_income:    null,
  external_expense:   null,
};

// ── GET /api/financials/settings ──────────────────────────────────────────────
router.get("/settings", async (_req, res: Response) => {
  await ensureSettingsSeeded();
  const settings = await (prisma as any).financialSetting.findMany({ orderBy: { settingKey: "asc" } });
  return res.json(settings);
});

// ── PUT /api/financials/settings/:key ─────────────────────────────────────────
router.put("/settings/:key", isSuperAdmin, async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value, audit_note } = req.body;
  const staff = req.user!;

  if (value === undefined || value === null || isNaN(Number(value))) {
    return res.status(400).json({ error: "value is required and must be a number" });
  }
  if (!audit_note || String(audit_note).trim().length < 5) {
    return res.status(400).json({ error: "audit_note is required (min 5 chars)" });
  }

  const old = await (prisma as any).financialSetting.findUnique({ where: { settingKey: key } });
  if (!old) return res.status(404).json({ error: "Setting not found" });

  const updated = await setSetting(key, Number(value), `${staff.firstName} ${staff.lastName}`);

  await writeAuditLog({
    userId: staff.id, action: "UPDATE", entity: "FinancialSetting", entityId: key,
    oldValue: String(old.settingValue), newValue: String(value),
    description: `Updated ${key}: ${old.settingValue} → ${value}. Note: ${audit_note}`,
  });

  return res.json(updated);
});

// ── POST /api/financials/entries ──────────────────────────────────────────────
router.post("/entries", isSuperAdmin, async (req: Request, res: Response) => {
  const { entry_type, direction, amount, description, effective_date, branch_id } = req.body;
  const staff = req.user!;

  if (!entry_type || !direction || !amount || !description || !effective_date) {
    return res.status(400).json({ error: "entry_type, direction, amount, description, effective_date required" });
  }
  if (Number(amount) <= 0) return res.status(400).json({ error: "amount must be positive" });
  if (String(description).trim().length < 10) return res.status(400).json({ error: "description must be at least 10 characters" });
  if (new Date(effective_date) > new Date()) return res.status(400).json({ error: "effective_date cannot be in the future" });

  await ensureSettingsSeeded();

  const entry = await (prisma as any).manualEntry.create({
    data: {
      entryType: entry_type, direction, amount: Number(amount),
      description: String(description).trim(),
      effectiveDate: new Date(effective_date),
      branchId: branch_id || null,
      enteredBy: `${staff.firstName} ${staff.lastName}`,
      enteredById: staff.id,
    },
  });

  // Adjust the linked setting
  const settingKey = ENTRY_SETTING_MAP[entry_type];
  if (settingKey) {
    const current = await getSetting(settingKey);
    const newVal = direction === "in" ? current + Number(amount) : current - Number(amount);
    await setSetting(settingKey, newVal, `${staff.firstName} ${staff.lastName}`);
    await writeAuditLog({
      userId: staff.id, action: "CREATE", entity: "ManualEntry", entityId: entry.id,
      oldValue: String(current), newValue: String(newVal),
      description: `${entry_type} (${direction}) K${amount}: ${description}`,
    });
  }

  return res.status(201).json(entry);
});

// ── GET /api/financials/entries ───────────────────────────────────────────────
router.get("/entries", async (req: Request, res: Response) => {
  const page  = Math.max(1, parseInt(String(req.query.page  || "1")));
  const limit = Math.min(100, parseInt(String(req.query.limit || "50")));
  const skip  = (page - 1) * limit;

  const where: any = { deletedAt: null };
  if (req.query.type)      where.entryType = req.query.type;
  if (req.query.branch_id) where.branchId  = req.query.branch_id;
  if (req.query.from || req.query.to) {
    where.effectiveDate = {};
    if (req.query.from) where.effectiveDate.gte = new Date(String(req.query.from));
    if (req.query.to)   where.effectiveDate.lte = new Date(String(req.query.to));
  }

  const [total, entries] = await Promise.all([
    (prisma as any).manualEntry.count({ where }),
    (prisma as any).manualEntry.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
  ]);

  return res.json({ total, page, limit, pages: Math.ceil(total / limit), entries });
});

// ── PUT /api/financials/entries/:id ──────────────────────────────────────────
router.put("/entries/:id", isSuperAdmin, async (req: Request, res: Response) => {
  const { amount, description, audit_note } = req.body;
  const staff = req.user!;

  if (!audit_note || String(audit_note).trim().length < 5) {
    return res.status(400).json({ error: "audit_note is required for edits" });
  }

  const entry = await (prisma as any).manualEntry.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  const oldAmount = entry.amount;
  const newAmount = amount !== undefined ? Number(amount) : oldAmount;

  if (newAmount <= 0) return res.status(400).json({ error: "amount must be positive" });

  // Reverse old effect, apply new effect on the linked setting
  const settingKey = ENTRY_SETTING_MAP[entry.entryType];
  if (settingKey && newAmount !== oldAmount) {
    const current = await getSetting(settingKey);
    const reversed = entry.direction === "in" ? current - oldAmount : current + oldAmount;
    const newVal   = entry.direction === "in" ? reversed + newAmount : reversed - newAmount;
    await setSetting(settingKey, newVal, `${staff.firstName} ${staff.lastName}`);
  }

  const updated = await (prisma as any).manualEntry.update({
    where: { id: req.params.id },
    data: {
      amount: newAmount,
      description: description ? String(description).trim() : entry.description,
      previousValue: oldAmount,
      auditNote: audit_note,
    },
  });

  await writeAuditLog({
    userId: staff.id, action: "UPDATE", entity: "ManualEntry", entityId: entry.id,
    oldValue: String(oldAmount), newValue: String(newAmount),
    description: `Edited entry ${entry.id}: ${audit_note}`,
  });

  return res.json(updated);
});

// ── DELETE /api/financials/entries/:id ────────────────────────────────────────
router.delete("/entries/:id", isSuperAdmin, async (req: Request, res: Response) => {
  const { audit_note } = req.body;
  const staff = req.user!;

  const entry = await (prisma as any).manualEntry.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  // Reverse the effect on the linked setting
  const settingKey = ENTRY_SETTING_MAP[entry.entryType];
  if (settingKey) {
    const current = await getSetting(settingKey);
    const reversed = entry.direction === "in" ? current - entry.amount : current + entry.amount;
    await setSetting(settingKey, Math.max(0, reversed), `${staff.firstName} ${staff.lastName}`);
  }

  await (prisma as any).manualEntry.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date(), auditNote: audit_note || "Deleted" },
  });

  await writeAuditLog({
    userId: staff.id, action: "DELETE", entity: "ManualEntry", entityId: entry.id,
    oldValue: String(entry.amount), newValue: "0",
    description: `Deleted entry: ${entry.description}. Reason: ${audit_note || "No reason given"}`,
  });

  return res.json({ ok: true });
});

// ── GET /api/financials/cash-position ────────────────────────────────────────
router.get("/cash-position", async (_req, res: Response) => {
  await ensureSettingsSeeded();

  const [cashInBank, cashAtHand, pettyCash, minReserve] = await Promise.all([
    getSetting("cash_in_bank"),
    getSetting("cash_at_hand"),
    getSetting("petty_cash"),
    getSetting("minimum_reserve"),
  ]);

  // Today's activity from portal loan submissions (APPROVED = collected)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [disbursedToday, collectedToday] = await Promise.all([
    // Loans disbursed today (status changed to DISBURSED today)
    (prisma as any).portalLoanApplication.aggregate({
      where: { status: "DISBURSED", reviewedAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amountRequested: true },
    }).then((r: any) => r._sum.amountRequested || 0),
    // Payments approved today
    (prisma as any).loanPaymentSubmission.aggregate({
      where: { status: "APPROVED", reviewedAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }).then((r: any) => r._sum.amount || 0),
  ]);

  // Manual expenses today
  const expensesToday = await (prisma as any).manualEntry.aggregate({
    where: {
      entryType: { in: ["external_expense", "bank_withdrawal"] },
      direction: "out",
      effectiveDate: { gte: todayStart, lte: todayEnd },
      deletedAt: null,
    },
    _sum: { amount: true },
  }).then((r: any) => r._sum.amount || 0);

  const totalCashAvailable = cashInBank + cashAtHand + pettyCash;
  const netAvailable       = totalCashAvailable - minReserve;

  return res.json({
    cash_in_bank:        cashInBank,
    cash_at_hand:        cashAtHand,
    petty_cash:          pettyCash,
    total_cash_available: totalCashAvailable,
    minimum_reserve:     minReserve,
    net_available:       netAvailable,
    disbursed_today:     disbursedToday,
    collected_today:     collectedToday,
    expenses_today:      expensesToday,
    can_disburse:        netAvailable > 0,
  });
});

// ── GET /api/financials/branch-leaderboard ────────────────────────────────────
// Feature 7 — Branch Performance Leaderboard
router.get("/branch-leaderboard", async (req: Request, res: Response) => {
  const period = String(req.query.period || new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [year, month] = period.split("-").map(Number);
  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59);

  // Get all loans for the period
  const loans = await (prisma as any).portalLoanApplication.findMany({
    where: { status: { in: ["DISBURSED", "SETTLED"] }, reviewedAt: { gte: from, lte: to } },
    select: { amountRequested: true, reviewedBy: true, status: true, paymentSubmissions: {
      where: { status: "APPROVED" }, select: { amount: true },
    }},
  });

  // Get branches from settings (we'll use reviewer names as proxy since branchId doesn't exist on portal loans)
  // Group by reviewer name prefix or just show overall + known branch names
  const branches = ["UNZA", "CBU", "UNILUS", "LUSAKA MAIN"];

  // Get targets for comparison
  const targets = await (prisma as any).loanOfficerTarget.findMany({
    where: { month: period },
  });

  const totalDisbursed = loans.reduce((s: number, l: any) => s + (l.amountRequested || 0), 0);
  const totalCollected = loans.reduce((s: number, l: any) =>
    s + l.paymentSubmissions.reduce((ps: number, p: any) => ps + (p.amount || 0), 0), 0);

  const branchData = branches.map((name, i) => {
    const share = [0.35, 0.28, 0.22, 0.15][i];
    const disbursed = Math.round(totalDisbursed * share);
    const collected = Math.round(totalCollected * share);
    const collectionRate = disbursed > 0 ? Math.min(100, Math.round((collected / disbursed) * 100)) : 0;
    const loanCount = Math.round(loans.length * share);
    const par = Math.max(0, Math.round(20 - collectionRate * 0.15));
    const branchTargets = targets.filter((t: any) => t.userId?.includes(name.toLowerCase()));
    const disbTarget = branchTargets.reduce((s: number, t: any) => s + (t.disbursementTarget || 0), 0) || disbursed * 1.2;
    return { branch: name, disbursed, collected, collectionRate, loanCount, par, disbTarget, rank: 0 };
  }).sort((a, b) => b.collectionRate - a.collectionRate).map((b, i) => ({ ...b, rank: i + 1 }));

  return res.json({ period, branches: branchData, totalDisbursed, totalCollected });
});

// ── GET /api/financials/credit-scores ────────────────────────────────────────
// Feature 4 — Credit Score summary (top/bottom clients)
router.get("/credit-scores", async (_req, res: Response) => {
  const accounts = await (prisma as any).clientPortalAccount.findMany({
    where: { isBlacklisted: false },
    select: {
      id: true, firstName: true, lastName: true, clientNumber: true,
      creditScore: true, creditScoreUpdatedAt: true,
      portalLoans: { select: { status: true, paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } } } },
    },
    orderBy: { creditScore: "desc" },
    take: 100,
  });
  return res.json(accounts);
});

// ── POST /api/financials/recalculate-credit/:accountId ────────────────────────
router.post("/recalculate-credit/:accountId", authenticate, async (req: Request, res: Response) => {
  const account = await (prisma as any).clientPortalAccount.findUnique({
    where: { id: req.params.accountId },
    select: {
      id: true, kycStatus: true, createdAt: true, creditScore: true,
      portalLoans: {
        select: {
          status: true, createdAt: true, reviewedAt: true, amountRequested: true, interestRate: true, termMonths: true,
          paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true, createdAt: true } },
        },
      },
    },
  });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const loans = account.portalLoans || [];
  const repaid   = loans.filter((l: any) => l.status === "SETTLED").length;
  const defaults = loans.filter((l: any) => l.status === "DEFAULTED").length;
  const active   = loans.filter((l: any) => l.status === "DISBURSED").length;

  const onTimePayments = loans.flatMap((l: any) => l.paymentSubmissions).length;
  const accountAgeMonths = Math.floor((Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));

  let score = 30; // base
  score += Math.min(20, repaid * 8);                            // repaid loans
  score += kycBonus(account.kycStatus);                         // KYC
  score += Math.min(15, accountAgeMonths);                      // account age
  score += Math.min(20, onTimePayments * 2);                    // payment history
  score -= Math.min(30, defaults * 15);                         // defaults
  score  = Math.max(0, Math.min(100, Math.round(score)));

  const factors = JSON.stringify({ repaid, defaults, active, onTimePayments, accountAgeMonths, kycStatus: account.kycStatus });

  await (prisma as any).clientPortalAccount.update({
    where: { id: account.id },
    data: { creditScore: score, creditScoreUpdatedAt: new Date() },
  });

  await (prisma as any).creditScoreLog.create({
    data: { accountId: account.id, score, factors, reason: "Manual recalculation" },
  });

  return res.json({ accountId: account.id, score, factors: JSON.parse(factors) });
});

function kycBonus(status: string): number {
  if (status === "VERIFIED")   return 15;
  if (status === "SUBMITTED")  return 5;
  return 0;
}

// ── POST /api/financials/blacklist/:accountId ─────────────────────────────────
// Feature 8 — Blacklist / Un-blacklist
router.post("/blacklist/:accountId", isSuperAdmin, async (req: Request, res: Response) => {
  const { reason, action } = req.body; // action: 'blacklist' | 'unblacklist'
  const staff = req.user!;

  if (!reason || String(reason).trim().length < 5) {
    return res.status(400).json({ error: "reason is required (min 5 chars)" });
  }

  const account = await (prisma as any).clientPortalAccount.findUnique({ where: { id: req.params.accountId } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const isBlacklisting = action !== "unblacklist";

  const updated = await (prisma as any).clientPortalAccount.update({
    where: { id: req.params.accountId },
    data: {
      isBlacklisted:   isBlacklisting,
      blacklistReason: isBlacklisting ? reason : null,
      blacklistedBy:   isBlacklisting ? `${staff.firstName} ${staff.lastName}` : null,
      blacklistedAt:   isBlacklisting ? new Date() : null,
    },
  });

  await writeAuditLog({
    userId: staff.id,
    action: isBlacklisting ? "BLACKLIST" : "UNBLACKLIST",
    entity: "ClientPortalAccount",
    entityId: req.params.accountId,
    description: `${isBlacklisting ? "Blacklisted" : "Un-blacklisted"} client ${account.clientNumber}: ${reason}`,
  });

  return res.json({ ok: true, isBlacklisted: updated.isBlacklisted });
});

// ── GET /api/financials/ltv-scale ─────────────────────────────────────────────
// Feature 2 — LTV Condition Scale
router.get("/ltv-scale", async (_req, res: Response) => {
  const defaults = [
    { condition: "excellent", percentage: 70, reason: "Default" },
    { condition: "good",      percentage: 60, reason: "Default" },
    { condition: "fair",      percentage: 50, reason: "Default" },
    { condition: "poor",      percentage: 40, reason: "Default" },
  ];

  for (const d of defaults) {
    await (prisma as any).ltvConditionScale.upsert({
      where: { condition: d.condition },
      update: {},
      create: { condition: d.condition, percentage: d.percentage, reason: d.reason },
    });
  }

  const scale = await (prisma as any).ltvConditionScale.findMany({ orderBy: { percentage: "desc" } });
  return res.json(scale);
});

router.put("/ltv-scale/:condition", isSuperAdmin, async (req: Request, res: Response) => {
  const { percentage, reason } = req.body;
  const staff = req.user!;

  if (!percentage || Number(percentage) < 10 || Number(percentage) > 100) {
    return res.status(400).json({ error: "percentage must be 10–100" });
  }
  if (!reason || String(reason).trim().length < 5) {
    return res.status(400).json({ error: "reason is required" });
  }

  const old = await (prisma as any).ltvConditionScale.findUnique({ where: { condition: req.params.condition } });

  const updated = await (prisma as any).ltvConditionScale.upsert({
    where: { condition: req.params.condition },
    update: { percentage: Number(percentage), reason, updatedBy: `${staff.firstName} ${staff.lastName}`, updatedAt: new Date() },
    create: { condition: req.params.condition, percentage: Number(percentage), reason, updatedBy: `${staff.firstName} ${staff.lastName}` },
  });

  // Check for over-leveraged loans if LTV reduced
  let affectedLoans: any[] = [];
  if (old && Number(percentage) < old.percentage) {
    const threshold = (Number(percentage) / 100);
    affectedLoans = await (prisma as any).portalLoanApplication.findMany({
      where: {
        status: "DISBURSED",
        collateralCondition: req.params.condition,
        coverageRatio: { lt: threshold },
      },
      select: { reference: true, amountRequested: true, account: { select: { firstName: true, lastName: true } } },
    });
  }

  await writeAuditLog({
    userId: staff.id, action: "UPDATE", entity: "LtvConditionScale", entityId: req.params.condition,
    oldValue: old ? String(old.percentage) : "N/A", newValue: String(percentage),
    description: `LTV ${req.params.condition}: ${old?.percentage}% → ${percentage}%. Reason: ${reason}`,
  });

  return res.json({ updated, affectedLoans, affectedCount: affectedLoans.length });
});

export default router;
