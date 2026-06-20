import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { authenticatePortal } from "../../middleware/portalAuth";
import { authenticate } from "../../middleware/auth";
import { Mailer } from "../../lib/mailer";
import { assessCollateral } from "../../lib/collateralEngine";

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const router = Router();

// Staff-only: GET /api/portal/applications/staff/all
router.get("/staff/all", authenticate, wrap(async (_req: Request, res: Response) => {
  const apps = await prisma.portalLoanApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      account: {
        select: { firstName: true, lastName: true, email: true, phone: true, clientNumber: true },
      },
    },
  });
  // Parse collateralPhotos JSON back to array for frontend
  const parsed = apps.map(a => ({
    ...a,
    collateralPhotos: a.collateralPhotos ? JSON.parse(a.collateralPhotos) : [],
  }));
  res.json(parsed);
}));

// Staff-only: PATCH /api/portal/applications/staff/:id
router.patch("/staff/:id", authenticate, wrap(async (req: Request, res: Response) => {
  const { status, rejectedReason, reviewedBy } = req.body;

  const app = await prisma.portalLoanApplication.findUnique({
    where: { id: req.params.id },
    include: { account: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });
  if (!app) throw new AppError("Application not found", 404);

  const updated = await prisma.portalLoanApplication.update({
    where: { id: req.params.id },
    data: {
      status,
      rejectedReason: rejectedReason ?? app.rejectedReason,
      reviewedBy: reviewedBy ?? req.user?.id,
      reviewedAt: new Date(),
    },
  });

  // Send email + portal notification asynchronously (don't block the response)
  setImmediate(async () => {
    try {
      const acct = app.account;
      if (!acct) return;
      if (status === "APPROVED" || status === "DISBURSED") {
        await Mailer.loanApproved({
          email: acct.email,
          firstName: acct.firstName,
          lastName: acct.lastName,
          reference: app.reference,
          productType: app.productType,
          amountRequested: app.amountRequested,
          termMonths: app.termMonths,
          createdAt: app.createdAt,
          accountId: acct.id,
        });
      } else if (status === "REJECTED") {
        await Mailer.loanRejected({
          email: acct.email,
          firstName: acct.firstName,
          lastName: acct.lastName,
          reference: app.reference,
          productType: app.productType,
          amountRequested: app.amountRequested,
          rejectedReason: rejectedReason ?? app.rejectedReason,
          accountId: acct.id,
        });
      }
    } catch (_) { /* email failure must not break the response */ }
  });

  res.json(updated);
}));

router.use(authenticatePortal);

function genRef() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `PHX-${n}`;
}

