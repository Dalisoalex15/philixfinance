// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.post("/", async (req: Request, res: Response) => {
  const { type, fileName, fileUrl, clientId, collateralId, loanId, notes, fileSize, mimeType } = req.body;
  const doc = await prisma.document.create({
    data: { type, fileName, fileUrl, clientId, collateralId, loanId, notes, fileSize, mimeType, uploadedById: req.user!.id },
  });
  res.status(201).json(doc);
});

router.get("/client/:clientId", async (req: Request, res: Response) => {
  const docs = await prisma.document.findMany({
    where: { clientId: req.params.clientId },
    orderBy: { createdAt: "desc" },
  });
  res.json(docs);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await prisma.document.delete({ where: { id: req.params.id } });
  res.json({ message: "Document deleted" });
});

export default router;