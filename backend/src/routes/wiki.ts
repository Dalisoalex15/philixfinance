// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, isManagerOrAbove } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response) => {
  const { search, category } = req.query;
  const where: any = { isPublished: true };
  if (category) where.category = category;
  if (search) where.OR = [
    { title: { contains: search as string, mode: "insensitive" } },
    { content: { contains: search as string, mode: "insensitive" } },
  ];

  const pages = await prisma.wikiPage.findMany({
    where,
    select: { id: true, title: true, slug: true, category: true, viewCount: true, updatedAt: true,
      author: { select: { firstName: true, lastName: true } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json(pages);
});

router.get("/:slug", async (req: Request, res: Response) => {
  const page = await prisma.wikiPage.findUnique({
    where: { slug: req.params.slug },
    include: { author: { select: { firstName: true, lastName: true } } },
  });
  if (!page) throw new AppError("Page not found", 404);
  await prisma.wikiPage.update({ where: { id: page.id }, data: { viewCount: { increment: 1 } } });
  res.json(page);
});

router.post("/", isManagerOrAbove, async (req: Request, res: Response) => {
  const { title, content, category } = req.body;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const page = await prisma.wikiPage.create({
    data: { title, content, category, slug, authorId: req.user!.id },
  });
  res.status(201).json(page);
});

router.put("/:id", isManagerOrAbove, async (req: Request, res: Response) => {
  const { title, content, category, isPublished } = req.body;
  const slug = title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const page = await prisma.wikiPage.update({
    where: { id: req.params.id },
    data: { title, content, category, slug, isPublished },
  });
  res.json(page);
});

export default router;