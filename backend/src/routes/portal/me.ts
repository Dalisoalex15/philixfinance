import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { authenticatePortal } from "../../middleware/portalAuth";

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const router = Router();
router.use(authenticatePortal);

// GET /api/portal/me
router.get("/", wrap(async (req: Request, res: Response) => {
  const account = await prisma.clientPortalAccount.findUnique({
    where: { id: (req as Request & { portalAccountId: string }).portalAccountId },
    include: {
      kycDocuments: { select: { id: true, docType: true, uploadedAt: true } },
      notifications: { where: { isRead: false }, select: { id: true } },
      portalLoans: {
        select: { id: true, reference: true, status: true, amountRequested: true, productType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!account) throw new AppError("Account not found", 404);
  const { passwordHash, failedLoginCount, lockedUntil, ...safe } = account as Record<string, unknown>;
  res.json(safe);
}));

// PATCH /api/portal/me — update profile
router.patch("/", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const { phone, address, city, occupation, employer, monthlyIncome } = req.body;
  const account = await prisma.clientPortalAccount.update({
    where: { id },
    data: {
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(occupation !== undefined && { occupation }),
      ...(employer !== undefined && { employer }),
      ...(monthlyIncome !== undefined && { monthlyIncome: parseFloat(monthlyIncome) || null }),
    },
  });
  const { passwordHash, ...safe } = account as Record<string, unknown>;
  res.json(safe);
}));

// PATCH /api/portal/me/nok — update next-of-kin contact
router.patch("/nok", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const { nextOfKinName, nextOfKinPhone, nextOfKinRelation } = req.body;
  if (!nextOfKinName || !nextOfKinPhone) throw new AppError("Name and phone are required", 400);
  const account = await prisma.clientPortalAccount.update({
    where: { id },
    data: { nextOfKinName, nextOfKinPhone, nextOfKinRelation },
    select: { id: true, nextOfKinName: true, nextOfKinPhone: true, nextOfKinRelation: true },
  });
  res.json(account);
}));

// POST /api/portal/me/change-password
router.post("/change-password", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError("Both passwords required", 400);
  if (newPassword.length < 8) throw new AppError("New password too short", 400);

  const account = await prisma.clientPortalAccount.findUnique({ where: { id } });
  if (!account) throw new AppError("Not found", 404);

  const valid = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect", 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.clientPortalAccount.update({ where: { id }, data: { passwordHash } });
  res.json({ message: "Password updated" });
}));

