// @ts-nocheck
// Philix Finance — 10 Branded Email Templates
// All use the exact format from brand screenshots (dark navy header, diamond sections, QR CTA)

import { buildPhilixEmail, fmt, fmtK, fmtDate } from "../lib/emailBuilder";

const PORTAL = process.env.FRONTEND_URL || "https://philix-finance.vercel.app";

// ── Template result type ──────────────────────────────────────────────────────
export interface EmailTemplate { subject: string; html: string; text: string; }

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WELCOME
// ═══════════════════════════════════════════════════════════════════════════════
export function templateWelcome(p: {
  clientName: string; loginEmail: string; loginUrl: string; tempPassword?: string;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];
  const html = buildPhilixEmail({
    ref: "", firstName,
    headerSubtitle: "CREATING A FUTURE TOGETHER",
    quote: "Welcome to Philix Finance — your trusted financial partner in Zambia.",
    actionType: "Required",
    actionLine: "Log in to your account to complete KYC and apply for your first loan.",
    subLine: "Funds can be disbursed within 24 hours after KYC approval.",
    particulars: [
      { label: "Full Name",     value: p.clientName },
      { label: "Login Email",   value: p.loginEmail },
      { label: "Portal Access", value: PORTAL + "/portal" },
      ...(p.tempPassword ? [{ label: "Temporary Password", value: p.tempPassword }] : []),
    ],
    breakdown: [
      { label: "Account Status",  value: "Active",   color: "#16a34a", bold: true },
      { label: "KYC Status",      value: "Pending — action needed", color: "#d97706" },
      { label: "Loan Eligibility",value: "Available after KYC" },
    ],
    totalPaid: 0, totalDue: 0,
    ctaType: "button",
    buttonText: "Open Client Portal",
    buttonUrl: p.loginUrl,
  });
  return {
    subject: `Welcome to Philix Finance, ${p.clientName}`,
    html,
    text: `Welcome to Philix Finance, ${p.clientName}!\n\nLog in at: ${p.loginUrl}\nEmail: ${p.loginEmail}${p.tempPassword ? `\nPassword: ${p.tempPassword}` : ""}\n\nComplete your KYC to unlock loans.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LOAN APPLICATION RECEIVED
// ═══════════════════════════════════════════════════════════════════════════════
export function templateLoanApplicationReceived(p: {
  clientName: string; loanId: string; productName: string;
  amount: number; duration: string; submittedDate: string;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];
  const html = buildPhilixEmail({
    ref: p.loanId, firstName,
    quote: "Every great financial journey begins with a single step. Thank you for trusting us.",
    actionType: "Update",
    actionLine: "Your application is under review. We will contact you within 24-48 hours.",
    subLine: "You can check your application status at any time in your Client Portal.",
    particulars: [
      { label: "Application Ref", value: p.loanId },
      { label: "Product",         value: p.productName },
      { label: "Amount Requested",value: `ZMW ${fmt(p.amount)}` },
      { label: "Duration",        value: p.duration },
      { label: "Submitted",       value: fmtDate(p.submittedDate) },
      { label: "Status",          value: "Under Review" },
    ],
    breakdown: [
      { label: "Amount Requested", value: `ZMW ${fmt(p.amount)}` },
      { label: "Status",           value: "Pending Decision", color: "#d97706", bold: true },
    ],
    totalPaid: p.amount, totalDue: p.amount,
    ctaType: "button",
    buttonText: "Track Application Status",
    buttonUrl: `${PORTAL}/portal/loans`,
  });
  return {
    subject: `Loan Application Received — ${p.loanId}`,
    html,
    text: `Dear ${p.clientName},\n\nWe received your loan application ${p.loanId} for ZMW ${fmt(p.amount)} (${p.productName}). Decision within 24-48 hours.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. LOAN APPROVED
// ═══════════════════════════════════════════════════════════════════════════════
export function templateLoanApproved(p: {
  clientName: string; loanId: string; productName: string;
  principal: number; interestRate: number; totalRepayment: number;
  dueDate: string; disbursementDate: string;
}): EmailTemplate {
  const firstName  = p.clientName.split(" ")[0];
  const interest   = p.totalRepayment - p.principal;
  const daysUntil  = Math.round((new Date(p.dueDate).getTime() - Date.now()) / 86400000);
  const html = buildPhilixEmail({
    ref: p.loanId, firstName,
    quote: "Your loan has been approved. We are excited to support your goals.",
    actionType: "Required",
    actionLine: "Review your loan terms. Funds will be disbursed on the date shown below.",
    subLine: "Please ensure your collateral has been submitted and verified before disbursement.",
    particulars: [
      { label: "Loan Type",     value: p.productName },
      { label: "Due Date",      value: fmtDate(p.dueDate) },
      { label: "Status",        value: `Due in ${daysUntil} days` },
      { label: "Disbursement",  value: fmtDate(p.disbursementDate) },
    ],
    breakdown: [
      { label: "Principal",           value: `ZMW ${fmt(p.principal)}` },
      { label: `Interest (${p.interestRate}% flat)`, value: `ZMW ${fmt(interest)}` },
      { label: "Total Repayable",     value: `ZMW ${fmt(p.totalRepayment)}`, bold: true },
      { label: "Total Paid",          value: "- ZMW 0.00", color: "#16a34a", bold: true },
    ],
    totalPaid: 0, totalDue: p.totalRepayment,
    ctaType: "pay",
  });
  return {
    subject: `Your Loan Has Been Approved — ${p.loanId}`,
    html,
    text: `Dear ${p.clientName},\n\nYour loan ${p.loanId} has been approved!\nPrincipal: ZMW ${fmt(p.principal)}\nTotal Repayable: ZMW ${fmt(p.totalRepayment)}\nDue: ${fmtDate(p.dueDate)}\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LOAN REJECTED
// ═══════════════════════════════════════════════════════════════════════════════
export function templateLoanRejected(p: {
  clientName: string; loanId: string; rejectionReason: string;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];
  const html = buildPhilixEmail({
    ref: p.loanId, firstName,
    quote: "We remain committed to finding the right financial solution for you.",
    actionType: "Update",
    actionLine: "Unfortunately, your application was not approved at this time.",
    subLine: "You are welcome to reapply after 30 days or visit your nearest branch to discuss options.",
    particulars: [
      { label: "Application Ref", value: p.loanId },
      { label: "Decision",        value: "Not Approved" },
      { label: "Reason",          value: p.rejectionReason },
      { label: "Reapply After",   value: fmtDate(new Date(Date.now() + 30 * 86400000)) },
    ],
    breakdown: [
      { label: "Application Status", value: "Declined", color: "#ef4444", bold: true },
      { label: "Next Step",          value: "Reapply after 30 days or call us" },
    ],
    totalPaid: 0, totalDue: 0,
    ctaType: "button",
    buttonText: "Contact Your Branch",
    buttonUrl: `${PORTAL}/portal/support`,
    extraContent: `<div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;font-family:Arial,sans-serif;"><strong style="color:#991b1b;">Reason:</strong> <span style="color:#7f1d1d;">${p.rejectionReason}</span></p>
    </div>`,
  });
  return {
    subject: `Loan Application Update — ${p.loanId}`,
    html,
    text: `Dear ${p.clientName},\n\nYour application ${p.loanId} was not approved.\nReason: ${p.rejectionReason}\n\nYou may reapply after 30 days.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PAYMENT RECEIVED / CONFIRMED
// ═══════════════════════════════════════════════════════════════════════════════
export function templatePaymentReceived(p: {
  clientName: string; loanId: string; paymentAmount: number;
  paymentDate: string; paymentMethod: string; receiptNumber: string;
  remainingBalance: number; totalPaid: number; totalDue: number;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];
  const fullyPaid = p.remainingBalance <= 0;
  const html = buildPhilixEmail({
    ref: p.loanId, firstName,
    isCongratulations: fullyPaid,
    quote: fullyPaid
      ? "Smart debt is the fuel for business growth. Use your next loan to stock up inventory or upgrade equipment."
      : "Thank you for your payment. Every payment builds your credit profile with Philix Finance.",
    actionType: "Completed",
    actionLine: "Payment received and confirmed.",
    subLine: "Thank you for your continued partnership with Philix Finance.",
    particulars: [
      { label: "Loan Type",       value: "Trusted Client" },
      { label: "Payment Date",    value: fmtDate(p.paymentDate) },
      { label: "Method",          value: p.paymentMethod },
      { label: "Receipt",         value: p.receiptNumber },
    ],
    breakdown: [
      { label: "Amount Confirmed",   value: `ZMW ${fmt(p.paymentAmount)}`, color: "#16a34a", bold: true },
      { label: "Total Paid to Date", value: `ZMW ${fmt(p.totalPaid)}`, color: "#16a34a", bold: true },
    ],
    totalPaid: p.totalPaid, totalDue: p.totalDue,
    ctaType: fullyPaid ? "growth" : "pay",
  });
  return {
    subject: fullyPaid ? `Congratulations! Loan ${p.loanId} Fully Repaid` : `Payment Confirmed — ZMW ${fmt(p.paymentAmount)} on ${p.loanId}`,
    html,
    text: `Dear ${p.clientName},\n\nPayment of ZMW ${fmt(p.paymentAmount)} confirmed for loan ${p.loanId}.\nTotal paid: ZMW ${fmt(p.totalPaid)}\nRemaining: ZMW ${fmt(p.remainingBalance)}\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PAYMENT REMINDER
// ═══════════════════════════════════════════════════════════════════════════════
export function templatePaymentReminder(p: {
  clientName: string; loanId: string; instalmentAmount: number;
  dueDate: string; daysUntilDue: number; remainingBalance: number;
}): EmailTemplate {
  const firstName   = p.clientName.split(" ")[0];
  const statusText  = p.daysUntilDue <= 1 ? "Due tomorrow" : `Due in ${p.daysUntilDue} days`;
  const html = buildPhilixEmail({
    ref: p.loanId, firstName,
    quote: "Your facility is maturing soon.",
    actionType: "Required",
    actionLine: "Please prepare your payment before the due date.",
    subLine: "Planning ahead ensures a stress-free financial life.",
    particulars: [
      { label: "Loan Type",        value: "Trusted Client" },
      { label: "Due Date",         value: fmtDate(p.dueDate) },
      { label: "Status",           value: statusText },
      { label: "Amount Due",       value: `ZMW ${fmt(p.instalmentAmount)}` },
    ],
    breakdown: [
      { label: "Amount Due",          value: `ZMW ${fmt(p.instalmentAmount)}`, bold: true },
      { label: "Remaining Balance",   value: `ZMW ${fmt(p.remainingBalance)}` },
      { label: "Total Paid",          value: `- ZMW ${fmt(p.remainingBalance > 0 ? 0 : p.instalmentAmount)}`, color: "#16a34a", bold: true },
    ],
    totalPaid: Math.max(0, p.remainingBalance > 0 ? 0 : p.instalmentAmount),
    totalDue: p.remainingBalance + p.instalmentAmount,
    ctaType: "pay",
  });
  return {
    subject: `Reminder: Payment due in ${p.daysUntilDue} day${p.daysUntilDue !== 1 ? "s" : ""} — ${p.loanId}`,
    html,
    text: `Dear ${p.clientName},\n\nReminder: ZMW ${fmt(p.instalmentAmount)} is due on ${fmtDate(p.dueDate)} for loan ${p.loanId}.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. OVERDUE NOTICE
// ═══════════════════════════════════════════════════════════════════════════════
export function templateOverdueNotice(p: {
  clientName: string; loanId: string; overdueAmount: number;
  dueDate: string; daysOverdue: number; penaltyRate: string;
  penaltyAmount: number; totalOwed: number;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];
  const html = buildPhilixEmail({
    ref: p.loanId, firstName,
    quote: "Settling overdue amounts protects your credit and keeps future loans available.",
    actionType: "Required",
    actionLine: `Make payment now — ${p.daysOverdue} day${p.daysOverdue !== 1 ? "s" : ""} overdue.`,
    subLine: "Continued non-payment may affect your credit score and future eligibility.",
    particulars: [
      { label: "Loan Type",     value: "Trusted Client" },
      { label: "Due Date",      value: fmtDate(p.dueDate) },
      { label: "Days Overdue",  value: `${p.daysOverdue} day${p.daysOverdue !== 1 ? "s" : ""}` },
      { label: "Status",        value: "OVERDUE — Action Required" },
    ],
    breakdown: [
      { label: "Amount Overdue",       value: `ZMW ${fmt(p.overdueAmount)}`, color: "#ef4444", bold: true },
      { label: `Penalty (${p.penaltyRate})`, value: `ZMW ${fmt(p.penaltyAmount)}`, color: "#ef4444" },
      { label: "Total Now Owed",       value: `ZMW ${fmt(p.totalOwed)}`, color: "#ef4444", bold: true },
      { label: "Total Paid",           value: "- ZMW 0.00", color: "#16a34a", bold: true },
    ],
    totalPaid: 0, totalDue: p.totalOwed,
    ctaType: "pay",
  });
  return {
    subject: `OVERDUE: Loan ${p.loanId} — ${p.daysOverdue} days past due`,
    html,
    text: `URGENT: Dear ${p.clientName},\n\nYour payment of ZMW ${fmt(p.overdueAmount)} for loan ${p.loanId} is ${p.daysOverdue} days overdue.\nTotal now owed (with penalty): ZMW ${fmt(p.totalOwed)}\n\nPlease pay immediately.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. LOAN FULLY REPAID / CONGRATULATIONS
// ═══════════════════════════════════════════════════════════════════════════════
export function templateLoanRepaid(p: {
  clientName: string; loanId: string; productName: string;
  totalPaid: number; repaidDate: string;
  collateralDescription: string; collectionDeadline: string; applyUrl: string;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];
  const html = buildPhilixEmail({
    ref: p.loanId, firstName,
    isCongratulations: true,
    quote: "Smart debt is the fuel for business growth. Use your next loan to invest in your future.",
    actionType: "Completed",
    actionLine: "Your loan has been fully settled. Collect your collateral at your branch.",
    subLine: "Thank you for your partnership with Philix Finance.",
    particulars: [
      { label: "Loan Type",          value: p.productName },
      { label: "Date Settled",       value: fmtDate(p.repaidDate) },
      { label: "Collateral",         value: p.collateralDescription },
      { label: "Collect By",         value: fmtDate(p.collectionDeadline) },
    ],
    breakdown: [
      { label: "Principal Loaned", value: `ZMW ${fmt(p.totalPaid * 0.83)}` },
      { label: "Total Repaid",     value: `ZMW ${fmt(p.totalPaid)}`, color: "#16a34a", bold: true },
    ],
    totalPaid: p.totalPaid, totalDue: p.totalPaid,
    ctaType: "growth",
  });
  return {
    subject: `Congratulations! Loan ${p.loanId} Fully Repaid`,
    html,
    text: `Congratulations ${p.clientName}! Your loan ${p.loanId} is fully repaid.\nTotal paid: ZMW ${fmt(p.totalPaid)}\nCollect your collateral by ${fmtDate(p.collectionDeadline)}.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. MONTHLY STATEMENT
// ═══════════════════════════════════════════════════════════════════════════════
export function templateMonthlyStatement(p: {
  clientName: string; statementPeriod: string;
  loans: { loanId: string; product: string; disbursed: number; totalDue: number; totalPaid: number; remaining: number; status: string }[];
  payments: { date: string; amount: number; method: string; loanId: string }[];
  totalOutstanding: number;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];

  const loanTableRows = p.loans.map(l => `
    <tr>
      <td style="padding:8px 10px;font-size:11px;font-family:monospace;color:#1e293b;border-top:1px solid #f1f5f9;">${l.loanId}</td>
      <td style="padding:8px 10px;font-size:11px;font-family:Arial,sans-serif;color:#1e293b;border-top:1px solid #f1f5f9;">${l.product.replace(/_/g," ")}</td>
      <td style="padding:8px 10px;font-size:11px;font-family:Arial,sans-serif;color:#1e293b;border-top:1px solid #f1f5f9;">ZMW ${fmt(l.disbursed)}</td>
      <td style="padding:8px 10px;font-size:11px;font-family:Arial,sans-serif;color:#166534;border-top:1px solid #f1f5f9;">ZMW ${fmt(l.totalPaid)}</td>
      <td style="padding:8px 10px;font-size:11px;font-family:Arial,sans-serif;color:${l.remaining <= 0 ? "#166534" : "#ef4444"};font-weight:700;border-top:1px solid #f1f5f9;">ZMW ${fmt(l.remaining)}</td>
      <td style="padding:8px 10px;font-size:10px;font-family:Arial,sans-serif;color:#64748b;border-top:1px solid #f1f5f9;">${l.status}</td>
    </tr>`).join("");

  const payRows = p.payments.slice(0, 10).map(pay => `
    <tr>
      <td style="padding:7px 10px;font-size:11px;font-family:Arial,sans-serif;color:#1e293b;border-top:1px solid #f1f5f9;">${fmtDate(pay.date)}</td>
      <td style="padding:7px 10px;font-size:11px;font-family:Arial,sans-serif;color:#166534;border-top:1px solid #f1f5f9;">ZMW ${fmt(pay.amount)}</td>
      <td style="padding:7px 10px;font-size:11px;font-family:Arial,sans-serif;color:#64748b;border-top:1px solid #f1f5f9;">${pay.method}</td>
      <td style="padding:7px 10px;font-size:11px;font-family:monospace;color:#64748b;border-top:1px solid #f1f5f9;">${pay.loanId}</td>
    </tr>`).join("");

  const statementHtml = `
    <p style="font-weight:700;color:#d97706;font-size:12px;margin-bottom:8px;letter-spacing:1px;font-family:Arial,sans-serif;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670; ACTIVE LOANS</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr style="background:#0B1F3A;">
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">LOAN ID</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">PRODUCT</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">DISBURSED</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">PAID</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">REMAINING</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">STATUS</th>
      </tr>
      ${loanTableRows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;font-family:Arial,sans-serif;">No active loans</td></tr>'}
    </table>
    ${p.payments.length > 0 ? `
    <p style="font-weight:700;color:#d97706;font-size:12px;margin-bottom:8px;letter-spacing:1px;font-family:Arial,sans-serif;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670; PAYMENT HISTORY</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <tr style="background:#0B1F3A;">
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">DATE</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">AMOUNT</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">METHOD</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;color:#94a3b8;font-family:Arial,sans-serif;">LOAN</th>
      </tr>
      ${payRows}
    </table>` : ""}
    <div style="background:#0B1F3A;border-radius:8px;padding:20px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:1px;font-family:Arial,sans-serif;">TOTAL OUTSTANDING</p>
      <p style="margin:6px 0 0;font-size:28px;font-weight:900;color:${p.totalOutstanding <= 0 ? "#16a34a" : "#ef4444"};font-family:Arial,sans-serif;">ZMW ${fmt(p.totalOutstanding)}</p>
    </div>`;

  const html = buildPhilixEmail({
    ref: `STMT-${p.statementPeriod.replace(/\s/g, "-")}`,
    firstName,
    quote: "We appreciate your partnership with Philix Finance.",
    actionType: "Update",
    actionLine: `Account Statement for ${p.statementPeriod}.`,
    subLine: "Log in to your portal for full details and to make payments.",
    extraContent: statementHtml,
    totalPaid: 0, totalDue: 0,
    ctaType: "button",
    buttonText: "View Full Statement Online",
    buttonUrl: `${PORTAL}/portal/statement`,
  });

  return {
    subject: `Your Philix Finance Statement — ${p.statementPeriod}`,
    html,
    text: `Dear ${p.clientName},\n\nStatement for ${p.statementPeriod}.\nTotal Outstanding: ZMW ${fmt(p.totalOutstanding)}\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. CUSTOM EMAIL
// ═══════════════════════════════════════════════════════════════════════════════
export function templateCustom(p: {
  clientName: string; customSubject: string; customBody: string; staffName: string;
}): EmailTemplate {
  const firstName = p.clientName.split(" ")[0];
  const safeBody = p.customBody
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=/gi, "data-blocked=")
    .replace(/javascript:/gi, "");

  const html = buildPhilixEmail({
    ref: "", firstName,
    quote: "A message from the Philix Finance team.",
    actionType: "Update",
    actionLine: p.customSubject,
    subLine: `Sent by ${p.staffName} — Philix Finance`,
    extraContent: `<div style="line-height:1.7;font-size:14px;color:#1e293b;margin-bottom:20px;font-family:Arial,sans-serif;">${safeBody}</div>`,
    totalPaid: 0, totalDue: 0,
    ctaType: "button",
    buttonText: "Open Client Portal",
    buttonUrl: `${PORTAL}/portal`,
  });

  return {
    subject: p.customSubject,
    html,
    text: `Dear ${p.clientName},\n\n${p.customBody.replace(/<[^>]+>/g, "")}\n\n${p.staffName}, Philix Finance`,
  };
}

// ── Template dispatcher ───────────────────────────────────────────────────────
export function buildTemplate(key: string, params: Record<string, any>): EmailTemplate {
  switch (key) {
    case "welcome":                   return templateWelcome(params as any);
    case "loan_application_received": return templateLoanApplicationReceived(params as any);
    case "loan_approved":             return templateLoanApproved(params as any);
    case "loan_rejected":             return templateLoanRejected(params as any);
    case "payment_received":          return templatePaymentReceived(params as any);
    case "payment_reminder":          return templatePaymentReminder(params as any);
    case "overdue_notice":            return templateOverdueNotice(params as any);
    case "loan_repaid":               return templateLoanRepaid(params as any);
    case "monthly_statement":         return templateMonthlyStatement(params as any);
    case "custom":                    return templateCustom(params as any);
    default: throw new Error(`Unknown template: ${key}`);
  }
}

export const TEMPLATE_LABELS: Record<string, string> = {
  welcome:                   "Welcome Email",
  loan_application_received: "Application Received",
  loan_approved:             "Loan Approved",
  loan_rejected:             "Loan Rejected",
  payment_received:          "Payment Received",
  payment_reminder:          "Payment Reminder",
  overdue_notice:            "Overdue Notice",
  loan_repaid:               "Loan Fully Repaid",
  monthly_statement:         "Monthly Statement",
  custom:                    "Custom Email",
};

// Sample data for previewing / testing each template
export const TEMPLATE_SAMPLES: Record<string, Record<string, any>> = {
  welcome: {
    clientName: "Chanda Mwale", loginEmail: "chanda@example.com",
    loginUrl: "https://philix-finance.vercel.app/portal", tempPassword: "Ch@nge2025",
  },
  loan_application_received: {
    clientName: "Mwanza Oscar", loanId: "PHX-2025-0001",
    productName: "Salary Loan", amount: 5000,
    duration: "3 months", submittedDate: new Date().toISOString(),
  },
  loan_approved: {
    clientName: "Kelvin Banda", loanId: "PHX-2025-0042",
    productName: "Business Loan", principal: 5000, interestRate: 20,
    totalRepayment: 6000, dueDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    disbursementDate: new Date().toISOString(),
  },
  loan_rejected: {
    clientName: "Chanda Mwale", loanId: "PHX-2025-0003",
    rejectionReason: "Insufficient collateral value to cover the requested loan amount.",
  },
  payment_received: {
    clientName: "Clive Chanda", loanId: "PHX-7588", paymentAmount: 300,
    paymentDate: new Date().toISOString(), paymentMethod: "MTN Mobile Money",
    receiptNumber: "RCP-001", remainingBalance: 220, totalPaid: 300, totalDue: 520,
  },
  payment_reminder: {
    clientName: "Clive Chanda", loanId: "PHX-7588",
    instalmentAmount: 220, dueDate: new Date(Date.now() + 86400000).toISOString(),
    daysUntilDue: 1, remainingBalance: 220,
  },
  overdue_notice: {
    clientName: "Mwanza Oscar", loanId: "PHX-3708",
    overdueAmount: 1500, dueDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    daysOverdue: 7, penaltyRate: "5% per week", penaltyAmount: 75, totalOwed: 1575,
  },
  loan_repaid: {
    clientName: "Mwanza Oscar", loanId: "PHX-3708", productName: "Business Loan",
    totalPaid: 240, repaidDate: new Date().toISOString(),
    collateralDescription: "Samsung Galaxy S23 (Black)",
    collectionDeadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    applyUrl: "https://philix-finance.vercel.app/portal/apply",
  },
  monthly_statement: {
    clientName: "Kelvin Banda",
    statementPeriod: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    loans: [
      { loanId: "PHX-1747", product: "SALARY_LOAN", disbursed: 700, totalDue: 945, totalPaid: 0, remaining: 945, status: "DISBURSED" },
      { loanId: "PHX-3708", product: "BUSINESS_LOAN", disbursed: 200, totalDue: 240, totalPaid: 240, remaining: 0, status: "REPAID" },
    ],
    payments: [
      { date: new Date().toISOString(), amount: 240, method: "MTN Money", loanId: "PHX-3708" },
    ],
    totalOutstanding: 945,
  },
  custom: {
    clientName: "Chanda Mwale",
    customSubject: "Important Notice from Philix Finance",
    customBody: "<p>Dear Chanda,</p><p>We hope this message finds you well. We have an important update regarding your account. Please contact us at your earliest convenience.</p><p>Thank you for banking with us.</p>",
    staffName: "Daliso Phiri",
  },
};