// POST /api/portal/applications
router.post("/", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const account = await prisma.clientPortalAccount.findUnique({ where: { id } });
  if (!account) throw new AppError("Account not found", 404);

  const {
    productType, amountRequested, termMonths, interestRate, purpose, description,
    occupation, employer, employerPhone, monthlyIncome, payDate,
    collateralType, collateralDesc, collateralValue, collateralPhotos,
    ref1Name, ref1Phone, ref1Relation, ref2Name, ref2Phone, ref2Relation,
    // Extended borrower info
    nrcNumber, physicalAddress, employmentType, payrollNumber, department,
    yearsInService, netSalaryAvailable, existingLoanDeductions,
    // Enhanced collateral
    collateralCondition, collateralYear, collateralSerial, collateralOwner,
    hasOwnershipDocs, hasInsurance,
    // Guarantor
    guarantorName, guarantorPhone, guarantorEmployer, guarantorRelation,
    // Student-specific
    studentInstitution, studentSponsor, studentGradYear,
  } = req.body;

  if (!productType || !amountRequested || !termMonths || !purpose) {
    throw new AppError("Product, amount, term and purpose are required", 400);
  }

  // Fallback rates by product ID + term weeks (used only when interestRate not sent)
  const PRODUCT_RATES: Record<string, Record<number, number>> = {
    "prod-001": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-002": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-003": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-004": { 1: 10, 2: 20, 3: 30, 4: 35 },
    "prod-005": { 1:  8, 2: 16, 3: 24, 4: 30 },
    "prod-006": { 1:  7, 2: 14, 3: 21, 4: 28 },
  };
  const termWeeks = parseInt(termMonths);
  const resolvedRate = interestRate != null
    ? parseFloat(interestRate)
    : (PRODUCT_RATES[productType]?.[termWeeks] ?? 35);

  // Compute collateral risk assessment at submission time
  const photos = Array.isArray(collateralPhotos) ? collateralPhotos : [];
  const assessment = assessCollateral({
    collateralType: collateralType ?? "",
    collateralValue: collateralValue != null ? parseFloat(collateralValue) : 0,
    collateralCondition: collateralCondition ?? "",
    collateralYear: collateralYear ?? undefined,
    collateralSerial: collateralSerial ?? undefined,
    collateralOwner: collateralOwner ?? undefined,
    hasOwnershipDocs: hasOwnershipDocs === true || hasOwnershipDocs === "true",
    hasInsurance: hasInsurance === true || hasInsurance === "true",
    collateralPhotos: photos,
    amountRequested: parseFloat(amountRequested),
    termMonths: termWeeks,
    interestRate: resolvedRate,
    monthlyIncome: monthlyIncome != null ? parseFloat(monthlyIncome) : 0,
    netSalaryAvailable: netSalaryAvailable != null ? parseFloat(netSalaryAvailable) : 0,
    employmentType: employmentType ?? "",
    guarantorName: guarantorName ?? undefined,
    ref1Name: ref1Name ?? undefined,
    ref2Name: ref2Name ?? undefined,
  });

  const reference = genRef();
  const application = await prisma.portalLoanApplication.create({
    data: {
      reference,
      accountId: id,
      productType,
      amountRequested: parseFloat(amountRequested),
      termMonths: termWeeks,
      interestRate: resolvedRate,
      purpose,
      description: description ?? null,
      occupation: occupation ?? null,
      employer: employer ?? null,
      employerPhone: employerPhone ?? null,
      monthlyIncome: monthlyIncome != null ? parseFloat(monthlyIncome) : null,
      payDate: payDate ?? null,
      collateralType: collateralType ?? null,
      collateralDesc: collateralDesc ?? null,
      collateralValue: collateralValue != null ? parseFloat(collateralValue) : null,
      collateralPhotos: photos.length > 0 ? JSON.stringify(photos) : null,
      ref1Name: ref1Name ?? null,
      ref1Phone: ref1Phone ?? null,
      ref1Relation: ref1Relation ?? null,
      ref2Name: ref2Name ?? null,
      ref2Phone: ref2Phone ?? null,
      ref2Relation: ref2Relation ?? null,
      // Extended borrower info
      nrcNumber: nrcNumber ?? null,
      physicalAddress: physicalAddress ?? null,
      employmentType: employmentType ?? null,
      payrollNumber: payrollNumber ?? null,
      department: department ?? null,
      yearsInService: yearsInService ?? null,
      netSalaryAvailable: netSalaryAvailable != null ? parseFloat(netSalaryAvailable) : null,
      existingLoanDeductions: existingLoanDeductions != null ? parseFloat(existingLoanDeductions) : null,
      // Enhanced collateral
      collateralCondition: collateralCondition ?? null,
      collateralYear: collateralYear ?? null,
      collateralSerial: collateralSerial ?? null,
      collateralOwner: collateralOwner ?? null,
      hasOwnershipDocs: hasOwnershipDocs === true || hasOwnershipDocs === "true",
      hasInsurance: hasInsurance === true || hasInsurance === "true",
      collateralConditionScore: null,
      // Guarantor
      guarantorName: guarantorName ?? null,
      guarantorPhone: guarantorPhone ?? null,
      guarantorEmployer: guarantorEmployer ?? null,
      guarantorRelation: guarantorRelation ?? null,
      // Student-specific
      studentInstitution: studentInstitution ?? null,
      studentSponsor: studentSponsor ?? null,
      studentGradYear: studentGradYear ?? null,
      // Auto-computed risk assessment
      riskScore: assessment.overallScore,
      riskCategory: assessment.riskCategory,
      coverageRatio: assessment.coverageRatio,
      marketValue: assessment.marketValue,
      forcedSaleValue: assessment.forcedSaleValue,
      lendingValue: assessment.lendingValue,
      maxRecommendedLoan: assessment.maxRecommendedLoan,
      repossessionScore: assessment.repossessionScore,
      assessmentJson: JSON.stringify(assessment),
    },
  });

  Mailer.loanApplicationReceived({
    email: account.email,
    firstName: account.firstName,
    reference,
    amount: parseFloat(amountRequested),
    product: productType.replace(/_/g, " "),
    id: account.id,
  }).catch(() => {});

  res.status(201).json(application);
}));

