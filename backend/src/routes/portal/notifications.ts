import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { authenticatePortal } from "../../middleware/portalAuth";

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const router = Router();
router.use(authenticatePortal);

// GET /api/portal/notifications
router.get("/", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const { page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [notifications, total, unread] = await Promise.all([
    prisma.clientNotification.findMany({
      where: { accountId: id },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.clientNotification.count({ where: { accountId: id } }),
    prisma.clientNotification.count({ where: { accountId: id, isRead: false } }),
  ]);

  res.json({ notifications, total, unread, page: parseInt(page as string) });
}));

// POST /api/portal/notifications/mark-read
router.post("/mark-read", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const { ids } = req.body;
  if (ids === "all") {
    await prisma.clientNotification.updateMany({ where: { accountId: id }, data: { isRead: true } });
  } else if (Array.isArray(ids)) {
    await prisma.clientNotification.updateMany({ where: { accountId: id, id: { in: ids } }, data: { isRead: true } });
  }
  res.json({ message: "Marked as read" });
}));

// GET /api/portal/announcements — latest ANNOUNCEMENT notifications for dashboard banner
router.get("/announcements", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  const rows = await prisma.clientNotification.findMany({
    where: { accountId: id, category: "ANNOUNCEMENT" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  res.json(rows);
}));

// DELETE /api/portal/notifications/:notifId
router.delete("/:notifId", wrap(async (req: Request, res: Response) => {
  const id = (req as Request & { portalAccountId: string }).portalAccountId;
  await prisma.clientNotification.deleteMany({ where: { id: req.params.notifId, accountId: id } });
  res.json({ message: "Deleted" });
}));

export default router;
