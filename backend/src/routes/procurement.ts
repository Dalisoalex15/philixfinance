// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const items = await (prisma as any).procurementOrder.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

router.post("/", async (req: Request, res: Response) => {
  const { itemName, description, quantity, unitPrice, supplier, notes } = req.body;
  const user = (req as any).user;
  const qty = Number(quantity) || 1;
  const price = Number(unitPrice) || 0;
  const item = await (prisma as any).procurementOrder.create({
    data: {
      itemName, description, supplier, notes,
      quantity: qty,
      unitPrice: price,
      totalAmount: qty * price,
      requestedBy: `${user.firstName} ${user.lastName}`,
    },
  });
  res.status(201).json(item);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, quantity, unitPrice, ...rest } = req.body;
  const data: any = { ...rest };
  if (quantity !== undefined) data.quantity = Number(quantity);
  if (unitPrice !== undefined) {
    data.unitPrice = Number(unitPrice);
    data.totalAmount = (data.quantity ?? 1) * Number(unitPrice);
  }
  if (status) {
    data.status = status;
    if (status === "APPROVED") data.approvedBy = `${user.firstName} ${user.lastName}`;
    if (status === "ORDERED") data.orderedAt = new Date();
    if (status === "RECEIVED") data.receivedAt = new Date();
  }
  const item = await (prisma as any).procurementOrder.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await (prisma as any).procurementOrder.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
