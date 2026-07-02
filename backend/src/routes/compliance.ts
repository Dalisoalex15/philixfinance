// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const items = await (prisma as any).complianceItem.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

router.post("/", async (req: Request, res: Response) => {
  const { category, title, description, dueDate, priority, assignedTo, notes } = req.body;
  const item = await (prisma as any).complianceItem.create({
    data: {
      category, title, description, priority: priority || "MEDIUM", assignedTo, notes,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  res.status(201).json(item);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const { dueDate, status, ...rest } = req.body;
  const data: any = { ...rest };
  if (dueDate) data.dueDate = new Date(dueDate);
  if (status) {
    data.status = status;
    if (status === "COMPLETED") data.completedAt = new Date();
  }
  const item = await (prisma as any).complianceItem.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await (prisma as any).complianceItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
