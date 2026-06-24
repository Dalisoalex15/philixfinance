import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export type UserRole = "SUPER_ADMIN" | "MANAGER" | "LOAN_OFFICER" | "COLLECTIONS_OFFICER" | "ACCOUNTANT";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  branchId?: string | null;
  firstName?: string;
  lastName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser & { sessionId?: string };

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, status: true, branchId: true, firstName: true, lastName: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Account is not active" });
    }

    req.user = { id: user.id, email: user.email, role: user.role, branchId: user.branchId, firstName: user.firstName, lastName: user.lastName };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export const isSuperAdmin = authorize("SUPER_ADMIN");
export const isManagerOrAbove = authorize("SUPER_ADMIN", "MANAGER");
export const isLoanOfficerOrAbove = authorize("SUPER_ADMIN", "MANAGER", "LOAN_OFFICER");
