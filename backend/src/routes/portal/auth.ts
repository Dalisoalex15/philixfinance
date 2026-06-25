import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { Mailer } from "../../lib/mailer";

// ── Zod schemas ───────────────────────────────────────────────────────────────
const registerSchema = z.object({
  firstName:          z.string().min(1).max(60).trim(),
  lastName:           z.string().min(1).max(60).trim(),
  email:              z.string().email().max(200).toLowerCase(),
  phone:              z.string().min(9).max(20).regex(/^[+\d\s()-]+$/, "Invalid phone format"),
  password:           z.string().min(8).max(128),
  emailProofToken:    z.string().min(1, "Email must be verified before registration"),
  dateOfBirth:        z.string().optional(),
  gender:             z.enum(["MALE", "FEMALE"]).optional(),
  address:            z.string().max(300).optional(),
  city:               z.string().max(100).optional(),
  occupation:         z.string().max(100).optional(),
  employer:           z.string().max(200).optional(),
  monthlyIncome:      z.union([z.number().min(0), z.string()]).optional(),
  nrcNumber:          z.string().max(30).optional(),
  referralCode:       z.string().max(20).optional(),
});

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

const otpSchema = z.object({
  email: z.string().email().toLowerCase(),
  otp:   z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
  type:  z.enum(["EMAIL_VERIFY", "PASSWORD_RESET", "EMAIL_CHANGE"]).default("EMAIL_VERIFY"),
});

const emailOnlySchema = z.object({
  email: z.string().email().toLowerCase(),
  type:  z.enum(["EMAIL_VERIFY", "PASSWORD_RESET", "EMAIL_CHANGE"]).default("EMAIL_VERIFY"),
});

const resetPasswordSchema = z.object({
  email:       z.string().email().toLowerCase(),
  otp:         z.string().length(6).regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(128),
});

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

/**
 * Issue a short-lived proof token that proves the email was verified.
 * Signed with JWT_SECRET, expires in 30 minutes.
 */
function genEmailProofToken(email: string): string {
  return jwt.sign(
    { email, purpose: "email_precheck" },
    process.env.JWT_SECRET!,
    { expiresIn: "30m" },
  );
}

/**
 * Verify and decode an email proof token.
 * Returns the email it was issued for, or throws.
 */
function verifyEmailProofToken(token: string): string {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { email: string; purpose: string };
    if (payload.purpose !== "email_precheck") throw new Error("Wrong purpose");
    return payload.email;
  } catch {
    throw new AppError("Email verification token is invalid or expired. Please restart registration.", 400);
  }
}

// ── POST /api/portal/auth/send-email-code ─────────────────────────────────────
// Step 1 of registration: send OTP to the email before creating an account.
router.post("/send-email-code", wrap(async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email().toLowerCase() }).safeParse(req.body);
  if (!parsed.success) throw new AppError("A valid email address is required", 400);
  const { email } = parsed.data;

  // Tell the user if the email is already taken
  const existing = await prisma.clientPortalAccount.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) throw new AppError("An account with this email already exists. Please log in instead.", 409);

  // Expire any previous pre-check OTPs for this email
  await prisma.otpVerification.updateMany({
    where: { email, type: "EMAIL_PRECHECK", verified: false },
    data: { expiresAt: new Date() },
  });

  const otp = genOtp();
  await prisma.otpVerification.create({
    data: {
      email,
      otp,
      type: "EMAIL_PRECHECK",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // Race the email send against a 5s timeout — if email takes too long or fails,
  // include the code in the response so the user can always complete registration.
  const emailResult = await Promise.race([
    Mailer.otp(email, email.split("@")[0], otp, "EMAIL_VERIFY").catch(() => ({ ok: false as const })),
    new Promise<{ ok: false }>(r => setTimeout(() => r({ ok: false }), 2000)),
  ]);

  res.json({
    sent: true,
    message: emailResult.ok
      ? "Verification code sent. Please check your inbox."
      : "Could not send email — your code is shown below.",
    ...(!emailResult.ok ? { _devCode: otp } : {}),
  });
}));

