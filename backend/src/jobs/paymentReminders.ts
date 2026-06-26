import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { Mailer } from "../lib/mailer";

function computeSchedule(app: {
  reviewedAt: Date | null;
  termMonths: number;
  amountRequested: number;
  interestRate: number;
}) {
  const start = app.reviewedAt ? new Date(app.reviewedAt) : new Date();
  const rate = app.interestRate ?? 20;
  const totalDue = Math.ceil(app.amountRequested * (1 + rate / 100));
  const weeklyAmt = Math.ceil(totalDue / (app.termMonths || 1));

  return {
    totalDue,
    weeklyAmt,
    weeks: Array.from({ length: app.termMonths }, (_, i) => ({
      week: i + 1,
      dueDate: new Date(start.getTime() + (i + 1) * 7 * 86400000),
      amount: weeklyAmt,
    })),
  };
}

async function runReminders() {
  const now = new Date();

  const disbursed = await prisma.portalLoanApplication.findMany({
    where: { status: "DISBURSED" },
    include: {
      account: { select: { id: true, email: true, firstName: true } },
      paymentSubmissions: { where: { status: "APPROVED" }, select: { amount: true } },
    },
  });

  let remindedCount = 0;
  let overdueCount = 0;

  for (const app of disbursed) {
    const acc = app.account;
    if (!acc?.email) continue;

    const { totalDue, weeklyAmt, weeks } = computeSchedule(app);
    const totalPaid = app.paymentSubmissions.reduce((s, p) => s + (p.amount ?? 0), 0);
    const paidWeeks = Math.min(app.termMonths, Math.floor(totalPaid / weeklyAmt));

    const unpaidWeeks = weeks.slice(paidWeeks);
    if (unpaidWeeks.length === 0) continue;

    const nextDue = unpaidWeeks[0];
    const daysUntil = Math.round((nextDue.dueDate.getTime() - now.getTime()) / 86400000);
    const daysOverdue = -daysUntil;

    // Upcoming reminder (3 days or 1 day before)
    if (daysUntil === 3 || daysUntil === 1) {
      await Mailer.paymentReminder({
        email: acc.email,
        firstName: acc.firstName,
        reference: app.reference,
        amountDue: nextDue.amount,
        dueDate: nextDue.dueDate,
        totalDue,
        totalPaid,
        accountId: acc.id,
      }).catch(() => {});
      remindedCount++;
    }

    // Overdue notice (day 1, 7, 30 after missed)
    if (daysOverdue > 0 && [1, 7, 30].includes(daysOverdue)) {
      await Mailer.overdueNotice({
        email: acc.email,
        firstName: acc.firstName,
        reference: app.reference,
        amountDue: nextDue.amount,
        daysOverdue,
        totalDue,
        totalPaid,
        accountId: acc.id,
      }).catch(() => {});
      overdueCount++;
    }
  }

  logger.info(`Cron: reminders=${remindedCount}, overdue=${overdueCount} (${disbursed.length} active loans checked)`);
}

async function runDocumentExpiryAlerts() {
  // Notify clients whose KYC docs are approaching 1 year old (30-day heads-up)
  const cutoffWarn  = new Date(Date.now() - 335 * 86400000); // 335 days ago
  const cutoffExpired = new Date(Date.now() - 365 * 86400000); // 365 days ago

  const [warnDocs, expiredDocs] = await Promise.all([
    prisma.kycDocument.findMany({
      where: { uploadedAt: { gte: cutoffExpired, lte: cutoffWarn } },
      distinct: ["accountId"],
      include: { account: { select: { id: true, email: true, firstName: true } } },
    }),
    prisma.kycDocument.findMany({
      where: { uploadedAt: { lt: cutoffExpired } },
      distinct: ["accountId"],
      include: { account: { select: { id: true, email: true, firstName: true } } },
    }),
  ]);

  let notified = 0;

  for (const doc of warnDocs) {
    const acc = doc.account;
    // Create in-app notification (avoid duplicating within 30 days)
    const recent = await prisma.clientNotification.findFirst({
      where: { accountId: acc.id, category: "KYC_EXPIRY_WARN", createdAt: { gte: new Date(Date.now() - 25 * 86400000) } },
    });
    if (recent) continue;

    await prisma.clientNotification.create({
      data: {
        accountId: acc.id,
        subject: "KYC Documents Due for Renewal",
        body: "Your KYC documents were submitted almost a year ago. Please update your documents to maintain full access to Philix Finance services.",
        category: "KYC_EXPIRY_WARN",
      },
    }).catch(() => {});
    notified++;
  }

  for (const doc of expiredDocs) {
    const acc = doc.account;
    const recent = await prisma.clientNotification.findFirst({
      where: { accountId: acc.id, category: "KYC_EXPIRED", createdAt: { gte: new Date(Date.now() - 25 * 86400000) } },
    });
    if (recent) continue;

    await prisma.clientNotification.create({
      data: {
        accountId: acc.id,
        subject: "Action Required: KYC Documents Expired",
        body: "Your KYC documents have expired (1+ year since submission). Please re-submit your documents to continue using loan services without interruption.",
        category: "KYC_EXPIRED",
      },
    }).catch(() => {});
    notified++;
  }

  logger.info(`Cron: doc expiry — ${warnDocs.length} warn, ${expiredDocs.length} expired, ${notified} notified`);
}

export function startCronJobs() {
  // Daily at 08:00 CAT — payment reminders
  cron.schedule("0 8 * * *", async () => {
    logger.info("Cron: payment reminders starting");
    try { await runReminders(); }
    catch (err) { logger.error("Cron: payment reminders failed", err); }
  }, { timezone: "Africa/Lusaka" });

  // Daily at 09:00 CAT — document expiry alerts
  cron.schedule("0 9 * * *", async () => {
    logger.info("Cron: document expiry check starting");
    try { await runDocumentExpiryAlerts(); }
    catch (err) { logger.error("Cron: document expiry check failed", err); }
  }, { timezone: "Africa/Lusaka" });

  logger.info("Cron jobs registered (08:00 reminders, 09:00 doc expiry — CAT)");
}
