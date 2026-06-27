// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isSuperAdmin } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    include: {
      _count: { select: { users: true, clients: true, loans: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json(branches);
});

router.post("/", isSuperAdmin, async (req: Request, res: Response) => {
  const { name, code, address, city, phone, email } = req.body;
  const branch = await prisma.branch.create({ data: { name, code, address, city, phone, email } });
  res.status(201).json(branch);
});

router.patch("/:id", isSuperAdmin, async (req: Request, res: Response) => {
  const branch = await prisma.branch.update({ where: { id: req.params.id }, data: req.body });
  res.json(branch);
});

export default router;