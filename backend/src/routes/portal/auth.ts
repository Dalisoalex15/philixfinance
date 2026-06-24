import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { Mailer } from "../../lib/mailer";

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function genClientNumber(): string {
  return `PHX-C-${Math.floor(Math.random() * 90000) + 10000}`;
}

function genOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function genAccessToken(id: string, email: string) {
  return jwt.sign({ id, email, type: "client" }, process.env.JWT_SECRET!, { expiresIn: "4h" });
}

function genRefreshToken(id: string) {
  return jwt.sign({ id, type: "client_refresh" }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "30d" });
}

async function issueTokens(accountId: string, email: string) {
  const access  = genAccessToken(accountId, email);
  const refresh = genRefreshToken(accountId);
  await prisma.portalRefreshToken.create({
    data: { token: refresh, accountId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });
  return { accessToken: access, refreshToken: refresh };
}

function sanitize(a: Record<string, unknown>) {
  const { passwordHash, failedLoginCount, lockedUntil, ...safe } = a;
  return safe;
}

// ── POST /api/portal/auth/register ────────────────────────────────────────────
router.post("/register", wrap(async (req: Request, res: Response) => {
  const {
    firstName, lastName, email, phone, password,
    dateOfBirth, gender, address, city,
    occupation, employer, monthlyIncome, nrcNumber, referralCode,
  } = req.body as Record<string, string>;

  if (!firstName || !lastName || !email || !phone || !password)
    throw new AppError("Required fields missing", 400);
  if (password.length < 8)
    throw new AppError("Password must be at least 8 characters", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AppError("Invalid email address", 400);

  const existing = await prisma.clientPortalAccount.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  let clientNumber = genClientNumber();
  while (await prisma.clientPortalAccount.findUnique({ where: { clientNumber } })) {
    clientNumber = genClientNumber();
  }

  const account = await prisma.clientPortalAccount.create({
    data: {
      clientNumber,
      email: email.toLowerCase(),
      passwordHash,
      firstName, lastName, phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender, address, city, occupation, employer,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
      nrcNumber,
      status: "PENDING_KYC",
      kycStatus: "NOT_STARTED",
      emailVerified: false,
      referredByCode: referralCode ? referralCode.trim().toUpperCase() : null,
    },
  });

  // Generate + send OTP
  const otp = genOtp();
  await (prisma as any).otpVerification.create({
    data: {
      email: account.email,
      otp,
      type: "EMAIL_VERIFY",
      accountId: account.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  Mailer.otp(account.email, account.firstName, otp, "EMAIL_VERIFY").catch(() => {});

  // Welcome email (non-blocking, secondary to OTP)
  Mailer.welcome({ email: account.email, firstName: account.firstName, lastName: account.lastName, clientNumber: account.clientNumber, id: account.id }).catch(() => {});

  res.status(201).json({
    requiresVerification: true,
    email: account.email,
    message: "Account created. Please check your email for the verification code.",
  });
}));

// ── POST /api/portal/auth/verify-otp ─────────────────────────────────────────
router.post("/verify-otp", wrap(async (req: Request, res: Response) => {
  const { email, otp, type = "EMAIL_VERIFY" } = req.body;
  if (!email || !otp) throw new AppError("Email and OTP required", 400);

  const record = await (prisma as any).otpVerification.findFirst({
    where: { email: email.toLowerCase(), type, verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new AppError("No pending verification found", 404);

  if (record.attempts >= 5) throw new AppError("Too many attempts. Please request a new code.", 429);

  if (new Date() > new Date(record.expiresAt)) {
    throw new AppError("Verification code has expired. Please request a new one.", 410);
  }

  if (record.otp !== String(otp)) {
    await (prisma as any).otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = 5 - record.attempts - 1;
    throw new AppError(`Invalid code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`, 400);
  }

  // Mark OTP verified
  await (prisma as any).otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  if (type === "EMAIL_VERIFY" && record.accountId) {
    // Activate account
    await prisma.clientPortalAccount.update({
      where: { id: record.accountId },
      data: { emailVerified: true },
    });
    const account = await prisma.clientPortalAccount.findUnique({ where: { id: record.accountId } });
    if (!account) throw new AppError("Account not found", 404);

    const tokens = await issueTokens(account.id, account.email);
    return res.json({ ...tokens, account: sanitize(account as any) });
  }

  // For PASSWORD_RESET: return a short-lived reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  res.json({ resetToken, email: email.toLowerCase(), message: "OTP verified. Proceed to reset password." });
}));

// ── POST /api/portal/auth/resend-otp ─────────────────────────────────────────
router.post("/resend-otp", wrap(async (req: Request, res: Response) => {
  const { email, type = "EMAIL_VERIFY" } = req.body;
  if (!email) throw new AppError("Email required", 400);

  const account = await prisma.clientPortalAccount.findUnique({ where: { email: email.toLowerCase() } });
  if (!account) throw new AppError("Account not found", 404);

  if (type === "EMAIL_VERIFY" && account.emailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  // Expire old OTPs
  await (prisma as any).otpVerification.updateMany({
    where: { email: email.toLowerCase(), type, verified: false },
    data: { expiresAt: new Date() },
  });

  const otp = genOtp();
  await (prisma as any).otpVerification.create({
    data: {
      email: account.email,
      otp,
      type,
      accountId: account.id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await Mailer.otp(account.email, account.firstName, otp, type as any);

  res.json({ message: "New verification code sent. Please check your email." });
}));

// ── POST /api/portal/auth/forgot-password ─────────────────────────────────────
router.post("/forgot-password", wrap(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError("Email required", 400);

  const account = await prisma.clientPortalAccount.findUnique({ where: { email: email.toLowerCase() } });

  // Always respond success to avoid email enumeration
  if (account) {
    await (prisma as any).otpVerification.updateMany({
      where: { email: email.toLowerCase(), type: "PASSWORD_RESET", verified: false },
      data: { expiresAt: new Date() },
    });

    const otp = genOtp();
    await (prisma as any).otpVerification.create({
      data: {
        email: account.email,
        otp,
        type: "PASSWORD_RESET",
        accountId: account.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    Mailer.otp(account.email, account.firstName, otp, "PASSWORD_RESET").catch(() => {});
  }

  res.json({ message: "If an account with that email exists, a reset code has been sent." });
}));

// ── POST /api/portal/auth/reset-password ──────────────────────────────────────
router.post("/reset-password", wrap(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) throw new AppError("Email, OTP, and new password required", 400);
  if (newPassword.length < 8) throw new AppError("Password must be at least 8 characters", 400);

  const record = await (prisma as any).otpVerification.findFirst({
    where: { email: email.toLowerCase(), type: "PASSWORD_RESET", verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.attempts >= 5 || new Date() > new Date(record.expiresAt))
    throw new AppError("Invalid or expired reset code", 400);

  if (record.otp !== String(otp)) {
    await (prisma as any).otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError("Invalid verification code", 400);
  }

  await (prisma as any).otpVerification.update({ where: { id: record.id }, data: { verified: true } });

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.clientPortalAccount.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash: hash, failedLoginCount: 0, lockedUntil: null },
  });

  res.json({ message: "Password reset successfully. Please log in." });
}));

// ── POST /api/portal/auth/login ───────────────────────────────────────────────
router.post("/login", wrap(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Email and password required", 400);

  const account = await prisma.clientPortalAccount.findUnique({ where: { email: email.toLowerCase() } });
  if (!account) {
    await new Promise(r => setTimeout(r, 300));
    throw new AppError("Invalid email or password", 401);
  }

  if (account.lockedUntil && account.lockedUntil > new Date())
    throw new AppError("Account temporarily locked. Try again later.", 423);
  if (account.status === "SUSPENDED") throw new AppError("Account is suspended", 403);
  if (account.status === "BLACKLISTED") throw new AppError("Account is blacklisted", 403);

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    const fails = account.failedLoginCount + 1;
    await prisma.clientPortalAccount.update({
      where: { id: account.id },
      data: {
        failedLoginCount: fails,
        lockedUntil: fails >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null,
      },
    });
    throw new AppError("Invalid email or password", 401);
  }

  await prisma.clientPortalAccount.update({
    where: { id: account.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(account.id, account.email);
  res.json({ ...tokens, account: sanitize(account as any) });
}));

// ── POST /api/portal/auth/refresh ─────────────────────────────────────────────
router.post("/refresh", wrap(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError("Refresh token required", 400);

  const stored = await prisma.portalRefreshToken.findUnique({
    where: { token: refreshToken },
    include: { account: true },
  });
  if (!stored || stored.expiresAt < new Date()) throw new AppError("Invalid or expired refresh token", 401);

  const accessToken = genAccessToken(stored.account.id, stored.account.email);
  res.json({ accessToken, account: sanitize(stored.account as any) });
}));

// ── POST /api/portal/auth/logout ──────────────────────────────────────────────
router.post("/logout", wrap(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.portalRefreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }
  res.json({ message: "Logged out" });
}));

export default router;
