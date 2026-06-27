// @ts-nocheck
﻿import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import { createAuditLog } from "../lib/audit";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const router = Router();

function generateAccessToken(userId: string, email: string, role: string) {
  return jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: (process.env.JWT_EXPIRES_IN || "15m") as any }
  );
}

function generateRefreshToken(userId: string) {
  return jwt.sign(
    { id: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as any }
  );
}

// POST /api/auth/login
router.post("/login", wrap(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    await new Promise((r) => setTimeout(r, 300)); // Prevent timing attacks
    throw new AppError("Invalid email or password", 401);
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError("Account temporarily locked. Please try again later.", 423);
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("Account is suspended or inactive", 403);
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    const newFailCount = user.failedLoginCount + 1;
    const lockedUntil = newFailCount >= 5
      ? new Date(Date.now() + 30 * 60 * 1000)
      : undefined;

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: newFailCount, lockedUntil },
    });

    throw new AppError("Invalid email or password", 401);
  }

  // Reset failed attempts
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: req.ip,
    },
  });

  const accessToken = generateAccessToken(user.id, user.email, user.role);
  const refreshTokenValue = generateRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    description: `${user.firstName} ${user.lastName} logged in`,
    req,
  });

  res.json({
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branch: null,
      mfaEnabled: user.mfaEnabled,
      avatarUrl: user.avatarUrl,
    },
  });
}));

// POST /api/auth/refresh
router.post("/refresh", wrap(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError("Refresh token required", 401);

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (stored.user.status !== "ACTIVE") {
    throw new AppError("Account is not active", 403);
  }

  const accessToken = generateAccessToken(stored.user.id, stored.user.email, stored.user.role);

  res.json({ accessToken });
}));

// POST /api/auth/logout
router.post("/logout", authenticate, wrap(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, userId: req.user!.id },
      data: { revokedAt: new Date() },
    });
  }

  await createAuditLog({
    userId: req.user!.id,
    action: "LOGOUT",
    entity: "User",
    entityId: req.user!.id,
    description: "User logged out",
    req,
  });

  res.json({ message: "Logged out successfully" });
}));

// GET /api/auth/me
router.get("/me", authenticate, wrap(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, employeeId: true, firstName: true, lastName: true,
      email: true, phone: true, role: true, status: true,
      mfaEnabled: true, avatarUrl: true, lastLoginAt: true,
    },
  });
  res.json(user);
}));

// POST /api/auth/change-password
router.post("/change-password", authenticate, wrap(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Current and new password required", 400);
  }
  if (newPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new AppError("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    description: "Password changed",
    req,
  });

  res.json({ message: "Password changed successfully" });
}));

// POST /api/auth/staff-register — public endpoint for staff self-registration
// Requires a valid admin authorisation code (not a JWT) to prevent unauthorised signups
router.post("/staff-register", wrap(async (req: Request, res: Response) => {
  const { firstName, lastName, email, phone, role, employeeNumber, password, adminCode } = req.body as {
    firstName: string; lastName: string; email: string; phone: string;
    role: string; employeeNumber?: string; password: string; adminCode: string;
  };

  const validCode = process.env.STAFF_REGISTER_CODE || "PHILIX2025";
  if (adminCode !== validCode) {
    return res.status(403).json({ error: "Invalid admin authorisation code" });
  }

  if (!email || !email.toLowerCase().trim().endsWith("@philixfinance.com")) {
    return res.status(400).json({ error: "Must use a @philixfinance.com email address" });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const validRoles = ["CEO", "MANAGER", "LOAN_OFFICER", "COLLECTIONS_OFFICER", "ACCOUNTANT"];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role selected" });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ error: "First name and last name are required" });
  }

  const normalEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalEmail } });
  if (existing) {
    return res.status(409).json({ error: "This email address is already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const employeeId = employeeNumber?.trim() || `EMP-${year}-${rand}`;

  const user = await prisma.user.create({
    data: { firstName, lastName, email: normalEmail, phone, role, employeeId, passwordHash },
    select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, role: true },
  });

  res.status(201).json(user);
}));

export default router;