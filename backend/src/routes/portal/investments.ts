import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticatePortal } from "../../middleware/portalAuth";
import { AppError } from "../../middleware/errorHandler";

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

type PortalReq = Request & { portalAccountId: string; portalEmail: string };

const router = Router();
router.use(authenticatePortal);

const K = (n: number) => n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function genRef(): string {
  return `PHX-INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function calcMaturity(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

function calcExpectedReturn(amount: number, annualRate: number, months: number): number {
  // Simple interest: P × R × T/12
  return amount + amount * (annualRate / 100) * (months / 12);
}

// ── GET /api/portal/investments/products — active products ────────────────────
router.get("/products", wrap(async (_req: Request, res: Response) => {
  const products = await (prisma as any).investmentProduct.findMany({
    where: { isActive: true },
    orderBy: { interestRate: "desc" },
  });
  res.json(products);
}));

// ── GET /api/portal/investments — client's investments ────────────────────────
router.get("/", wrap(async (req: Request, res: Response) => {
  const accountId = (req as PortalReq).portalAccountId;
  const investments = await (prisma as any).clientInvestment.findMany({
    where: { accountId },
    include: { product: { select: { name: true, type: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalInvested = investments
    .filter((i: any) => ["ACTIVE", "MATURED"].includes(i.status))
    .reduce((s: number, i: any) => s + i.amountInvested, 0);

  const totalExpected = investments
    .filter((i: any) => i.status === "ACTIVE")
    .reduce((s: number, i: any) => s + i.expectedReturn, 0);

  const totalMatured = investments
    .filter((i: any) => i.status === "MATURED")
    .reduce((s: number, i: any) => s + (i.actualReturn ?? i.expectedReturn), 0);

  res.json({
    investments,
    summary: { totalInvested, totalExpected, totalMatured, count: investments.length },
  });
}));

// ── POST /api/portal/investments — place a new investment ─────────────────────
const investSchema = z.object({
  productId:     z.string().uuid(),
  amountInvested: z.number().positive("Amount must be positive"),
  termMonths:    z.number().int().min(1),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER"]),
  paymentRef:    z.string().max(100).optional(),
  notes:         z.string().max(500).optional(),
});

router.post("/", wrap(async (req: Request, res: Response) => {
  const parsed = investSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);
  const { productId, amountInvested, termMonths, paymentMethod, paymentRef, notes } = parsed.data;

  const accountId = (req as PortalReq).portalAccountId;

  const product = await (prisma as any).investmentProduct.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw new AppError("Investment product not found or inactive", 404);

  if (amountInvested < product.minAmount)
    throw new AppError(`Minimum investment for this product is K${K(product.minAmount)}`, 400);
  if (product.maxAmount && amountInvested > product.maxAmount)
    throw new AppError(`Maximum investment for this product is K${K(product.maxAmount)}`, 400);
  if (termMonths < product.termMonths)
    throw new AppError(`Minimum term for this product is ${product.termMonths} months`, 400);

  const maturityDate = calcMaturity(termMonths);
  const expectedReturn = calcExpectedReturn(amountInvested, product.interestRate, termMonths);

  const investment = await (prisma as any).clientInvestment.create({
    data: {
      reference: genRef(),
      accountId,
      productId,
      amountInvested,
      interestRate: product.interestRate,
      termMonths,
      maturityDate,
      expectedReturn,
      paymentMethod,
      paymentRef: paymentRef || null,
      notes: notes || null,
      status: "PENDING",
    },
    include: { product: { select: { name: true, type: true } } },
  });

  // In-app notification
  try {
    await (prisma as any).clientNotification.create({
      data: {
        accountId,
        subject: "Investment request received",
        body: `Your investment of K${K(amountInvested)} in ${product.name} (ref: ${investment.reference}) has been received and is pending approval. Expected return: K${K(expectedReturn)} at maturity.`,
        category: "INVESTMENT",
      },
    });
  } catch {}

  res.status(201).json(investment);
}));

export default router;
