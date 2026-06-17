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
  ] = await Promise.all([
    prisma.clientPortalAccount.count(),
    prisma.portalLoanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.portalLoanApplication.count({ where: { status: "APPROVED", reviewedAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.portalLoanApplication.count(),
  ]);

  res.json({
    totalPortalAccounts: totalAccounts,
    pendingApplications,
    approvedToday,
    submittedToday,
    totalApplications,
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

export default router;
