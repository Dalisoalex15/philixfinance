// @ts-nocheck
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authenticate, isSuperAdmin, isManagerOrAbove } from "../middleware/auth";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

// GET /api/users
router.get("/", isManagerOrAbove, async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, employeeId: true, firstName: true, lastName: true,
      email: true, phone: true, role: true, status: true,
      avatarUrl: true, lastLoginAt: true, createdAt: true,
      branch: { select: { id: true, name: true } },
      _count: { select: { loansCreated: true } },
    },
    orderBy: { firstName: "asc" },
  });
  res.json(users);
});

// POST /api/users
router.post("/", isSuperAdmin, async (req: Request, res: Response) => {
  const { firstName, lastName, email, phone, role, branchId, department, password } = req.body;

  if (!password || password.length < 8) throw new AppError("Password must be at least 8 characters", 400);
  if (!email) throw new AppError("Email is required", 400);

  const normalEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalEmail } });
  if (existing) throw new AppError("Email already in use", 409);

  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const employeeId = `EMP-${year}-${rand}`;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { firstName, lastName, email: normalEmail, phone, role, branchId, department, passwordHash, employeeId },
    select: {
      id: true, employeeId: true, firstName: true, lastName: true,
      email: true, phone: true, role: true, status: true,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    description: `Created user ${user.firstName} ${user.lastName} (${user.role})`,
    req,
  });

  res.status(201).json(user);
});

// PATCH /api/users/:id — CEO can update any staff profile field
router.patch("/:id", isSuperAdmin, async (req: Request, res: Response) => {
  const { firstName, lastName, email, phone, role, status, branchId, department } = req.body;

  if (email) {
    const normalEmail = email.toLowerCase().trim();
    const conflict = await prisma.user.findFirst({ where: { email: normalEmail, NOT: { id: req.params.id } } });
    if (conflict) throw new AppError("Email already in use by another staff member", 409);
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(phone !== undefined && { phone }),
      ...(role && { role }),
      ...(status && { status }),
      ...(branchId !== undefined && { branchId }),
      ...(department !== undefined && { department }),
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, department: true },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    entity: "User",
    entityId: req.params.id,
    description: `Updated user ${updated.firstName} ${updated.lastName}`,
    req,
  });

  res.json(updated);
});

// PATCH /api/users/:id/reset-password — manager resets a staff password
router.patch("/:id/reset-password", isManagerOrAbove, async (req: Request, res: Response) => {
  const { password } = req.body as { password: string };
  if (!password || password.length < 8) throw new AppError("Password must be at least 8 characters", 400);
  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  await createAuditLog({
    userId: req.user!.id, action: "UPDATE", entity: "User", entityId: req.params.id,
    description: `Password reset for ${updated.firstName} ${updated.lastName}`, req,
  });
  res.json({ ok: true, message: "Password reset successfully" });
});

// DELETE /api/users/:id — remove a staff member
router.delete("/:id", isSuperAdmin, async (req: Request, res: Response) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, firstName: true, lastName: true } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (req.params.id === req.user!.id) return res.status(400).json({ error: "Cannot delete your own account" });
  await prisma.user.delete({ where: { id: req.params.id } });
  await createAuditLog({
    userId: req.user!.id, action: "DELETE", entity: "User", entityId: req.params.id,
    description: `Deleted user ${target.firstName} ${target.lastName}`, req,
  });
  res.json({ ok: true });
});

// GET /api/users/performance
router.get("/performance", isManagerOrAbove, async (_req: Request, res: Response) => {
  const officers = await prisma.user.findMany({
    where: { role: { in: ["LOAN_OFFICER", "MANAGER", "COLLECTIONS_OFFICER"] } },
    include: {
      loansCreated: {
        select: { status: true, totalPaid: true, totalDue: true, principal: true },
      },
    },
  });

  const performance = officers.map((u) => {
    const issued = u.loansCreated.length;
    const active = u.loansCreated.filter((l) => l.status === "ACTIVE").length;
    const defaults = u.loansCreated.filter((l) => l.status === "DEFAULTED").length;
    const collected = u.loansCreated.reduce((s, l) => s + l.totalPaid, 0);
    const due = u.loansCreated.reduce((s, l) => s + l.totalDue, 0);
    const collectionRate = due > 0 ? parseFloat(((collected / due) * 100).toFixed(1)) : 0;

    return {
      id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role,
      loansIssued: issued, activeLoans: active, defaults,
      collectionRate, totalCollected: collected, totalDisbursed: u.loansCreated.reduce((s, l) => s + l.principal, 0),
    };
  }).sort((a, b) => b.loansIssued - a.loansIssued);

  res.json(performance);
});

export default router;