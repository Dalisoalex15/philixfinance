// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (_req: Request, res: Response) => {
  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    include: { author: { select: { firstName: true, lastName: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
  res.json(announcements);
});

router.post("/", isManagerOrAbove, async (req: Request, res: Response) => {
  const { title, content, isPinned, expiresAt, branchId } = req.body;
  const announcement = await prisma.announcement.create({
    data: {
      title, content, isPinned: isPinned || false,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      branchId, authorId: req.user!.id,
    },
    include: { author: { select: { firstName: true, lastName: true } } },
  });
  res.status(201).json(announcement);
});

router.delete("/:id", isManagerOrAbove, async (req: Request, res: Response) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.json({ message: "Announcement deleted" });
});

export default router;