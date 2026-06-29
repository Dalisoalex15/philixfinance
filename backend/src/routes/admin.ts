// @ts-nocheck
import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { Mailer, sendEmail, buildBaseHtml } from "../lib/mailer";

const sendClientEmailSchema = z.object({
  accountId: z.string().min(1),
  subject:   z.string().min(1).max(200).trim(),
  body:      z.string().min(1).max(10000).trim(),
  loanRef:   z.string().max(50).optional(),
  loanId:    z.string().optional(),
});

type AsyncHandler = (req: Request, res: Response, next: (err?: unknown) => void) => Promise<unknown>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: (err?: unknown) => void) =>
  fn(req, res, next).catch(next);

const router = Router();
router.use(authenticate);

// GET /api/admin/activity — recent portal events for live dashboard feed
router.get("/activity", wrap(async (_req: Request, res: Response) => {
  const apps = await prisma.portalLoanApplication.findMany({
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      account: { select: { firstName: true, lastName: true, clientNumber: true } },
    },
  });

  const events = apps.map((a) => {
    const name = `${a.account.firstName} ${a.account.lastName}`;
    const product = a.productType.replace(/_/g, " ");
    const amount = a.amountRequested;

    let type: string;
    let description: string;
    switch (a.status) {
      case "SUBMITTED":
        type = "APPLICATION_SUBMITTED";
        description = `${name} submitted a new ${product} application for K${amount.toLocaleString()}`;
        break;
      case "UNDER_REVIEW":
        type = "APPLICATION_REVIEWING";
        description = `${name}'s ${product} application is now under review`;
        break;
      case "APPROVED":
        type = "APPLICATION_APPROVED";
        description = `${name}'s loan of K${amount.toLocaleString()} was APPROVED`;
        break;
      case "REJECTED":
        type = "APPLICATION_REJECTED";
        description = `${name}'s ${product} application was rejected`;
        break;
      case "DISBURSED":
        type = "LOAN_DISBURSED";
        description = `K${amount.toLocaleString()} disbursed to ${name} — ${product}`;
        break;
      default:
        type = "APPLICATION_UPDATED";
        description = `${name}'s application was updated`;
    }

    return {
      id: a.id,
      type,
      client: name,
      clientNo: a.account.clientNumber,
      ref: a.reference,
      amount,
      description,
      timestamp: a.updatedAt,
    };
  });

  res.json(events);
}));

// GET /api/admin/fraud-scan — detect duplicate NRC / phone across portal accounts
router.get("/fraud-scan", wrap(async (_req: Request, res: Response) => {
  const accounts = await prisma.clientPortalAccount.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      clientNumber: true,
      nrcNumber: true,
      phone: true,
      email: true,
      createdAt: true,
    },
  });

  type AccRecord = typeof accounts[number];
  const nrcMap = new Map<string, AccRecord[]>();
  const phoneMap = new Map<string, AccRecord[]>();

  for (const acc of accounts) {
    if (acc.nrcNumber) {
      const key = acc.nrcNumber.replace(/\s/g, "").toLowerCase();
      if (!nrcMap.has(key)) nrcMap.set(key, []);
      nrcMap.get(key)!.push(acc);
    }
    if (acc.phone) {
      const key = acc.phone.replace(/\s/g, "");
      if (!phoneMap.has(key)) phoneMap.set(key, []);
      phoneMap.get(key)!.push(acc);
    }
  }

  const alerts: object[] = [];

  for (const [nrc, accs] of nrcMap) {
    if (accs.length > 1) {
      alerts.push({
        id: `nrc-${nrc}`,
        type: "DUPLICATE_NRC",
        severity: "HIGH",
        value: nrc,
        description: `NRC ${nrc} is linked to ${accs.length} accounts`,
        accounts: accs.map((a) => ({
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          clientNo: a.clientNumber,
          email: a.email,
        })),
        detectedAt: new Date().toISOString(),
      });
    }
  }

  for (const [phone, accs] of phoneMap) {
    if (accs.length > 1) {
      alerts.push({
        id: `phone-${phone}`,
        type: "DUPLICATE_PHONE",
        severity: "MEDIUM",
        value: phone,
        description: `Phone ${phone} is used by ${accs.length} accounts`,
        accounts: accs.map((a) => ({
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          clientNo: a.clientNumber,
          email: a.email,
        })),
        detectedAt: new Date().toISOString(),
      });
    }
  }

  res.json({ alerts, scannedAt: new Date().toISOString(), totalAccounts: accounts.length });
}));

// GET /api/admin/summary — quick stats for CEO dashboard
router.get("/summary", wrap(async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Fallback rates keyed by product ID + term weeks (for loans without a stored interestRate)
  // prod-001..004 = 10/20/30/35%, prod-005 = 8/16/24/30%, prod-006 = 7/14/21/28%
  const PRODUCT_RATES: Record<string, Record<number, number>> = {
    "prod-001": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-002": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-003": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-004": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-005": { 1:  8, 2: 16, 3: 24, 4: 30 },
    "prod-006": { 1:  7, 2: 14, 3: 21, 4: 28 },
    "prod-007": { 4: 8, 8: 15, 12: 22, 16: 28, 20: 33, 24: 38 },
  };

  const [
    totalAccounts,
    pendingApplications,
    approvedToday,
    submittedToday,
    totalApplications,
    disbursedAgg,
    activeAgg,
    disbursedLoans,
    totalPaidAgg,
    repaidCount,
  ] = await Promise.all([
    prisma.clientPortalAccount.count(),
    prisma.portalLoanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.portalLoanApplication.count({ where: { status: "APPROVED", reviewedAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count(),
    prisma.portalLoanApplication.aggregate({ _sum: { amountRequested: true }, where: { status: { in: ["DISBURSED", "REPAID"] } } }),
    prisma.portalLoanApplication.aggregate({ _sum: { amountRequested: true }, where: { status: { in: ["APPROVED", "DISBURSED"] } } }),
    prisma.portalLoanApplication.findMany({
      where: { status: { in: ["DISBURSED", "REPAID"] } },
      select: { amountRequested: true, termMonths: true, interestRate: true, productType: true },
    }),
    (prisma as any).loanPaymentSubmission.aggregate({ _sum: { amount: true }, where: { status: "APPROVED" } }),
    prisma.portalLoanApplication.count({ where: { status: "REPAID" } }),
  ]);

  // Use the rate stored at application time; fall back to product+term table for legacy records
  const totalInterestEarned = disbursedLoans.reduce((sum: number, loan: {
    amountRequested: number; termMonths: number; interestRate: number; productType: string;
  }) => {
    const ratePct = loan.interestRate > 0
      ? loan.interestRate
      : (PRODUCT_RATES[loan.productType]?.[loan.termMonths] ?? 35);
    return sum + loan.amountRequested * (ratePct / 100);
  }, 0);

  const totalDisbursedAmount = disbursedAgg._sum.amountRequested ?? 0;

  res.json({
    totalPortalAccounts: totalAccounts,
    pendingApplications,
    approvedToday,
    submittedToday,
    totalApplications,
    totalDisbursedAmount,
    totalLoanedOut: activeAgg._sum.amountRequested ?? 0,
    totalInterestEarned,
    totalRepayable: totalDisbursedAmount + totalInterestEarned,
    totalCollected: totalPaidAgg._sum.amount ?? 0,
    repaidLoansCount: repaidCount,
  });
}));

// GET /api/admin/portal-accounts — list all portal client accounts
router.get("/portal-accounts", wrap(async (_req: Request, res: Response) => {
  const accounts = await prisma.clientPortalAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clientNumber: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      address: true,
      city: true,
      occupation: true,
      employer: true,
      monthlyIncome: true,
      nrcNumber: true,
      kycStatus: true,
      status: true,
      emailVerified: true,
      lastLoginAt: true,
      failedLoginCount: true,
      lockedUntil: true,
      createdAt: true,
      _count: { select: { portalLoans: true } },
    },
  });
  // Normalize _count field name for frontend
  const normalized = (accounts as any[]).map(a => ({
    ...a,
    _count: { loanApplications: a._count.portalLoans },
  }));
  res.json(normalized);
}));

// GET /api/admin/portal-accounts/:id — full details for one portal account
router.get("/portal-accounts/:id", wrap(async (req: Request, res: Response) => {
  const account = await prisma.clientPortalAccount.findUnique({
    where: { id: req.params.id },
    include: {
      portalLoans: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, reference: true, productType: true, amountRequested: true,
          status: true, createdAt: true, reviewedAt: true,
        },
      },
      kycDocuments: { select: { id: true, docType: true, fileName: true, fileUrl: true, mimeType: true, uploadedAt: true } },
      notifications: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!account) return res.status(404).json({ error: "Account not found" });
  const { passwordHash, portalLoans, ...safe } = account as any;
  res.json({ ...safe, loanApplications: portalLoans, hasPassword: !!passwordHash });
}));

