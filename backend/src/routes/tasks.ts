// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const { status, priority, assigneeId } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  else if (req.user!.role === "LOAN_OFFICER" || req.user!.role === "COLLECTIONS_OFFICER") {
    where.assigneeId = req.user!.id;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { firstName: true, lastName: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  res.json(tasks);
});

router.post("/", async (req: Request, res: Response) => {
  const { title, description, assigneeId, priority, dueDate, clientId, loanId, notes } = req.body;
  const task = await prisma.task.create({
    data: {
      title, description, assigneeId, priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      clientId, loanId, notes, createdById: req.user!.id,
    },
    include: {
      assignee: { select: { firstName: true, lastName: true } },
    },
  });
  res.status(201).json(task);
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  const { status, notes } = req.body;
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status,
      notes,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  });
  res.json(task);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ message: "Task deleted" });
});

export default router;