// GET /api/portal/applications
router.get("/", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const apps = await prisma.portalLoanApplication.findMany({
    where: { accountId: id },
    orderBy: { createdAt: "desc" },
  });

  // Auto-upgrade: DISBURSED loans < 4 weeks within 3 days of due date
  const now = Date.now();
  for (const app of apps) {
    if (app.status === "DISBURSED" && app.termMonths < 4 && app.reviewedAt) {
      const disbursedMs = app.reviewedAt.getTime();
      const dueDateMs = disbursedMs + app.termMonths * 7 * 86400000;
      const daysUntilDue = (dueDateMs - now) / 86400000;
      if (daysUntilDue <= 3) {
        await prisma.portalLoanApplication.update({
          where: { id: app.id },
          data: { termMonths: 4 },
        });
        (app as any).termMonths = 4;
        (app as any).autoUpgraded = true;
      }
    }
  }

  res.json(apps);
}));

// GET /api/portal/applications/:appId
router.get("/:appId", wrap(async (req: Request, res: Response) => {
  const accountId = (req as Request & { portalAccountId: string }).portalAccountId;
  const app = await prisma.portalLoanApplication.findFirst({
    where: { id: req.params.appId, accountId },
  });
  if (!app) throw new AppError("Application not found", 404);
  res.json(app);
}));

// POST /api/portal/applications/:appId/upgrade — client upgrades loan term (max 4 weeks)
router.post("/:appId/upgrade", wrap(async (req: Request, res: Response) => {
  const accountId = (req as Request & { portalAccountId: string }).portalAccountId;
  const app = await prisma.portalLoanApplication.findFirst({
    where: { id: req.params.appId, accountId },
  });
  if (!app) throw new AppError("Application not found", 404);

  const activeStatuses = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"];
  if (!activeStatuses.includes(app.status)) {
    throw new AppError("Can only upgrade an active application", 400);
  }
  if (app.termMonths >= 4) {
    throw new AppError("This loan is already at the maximum term of 4 weeks", 400);
  }

  const { newTermWeeks } = req.body as { newTermWeeks: number };
  if (!newTermWeeks || newTermWeeks <= app.termMonths || newTermWeeks > 4) {
    throw new AppError("New term must be greater than current term and at most 4 weeks", 400);
  }

  const updated = await prisma.portalLoanApplication.update({
    where: { id: app.id },
    data: { termMonths: newTermWeeks },
  });

  // Notify client
  const account = await prisma.clientPortalAccount.findUnique({ where: { id: accountId } });
  if (account) {
    await prisma.clientNotification.create({
      data: {
        accountId,
        subject: "Loan term upgraded",
        body: `Your loan ${app.reference} has been upgraded from ${app.termMonths} to ${newTermWeeks} weeks.`,
        category: "LOAN_UPDATE",
      },
    });
  }

  res.json(updated);
}));