// POST /api/admin/portal-accounts/:id/reset-password — admin sets a new password
router.post("/portal-accounts/:id/reset-password", wrap(async (req: Request, res: Response) => {
  const { newPassword } = req.body as { newPassword: string };
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const bcrypt = require("bcryptjs");
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: { passwordHash: hash, failedLoginCount: 0, lockedUntil: null },
  });
  res.json({ success: true, message: "Password reset successfully" });
}));

// PATCH /api/admin/portal-accounts/:id/status — suspend / activate account
router.patch("/portal-accounts/:id/status", wrap(async (req: Request, res: Response) => {
  const { status } = req.body as { status: string };
  const allowed = ["ACTIVE", "SUSPENDED", "BLACKLISTED", "PENDING_KYC"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const account = await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, status: true, clientNumber: true },
  });
  res.json(account);
}));

// POST /api/admin/portal-accounts/:id/unlock — clear failed logins and lock
router.post("/portal-accounts/:id/unlock", wrap(async (req: Request, res: Response) => {
  await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
  res.json({ success: true });
}));

// POST /api/admin/portal-accounts/:id/notify — send in-app notification to client
router.post("/portal-accounts/:id/notify", wrap(async (req: Request, res: Response) => {
  const { subject, body, category } = req.body as { subject: string; body: string; category?: string };
  if (!subject || !body) return res.status(400).json({ error: "subject and body required" });
  const notification = await prisma.clientNotification.create({
    data: {
      accountId: req.params.id,
      subject,
      body,
      category: category ?? "GENERAL",
    },
  });
  res.status(201).json(notification);
}));

// PATCH /api/admin/portal-accounts/:id/kyc — manually set KYC status
router.patch("/portal-accounts/:id/kyc", wrap(async (req: Request, res: Response) => {
  const { kycStatus } = req.body as { kycStatus: string };
  const allowed = ["NOT_STARTED", "SUBMITTED", "IN_REVIEW", "VERIFIED", "REJECTED"];
  if (!allowed.includes(kycStatus)) return res.status(400).json({ error: "Invalid kycStatus" });
  const account = await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: { kycStatus },
    select: { id: true, kycStatus: true },
  });
  res.json(account);
}));

// DELETE /api/admin/portal-accounts/:id — permanently delete account + all linked data
router.delete("/portal-accounts/:id", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Only SUPER_ADMIN can delete accounts." });
  }
  const id = req.params.id;
  // Delete in dependency order
  await prisma.clientNotification.deleteMany({ where: { accountId: id } });
  await prisma.kycDocument.deleteMany({ where: { accountId: id } });
  await prisma.portalLoanApplication.deleteMany({ where: { accountId: id } });
  await prisma.portalRefreshToken.deleteMany({ where: { accountId: id } });
  await prisma.clientPortalAccount.delete({ where: { id } });
  res.json({ success: true });
}));

// PATCH /api/admin/portal-accounts/:id/trust — grant or revoke trusted client status
router.patch("/portal-accounts/:id/trust", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { isTrustedClient } = req.body as { isTrustedClient: boolean };

  const updated = await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: {
      isTrustedClient: !!isTrustedClient,
      trustGrantedAt: isTrustedClient ? new Date() : null,
      trustGrantedBy: isTrustedClient ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email) : null,
    },
    select: { id: true, isTrustedClient: true, trustGrantedAt: true, trustGrantedBy: true },
  });

  // Send in-app notification to the client
  if (isTrustedClient) {
    await prisma.clientNotification.create({
      data: {
        accountId: req.params.id,
        subject: "🎉 You've been upgraded to Trusted Client status!",
        body: "Congratulations! You have been granted Trusted Client status by Philix Finance. You now have access to the Trusted Client Express Loan — financing without collateral, based on your outstanding repayment history. Log in to apply now!",
        category: "ACCOUNT",
      },
    }).catch(() => {});
  }

  res.json(updated);
}));

// GET /api/admin/portal-accounts/:id/trust-score — compute trust score for a client
router.get("/portal-accounts/:id/trust-score", wrap(async (req: Request, res: Response) => {
  const account = await prisma.clientPortalAccount.findUnique({
    where: { id: req.params.id },
    include: {
      portalLoans: {
        select: { status: true, amountRequested: true, createdAt: true, reviewedAt: true, termMonths: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const loans = (account as any).portalLoans ?? [];
  const disbursed = loans.filter((l: any) => l.status === "DISBURSED").length;
  const approved  = loans.filter((l: any) => l.status === "APPROVED" || l.status === "DISBURSED").length;
  const rejected  = loans.filter((l: any) => l.status === "REJECTED").length;
  const total     = loans.length;

  // Trust score out of 100
  let score = 0;

  // Repayment History (40 pts) — based on completed/disbursed loans
  score += Math.min(40, disbursed * 10);

  // Income Stability (25 pts) — based on having income on file
  if ((account as any).monthlyIncome && (account as any).monthlyIncome > 0) score += 15;
  if ((account as any).employer) score += 10;

  // Employment Duration (15 pts) — based on account age
  const accountAgeMonths = Math.floor((Date.now() - new Date((account as any).createdAt).getTime()) / (30 * 86400000));
  score += Math.min(15, accountAgeMonths);

  // Existing Relationship (10 pts) — total loans taken
  score += Math.min(10, total * 2);

  // Verification Success (10 pts) — KYC and profile completeness
  if ((account as any).kycStatus === "VERIFIED") score += 7;
  if ((account as any).nrcNumber) score += 3;

  // Deductions for bad behavior
  if (rejected > 0) score = Math.max(0, score - rejected * 5);

  score = Math.min(100, Math.max(0, score));

  // Approval band
  let recommendation: string;
  let grade: string;
  if (score >= 90)      { recommendation = "AUTOMATIC_APPROVAL"; grade = "A"; }
  else if (score >= 75) { recommendation = "MANAGER_REVIEW";     grade = "B"; }
  else if (score >= 60) { recommendation = "SENIOR_REVIEW";      grade = "C"; }
  else                  { recommendation = "DECLINE";             grade = "D"; }

  // Loan limit based on tier
  let maxLoanLimit: number;
  if (disbursed === 0)     maxLoanLimit = 0;
  else if (disbursed <= 1) maxLoanLimit = 5000;
  else if (disbursed <= 3) maxLoanLimit = 10000;
  else                     maxLoanLimit = 25000;

  // Update stored trust score
  await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: { trustScore: score },
  });

  res.json({
    score,
    grade,
    recommendation,
    maxLoanLimit,
    breakdown: {
      repaymentHistory: Math.min(40, disbursed * 10),
      incomeStability:  ((account as any).monthlyIncome ? 15 : 0) + ((account as any).employer ? 10 : 0),
      accountAge:       Math.min(15, accountAgeMonths),
      relationship:     Math.min(10, total * 2),
      verification:     ((account as any).kycStatus === "VERIFIED" ? 7 : 0) + ((account as any).nrcNumber ? 3 : 0),
    },
    stats: {
      totalLoans: total,
      disbursed,
      approved,
      rejected,
      accountAgeMonths,
      isTrustedClient: (account as any).isTrustedClient,
      trustGrantedAt: (account as any).trustGrantedAt,
      trustGrantedBy: (account as any).trustGrantedBy,
    },
  });
}));

// POST /api/admin/wipe-demo-data — clean-slate launch (SUPER_ADMIN only)
router.post("/wipe-demo-data", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Only SUPER_ADMIN can wipe demo data." });
  }

  const confirm = (req.body as any).confirm;
  if (confirm !== "WIPE_ALL_DEMO_DATA") {
    return res.status(400).json({ error: "Must include confirm: 'WIPE_ALL_DEMO_DATA' in body." });
  }

  await prisma.clientNotification.deleteMany({});
  await prisma.kycDocument.deleteMany({});
  await prisma.portalLoanApplication.deleteMany({});
  await prisma.portalRefreshToken.deleteMany({});
  await prisma.clientPortalAccount.deleteMany({});

  res.json({
    success: true,
    message: "All portal demo data wiped. CEO account and system config preserved.",
    wipedAt: new Date().toISOString(),
  });
}));

