// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isLoanOfficerOrAbove, isManagerOrAbove } from "../middleware/auth";
import { createAuditLog } from "../lib/audit";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

function generateClientNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `CLT-${year}-${rand}`;
}

function calculateRiskScore(data: any): { score: number; rating: string } {
  let score = 50;
  if (data.previousLoans > 0) score += 10;
  if (data.defaultCount === 0) score += 20;
  if (data.defaultCount > 0) score -= data.defaultCount * 15;
  if (data.monthlySalary && data.monthlySalary > 3000) score += 10;
  if (data.yearsOperating && data.yearsOperating > 2) score += 10;
  score = Math.max(0, Math.min(100, score));
  let rating = "MEDIUM";
  if (score >= 70) rating = "LOW";
  else if (score <= 30) rating = "CRITICAL";
  else if (score <= 50) rating = "HIGH";
  return { score, rating };
}

// GET /api/clients
router.get("/", async (req: Request, res: Response) => {
  const { search, status, type, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: "insensitive" } },
      { lastName: { contains: search as string, mode: "insensitive" } },
      { nrcNumber: { contains: search as string, mode: "insensitive" } },
      { phone: { contains: search as string, mode: "insensitive" } },
      { clientNumber: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true, clientNumber: true, firstName: true, lastName: true,
        phone: true, email: true, type: true, status: true, riskRating: true,
        internalScore: true, city: true, university: true, businessName: true,
        createdAt: true,
        _count: { select: { loans: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.client.count({ where }),
  ]);

  res.json({ clients, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
});

// GET /api/clients/:id
router.get("/:id", async (req: Request, res: Response) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      loans: {
        select: {
          id: true, loanNumber: true, status: true, principal: true,
          outstandingBalance: true, totalPaid: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      collaterals: { select: { id: true, vaultId: true, type: true, brand: true, model: true, status: true } },
      documents: { select: { id: true, type: true, fileName: true, fileUrl: true, createdAt: true } },
      communicationLogs: {
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      followUps: { where: { completed: false }, orderBy: { dueDate: "asc" } },
    },
  });

  if (!client) throw new AppError("Client not found", 404);
  res.json(client);
});

// POST /api/clients
router.post("/", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const body = req.body;

  const existing = await prisma.client.findFirst({ where: { nrcNumber: body.nrcNumber } });
  if (existing) throw new AppError("A client with this NRC number already exists", 409);

  const { score, rating } = calculateRiskScore(body);

  const client = await prisma.client.create({
    data: {
      clientNumber: generateClientNumber(),
      type: body.type,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      nrcNumber: body.nrcNumber,
      dateOfBirth: new Date(body.dateOfBirth),
      gender: body.gender,
      phone: body.phone,
      whatsapp: body.whatsapp,
      email: body.email,
      address: body.address,
      city: body.city,
      province: body.province,
      studentId: body.studentId,
      university: body.university,
      course: body.course,
      yearOfStudy: body.yearOfStudy,
      employer: body.employer,
      jobTitle: body.jobTitle,
      monthlySalary: body.monthlySalary,
      payDate: body.payDate,
      businessName: body.businessName,
      businessType: body.businessType,
      marketLocation: body.marketLocation,
      monthlyRevenue: body.monthlyRevenue,
      yearsOperating: body.yearsOperating,
      internalScore: score,
      riskRating: rating as any,
      branchId: req.user!.branchId,
      loanOfficerId: req.user!.id,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    entity: "Client",
    entityId: client.id,
    description: `Registered new client ${client.firstName} ${client.lastName} (${client.clientNumber})`,
    req,
  });

  res.status(201).json(client);
});

// PUT /api/clients/:id
router.put("/:id", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError("Client not found", 404);

  const body = req.body;
  const { score, rating } = calculateRiskScore({ ...existing, ...body });

  const updated = await prisma.client.update({
    where: { id: req.params.id },
    data: {
      ...body,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      internalScore: score,
      riskRating: rating as any,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    entity: "Client",
    entityId: existing.id,
    description: `Updated client profile for ${existing.firstName} ${existing.lastName}`,
    req,
  });

  res.json(updated);
});

// POST /api/clients/:id/communication
router.post("/:id/communication", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const { type, subject, notes, outcome, nextAction } = req.body;

  const log = await prisma.communicationLog.create({
    data: {
      clientId: req.params.id,
      userId: req.user!.id,
      type,
      subject,
      notes,
      outcome,
      nextAction,
    },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  res.status(201).json(log);
});

// POST /api/clients/:id/follow-up
router.post("/:id/follow-up", isLoanOfficerOrAbove, async (req: Request, res: Response) => {
  const { dueDate, type, notes } = req.body;

  const followUp = await prisma.followUp.create({
    data: {
      clientId: req.params.id,
      dueDate: new Date(dueDate),
      type,
      notes,
      createdById: req.user!.id,
    },
  });

  res.status(201).json(followUp);
});

// PATCH /api/clients/:id/blacklist
router.patch("/:id/blacklist", isManagerOrAbove, async (req: Request, res: Response) => {
  const { reason } = req.body;
  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: { status: "BLACKLISTED" },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    entity: "Client",
    entityId: req.params.id,
    description: `Blacklisted client ${client.firstName} ${client.lastName}: ${reason}`,
    req,
  });

  res.json(client);
});

export default router;