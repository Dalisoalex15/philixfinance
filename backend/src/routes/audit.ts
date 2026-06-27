// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";

const router = Router();
router.use(authenticate, isManagerOrAbove);

router.get("/", async (req: Request, res: Response) => {
  const { entity, userId, action, page = "1", limit = "50" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: any = {};
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip, take: parseInt(limit as string),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total });
});

export default router;