// GET /api/admin/payment-submissions — list all payment proofs for staff review
router.get("/payment-submissions", wrap(async (_req: Request, res: Response) => {
  const submissions = await (prisma as any).loanPaymentSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      application: {
        select: {
          reference: true, productType: true, amountRequested: true,
          account: { select: { firstName: true, lastName: true, clientNumber: true, email: true } },
        },
      },
    },
  });
  res.json(submissions);
}));

// PATCH /api/admin/payment-submissions/:id — approve or reject
router.patch("/payment-submissions/:id", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, rejectedReason, amountReceived } = req.body as {
    status: string; rejectedReason?: string; amountReceived?: number;
  };
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "status must be APPROVED or REJECTED" });
  }

  // Fetch submission + update in parallel to save one round-trip
  const [submission, updated] = await Promise.all([
    (prisma as any).loanPaymentSubmission.findUnique({
      where: { id: req.params.id },
      include: {
        application: {
          select: {
            id: true, reference: true, amountRequested: true, interestRate: true,
            status: true, accountId: true, productType: true, termMonths: true, purpose: true,
            account: { select: { firstName: true } },
            paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } },
          },
        },
      },
    }),
    (prisma as any).loanPaymentSubmission.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedBy: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
        reviewedAt: new Date(),
        rejectedReason: rejectedReason || null,
        // Override stored amount with what was actually received, if staff provides it
        ...(typeof amountReceived === "number" && amountReceived > 0 ? { amount: amountReceived } : {}),
      },
    }),
  ]);
  if (!submission) return res.status(404).json({ error: "Payment submission not found" });

  // Respond immediately — fire side-effects (notifications + status update) asynchronously
  res.json(updated);

  // Background: notification + repaid check (does not block the admin UI)
  setImmediate(async () => {
    try {
      if (status === "APPROVED" && submission.application) {
        const app = submission.application;
        const reviewedByStr = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;

        // ── LOAN ROLLOVER: client paid interest only — renew the principal ──
        if (submission.notes === "LOAN_ROLLOVER" && app.status === "DISBURSED") {
          const newRef = `PHX-${Math.floor(Math.random() * 9000) + 1000}`;
          await Promise.all([
            prisma.portalLoanApplication.update({ where: { id: app.id }, data: { status: "REPAID" } }),
            prisma.portalLoanApplication.create({
              data: {
                reference: newRef,
                accountId: app.accountId,
                productType: app.productType ?? "SHORT_TERM_LOAN",
                amountRequested: app.amountRequested,
                termMonths: app.termMonths ?? 1,
                interestRate: app.interestRate ?? 20,
                purpose: app.purpose ?? "Loan renewal",
                status: "DISBURSED",
                reviewedAt: new Date(),
                reviewedBy: reviewedByStr,
              },
            }),
            prisma.clientNotification.create({
              data: {
                accountId: app.accountId,
                subject: `🔄 Loan renewed — K${app.amountRequested.toLocaleString()} ready!`,
                body: `Great news, ${app.account.firstName}! Your interest payment has been verified and your loan has been renewed. K${app.amountRequested.toLocaleString()} is available for use again. New reference: ${newRef}.`,
                category: "LOAN_RENEWED",
              },
            }),
          ]);
          // Email notification for rollover (non-blocking)
          const acctRoll = await prisma.clientPortalAccount.findUnique({ where: { id: app.accountId }, select: { email: true, firstName: true } });
          if (acctRoll) {
            Mailer.loanRenewed({ email: acctRoll.email, firstName: acctRoll.firstName, oldReference: app.reference, newReference: newRef, principal: app.amountRequested, interestPaid: submission.amount ?? 0, accountId: app.accountId }).catch(() => {});
          }
          return; // skip normal repaid/notification flow
        }

        // ── NORMAL PAYMENT FLOW ──
        const paidSoFar = (app.paymentSubmissions as { amount: number | null }[])
          .reduce((s: number, p) => s + (p.amount ?? 0), 0);
        const thisPayment = submission.amount ?? 0;
        const totalPaid = paidSoFar + thisPayment;
        const totalDue = Math.ceil(app.amountRequested * (1 + (app.interestRate ?? 20) / 100));
        const remaining = Math.max(0, totalDue - totalPaid);
        const fullyRepaid = totalPaid >= totalDue;

        const notifPromise = prisma.clientNotification.create({
          data: {
            accountId: app.accountId,
            subject: fullyRepaid
              ? `✅ Loan ${app.reference} fully repaid!`
              : `✅ Payment of K${thisPayment.toLocaleString()} confirmed`,
            body: fullyRepaid
              ? `Congratulations, ${app.account.firstName}! Your payment of K${thisPayment.toLocaleString()} has been confirmed and your loan ${app.reference} is now fully repaid. Thank you for banking with Philix Finance.`
              : `Your payment of K${thisPayment.toLocaleString()} for loan ${app.reference} has been confirmed. Total paid: K${totalPaid.toLocaleString()}. Remaining balance: K${remaining.toLocaleString()}.`,
            category: "PAYMENT_CONFIRMED",
          },
        });

        const loanUpdatePromise = fullyRepaid && app.status === "DISBURSED"
          ? prisma.portalLoanApplication.update({ where: { id: app.id }, data: { status: "REPAID" } })
          : Promise.resolve();

        await Promise.all([notifPromise, loanUpdatePromise]);

        // Payment confirmed email
        const acctPay = await prisma.clientPortalAccount.findUnique({ where: { id: app.accountId }, select: { email: true, firstName: true } });
        if (acctPay) {
          Mailer.paymentConfirmed({ email: acctPay.email, firstName: acctPay.firstName, reference: app.reference, amount: thisPayment, totalPaid, remaining, totalDue, accountId: app.accountId }).catch(() => {});
        }
      }

      if (status === "REJECTED" && submission.application) {
        const app = submission.application;
        await prisma.clientNotification.create({
          data: {
            accountId: app.accountId,
            subject: `❌ Payment proof for ${app.reference} was rejected`,
            body: `Your payment submission for loan ${app.reference} could not be verified.${rejectedReason ? ` Reason: ${rejectedReason}.` : ""} Please resubmit with a clear screenshot of the transaction.`,
            category: "PAYMENT_REJECTED",
          },
        });
        // Payment rejected email
        const acctRej = await prisma.clientPortalAccount.findUnique({ where: { id: app.accountId }, select: { email: true, firstName: true } });
        if (acctRej) {
          Mailer.paymentRejected({ email: acctRej.email, firstName: acctRej.firstName, reference: app.reference, amount: submission.amount ?? 0, reason: rejectedReason, accountId: app.accountId }).catch(() => {});
        }
      }
    } catch (_) { /* background failure must not surface to client */ }
  });
}));

// POST /api/admin/broadcast — send message to all clients or a specific client
router.post("/broadcast", wrap(async (req: Request, res: Response) => {
  const { subject, body, category = "ANNOUNCEMENT", targetAccountId } = req.body as {
    subject: string; body: string; category?: string; targetAccountId?: string;
  };
  if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });

  let accounts: { id: string }[];
  if (targetAccountId) {
    accounts = [{ id: targetAccountId }];
  } else {
    accounts = await prisma.clientPortalAccount.findMany({ select: { id: true } });
  }

  await prisma.clientNotification.createMany({
    data: accounts.map(a => ({
      accountId: a.id,
      subject,
      body,
      category,
      sentViaEmail: false,
    })),
  });

  res.json({ sent: accounts.length });
}));

// GET /api/admin/broadcasts — history of announcement notifications
router.get("/broadcasts", wrap(async (_req: Request, res: Response) => {
  const rows = await prisma.clientNotification.findMany({
    where: { category: "ANNOUNCEMENT" },
    orderBy: { createdAt: "desc" },
    take: 50,
    distinct: ["subject", "body"],
    select: { id: true, subject: true, body: true, category: true, createdAt: true },
  });
  res.json(rows);
}));

// ── BLACKLIST ─────────────────────────────────────────────────────────────────

// POST /api/admin/portal-accounts/:id/blacklist — blacklist or unblacklist a client
router.post("/portal-accounts/:id/blacklist", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { blacklist, reason } = req.body as { blacklist: boolean; reason?: string };

  if (blacklist && !reason) {
    return res.status(400).json({ error: "reason required when blacklisting" });
  }

  const updated = await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: {
      isBlacklisted: blacklist,
      blacklistReason: blacklist ? reason : null,
      blacklistedAt: blacklist ? new Date() : null,
      blacklistedBy: blacklist ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email) : null,
      status: blacklist ? "BLACKLISTED" : "ACTIVE",
    },
    select: { id: true, isBlacklisted: true, blacklistReason: true, status: true },
  });

  if (blacklist) {
    await prisma.clientNotification.create({
      data: {
        accountId: req.params.id,
        subject: "Account Access Restricted",
        body: `Your account has been restricted from applying for new loans. Reason: ${reason}. Contact us at info@philixfinance.com for assistance.`,
        category: "ACCOUNT",
      },
    }).catch(() => {});
  }

  res.json(updated);
}));

