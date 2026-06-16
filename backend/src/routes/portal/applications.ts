import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { authenticatePortal } from "../../middleware/portalAuth";
import { authenticate } from "../../middleware/auth";
import { Mailer } from "../../lib/mailer";

const router = Router();

// Staff-only: GET /api/portal/applications/staff/all — returns all portal loan applications
router.get("/staff/all", authenticate, async (_req: Request, res: Response) => {
  const apps = await prisma.portalLoanApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      account: {
        select: { firstName: true, lastName: true, email: true, phone: true, clientNumber: true },
      },
    },
  });
  res.json(apps);
});

// Staff-only: PATCH /api/portal/applications/staff/:id — update status of a portal loan application
router.patch("/staff/:id", authenticate, async (req: Request, res: Response) => {
  const { status, rejectedReason, reviewedBy } = req.body;
  const app = await prisma.portalLoanApplication.findUnique({ where: { id: req.params.id } });
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
  res.json(updated);
});

router.use(authenticatePortal);

function genRef() {
  return `APP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// POST /api/portal/applications
router.post("/", async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const account = await prisma.clientPortalAccount.findUnique({ where: { id } });
  if (!account) throw new AppError("Account not found", 404);

  const {
    productType, amountRequested, termMonths, purpose, description,
    occupation, employer, employerPhone, monthlyIncome, payDate,
    collateralType, collateralDesc, collateralValue,
    ref1Name, ref1Phone, ref1Relation, ref2Name, ref2Phone, ref2Relation,
  } = req.body;

  if (!productType || !amountRequested || !termMonths || !purpose) {
    throw new AppError("Product, amount, term and purpose are required", 400);
  }

  const reference = genRef();
  const application = await prisma.portalLoanApplication.create({
    data: {
      reference,
      accountId: id,
      productType,
      amountRequested: parseFloat(amountRequested),
      termMonths: parseInt(termMonths),
      purpose,
      description,
      occupation,
      employer,
      employerPhone,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
      payDate,
      collateralType,
      collateralDesc,
      collateralValue: collateralValue ? parseFloat(collateralValue) : null,
      ref1Name, ref1Phone, ref1Relation,
      ref2Name, ref2Phone, ref2Relation,
    },
  });

  // Send notification email
  Mailer.loanApplicationReceived({
    email: account.email,
    firstName: account.firstName,
    reference,
    amount: parseFloat(amountRequested),
    product: productType.replace(/_/g, " "),
    id: account.id,
  }).catch(() => {});

  res.status(201).json(application);
});

// GET /api/portal/applications
router.get("/", async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const apps = await prisma.portalLoanApplication.findMany({
    where: { accountId: id },
    orderBy: { createdAt: "desc" },
  });
  res.json(apps);
});

// GET /api/portal/applications/:id
router.get("/:appId", async (req: Request, res: Response) => {
  const accountId = (req as Request & { portalAccountId: string }).portalAccountId;
  const app = await prisma.portalLoanApplication.findFirst({
    where: { id: req.params.appId, accountId },
  });
  if (!app) throw new AppError("Application not found", 404);
  res.json(app);
});

export default router;
