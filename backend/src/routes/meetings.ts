// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const items = await (prisma as any).meetingMinute.findMany({ orderBy: { meetingDate: "desc" } });
  res.json(items);
});

router.post("/", async (req: Request, res: Response) => {
  const { title, meetingDate, location, attendees, agenda, minutes, actionItems } = req.body;
  const user = (req as any).user;
  const item = await (prisma as any).meetingMinute.create({
    data: {
      title, location, agenda, minutes,
      meetingDate: new Date(meetingDate),
      attendees: typeof attendees === "string" ? attendees : (attendees ?? []).join(", "),
      actionItems: actionItems ? JSON.stringify(actionItems) : null,
      recordedBy: `${user.firstName} ${user.lastName}`,
    },
  });
  res.status(201).json(item);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const { meetingDate, attendees, actionItems, ...rest } = req.body;
  const data: any = { ...rest };
  if (meetingDate) data.meetingDate = new Date(meetingDate);
  if (attendees !== undefined) data.attendees = typeof attendees === "string" ? attendees : attendees.join(", ");
  if (actionItems !== undefined) data.actionItems = JSON.stringify(actionItems);
  const item = await (prisma as any).meetingMinute.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await (prisma as any).meetingMinute.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