// ── CREDIT SCORE ──────────────────────────────────────────────────────────────

// GET /api/admin/portal-accounts/:id/credit-score — compute & return credit score
router.get("/portal-accounts/:id/credit-score", wrap(async (req: Request, res: Response) => {
  const account = await prisma.clientPortalAccount.findUnique({
    where: { id: req.params.id },
    include: {
      portalLoans: {
        select: { status: true, amountRequested: true, termMonths: true, createdAt: true, reviewedAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const loans = (account as any).portalLoans ?? [];
  const disbursed = loans.filter((l: any) => l.status === "DISBURSED").length;
  const rejected  = loans.filter((l: any) => l.status === "REJECTED").length;
  const total     = loans.length;
  const accountAgeMonths = Math.floor((Date.now() - new Date((account as any).createdAt).getTime()) / (30 * 86400000));

  let score = 40; // Base score for having an account
  score += Math.min(25, disbursed * 8);          // Repayment history (up to 25)
  score -= Math.min(30, rejected * 10);          // Rejections (penalty)
  if ((account as any).kycStatus === "VERIFIED") score += 10;
  if ((account as any).nrcNumber) score += 5;
  if ((account as any).monthlyIncome && (account as any).monthlyIncome > 0) score += 8;
  if ((account as any).employer) score += 5;
  score += Math.min(7, accountAgeMonths);        // Account age (up to 7)
  if ((account as any).isBlacklisted) score = Math.max(0, score - 50);

  score = Math.min(100, Math.max(0, score));

  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
  const band = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : score >= 35 ? "Poor" : "Very Poor";
  const color = score >= 80 ? "emerald" : score >= 65 ? "blue" : score >= 50 ? "amber" : score >= 35 ? "orange" : "red";

  await prisma.clientPortalAccount.update({
    where: { id: req.params.id },
    data: { creditScore: score, creditScoreUpdatedAt: new Date() },
  });

  res.json({ score, grade, band, color, total, disbursed, rejected, accountAgeMonths });
}));

// ── NEXT OF KIN ALERT ─────────────────────────────────────────────────────────

// POST /api/admin/portal-accounts/:id/nok-alert — trigger NOK emergency SMS alert
router.post("/portal-accounts/:id/nok-alert", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const account = await prisma.clientPortalAccount.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, firstName: true, lastName: true, clientNumber: true,
      nextOfKinName: true, nextOfKinPhone: true, nextOfKinRelation: true,
      portalLoans: {
        where: { status: "DISBURSED" },
        select: { reference: true, amountRequested: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    } as any,
  });
  if (!account) return res.status(404).json({ error: "Account not found" });
  const acc = account as any;
  if (!acc.nextOfKinPhone) return res.status(400).json({ error: "No next of kin phone on file" });

  const loan = acc.portalLoans?.[0];
  const message = `Dear ${acc.nextOfKinName || "Sir/Madam"}, this is Philix Finance. Your ${acc.nextOfKinRelation || "family member"} ${acc.firstName} ${acc.lastName} (${acc.clientNumber}) has an overdue loan of K${loan?.amountRequested?.toLocaleString() ?? "unknown"}. Please advise them to contact us urgently at +260-XXX-XXXXXX. Reference: ${loan?.reference ?? "N/A"}.`;

  // Log the alert — in production wire this to an SMS gateway (e.g. Airtel API, SMS247.net)
  console.log(`[NOK ALERT] To: ${acc.nextOfKinPhone} | Message: ${message}`);
  await prisma.clientNotification.create({
    data: {
      accountId: req.params.id,
      subject: "⚠️ NOK Alert Sent",
      body: `An emergency alert was sent to your next of kin (${acc.nextOfKinName}, ${acc.nextOfKinPhone}) by ${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}.`,
      category: "ALERT",
    },
  }).catch(() => {});

  res.json({
    success: true,
    sentTo: acc.nextOfKinPhone,
    name: acc.nextOfKinName,
    relation: acc.nextOfKinRelation,
    message,
  });
}));

// ── BRANCH LEADERBOARD ────────────────────────────────────────────────────────

// GET /api/admin/stats/branch-leaderboard — branch performance comparison
router.get("/stats/branch-leaderboard", wrap(async (_req: Request, res: Response) => {
  const BRANCHES = ["UNZA", "CBU", "UNILUS"];

  // Get all staff users (loan officers) with their branch and review activity
  const [staffUsers, allLoans] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, branchId: true, role: true },
      where: { status: "ACTIVE" },
    }),
    prisma.portalLoanApplication.findMany({
      select: {
        status: true, amountRequested: true, reviewedBy: true, createdAt: true,
        paymentSubmissions: {
          where: { status: "APPROVED" },
          select: { amount: true },
        },
      },
    } as any),
  ]);

  // Map staff to branches
  const staffByBranch: Record<string, typeof staffUsers> = {};
  for (const b of BRANCHES) staffByBranch[b] = [];
  staffByBranch["OTHER"] = [];
  for (const s of staffUsers) {
    const b = s.branchId ?? "OTHER";
    if (!(b in staffByBranch)) staffByBranch[b] = [];
    staffByBranch[b].push(s);
  }

  // Compute metrics per branch
  const leaderboard = BRANCHES.map(branch => {
    const officers = staffByBranch[branch] ?? [];
    const officerIds = officers.map((o: { id: string }) => o.id);

    const branchLoans = (allLoans as any[]).filter(l => officerIds.includes(l.reviewedBy));
    const disbursed = branchLoans.filter(l => l.status === "DISBURSED");
    const active = branchLoans.filter(l => ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"].includes(l.status));

    const totalDisbursed = disbursed.reduce((s: number, l: any) => s + l.amountRequested, 0);
    const totalCollected = (allLoans as any[]).reduce((s: number, l: any) => {
      return s + (l.paymentSubmissions ?? []).reduce((ps: number, p: any) => ps + (p.amount ?? 0), 0);
    }, 0);
    const collectionRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;

    // PAR = loans with no payment submissions that are disbursed / total disbursed
    const loansWithPayments = disbursed.filter((l: any) => (l.paymentSubmissions ?? []).length > 0).length;
    const parRate = disbursed.length > 0 ? Math.round(((disbursed.length - loansWithPayments) / disbursed.length) * 100) : 0;

    return {
      branch,
      officers: officers.length,
      totalDisbursed,
      activeLoans: active.length,
      disbursedCount: disbursed.length,
      collectionRate,
      parRate,
      score: Math.max(0, collectionRate - parRate),
    };
  });

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.forEach((b, i) => (b as any).rank = i + 1);

  res.json(leaderboard);
}));

// ── LOAN OFFICER TARGETS ──────────────────────────────────────────────────────

// GET /api/admin/targets — get all targets (optionally filtered by month)
router.get("/targets", wrap(async (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  const currentMonth = month ?? new Date().toISOString().slice(0, 7);

  const [targets, staff] = await Promise.all([
    (prisma as any).loanOfficerTarget.findMany({
      where: { month: currentMonth },
      orderBy: { setAt: "desc" },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["LOAN_OFFICER", "COLLECTIONS_OFFICER", "MANAGER"] } },
      select: { id: true, firstName: true, lastName: true, role: true, branchId: true },
    }),
  ]);

  // Compute actuals from this month's loan activity
  const monthStart = new Date(`${currentMonth}-01`);
  const monthEnd   = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const monthlyLoans = await prisma.portalLoanApplication.findMany({
    where: {
      reviewedAt: { gte: monthStart, lt: monthEnd },
      reviewedBy: { not: null },
    },
    select: { status: true, amountRequested: true, reviewedBy: true, paymentSubmissions: {
      where: { status: "APPROVED" }, select: { amount: true },
    } } as any,
  });

  const actuals: Record<string, { disbursed: number; collected: number; loans: number }> = {};
  for (const loan of monthlyLoans as any[]) {
    const oid = loan.reviewedBy;
    if (!oid) continue;
    if (!actuals[oid]) actuals[oid] = { disbursed: 0, collected: 0, loans: 0 };
    if (loan.status === "DISBURSED") {
      actuals[oid].disbursed += loan.amountRequested;
      actuals[oid].loans += 1;
    }
    actuals[oid].collected += (loan.paymentSubmissions ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
  }

  const result = staff.map((s: { id: string; firstName: string; lastName: string; role: string; branchId: string | null }) => {
    const target = targets.find((t: any) => t.userId === s.id);
    const actual = actuals[s.id] ?? { disbursed: 0, collected: 0, loans: 0 };
    return {
      userId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      role: s.role,
      branchId: s.branchId,
      month: currentMonth,
      disbursementTarget: target?.disbursementTarget ?? 0,
      collectionTarget: target?.collectionTarget ?? 0,
      loansTarget: target?.loansTarget ?? 0,
      disbursementActual: actual.disbursed,
      collectionActual: actual.collected,
      loansActual: actual.loans,
      disbursementPct: target?.disbursementTarget > 0 ? Math.round((actual.disbursed / target.disbursementTarget) * 100) : 0,
      collectionPct: target?.collectionTarget > 0 ? Math.round((actual.collected / target.collectionTarget) * 100) : 0,
      loansPct: target?.loansTarget > 0 ? Math.round((actual.loans / target.loansTarget) * 100) : 0,
      targetId: target?.id ?? null,
    };
  });

  res.json({ month: currentMonth, officers: result });
}));

