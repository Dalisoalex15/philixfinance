import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

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

  const [
    totalAccounts,
    pendingApplications,
    approvedToday,
    submittedToday,
    totalApplications,
    disbursedAgg,
    activeAgg,
  ] = await Promise.all([
    prisma.clientPortalAccount.count(),
    prisma.portalLoanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.portalLoanApplication.count({ where: { status: "APPROVED", reviewedAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count(),
    prisma.portalLoanApplication.aggregate({ _sum: { amountRequested: true }, where: { status: "DISBURSED" } }),
    prisma.portalLoanApplication.aggregate({ _sum: { amountRequested: true }, where: { status: { in: ["APPROVED", "DISBURSED"] } } }),
  ]);

  res.json({
    totalPortalAccounts: totalAccounts,
    pendingApplications,
    approvedToday,
    submittedToday,
    totalApplications,
    totalDisbursedAmount: disbursedAgg._sum.amountRequested ?? 0,
    totalLoanedOut: activeAgg._sum.amountRequested ?? 0,
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
      kycDocuments: { select: { id: true, docType: true, uploadedAt: true } },
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

export default router;
