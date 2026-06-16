import { prisma } from "./prisma";
import { Request } from "express";

interface AuditParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: object;
  newValue?: object;
  description: string;
  req?: Request;
}

export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : undefined,
        newValue: params.newValue ? JSON.stringify(params.newValue) : undefined,
        description: params.description,
        ipAddress: params.req?.ip,
        userAgent: params.req?.headers["user-agent"],
      },
    });
  } catch (err) {
    // Audit failures should not break business logic
    console.error("Audit log failed:", err);
  }
}