// POST /api/admin/targets — create or update a target for an officer
router.post("/targets", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["SUPER_ADMIN", "MANAGER"].includes(user.role)) {
    return res.status(403).json({ error: "Only CEO or Manager can set targets" });
  }
  const { userId, month, disbursementTarget, collectionTarget, loansTarget } = req.body as {
    userId: string; month: string; disbursementTarget: number; collectionTarget: number; loansTarget: number;
  };
  if (!userId || !month) return res.status(400).json({ error: "userId and month required" });

  const target = await (prisma as any).loanOfficerTarget.upsert({
    where: { userId_month: { userId, month } },
    update: { disbursementTarget, collectionTarget, loansTarget, setBy: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email, updatedAt: new Date() },
    create: { userId, month, disbursementTarget, collectionTarget, loansTarget, setBy: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email },
  });

  res.json(target);
}));

// ── REFERRAL DASHBOARD ────────────────────────────────────────────────────────

// GET /api/admin/referrals — referral programme stats
router.get("/referrals", wrap(async (_req: Request, res: Response) => {
  const accounts = await prisma.clientPortalAccount.findMany({
    select: {
      id: true, firstName: true, lastName: true, clientNumber: true,
      referredByCode: true, referralCode: true, referralCount: true,
      createdAt: true,
    },
  });

  // Build referral map: code → referrer
  const codeToReferrer: Record<string, (typeof accounts)[number]> = {};
  for (const acc of accounts) {
    if (acc.referralCode) codeToReferrer[acc.referralCode] = acc;
    // Fallback: derive code from client number (same formula as existing logic)
    const suffix = acc.clientNumber.replace(/\D/g, "").slice(-5);
    const derived = `PHX-${suffix || acc.clientNumber.slice(-5).toUpperCase()}`;
    if (!codeToReferrer[derived]) codeToReferrer[derived] = acc;
  }

  // Build referral chains
  const referralChains: { referrer: string; referrerId: string; referredName: string; referredId: string; joinedAt: string }[] = [];
  for (const acc of accounts) {
    if (acc.referredByCode) {
      const referrer = codeToReferrer[acc.referredByCode];
      if (referrer && referrer.id !== acc.id) {
        referralChains.push({
          referrer: `${referrer.firstName} ${referrer.lastName}`,
          referrerId: referrer.id,
          referredName: `${acc.firstName} ${acc.lastName}`,
          referredId: acc.id,
          joinedAt: acc.createdAt.toISOString(),
        });
      }
    }
  }

  // Top referrers
  const referrerCounts: Record<string, { id: string; name: string; count: number }> = {};
  for (const chain of referralChains) {
    if (!referrerCounts[chain.referrerId]) {
      referrerCounts[chain.referrerId] = { id: chain.referrerId, name: chain.referrer, count: 0 };
    }
    referrerCounts[chain.referrerId].count++;
  }
  const topReferrers = Object.values(referrerCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((r, i) => ({ rank: i + 1, ...r }));

  res.json({
    totalReferrals: referralChains.length,
    uniqueReferrers: topReferrers.length,
    chains: referralChains.slice(0, 100),
    topReferrers,
  });
}));

// ── MONTHLY STATEMENT EMAIL ───────────────────────────────────────────────────

// POST /api/admin/send-statements — send monthly statements to all active clients
router.post("/send-statements", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!["SUPER_ADMIN", "MANAGER", "ACCOUNTANT"].includes(user.role)) {
    return res.status(403).json({ error: "Insufficient permission" });
  }
  const { month } = req.body as { month?: string };
  const stmtMonth = month ?? new Date().toISOString().slice(0, 7);
  const [year, mo] = stmtMonth.split("-").map(Number);
  const monthName = new Date(year, mo - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });

  const accounts = await prisma.clientPortalAccount.findMany({
    where: { status: "ACTIVE" },
    include: {
      portalLoans: {
        where: { status: "DISBURSED" },
        select: { reference: true, amountRequested: true, termMonths: true, interestRate: true, productType: true },
        take: 5,
      },
    },
  });

  let sent = 0;
  for (const acc of accounts) {
    const acc2 = acc as any;
    if (!acc2.portalLoans?.length) continue;
    // Create in-app notification as the statement delivery mechanism
    await prisma.clientNotification.create({
      data: {
        accountId: acc.id,
        subject: `📄 Your Philix Finance Statement — ${monthName}`,
        body: `Dear ${acc.firstName},\n\nYour monthly account statement for ${monthName} is ready. You currently have ${acc2.portalLoans.length} active loan(s) totalling K${acc2.portalLoans.reduce((s: number, l: any) => s + l.amountRequested, 0).toLocaleString()}.\n\nLog in to your portal at philixfinance.zm to view full details, payment history, and download your statement.\n\nThank you for banking with Philix Finance.`,
        category: "STATEMENT",
      },
    });
    sent++;
  }

  res.json({ success: true, sent, month: stmtMonth });
}));

// ── EMAIL MANAGEMENT ─────────────────────────────────────────────────────────

// GET /api/admin/email-logs — paginated email history
router.get("/email-logs", wrap(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const status    = req.query.status    as string | undefined;
  const category  = req.query.category  as string | undefined;
  const search    = req.query.search    as string | undefined;

  const where: Record<string, unknown> = {};
  if (status)   where.status   = status;
  if (category) where.template = category;
  if (search)   where.to = { contains: search };

  const [logs, total] = await Promise.all([
    (prisma as any).emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma as any).emailLog.count({ where }),
  ]);

  res.json({ logs, total, page, pages: Math.ceil(total / limit) });
}));

// POST /api/admin/email-logs/:id/resend — resend a failed email
router.post("/email-logs/:id/resend", wrap(async (req: Request, res: Response) => {
  const log = await (prisma as any).emailLog.findUnique({ where: { id: req.params.id } });
  if (!log) return res.status(404).json({ error: "Log not found" });

  const result = await sendEmail({
    to: log.to, toName: log.toName,
    subject: `[Resend] ${log.subject}`,
    body: log.body || "(no content)",
    category: log.template,
    portalAccountId: log.accountId,
  });

  res.json({ ok: result.ok });
}));

// GET /api/admin/email-stats — summary counters
router.get("/email-stats", wrap(async (_req: Request, res: Response) => {
  const since30d = new Date(Date.now() - 30 * 86400000);
  const [total, sent, failed, last24h] = await Promise.all([
    (prisma as any).emailLog.count(),
    (prisma as any).emailLog.count({ where: { status: "SENT" } }),
    (prisma as any).emailLog.count({ where: { status: "FAILED" } }),
    (prisma as any).emailLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
  ]);
  const byCategory = await (prisma as any).emailLog.groupBy({
    by: ["template"],
    _count: { id: true },
    where: { createdAt: { gte: since30d } },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  });
  res.json({ total, sent, failed, last24h, byCategory });
}));

// GET /api/admin/email-campaigns — list campaigns
router.get("/email-campaigns", wrap(async (_req: Request, res: Response) => {
  const campaigns = await (prisma as any).emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(campaigns);
}));