// POST /api/portal/applications/:appId/reloan — reapply using same details
router.post("/:appId/reloan", wrap(async (req: Request, res: Response) => {
  const accountId = (req as Request & { portalAccountId: string }).portalAccountId;
  const account = await prisma.clientPortalAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new AppError("Account not found", 404);

  const sourceApp = await prisma.portalLoanApplication.findFirst({
    where: { id: req.params.appId, accountId },
  });
  if (!sourceApp) throw new AppError("Application not found", 404);

  // Block if there's already an active application
  const conflict = await prisma.portalLoanApplication.findFirst({
    where: { accountId, status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"] } },
  });
  if (conflict) {
    throw new AppError("You already have an active loan application. Wait for it to be disbursed before reloaning.", 400);
  }

  const { amountRequested, termWeeks, purpose } = req.body as {
    amountRequested?: number; termWeeks?: number; purpose?: string;
  };

  const reference = genRef();
  const reloan = await prisma.portalLoanApplication.create({
    data: {
      reference,
      accountId,
      productType: sourceApp.productType,
      amountRequested: amountRequested ? parseFloat(String(amountRequested)) : sourceApp.amountRequested,
      termMonths: termWeeks ? parseInt(String(termWeeks)) : sourceApp.termMonths,
      purpose: purpose || sourceApp.purpose,
      description: sourceApp.description,
      occupation: sourceApp.occupation,
      employer: sourceApp.employer,
      employerPhone: sourceApp.employerPhone,
      monthlyIncome: sourceApp.monthlyIncome,
      payDate: sourceApp.payDate,
      collateralType: sourceApp.collateralType,
      collateralDesc: sourceApp.collateralDesc,
      collateralValue: sourceApp.collateralValue,
      ref1Name: sourceApp.ref1Name,
      ref1Phone: sourceApp.ref1Phone,
      ref1Relation: sourceApp.ref1Relation,
      ref2Name: sourceApp.ref2Name,
      ref2Phone: sourceApp.ref2Phone,
      ref2Relation: sourceApp.ref2Relation,
    },
  });

  Mailer.loanApplicationReceived({
    email: account.email,
    firstName: account.firstName,
    reference,
    amount: reloan.amountRequested,
    product: reloan.productType.replace(/_/g, " "),
    id: account.id,
  }).catch(() => {});

  res.status(201).json(reloan);
}));

// POST /api/portal/applications/:appId/pay — submit payment proof
router.post("/:appId/pay", wrap(async (req: Request, res: Response) => {
  const accountId = (req as Request & { portalAccountId: string }).portalAccountId;
  const app = await prisma.portalLoanApplication.findFirst({
    where: { id: req.params.appId, accountId },
  });
  if (!app) throw new AppError("Application not found", 404);
  if (app.status !== "DISBURSED") throw new AppError("Only disbursed loans can have payment submitted", 400);

  const { amount, paymentMethod, provider, reference, screenshotData, notes } = req.body as {
    amount?: number; paymentMethod?: string; provider?: string;
    reference?: string; screenshotData?: string; notes?: string;
  };

  const submission = await (prisma as any).loanPaymentSubmission.create({
    data: {
      applicationId: app.id,
      accountId,
      amount: amount ? parseFloat(String(amount)) : null,
      paymentMethod: paymentMethod || null,
      provider: provider || null,
      reference: reference || null,
      screenshotData: screenshotData || null,
      notes: notes || null,
      status: "PENDING",
    },
  });

  res.status(201).json(submission);
}));

// GET /api/portal/applications/:appId/payments — client sees their submissions
router.get("/:appId/payments", wrap(async (req: Request, res: Response) => {
  const accountId = (req as Request & { portalAccountId: string }).portalAccountId;
  const app = await prisma.portalLoanApplication.findFirst({
    where: { id: req.params.appId, accountId },
  });
  if (!app) throw new AppError("Application not found", 404);

  const submissions = await (prisma as any).loanPaymentSubmission.findMany({
    where: { applicationId: app.id, accountId },
    orderBy: { createdAt: "desc" },
  });
  res.json(submissions);
}));

export default router;
