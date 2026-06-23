import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

interface PortalTokenPayload {
  id: string;
  email: string;
  type: "client";
}

export function authenticatePortal(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return next(new AppError("Authentication required", 401));

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as PortalTokenPayload;
    if (payload.type !== "client") return next(new AppError("Invalid token type", 401));
    (req as Request & { portalAccountId: string; portalEmail: string }).portalAccountId = payload.id;
    (req as Request & { portalAccountId: string; portalEmail: string }).portalEmail = payload.email;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}