// POST /api/admin/email-campaigns — create and send bulk campaign
router.post("/email-campaigns", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, subject, htmlBody, text, targetGroup } = req.body as {
    name: string; subject: string; htmlBody?: string; text: string; targetGroup: string;
  };
  if (!name || !subject || !text) return res.status(400).json({ error: "name, subject, and text are required" });

  const GROUPS: Record<string, Record<string, unknown>> = {
    ALL:     {},
    ACTIVE:  { portalLoans: { some: { status: "DISBURSED" } } },
    REPAID:  { portalLoans: { some: { status: "REPAID" } }, NOT: { portalLoans: { some: { status: "DISBURSED" } } } },
    PENDING: { portalLoans: { some: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } } } },
  };
  const where = GROUPS[targetGroup] ?? {};

  const accounts = await prisma.clientPortalAccount.findMany({
    where: where as any,
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const campaign = await (prisma as any).emailCampaign.create({
    data: {
      name, subject,
      htmlBody: htmlBody || text,
      targetGroup: targetGroup || "ALL",
      status: "SENDING",
      createdBy: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
    },
  });

  // Fire off bulk send in background
  setImmediate(async () => {
    const recipients = accounts.map((a: { id: string; email: string; firstName: string; lastName: string }) => ({
      email: a.email, name: `${a.firstName} ${a.lastName}`, accountId: a.id,
    }));
    const { sent, failed } = await Mailer.bulk(recipients, subject, htmlBody || text, text);
    await (prisma as any).emailCampaign.update({
      where: { id: campaign.id },
      data: { status: failed === recipients.length ? "FAILED" : "SENT", sentAt: new Date(), totalSent: sent, totalFailed: failed },
    });
  });

  res.status(201).json({ ...campaign, totalRecipients: accounts.length });
}));

// POST /api/admin/send-client-email — compose & send a direct email to one client
router.post("/send-client-email", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const parsed = sendClientEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { accountId, subject, body, loanRef, loanId } = parsed.data;

  const account = await prisma.clientPortalAccount.findUnique({
    where: { id: accountId },
    select: { id: true, email: true, firstName: true, lastName: true, clientNumber: true },
  });
  if (!account) return res.status(404).json({ error: "Client not found" });

  const senderName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email;

  // Build a clean branded HTML body
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const loanBanner = loanRef
    ? `<div style="background:#0f172a;border-left:4px solid #C9A84C;padding:10px 16px;border-radius:4px;margin-bottom:20px;">
         <div style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:1px;">LOAN REFERENCE</div>
         <div style="color:#e2e8f0;font-size:15px;font-weight:700;font-family:'Courier New',monospace;margin-top:2px;">${loanRef}</div>
       </div>`
    : "";

  const htmlBody = `
<div style="text-align:center;padding:8px 0 24px;">
  <div style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:1.5px;padding:5px 14px;border-radius:20px;">PHILIX FINANCE — DIRECT MESSAGE</div>
  <h2 style="color:#f8fafc;font-size:20px;font-weight:800;margin:16px 0 4px;">Dear ${account.firstName},</h2>
  <p style="color:#64748b;font-size:12px;margin:0;">${account.clientNumber}</p>
</div>
${loanBanner}
<div style="background:#0f172a;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
  <p style="color:#cbd5e1;font-size:14px;line-height:1.9;margin:0;">${escapedBody}</p>
</div>
<div style="border-top:1px solid #1e293b;padding-top:16px;margin-top:4px;">
  <p style="color:#475569;font-size:12px;margin:0 0 4px;">This message was sent by <strong style="color:#94a3b8;">${senderName}</strong> on behalf of Philix Finance Ltd.</p>
  <p style="color:#334155;font-size:11px;margin:0;">For queries, contact us at <a href="mailto:${process.env.COMPANY_EMAIL || "info@philixfinance.com"}" style="color:#6366f1;">${process.env.COMPANY_EMAIL || "info@philixfinance.com"}</a></p>
</div>`;

  const result = await sendEmail({
    to: account.email,
    toName: `${account.firstName} ${account.lastName}`,
    subject,
    body: body.replace(/\n/g, " "),
    category: "DIRECT",
    portalAccountId: account.id,
    loanId,
    htmlOverride: buildBaseHtml("DIRECT MESSAGE", htmlBody, account.email),
  });

  // Also create an in-app notification so client sees it in their portal
  await prisma.clientNotification.create({
    data: {
      accountId: account.id,
      subject,
      body: body.trim(),
      category: "GENERAL",
      sentViaEmail: result.ok,
    },
  });

  res.json({
    ok: result.ok,
    to: account.email,
    clientNumber: account.clientNumber,
    message: result.ok
      ? `Email sent to ${account.email}`
      : `Email queued (delivery may be delayed — check email logs)`,
  });
}));

// GET /api/admin/email-directory — searchable client email list
router.get("/email-directory", wrap(async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();
  const filter = (req.query.filter as string | undefined); // active | repaid | overdue

  const statusMap: Record<string, Record<string, unknown>> = {
    active:  { portalLoans: { some: { status: "DISBURSED" } } },
    repaid:  { portalLoans: { some: { status: "REPAID" } } },
    pending: { portalLoans: { some: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } } } },
  };

  const where: Record<string, unknown> = filter && statusMap[filter] ? statusMap[filter] : {};
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName:  { contains: search } },
      { email:     { contains: search } },
      { clientNumber: { contains: search } },
      { nrcNumber:    { contains: search } },
    ];
  }

  const accounts = await prisma.clientPortalAccount.findMany({
    where: where as any,
    select: {
      id: true, clientNumber: true, firstName: true, lastName: true,
      email: true, phone: true, status: true, emailVerified: true,
      lastLoginAt: true, createdAt: true,
      portalLoans: { select: { status: true, amountRequested: true }, orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  res.json(accounts);
}));

// ══════════════════════════════════════════════════════════════════════════════
// INVESTMENT PRODUCT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

const investmentProductSchema = z.object({
  name:         z.string().min(2).max(100).trim(),
  description:  z.string().max(500).trim().optional(),
  type:         z.enum(["FIXED_DEPOSIT", "SAVINGS", "MONEY_MARKET", "NOTICE"]),
  interestRate: z.number().min(0.1).max(100),
  minAmount:    z.number().positive().default(500),
  maxAmount:    z.number().positive().optional(),
  termMonths:   z.number().int().min(1),
  isActive:     z.boolean().default(true),
});

// GET /api/admin/investment-products
router.get("/investment-products", wrap(async (_req: Request, res: Response) => {
  const products = await (prisma as any).investmentProduct.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { investments: true } },
    },
  });
  res.json(products);
}));

// POST /api/admin/investment-products
router.post("/investment-products", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const parsed = investmentProductSchema.safeParse(req.body);
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const product = await (prisma as any).investmentProduct.create({
    data: { ...parsed.data, createdBy: `${user.firstName} ${user.lastName}` },
  });
  res.status(201).json(product);
}));

// PATCH /api/admin/investment-products/:id
router.patch("/investment-products/:id", wrap(async (req: Request, res: Response) => {
  const parsed = investmentProductSchema.partial().safeParse(req.body);
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const product = await (prisma as any).investmentProduct.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(product);
}));

// DELETE /api/admin/investment-products/:id — deactivates, not hard delete
router.delete("/investment-products/:id", wrap(async (req: Request, res: Response) => {
  const product = await (prisma as any).investmentProduct.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json(product);
}));

// ── INVESTMENT MANAGEMENT ─────────────────────────────────────────────────────

// GET /api/admin/investments
router.get("/investments", wrap(async (_req: Request, res: Response) => {
  const investments = await (prisma as any).clientInvestment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { firstName: true, lastName: true, clientNumber: true, email: true } },
      product: { select: { name: true, type: true, interestRate: true } },
    },
  });

  const totalInvested = investments
    .filter((i: any) => ["ACTIVE", "MATURED"].includes(i.status))
    .reduce((s: number, i: any) => s + i.amountInvested, 0);

  const pending = investments.filter((i: any) => i.status === "PENDING").length;
  const active  = investments.filter((i: any) => i.status === "ACTIVE").length;
  const matured = investments.filter((i: any) => i.status === "MATURED").length;

  res.json({ investments, summary: { totalInvested, pending, active, matured, total: investments.length } });
}));