// ── POST /api/portal/auth/confirm-email-code ──────────────────────────────────
// Step 2 of registration: verify the OTP, return an email proof token.
router.post("/confirm-email-code", wrap(async (req: Request, res: Response) => {
  const parsed = z.object({
    email: z.string().email().toLowerCase(),
    otp:   z.string().length(6).regex(/^\d{6}$/),
  }).safeParse(req.body);
  if (!parsed.success) throw new AppError("Email and 6-digit code required", 400);
  const { email, otp } = parsed.data;

  const record = await prisma.otpVerification.findFirst({
    where: { email, type: "EMAIL_PRECHECK", verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new AppError("No pending verification found. Please request a new code.", 404);
  if (record.attempts >= 5) throw new AppError("Too many incorrect attempts. Please request a new code.", 429);
  if (new Date() > new Date(record.expiresAt)) {
    throw new AppError("Code has expired. Please request a new one.", 410);
  }

  if (record.otp !== String(otp)) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = 4 - record.attempts;
    throw new AppError(
      `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
      400,
    );
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  // Issue a short-lived proof token the frontend will attach to the register call
  const emailProofToken = genEmailProofToken(email);

  res.json({
    verified: true,
    emailProofToken,
    message: "Email verified. You may now complete your registration.",
  });
}));

// ── POST /api/portal/auth/register ────────────────────────────────────────────
router.post("/register", wrap(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new AppError(`${first.path.join(".")}: ${first.message}`, 400);
  }
  const {
    firstName, lastName, email, phone, password,
    emailProofToken,
    dateOfBirth, gender, address, city,
    occupation, employer, monthlyIncome, nrcNumber, referralCode,
  } = parsed.data;

  // Validate the proof token and confirm it was issued for this email
  const provenEmail = verifyEmailProofToken(emailProofToken);
  if (provenEmail !== email) {
    throw new AppError("Email mismatch: the verified email does not match the registration email.", 400);
  }

  const existing = await prisma.clientPortalAccount.findUnique({ where: { email } });
  if (existing) throw new AppError("An account with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  let clientNumber = genClientNumber();
  while (await prisma.clientPortalAccount.findUnique({ where: { clientNumber } })) {
    clientNumber = genClientNumber();
  }

  // Account is created with emailVerified: true since we already confirmed it
  const account = await prisma.clientPortalAccount.create({
    data: {
      clientNumber,
      email,
      passwordHash,
      firstName, lastName, phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender, address, city, occupation, employer,
      monthlyIncome: monthlyIncome ? parseFloat(String(monthlyIncome)) : null,
      nrcNumber,
      status: "PENDING_KYC",
      kycStatus: "NOT_STARTED",
      emailVerified: true, // already confirmed by emailProofToken
      referredByCode: referralCode ? referralCode.trim().toUpperCase() : null,
    },
  });

  // Welcome email — fire and forget
  Mailer.welcome({
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    clientNumber: account.clientNumber,
    id: account.id,
  }).catch(() => {});

  // Issue tokens immediately — no second OTP step needed
  const tokens = await issueTokens(account.id, account.email);
  res.status(201).json({ ...tokens, account: sanitize(account as any) });
}));

// ── POST /api/portal/auth/verify-otp ─────────────────────────────────────────
// Kept for password-reset and any legacy flows
router.post("/verify-otp", wrap(async (req: Request, res: Response) => {
  const parsed = otpSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid request: " + parsed.error.errors[0].message, 400);
  const { email, otp, type } = parsed.data;

  const record = await (prisma as any).otpVerification.findFirst({
    where: { email, type, verified: false },
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

  await (prisma as any).otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  if (type === "EMAIL_VERIFY" && record.accountId) {
    await prisma.clientPortalAccount.update({
      where: { id: record.accountId },
      data: { emailVerified: true },
    });
    const account = await prisma.clientPortalAccount.findUnique({ where: { id: record.accountId } });
    if (!account) throw new AppError("Account not found", 404);
    const tokens = await issueTokens(account.id, account.email);
    return res.json({ ...tokens, account: sanitize(account as any) });
  }

  // PASSWORD_RESET: return verified flag so frontend can proceed to reset form
  res.json({ verified: true, email, message: "Code verified. Proceed to reset password." });
}));

// ── POST /api/portal/auth/resend-otp ─────────────────────────────────────────
router.post("/resend-otp", wrap(async (req: Request, res: Response) => {
  const parsed = emailOnlySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Valid email required", 400);
  const { email, type } = parsed.data;

  const account = await prisma.clientPortalAccount.findUnique({ where: { email } });
  if (!account) throw new AppError("Account not found", 404);

  if (type === "EMAIL_VERIFY" && account.emailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  await (prisma as any).otpVerification.updateMany({
    where: { email, type, verified: false },
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
  const parsed = z.object({ email: z.string().email().toLowerCase() }).safeParse(req.body);
  if (!parsed.success) throw new AppError("Valid email required", 400);
  const { email } = parsed.data;

  const account = await prisma.clientPortalAccount.findUnique({ where: { email } });

  if (account) {
    await (prisma as any).otpVerification.updateMany({
      where: { email, type: "PASSWORD_RESET", verified: false },
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
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid request: " + parsed.error.errors[0].message, 400);
  const { email, otp, newPassword } = parsed.data;

  const record = await (prisma as any).otpVerification.findFirst({
    where: { email, type: "PASSWORD_RESET", verified: false },
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
    where: { email },
    data: { passwordHash: hash, failedLoginCount: 0, lockedUntil: null },
  });

  res.json({ message: "Password reset successfully. Please log in." });
}));

// ── POST /api/portal/auth/login ───────────────────────────────────────────────
router.post("/login", wrap(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Email and password required", 400);
  const { email, password } = parsed.data;

  const account = await prisma.clientPortalAccount.findUnique({ where: { email } });
  if (!account) {
    await new Promise(r => setTimeout(r, 300));
    throw new AppError("Invalid email or password", 401);
  }

  if (account.lockedUntil && account.lockedUntil > new Date())
    throw new AppError("Account temporarily locked. Try again later.", 423);
  if (account.status === "SUSPENDED")  throw new AppError("Account is suspended", 403);
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
