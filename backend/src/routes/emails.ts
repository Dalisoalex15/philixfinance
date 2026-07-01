// @ts-nocheck
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/mailer";
import { buildTemplate, TEMPLATE_LABELS, TEMPLATE_SAMPLES } from "../services/emailTemplates";
import { authenticate as isLoggedIn, isManagerOrAbove } from "../middleware/auth";
import { logger } from "../lib/logger";
import { Resend } from "resend";

const router = Router();

// ── Helper: log an email ──────────────────────────────────────────────────────
async function logEmail(data: {
  to: string; toName?: string; subject: string; template: string;
  bodyHtml?: string; status: string; accountId?: string; loanId?: string;
  triggeredBy?: string; triggerType?: string; resendId?: string; error?: string;
}) {
  try {
    await (prisma as any).emailLog.create({ data: { ...data, body: data.bodyHtml } });
  } catch (e) { logger.warn("emailLog.create failed", e); }
}

// ── Helper: resolve client data ───────────────────────────────────────────────
async function resolveClient(accountId: string) {
  return (prisma as any).clientPortalAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true, firstName: true, lastName: true, email: true, clientNumber: true,
      portalLoans: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, reference: true, productType: true, amountRequested: true,
          interestRate: true, termMonths: true, status: true,
          createdAt: true, reviewedAt: true, rejectedReason: true,
          paymentSubmissions: {
            where: { status: "APPROVED" },
            select: { amount: true, createdAt: true, paymentMethod: true, reference: true },
          },
        },
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/emails/send — staff-triggered single send
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/send", isLoggedIn, async (req: Request, res: Response) => {
  const { templateKey, accountId, loanId, params, customSubject, customBody } = req.body;
  const staff = (req as any).user;

  if (!templateKey || !accountId) {
    return res.status(400).json({ error: "templateKey and accountId are required" });
  }

  const client = await resolveClient(accountId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const loan = loanId
    ? client.portalLoans.find((l: any) => l.id === loanId)
    : client.portalLoans[0];

  // Build template-specific params
  let templateParams: Record<string, any> = {
    clientName: `${client.firstName} ${client.lastName}`,
    ...params,
  };

  if (templateKey === "custom") {
    if (!customSubject || !customBody) {
      return res.status(400).json({ error: "customSubject and customBody required for custom emails" });
    }
    templateParams = { clientName: `${client.firstName} ${client.lastName}`, customSubject, customBody, staffName: `${staff.firstName} ${staff.lastName}` };
  } else if (templateKey === "payment_reminder" && loan) {
    const paid = loan.paymentSubmissions.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const principal = loan.amountRequested;
    const interest = principal * (loan.interestRate / 100) * (loan.termMonths / 12);
    const totalDue = principal + interest;
    const weekly = totalDue / (loan.termMonths * 4.33);
    const dueDate = new Date(loan.reviewedAt || loan.createdAt);
    dueDate.setMonth(dueDate.getMonth() + loan.termMonths);
    const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86400000));
    templateParams = {
      ...templateParams,
      loanId: loan.reference,
      instalmentAmount: params?.instalmentAmount ?? weekly,
      dueDate: dueDate.toISOString(),
      daysUntilDue: params?.daysUntilDue ?? daysUntilDue,
      remainingBalance: params?.remainingBalance ?? Math.max(0, totalDue - paid),
    };
  } else if (templateKey === "overdue_notice" && loan) {
    const paid = loan.paymentSubmissions.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const principal = loan.amountRequested;
    const interest = principal * (loan.interestRate / 100) * (loan.termMonths / 12);
    const totalDue = principal + interest;
    const remaining = Math.max(0, totalDue - paid);
    const dueDate = new Date(loan.reviewedAt || loan.createdAt);
    dueDate.setMonth(dueDate.getMonth() + loan.termMonths);
    const daysOverdue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000));
    const penaltyAmount = remaining * 0.05 * Math.ceil(daysOverdue / 7);
    templateParams = {
      ...templateParams,
      loanId: loan.reference,
      overdueAmount: params?.overdueAmount ?? remaining,
      dueDate: dueDate.toISOString(),
      daysOverdue: params?.daysOverdue ?? daysOverdue,
      penaltyRate: params?.penaltyRate ?? "5% per week",
      penaltyAmount: params?.penaltyAmount ?? penaltyAmount,
      totalOwed: params?.totalOwed ?? (remaining + penaltyAmount),
    };
  } else if (templateKey === "monthly_statement") {
    const loans = client.portalLoans.filter((l: any) => l.status !== "DRAFT").map((l: any) => {
      const paid = l.paymentSubmissions.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const principal = l.amountRequested;
      const interest = principal * (l.interestRate / 100) * (l.termMonths / 12);
      const totalDue = principal + interest;
      return {
        loanId: l.reference, product: l.productType,
        disbursed: principal, totalDue, totalPaid: paid,
        remaining: Math.max(0, totalDue - paid), status: l.status,
      };
    });
    const allPayments = client.portalLoans.flatMap((l: any) => l.paymentSubmissions.map((p: any) => ({
      date: p.createdAt, amount: p.amount, method: p.paymentMethod || "CASH", loanId: l.reference,
    }))).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalOutstanding = loans.reduce((s: number, l: any) => s + l.remaining, 0);
    const period = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    templateParams = {
      ...templateParams,
      statementPeriod: params?.statementPeriod ?? period,
      loans, payments: allPayments, totalOutstanding,
    };
  }

  let tpl;
  try { tpl = buildTemplate(templateKey, templateParams); }
  catch (e: any) { return res.status(400).json({ error: e.message }); }

  const subject = templateKey === "custom" ? customSubject : tpl.subject;

  const fromName  = process.env.COMPANY_NAME || "Philix Finance";
  const fromEmail = process.env.SMTP_FROM || "noreply@philixfinance.com";
  let resendId: string | undefined;
  let status = "SENT";
  let error: string | undefined;

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [client.email],
        subject,
        html: tpl.html,
        text: tpl.text,
      });
      resendId = (result as any).data?.id;
    }
  } catch (err: any) {
    status = "FAILED";
    error = String(err.message || err);
    logger.error("Email send failed", err);
  }

  await logEmail({
    to: client.email,
    toName: `${client.firstName} ${client.lastName}`,
    subject,
    template: templateKey,
    bodyHtml: tpl.html,
    status,
    accountId: client.id,
    loanId: loan?.id,
    triggeredBy: `${staff.firstName} ${staff.lastName}`,
    triggerType: "manual",
    resendId,
    error,
  });

  if (status === "FAILED") {
    return res.status(500).json({ error: "Email failed to send", detail: error });
  }

  return res.json({ ok: true, to: client.email, subject, resendId });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/emails/send-bulk — bulk send to filtered clients
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/send-bulk", isLoggedIn, isManagerOrAbove, async (req: Request, res: Response) => {
  const { templateKey, clientFilter, params } = req.body;
  const staff = (req as any).user;

  if (!templateKey) return res.status(400).json({ error: "templateKey required" });

  // Build where clause from filter
  const where: any = { isBlacklisted: false };
  if (clientFilter?.status) where.status = clientFilter.status;
  if (clientFilter?.kycStatus) where.kycStatus = clientFilter.kycStatus;
  if (clientFilter?.loanStatus) {
    where.portalLoans = { some: { status: clientFilter.loanStatus } };
  }

  const clients = await (prisma as any).clientPortalAccount.findMany({
    where,
    select: {
      id: true, firstName: true, lastName: true, email: true, clientNumber: true,
      portalLoans: {
        where: clientFilter?.loanStatus ? { status: clientFilter.loanStatus } : undefined,
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, reference: true, productType: true, amountRequested: true,
          interestRate: true, termMonths: true, status: true, createdAt: true, reviewedAt: true,
          paymentSubmissions: {
            where: { status: "APPROVED" },
            select: { amount: true, createdAt: true, paymentMethod: true, reference: true },
          },
        },
      },
    },
  });

  if (clients.length === 0) {
    return res.json({ ok: true, sent: 0, failed: 0, skipped: 0, message: "No clients matched the filter" });
  }

  const fromName  = process.env.COMPANY_NAME || "Philix Finance";
  const fromEmail = process.env.SMTP_FROM || "noreply@philixfinance.com";
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  const results = await Promise.allSettled(
    clients.map(async (client: any) => {
      const loan = client.portalLoans[0];
      const clientName = `${client.firstName} ${client.lastName}`;
      const period = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

      let templateParams: Record<string, any> = { clientName, ...params };

      if (templateKey === "monthly_statement") {
        const fullClient = await resolveClient(client.id);
        if (!fullClient) return { ok: false, email: client.email, error: "not found" };
        const loans = fullClient.portalLoans.filter((l: any) => l.status !== "DRAFT").map((l: any) => {
          const paid = l.paymentSubmissions.reduce((s: number, p: any) => s + (p.amount || 0), 0);
          const principal = l.amountRequested;
          const interest = principal * (l.interestRate / 100) * (l.termMonths / 12);
          const totalDue = principal + interest;
          return { loanId: l.reference, product: l.productType, disbursed: principal, totalDue, totalPaid: paid, remaining: Math.max(0, totalDue - paid), status: l.status };
        });
        const allPayments = fullClient.portalLoans.flatMap((l: any) =>
          l.paymentSubmissions.map((p: any) => ({ date: p.createdAt, amount: p.amount, method: p.paymentMethod || "CASH", loanId: l.reference }))
        ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        templateParams = { clientName, statementPeriod: period, loans, payments: allPayments, totalOutstanding: loans.reduce((s: number, l: any) => s + l.remaining, 0) };
      } else if (templateKey === "payment_reminder" && loan) {
        const paid = loan.paymentSubmissions.reduce((s: number, p: any) => s + (p.amount || 0), 0);
        const totalDue = loan.amountRequested * (1 + loan.interestRate / 100 * loan.termMonths / 12);
        const dueDate = new Date(loan.reviewedAt || loan.createdAt);
        dueDate.setMonth(dueDate.getMonth() + loan.termMonths);
        const daysUntilDue = Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86400000));
        templateParams = { clientName, loanId: loan.reference, instalmentAmount: totalDue / (loan.termMonths * 4.33), dueDate: dueDate.toISOString(), daysUntilDue, remainingBalance: Math.max(0, totalDue - paid) };
      } else if (templateKey === "overdue_notice" && loan) {
        const paid = loan.paymentSubmissions.reduce((s: number, p: any) => s + (p.amount || 0), 0);
        const totalDue = loan.amountRequested * (1 + loan.interestRate / 100 * loan.termMonths / 12);
        const remaining = Math.max(0, totalDue - paid);
        const dueDate = new Date(loan.reviewedAt || loan.createdAt);
        dueDate.setMonth(dueDate.getMonth() + loan.termMonths);
        const daysOverdue = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000));
        const penalty = remaining * 0.05 * Math.ceil(daysOverdue / 7);
        templateParams = { clientName, loanId: loan?.reference || "N/A", overdueAmount: remaining, dueDate: dueDate.toISOString(), daysOverdue, penaltyRate: "5% per week", penaltyAmount: penalty, totalOwed: remaining + penalty };
      }

      let tpl;
      try { tpl = buildTemplate(templateKey, templateParams); }
      catch { return { ok: false, email: client.email, error: "template build failed" }; }

      let resendId: string | undefined;
      let status = "SENT";
      let error: string | undefined;

      try {
        if (resend) {
          const result = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: [client.email],
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
          });
          resendId = (result as any).data?.id;
        }
      } catch (err: any) {
        status = "FAILED"; error = String(err.message || err);
      }

      await logEmail({ to: client.email, toName: clientName, subject: tpl.subject, template: templateKey, bodyHtml: tpl.html, status, accountId: client.id, loanId: loan?.id, triggeredBy: `${staff.firstName} ${staff.lastName}`, triggerType: "manual", resendId, error });

      return { ok: status === "SENT", email: client.email, resendId };
    })
  );

  const sent    = results.filter(r => r.status === "fulfilled" && (r as any).value.ok).length;
  const failed  = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !(r as any).value.ok)).length;
  const skipped = clients.length - sent - failed;

  return res.json({ ok: true, total: clients.length, sent, failed, skipped, template: templateKey });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/emails/log — paginated email log with filters
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/log", isLoggedIn, async (req: Request, res: Response) => {
  const page    = Math.max(1, parseInt(String(req.query.page  || "1")));
  const limit   = Math.min(100, parseInt(String(req.query.limit || "50")));
  const skip    = (page - 1) * limit;

  const where: any = {};
  if (req.query.accountId)   where.accountId   = req.query.accountId;
  if (req.query.template)    where.template     = req.query.template;
  if (req.query.triggerType) where.triggerType  = req.query.triggerType;
  if (req.query.status)      where.status       = req.query.status;
  if (req.query.dateFrom || req.query.dateTo) {
    where.createdAt = {};
    if (req.query.dateFrom) where.createdAt.gte = new Date(String(req.query.dateFrom));
    if (req.query.dateTo)   where.createdAt.lte = new Date(String(req.query.dateTo));
  }
  if (req.query.search) {
    where.OR = [
      { to: { contains: String(req.query.search) } },
      { toName: { contains: String(req.query.search) } },
      { subject: { contains: String(req.query.search) } },
    ];
  }

  const [total, logs] = await Promise.all([
    (prisma as any).emailLog.count({ where }),
    (prisma as any).emailLog.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, to: true, toName: true, subject: true, template: true,
        status: true, triggerType: true, triggeredBy: true,
        resendId: true, openedAt: true, createdAt: true, error: true,
        accountId: true, loanId: true, bodyHtml: true,
      },
    }),
  ]);

  return res.json({ total, page, limit, pages: Math.ceil(total / limit), logs });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/emails/log/:id — single email detail (for view modal)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/log/:id", isLoggedIn, async (req: Request, res: Response) => {
  const log = await (prisma as any).emailLog.findUnique({ where: { id: req.params.id } });
  if (!log) return res.status(404).json({ error: "Not found" });
  return res.json(log);
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/emails/log/:id/retry — retry a failed email
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/log/:id/retry", isLoggedIn, async (req: Request, res: Response) => {
  const log = await (prisma as any).emailLog.findUnique({ where: { id: req.params.id } });
  if (!log) return res.status(404).json({ error: "Not found" });
  if (log.status !== "FAILED") return res.status(400).json({ error: "Only FAILED emails can be retried" });

  const fromName  = process.env.COMPANY_NAME || "Philix Finance";
  const fromEmail = process.env.SMTP_FROM || "noreply@philixfinance.com";
  const staff = (req as any).user;

  let resendId: string | undefined;
  let newStatus = "SENT";
  let error: string | undefined;

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [log.to],
        subject: log.subject,
        html: log.bodyHtml || log.body || log.subject,
        text: log.subject,
      });
      resendId = (result as any).data?.id;
    }
  } catch (err: any) {
    newStatus = "FAILED"; error = String(err.message || err);
  }

  await (prisma as any).emailLog.update({
    where: { id: log.id },
    data: { status: newStatus, resendId, error: error || null, updatedAt: new Date() },
  });

  return res.json({ ok: newStatus === "SENT", status: newStatus });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/emails/clients/search — search for clients for the picker
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/clients/search", isLoggedIn, async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  if (!q || q.length < 2) return res.json([]);

  const clients = await (prisma as any).clientPortalAccount.findMany({
    where: {
      isBlacklisted: false,
      OR: [
        { firstName:    { contains: q } } as any,
        { lastName:     { contains: q } } as any,
        { email:        { contains: q } } as any,
        { clientNumber: { contains: q } } as any,
        { phone:        { contains: q } } as any,
      ],
    } as any,
    take: 20,
    select: {
      id: true, firstName: true, lastName: true, email: true, clientNumber: true,
      portalLoans: {
        take: 5,
        where: { status: { notIn: ["REJECTED", "DRAFT"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, status: true, amountRequested: true, productType: true },
      },
    },
  });

  return res.json(clients.map((c: any) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    email: c.email,
    clientNumber: c.clientNumber,
    loans: c.portalLoans,
  })));
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/emails/preview/:templateKey — returns sample HTML for template preview
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/preview/:templateKey", isLoggedIn, (_req: Request, res: Response) => {
  const key = _req.params.templateKey;
  const sampleParams = TEMPLATE_SAMPLES[key];
  if (!sampleParams) return res.status(400).json({ error: `Unknown template: ${key}` });
  try {
    const tpl = buildTemplate(key, sampleParams);
    res.setHeader("Content-Type", "text/html");
    return res.send(tpl.html);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/webhooks/resend — Resend delivery event webhook
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/webhook/resend", async (req: Request, res: Response) => {
  // Webhook secret validation (optional — set RESEND_WEBHOOK_SECRET in env)
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers["svix-signature"] || req.headers["resend-signature"];
    if (!sig || !String(sig).includes(secret.slice(0, 8))) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  }

  const event = req.body;
  const emailId = event?.data?.email_id || event?.data?.id;
  const eventType = event?.type;

  if (!emailId || !eventType) return res.status(200).json({ ok: true });

  let statusMap: Record<string, string> = {
    "email.delivered": "DELIVERED",
    "email.bounced":   "BOUNCED",
    "email.complained":"BOUNCED",
    "email.opened":    "DELIVERED",
  };

  const newStatus = statusMap[eventType];
  if (!newStatus) return res.status(200).json({ ok: true });

  try {
    const updateData: any = { status: newStatus, updatedAt: new Date() };
    if (eventType === "email.opened") updateData.openedAt = new Date();

    await (prisma as any).emailLog.updateMany({
      where: { resendId: emailId },
      data: updateData,
    });
  } catch (e) { logger.warn("webhook emailLog update failed", e); }

  return res.status(200).json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/emails/send-test — send a test email of any template to philixfinance15@gmail.com
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/send-test", isLoggedIn, async (req: Request, res: Response) => {
  const { templateKey } = req.body;
  if (!templateKey) return res.status(400).json({ error: "templateKey required" });

  const TEST_EMAIL = "philixfinance15@gmail.com";
  const staff = (req as any).user;

  const sampleParams = TEMPLATE_SAMPLES[templateKey];
  if (!sampleParams) return res.status(400).json({ error: `No sample data for template: ${templateKey}` });

  let tpl: any;
  try { tpl = buildTemplate(templateKey, sampleParams); }
  catch (e: any) { return res.status(400).json({ error: e.message }); }

  const fromName  = process.env.COMPANY_NAME || "Philix Finance";
  const fromEmail = process.env.SMTP_FROM    || "noreply@philixfinance.com";
  let resendId: string | undefined;
  let status = "SENT";
  let error: string | undefined;

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [TEST_EMAIL],
        subject: `[TEST] ${tpl.subject}`,
        html: tpl.html,
        text: tpl.text,
      });
      resendId = (result as any).data?.id;
    } else {
      return res.status(503).json({ error: "No email provider configured. Set RESEND_API_KEY in backend/.env" });
    }
  } catch (err: any) {
    status = "FAILED"; error = String(err.message || err);
    logger.error("Test email failed", err);
  }

  await logEmail({
    to: TEST_EMAIL, toName: "Test Recipient",
    subject: `[TEST] ${tpl.subject}`, template: templateKey,
    bodyHtml: tpl.html, status,
    triggeredBy: `${staff.firstName} ${staff.lastName}`,
    triggerType: "test", resendId, error,
  });

  if (status === "FAILED") {
    return res.status(500).json({ error: "Test email failed to send", detail: error });
  }
  return res.json({ ok: true, to: TEST_EMAIL, subject: `[TEST] ${tpl.subject}`, resendId });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/emails/stats — email stats for the Email Centre header
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/stats", isLoggedIn, async (_req: Request, res: Response) => {
  const since = new Date(); since.setDate(since.getDate() - 30);

  const [total, sent, failed, delivered] = await Promise.all([
    (prisma as any).emailLog.count({ where: { createdAt: { gte: since } } }),
    (prisma as any).emailLog.count({ where: { createdAt: { gte: since }, status: "SENT" } }),
    (prisma as any).emailLog.count({ where: { createdAt: { gte: since }, status: "FAILED" } }),
    (prisma as any).emailLog.count({ where: { createdAt: { gte: since }, status: "DELIVERED" } }),
  ]);

  const deliveryRate = total > 0 ? Math.round(((sent + delivered) / total) * 100) : 0;
  return res.json({ total, sent, failed, delivered, deliveryRate, period: "Last 30 days" });
});

export default router;