// PATCH /api/admin/investments/:id — approve / activate / mature / cancel
router.patch("/investments/:id", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, notes } = req.body as { status: string; notes?: string };

  const allowed = ["PENDING", "ACTIVE", "MATURED", "WITHDRAWN", "CANCELLED"];
  if (!allowed.includes(status)) throw new Error(`Invalid status. Must be one of: ${allowed.join(", ")}`);

  const inv = await (prisma as any).clientInvestment.findUnique({
    where: { id: req.params.id },
    include: { account: true, product: true },
  });
  if (!inv) return res.status(404).json({ error: "Investment not found" });

  const update: Record<string, unknown> = { status };
  if (notes) update.notes = notes;

  if (status === "ACTIVE" && inv.status === "PENDING") {
    update.approvedBy = `${user.firstName} ${user.lastName}`;
    update.approvedAt = new Date();
    update.startDate  = new Date();
    const mat = new Date();
    mat.setMonth(mat.getMonth() + inv.termMonths);
    update.maturityDate = mat;
  }

  if (status === "MATURED") {
    update.actualReturn = inv.expectedReturn;
  }

  const updated = await (prisma as any).clientInvestment.update({
    where: { id: req.params.id },
    data: update,
    include: {
      account: { select: { firstName: true, lastName: true, clientNumber: true, email: true } },
      product: { select: { name: true, type: true } },
    },
  });

  // Notify the client
  const statusMessages: Record<string, string> = {
    ACTIVE:    `Your investment of K${inv.amountInvested.toLocaleString()} in ${inv.product.name} (ref: ${inv.reference}) has been approved and is now ACTIVE. It matures on ${new Date(updated.maturityDate).toLocaleDateString()}.`,
    MATURED:   `Congratulations! Your investment (ref: ${inv.reference}) has matured. Your return of K${inv.expectedReturn.toLocaleString("en-ZM", { minimumFractionDigits: 2 })} is now ready for withdrawal.`,
    WITHDRAWN: `Your investment (ref: ${inv.reference}) withdrawal has been processed. Thank you for investing with Philix Finance.`,
    CANCELLED: `Your investment request (ref: ${inv.reference}) has been cancelled. ${notes ? `Reason: ${notes}` : ""} Please contact us if you have questions.`,
  };

  if (statusMessages[status]) {
    await (prisma as any).clientNotification.create({
      data: {
        accountId: inv.accountId,
        subject: `Investment ${status.charAt(0) + status.slice(1).toLowerCase()}`,
        body: statusMessages[status],
        category: "INVESTMENT",
      },
    }).catch(() => {});
  }

  res.json(updated);
}));

// ═══════════════════════════════════════════════════════════════
// LOAN OFFICER TARGETS
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/targets?month=YYYY-MM  — targets + actuals for all officers
router.get("/targets", wrap(async (req: Request, res: Response) => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd   = new Date(y, m, 0, 23, 59, 59);

  const [officers, targets, actuals] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["LOAN_OFFICER", "MANAGER", "SUPER_ADMIN"] } },
      select: { id: true, firstName: true, lastName: true, role: true, employeeId: true },
    }),
    prisma.loanOfficerTarget.findMany({ where: { month } }),
    prisma.portalLoanApplication.groupBy({
      by: ["reviewedBy"],
      where: { status: { in: ["DISBURSED", "REPAID"] }, reviewedAt: { gte: monthStart, lte: monthEnd } },
      _count: { id: true },
      _sum: { amountRequested: true },
    }),
  ]);

  const targetMap = new Map(targets.map(t => [t.userId, t]));
  const actualMap = new Map((actuals as any[]).map((a: any) => [a.reviewedBy, a]));

  const result = officers.map(o => {
    const target = targetMap.get(o.id);
    const actual = actualMap.get(o.id) as any;
    const actualLoans = actual?._count?.id ?? 0;
    const actualDisbursed = actual?._sum?.amountRequested ?? 0;
    return {
      userId: o.id, employeeId: o.employeeId,
      name: `${o.firstName} ${o.lastName}`, role: o.role, month,
      target: target ? { id: target.id, disbursementTarget: target.disbursementTarget, collectionTarget: target.collectionTarget, loansTarget: target.loansTarget } : null,
      actual: { loansIssued: actualLoans, amountDisbursed: actualDisbursed },
      performance: target ? {
        disbursementPct: target.disbursementTarget > 0 ? Math.round((actualDisbursed / target.disbursementTarget) * 100) : null,
        loansPct: target.loansTarget > 0 ? Math.round((actualLoans / target.loansTarget) * 100) : null,
      } : null,
    };
  });

  res.json({ month, officers: result });
}));

// POST /api/admin/targets — upsert target for an officer/month
router.post("/targets", wrap(async (req: Request, res: Response) => {
  const { userId, month, disbursementTarget = 0, collectionTarget = 0, loansTarget = 0 } = req.body as {
    userId: string; month: string; disbursementTarget?: number; collectionTarget?: number; loansTarget?: number;
  };
  if (!userId || !month) return res.status(400).json({ error: "userId and month are required" });

  const user = (req as any).user;
  const setBy = user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email ?? "system";

  const target = await prisma.loanOfficerTarget.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, disbursementTarget, collectionTarget, loansTarget, setBy },
    update: { disbursementTarget, collectionTarget, loansTarget, setBy, updatedAt: new Date() },
  });
  res.json(target);
}));

// ═══════════════════════════════════════════════════════════════
// BULK EMAIL CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/campaigns — list all campaigns
router.get("/campaigns", wrap(async (_req: Request, res: Response) => {
  const campaigns = await prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  res.json(campaigns);
}));

// POST /api/admin/campaigns — create and optionally send bulk email campaign
router.post("/campaigns", wrap(async (req: Request, res: Response) => {
  const { name, subject, htmlBody, targetGroup, sendNow = false } = req.body as {
    name: string; subject: string; htmlBody: string;
    targetGroup: "ALL" | "ACTIVE" | "PENDING_KYC" | "DISBURSED";
    sendNow?: boolean;
  };
  if (!name || !subject || !htmlBody || !targetGroup) {
    return res.status(400).json({ error: "name, subject, htmlBody, and targetGroup are required" });
  }
  const user = (req as any).user;
  const createdBy = user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email ?? "system";

  let whereClause: Record<string, unknown> = {};
  if (targetGroup === "ACTIVE") whereClause = { status: "ACTIVE" };
  else if (targetGroup === "PENDING_KYC") whereClause = { status: "PENDING_KYC" };
  else if (targetGroup === "DISBURSED") {
    const ids = await prisma.portalLoanApplication.findMany({ where: { status: "DISBURSED" }, select: { accountId: true }, distinct: ["accountId"] });
    whereClause = { id: { in: ids.map(d => d.accountId) } };
  }

  const accounts = await prisma.clientPortalAccount.findMany({
    where: whereClause, select: { id: true, email: true, firstName: true, lastName: true },
  });

  let campaign = await prisma.emailCampaign.create({
    data: { name, subject, htmlBody, targetGroup, status: "DRAFT", createdBy },
  });

  if (!sendNow) return res.json({ campaign, recipientCount: accounts.length });

  let totalSent = 0, totalFailed = 0;
  for (const acc of accounts) {
    try {
      await sendEmail({
        to: acc.email, toName: `${acc.firstName} ${acc.lastName}`, subject,
        body: htmlBody.replace(/\{\{firstName\}\}/g, acc.firstName).replace(/\{\{lastName\}\}/g, acc.lastName),
        htmlOverride: htmlBody.replace(/\{\{firstName\}\}/g, acc.firstName).replace(/\{\{lastName\}\}/g, acc.lastName),
        portalAccountId: acc.id,
      });
      totalSent++;
    } catch { totalFailed++; }
  }

  campaign = await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: totalFailed === accounts.length && accounts.length > 0 ? "FAILED" : "SENT", sentAt: new Date(), totalSent, totalFailed },
  });
  res.json({ campaign, totalSent, totalFailed });
}));

