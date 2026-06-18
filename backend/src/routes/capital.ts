import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

type AsyncHandler = (req: Request, res: Response, next: (err?: unknown) => void) => Promise<unknown>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: (err?: unknown) => void) =>
  fn(req, res, next).catch(next);

const router = Router();
router.use(authenticate);

// GET /api/capital — all entries + summary totals
router.get("/", wrap(async (_req: Request, res: Response) => {
  const entries = await prisma.capitalEntry.findMany({
    orderBy: { entryDate: "desc" },
  });

  const totalDeposits = entries
    .filter(e => e.type === "DEPOSIT")
    .reduce((s, e) => s + e.amount, 0);

  const totalWithdrawals = entries
    .filter(e => e.type === "WITHDRAWAL")
    .reduce((s, e) => s + e.amount, 0);

  res.json({
    entries,
    summary: {
      totalDeposits,
      totalWithdrawals,
      netCapital: totalDeposits - totalWithdrawals,
      entryCount: entries.length,
    },
  });
}));

// POST /api/capital — record a new deposit or withdrawal
router.post("/", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const {
    type, amount, source, provider, reference, description, entryDate,
  } = req.body as {
    type: string; amount: number; source: string;
    provider?: string; reference?: string; description?: string; entryDate?: string;
  };

  if (!type || !["DEPOSIT", "WITHDRAWAL"].includes(type)) {
    return res.status(400).json({ error: "type must be DEPOSIT or WITHDRAWAL" });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (!source) {
    return res.status(400).json({ error: "source is required" });
  }

  const entry = await prisma.capitalEntry.create({
    data: {
      type,
      amount: parseFloat(String(amount)),
      source,
      provider: provider || null,
      reference: reference || null,
      description: description || null,
      addedBy: `${user.firstName} ${user.lastName}`,
      entryDate: entryDate ? new Date(entryDate) : new Date(),
    },
  });

  res.status(201).json(entry);
}));

// DELETE /api/capital/:id — remove an entry (SUPER_ADMIN only)
router.delete("/:id", wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Only SUPER_ADMIN can delete capital entries." });
  }
  await prisma.capitalEntry.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

export default router;
