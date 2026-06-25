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

export function startCronJobs() {
  // Daily at 08:00 CAT
  cron.schedule("0 8 * * *", async () => {
    logger.info("Cron: payment reminders starting");
    try {
      await runReminders();
    } catch (err) {
      logger.error("Cron: payment reminders failed", err);
    }
  }, { timezone: "Africa/Lusaka" });

  logger.info("Cron jobs registered (daily at 08:00 CAT)");
}
