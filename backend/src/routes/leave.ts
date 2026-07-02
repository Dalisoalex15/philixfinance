// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const items = await (prisma as any).leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

router.post("/", async (req: Request, res: Response) => {
  const { staffName, staffRole, leaveType, startDate, endDate, daysRequested, reason } = req.body;
  const user = (req as any).user;
  const item = await (prisma as any).leaveRequest.create({
    data: {
      staffId: user.id,
      staffName: staffName || `${user.firstName} ${user.lastName}`,
      staffRole: staffRole || user.role,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      daysRequested: Number(daysRequested) || 1,
      reason,
    },
  });
  res.status(201).json(item);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { status, ...rest } = req.body;
  const data: any = { ...rest };
  if (status) {
    data.status = status;
    if (status === "APPROVED" || status === "REJECTED") {
      data.approvedByName = `${user.firstName} ${user.lastName}`;
      data.approvedAt = new Date();
    }
  }
  const item = await (prisma as any).leaveRequest.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await (prisma as any).leaveRequest.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