// ── POST /api/admin/applications/:id/declare-default ──────────────────────────
// Marks a DISBURSED loan as in default. CEO/Manager only.
router.post("/applications/:id/declare-default", wrap(async (req: Request, res: Response) => {
  const { reason, notifyClient } = req.body as { reason?: string; notifyClient?: boolean };
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: "A reason for declaring default is required (min 5 characters)" });
  }

  const app = await (prisma as any).portalLoanApplication.findUnique({
    where: { id: req.params.id },
    include: { account: { select: { firstName: true, lastName: true, email: true, phone: true } } },
  });
  if (!app) return res.status(404).json({ error: "Loan application not found" });
  if (app.status !== "DISBURSED") return res.status(400).json({ error: "Only DISBURSED loans can be declared in default" });

  const updated = await (prisma as any).portalLoanApplication.update({
    where: { id: req.params.id },
    data: {
      status: "OVERDUE",
      rejectedReason: `DEFAULT DECLARED: ${reason.trim()}`,
      updatedAt: new Date(),
    },
  });

  // Optionally send overdue notice email
  if (notifyClient && app.account?.email) {
    try {
      await sendEmail({
        to: app.account.email,
        toName: `${app.account.firstName} ${app.account.lastName}`,
        subject: "Important Notice: Loan Default Declaration — Philix Finance",
        body: `Dear ${app.account.firstName},\n\nThis is to inform you that your loan (Ref: ${app.reference}) has been declared in default.\n\nReason: ${reason}\n\nPlease contact us immediately to discuss a repayment plan.\n\nPhilix Finance Team`,
        portalAccountId: app.accountId,
      });
    } catch { /* non-fatal */ }
  }

  const staffUser = (req as any).user;
  try {
    await (prisma as any).auditLog?.create({
      data: {
        userId: staffUser?.id ?? "system",
        action: "DECLARE_DEFAULT",
        entity: "PortalLoanApplication",
        entityId: req.params.id,
        description: `Loan ${app.reference} declared in default. Reason: ${reason}`,
      },
    });
  } catch { /* audit is non-fatal */ }

  res.json({ ok: true, loan: updated });
}));

// ── POST /api/admin/applications/:id/lift-default ────────────────────────────
// Reverses a default declaration (sets status back to DISBURSED).
router.post("/applications/:id/lift-default", wrap(async (req: Request, res: Response) => {
  const app = await (prisma as any).portalLoanApplication.findUnique({ where: { id: req.params.id } });
  if (!app) return res.status(404).json({ error: "Loan not found" });
  if (app.status !== "OVERDUE") return res.status(400).json({ error: "Loan is not currently in default status" });

  const updated = await (prisma as any).portalLoanApplication.update({
    where: { id: req.params.id },
    data: { status: "DISBURSED", rejectedReason: null },
  });
  res.json({ ok: true, loan: updated });
}));

// ── PATCH /api/admin/applications/:id/change-duration ─────────────────────────
// Allows staff to change the loan term (duration in weeks) for an active loan.
router.patch("/applications/:id/change-duration", wrap(async (req: Request, res: Response) => {
  const { termMonths, reason } = req.body as { termMonths?: number; reason?: string };
  if (!termMonths || termMonths < 1 || termMonths > 52) {
    return res.status(400).json({ error: "Duration must be between 1 and 52 weeks" });
  }
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: "Reason is required (min 5 characters)" });
  }
  const app = await (prisma as any).portalLoanApplication.findUnique({ where: { id: req.params.id } });
  if (!app) return res.status(404).json({ error: "Loan not found" });
  if (!["DISBURSED", "APPROVED"].includes(app.status)) {
    return res.status(400).json({ error: "Can only change duration on active (DISBURSED/APPROVED) loans" });
  }

  const staffUser = (req as any).user;
  const updated = await (prisma as any).portalLoanApplication.update({
    where: { id: req.params.id },
    data: {
      termMonths,
      rejectedReason: `DURATION CHANGED: ${reason} (by ${staffUser?.firstName ?? "Staff"} ${staffUser?.lastName ?? ""})`,
    },
  });

  // Audit log
  try {
    await (prisma as any).auditLog.create({
      data: {
        action: "LOAN_DURATION_CHANGED",
        resource: "PortalLoanApplication",
        resourceId: req.params.id,
        userId: staffUser?.id ?? "system",
        details: JSON.stringify({ from: app.termMonths, to: termMonths, reason }),
      },
    });
  } catch { /* audit log optional */ }

  res.json({ ok: true, loan: updated, newDuration: termMonths });
}));

// ── POST /api/admin/send-payment-reminders — bulk email clients due this week ──
router.post("/send-payment-reminders", wrap(async (req: Request, res: Response) => {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const GRACE_DAYS = 3;

  // Get all disbursed loans that have a maturity date in the next 7 days OR already overdue
  const loans = await (prisma as any).portalLoanApplication.findMany({
    where: { status: "DISBURSED" },
    include: {
      account: { select: { id: true, firstName: true, lastName: true, email: true, clientNumber: true } },
    },
  });

  const toRemind: { name: string; email: string; ref: string; dueDate: string; amount: number; isOverdue: boolean }[] = [];

  for (const loan of loans) {
    if (!loan.maturityDate || !loan.account?.email) continue;
    const maturity = new Date(loan.maturityDate);
    const daysUntilDue = Math.floor((maturity.getTime() - now.getTime()) / 86400000);
    const outstanding = (loan.totalDue ?? loan.amountRequested) - (loan.totalPaid ?? 0);
    if (outstanding <= 0) continue; // fully paid

    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7;
    const isOverdue  = daysUntilDue < -GRACE_DAYS;

    if (isDueSoon || isOverdue) {
      toRemind.push({
        name: `${loan.account.firstName} ${loan.account.lastName}`,
        email: loan.account.email,
        ref: loan.reference,
        dueDate: maturity.toLocaleDateString("en-ZM", { day: "numeric", month: "long", year: "numeric" }),
        amount: outstanding,
        isOverdue,
      });
    }
  }

  let sent = 0;
  for (const r of toRemind) {
    const subject = r.isOverdue
      ? `⚠️ URGENT: Your loan ${r.ref} is overdue — Philix Finance`
      : `📅 Payment reminder: ${r.ref} due ${r.dueDate} — Philix Finance`;

    const body = r.isOverdue
      ? `<p>Dear <strong>${r.name}</strong>,</p>
         <p>Your loan <strong>${r.ref}</strong> has an outstanding balance of <strong>K${r.amount.toLocaleString()}</strong> which is now overdue.</p>
         <p>Penalties of <strong>2% per day</strong> are accruing on the outstanding balance. Please make payment immediately to stop further charges.</p>
         <p><strong>To pay:</strong> Visit any Philix Finance branch or call <strong>+260 777 158 901</strong></p>
         <p>If you have already made a payment, please submit your proof of payment through the Philix Finance client portal.</p>
         <p>Thank you for banking with Philix Finance.</p>`
      : `<p>Dear <strong>${r.name}</strong>,</p>
         <p>This is a friendly reminder that your loan <strong>${r.ref}</strong> has an outstanding balance of <strong>K${r.amount.toLocaleString()}</strong> due on <strong>${r.dueDate}</strong>.</p>
         <p>Please ensure payment is made on or before the due date to avoid a 2% daily penalty after the 3-day grace period.</p>
         <p><strong>To pay:</strong> Visit any Philix Finance branch, use mobile money, or call <strong>+260 777 158 901</strong></p>
         <p>Thank you — we appreciate your continued trust in Philix Finance.</p>`;

    try {
      await sendEmail({ to: r.email, subject, html: buildBaseHtml(subject, body) });
      sent++;
    } catch { /* log but continue */ }
  }

  res.json({
    ok: true,
    sent,
    total: toRemind.length,
    message: sent > 0
      ? `Payment reminders sent to ${sent} client${sent !== 1 ? "s" : ""} (${toRemind.filter(r => r.isOverdue).length} overdue, ${toRemind.filter(r => !r.isOverdue).length} due soon)`
      : toRemind.length === 0 ? "No clients are due this week — all clear!" : "No reminders sent (email delivery issue)",
  });
}));

// POST /api/admin/clients — CEO creates a client portal account directly
router.post("/clients", wrap(async (req: Request, res: Response) => {
  // @ts-ignore
  const user = req.user as { role: string };
  if (user?.role !== "SUPER_ADMIN") return res.status(403).json({ error: "CEO only" });

  const { firstName, lastName, email, phone, password } = req.body as {
    firstName: string; lastName: string; email: string; phone?: string; password: string;
  };

  if (!firstName || !email || !password || password.length < 8) {
    return res.status(400).json({ error: "First name, email, and password (min 8 chars) are required" });
  }

  const normalEmail = email.toLowerCase().trim();
  const existing = await prisma.clientPortalAccount.findUnique({ where: { email: normalEmail } });
  if (existing) return res.status(409).json({ error: "Email is already registered as a client" });

  const passwordHash = await bcrypt.hash(password, 12);
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const clientNumber = `PHX-C-${rand}`;

  const account = await prisma.clientPortalAccount.create({
    data: {
      firstName: firstName.trim(),
      lastName: (lastName || "").trim(),
      email: normalEmail,
      phone: phone || "",
      passwordHash,
      clientNumber,
      emailVerified: true,
      kycStatus: "VERIFIED",
      status: "ACTIVE",
    },
    select: { id: true, firstName: true, lastName: true, email: true, clientNumber: true },
  });

  res.status(201).json(account);
}));

export default router;
