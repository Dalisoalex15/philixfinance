// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const items = await (prisma as any).assetItem.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

router.post("/", async (req: Request, res: Response) => {
  const { name, category, serialNumber, purchaseDate, purchasePrice, currentValue, location, condition, assignedTo, notes } = req.body;
  const item = await (prisma as any).assetItem.create({
    data: {
      name, category, serialNumber, location, assignedTo, notes,
      condition: condition || "GOOD",
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      currentValue: currentValue ? Number(currentValue) : null,
    },
  });
  res.status(201).json(item);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const { purchaseDate, purchasePrice, currentValue, ...rest } = req.body;
  const data: any = { ...rest };
  if (purchaseDate) data.purchaseDate = new Date(purchaseDate);
  if (purchasePrice !== undefined) data.purchasePrice = Number(purchasePrice);
  if (currentValue !== undefined) data.currentValue = Number(currentValue);
  const item = await (prisma as any).assetItem.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await (prisma as any).assetItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