// GET /api/portal/me/credit-score — compute + persist creditworthiness score
router.get("/credit-score", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const account = await prisma.clientPortalAccount.findUnique({
    where: { id },
    include: {
      portalLoans: {
        select: { id: true, status: true, amountRequested: true },
      },
      kycDocuments: { select: { id: true } },
    },
  });
  if (!account) throw new AppError("Account not found", 404);

  const kycVerified = account.kycStatus === "VERIFIED";
  const kycScore = kycVerified ? 25 : account.kycStatus === "PENDING" ? 5 : 0;

  const profileFields = [account.firstName, account.lastName, account.phone, account.address, account.city, account.occupation, account.employer, account.monthlyIncome];
  const filled = profileFields.filter(Boolean).length;
  const profileScore = Math.round((filled / profileFields.length) * 20);

  const disbursedApps = account.portalLoans.filter(a => ["DISBURSED", "REPAID"].includes(a.status));
  const rejectedApps = account.portalLoans.filter(a => a.status === "REJECTED");
  const totalApps = account.portalLoans.length;
  let historyScore = 30;
  if (totalApps === 0) historyScore = 10;
  else {
    const penalty = Math.min(30, rejectedApps.length * 10);
    historyScore = Math.max(0, 30 - penalty);
    if (disbursedApps.length > 0) historyScore = Math.min(30, historyScore + disbursedApps.length * 5);
  }

  const employScore = (account.employer || account.occupation ? 5 : 0) + (account.monthlyIncome ? 5 : 0);

  const ageDays = Math.floor((Date.now() - new Date(account.createdAt).getTime()) / 86400000);
  const ageScore = Math.min(10, Math.floor(ageDays / 10));

  const suffix = account.clientNumber.replace(/\D/g, "").slice(-5);
  const myCode = `PHX-${suffix || account.clientNumber.slice(-5).toUpperCase()}`;
  const referralCount = await prisma.clientPortalAccount.count({ where: { referredByCode: myCode } });
  const referralScore = Math.min(5, referralCount * 2);

  const totalScore = kycScore + profileScore + historyScore + employScore + ageScore + referralScore;

  await prisma.clientPortalAccount.update({ where: { id }, data: { creditScore: totalScore } });

  res.json({
    score: totalScore,
    factors: [
      { name: "KYC Verification", score: kycScore, max: 25,
        status: kycVerified ? "good" : account.kycStatus === "PENDING" ? "warn" : "bad",
        tip: kycVerified ? "Your identity is verified" : "Complete KYC to add 25 points",
        actionHref: !kycVerified ? "/portal/kyc" : null, actionLabel: "Verify Identity" },
      { name: "Repayment History", score: historyScore, max: 30,
        status: historyScore >= 20 ? "good" : historyScore >= 10 ? "warn" : "bad",
        tip: totalApps === 0 ? "No history yet — apply for your first loan"
          : disbursedApps.length > 0 && rejectedApps.length === 0
          ? `${disbursedApps.length} successful loan(s) — great track record`
          : `${rejectedApps.length} rejection(s) affecting your score` },
      { name: "Profile Completeness", score: profileScore, max: 20,
        status: profileScore >= 15 ? "good" : profileScore >= 10 ? "warn" : "bad",
        tip: profileScore < 20 ? `${filled}/${profileFields.length} fields complete — fill your profile for more points` : "Profile fully complete",
        actionHref: profileScore < 20 ? "/portal/profile" : null, actionLabel: "Complete Profile" },
      { name: "Employment & Income", score: employScore, max: 10,
        status: employScore >= 8 ? "good" : employScore >= 5 ? "warn" : "bad",
        tip: employScore === 10 ? "Employment and income on file" : "Add employer and monthly income in your profile",
        actionHref: employScore < 10 ? "/portal/profile" : null, actionLabel: "Add Employment" },
      { name: "Account Age", score: ageScore, max: 10,
        status: ageScore >= 8 ? "good" : ageScore >= 4 ? "warn" : "bad",
        tip: ageScore === 10 ? "Established account" : `Account is ${ageDays} days old — score grows over time` },
      { name: "Referrals", score: referralScore, max: 5,
        status: referralScore >= 4 ? "good" : referralScore >= 2 ? "warn" : "bad",
        tip: referralCount > 0 ? `${referralCount} friend(s) referred — keep sharing your code` : "Refer friends to earn up to 5 points",
        actionHref: referralScore < 5 ? "/portal/referral" : null, actionLabel: "Share Code" },
    ],
    accountAgeDays: ageDays,
    referralCount,
    disbursedCount: disbursedApps.length,
    rejectedCount: rejectedApps.length,
    totalApps,
  });
}));

// GET /api/portal/me/referral — referral programme stats
router.get("/referral", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const account = await prisma.clientPortalAccount.findUnique({
    where: { id },
    select: { clientNumber: true, referredByCode: true },
  });
  if (!account) throw new AppError("Account not found", 404);

  // Derive referral code from client number (same formula as frontend)
  const suffix = account.clientNumber.replace(/\D/g, "").slice(-5);
  const myCode = `PHX-${suffix || account.clientNumber.slice(-5).toUpperCase()}`;

  // Count how many accounts used this code
  const referralCount = await prisma.clientPortalAccount.count({
    where: { referredByCode: myCode },
  });

  // Fetch brief info on referred accounts (name + join date only)
  const referred = await prisma.clientPortalAccount.findMany({
    where: { referredByCode: myCode },
    select: { firstName: true, lastName: true, createdAt: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({
    myCode,
    referralCount,
    wasReferred: !!account.referredByCode,
    referredByCode: account.referredByCode,
    referred: referred.map(r => ({
      name: `${r.firstName} ${r.lastName[0]}.`,
      joinedAt: r.createdAt,
      status: r.status,
    })),
  });
}));

export default router;
