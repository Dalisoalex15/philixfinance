// ── Philix Finance Branded Email Templates ────────────────────────────────────
// Brand: Navy #0B1F3A | Gold #C9A227 | Background #F5F0E6

const NAVY  = "#0B1F3A";
const GOLD  = "#C9A227";
const BG    = "#F5F0E6";

function fmt(n: number) { return Number(n ?? 0).toLocaleString("en-ZM", { minimumFractionDigits: 2 }); }
function fmtDate(d: string | Date) { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }

// ── Base branded template ─────────────────────────────────────────────────────
export function renderEmailTemplate(contentHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- HEADER BAR -->
          <tr>
            <td style="background-color:${NAVY};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:${GOLD};font-size:24px;font-weight:700;letter-spacing:1px;">PHILIX FINANCE</h1>
              <p style="margin:4px 0 0;color:#ffffff;font-size:12px;letter-spacing:2px;">CREATING A FUTURE TOGETHER</p>
            </td>
          </tr>

          <!-- GOLD ACCENT LINE -->
          <tr><td style="background-color:${GOLD};height:4px;"></td></tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding:32px;color:#1A1A1A;font-size:15px;line-height:1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:${NAVY};padding:20px 32px;text-align:center;">
              <p style="margin:0;color:${GOLD};font-size:11px;">Philix Finance Limited</p>
              <p style="margin:4px 0 0;color:#888888;font-size:10px;">This is an automated message. Please do not reply directly to this email.</p>
              <p style="margin:4px 0 0;color:#888888;font-size:10px;">© ${new Date().getFullYear()} Philix Finance Limited. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Shared building blocks ────────────────────────────────────────────────────
function detailsTable(rows: [string, string][]): string {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;font-weight:bold;color:#444;border-bottom:1px solid #eee;width:45%;font-size:13px;">${label}</td>
      <td style="padding:8px 12px;color:#1A1A1A;border-bottom:1px solid #eee;font-size:13px;">${value}</td>
    </tr>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6ef;border-radius:6px;margin-bottom:20px;border:1px solid #e0d8c8;">
    ${cells}
  </table>`;
}

function navyButton(text: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="background-color:${NAVY};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:6px;display:inline-block;letter-spacing:0.5px;">${text}</a>
  </div>`;
}

function goldButton(text: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="background-color:${GOLD};color:${NAVY};text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:6px;display:inline-block;letter-spacing:0.5px;">${text}</a>
  </div>`;
}

function paymentMethods(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr>
      <td style="padding:8px 12px;background:#f9f6ef;border-radius:6px;border:1px solid #e0d8c8;font-size:13px;">
        <strong style="color:${NAVY};">💵 Cash</strong> — Visit any Philix Finance branch<br>
        <strong style="color:${NAVY};">📱 MTN Money</strong> — 0976 XXX XXX (Philix Finance Ltd)<br>
        <strong style="color:${NAVY};">📱 Airtel Money</strong> — 0977 XXX XXX (Philix Finance Ltd)<br>
        <strong style="color:${NAVY};">🏦 Bank Transfer</strong> — Contact your branch for details
      </td>
    </tr>
  </table>`;
}

function signOff(staffName?: string): string {
  const from = staffName ? `${staffName}, Philix Finance` : "The Philix Finance Team";
  return `<p style="margin-top:28px;font-size:13px;color:#555;">Warm regards,<br>
    <strong style="color:${NAVY};">${from}</strong><br>
    Philix Finance Limited<br>
    <a href="mailto:info@philixfinance.com" style="color:${GOLD};">info@philixfinance.com</a>
  </p>`;
}

// ── Template result type ──────────────────────────────────────────────────────
export interface EmailTemplate { subject: string; html: string; text: string }

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WELCOME
// ═══════════════════════════════════════════════════════════════════════════════
export function templateWelcome(p: {
  clientName: string; loginEmail: string; loginUrl: string; tempPassword?: string;
}): EmailTemplate {
  const content = `
    <p style="font-size:16px;">Dear <strong>${p.clientName}</strong>,</p>
    <p>Your <strong style="color:${NAVY};">Philix Finance</strong> account has been created. You can now log in to view your dashboard, check loan products, and apply for loans.</p>

    <div style="background:#f9f6ef;border:1px solid #e0d8c8;border-radius:6px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 6px;font-weight:bold;color:${NAVY};font-size:13px;">LOGIN DETAILS</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Email:</strong> ${p.loginEmail}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Password:</strong> ${p.tempPassword ? p.tempPassword : "The password you set during registration"}</p>
    </div>

    ${navyButton("Log In to Your Account", p.loginUrl)}

    <p style="font-size:13px;color:#666;">If you did not create this account, please contact us immediately at <a href="mailto:info@philixfinance.com" style="color:${GOLD};">info@philixfinance.com</a>.</p>
    ${signOff()}`;

  return {
    subject: `Welcome to Philix Finance, ${p.clientName}`,
    html: renderEmailTemplate(content),
    text: `Welcome to Philix Finance, ${p.clientName}!\n\nLogin at: ${p.loginUrl}\nEmail: ${p.loginEmail}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LOAN APPLICATION RECEIVED
// ═══════════════════════════════════════════════════════════════════════════════
export function templateLoanApplicationReceived(p: {
  clientName: string; loanId: string; productName: string;
  amount: number; duration: string; submittedDate: string;
}): EmailTemplate {
  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <p>We have received your loan application. Here are the details:</p>

    ${detailsTable([
      ["Application ID", p.loanId],
      ["Product",        p.productName],
      ["Amount Requested", `K${fmt(p.amount)}`],
      ["Duration",       p.duration],
      ["Date Submitted", fmtDate(p.submittedDate)],
    ])}

    <p>Your application is now <strong>under review</strong> by our team. We will notify you once a decision has been made.</p>
    <p>You can check the status of your application at any time by logging into your Philix Finance account.</p>
    ${signOff()}`;

  return {
    subject: `Loan Application Received — ${p.loanId}`,
    html: renderEmailTemplate(content),
    text: `Dear ${p.clientName},\n\nWe received your loan application ${p.loanId} for K${fmt(p.amount)}. We will notify you of the decision.\n\nPhilix Finance`,
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
  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-weight:700;font-size:18px;color:#166534;">🎉 Great news! Your loan application has been approved.</p>
    </div>

    ${detailsTable([
      ["Loan ID",              p.loanId],
      ["Product",              p.productName],
      ["Principal Disbursed",  `K${fmt(p.principal)}`],
      ["Interest Rate",        `${p.interestRate}% flat`],
      ["Total Repayment Due",  `K${fmt(p.totalRepayment)}`],
      ["Disbursement Date",    fmtDate(p.disbursementDate)],
      ["Repayment Due Date",   fmtDate(p.dueDate)],
    ])}

    <p>The funds will be disbursed to you on <strong>${fmtDate(p.disbursementDate)}</strong>. Please ensure your collateral has been submitted and verified.</p>
    <p style="background:#fff8dc;border:1px solid ${GOLD};border-radius:6px;padding:12px 16px;">
      ⚠️ Remember: your total repayment of <strong>K${fmt(p.totalRepayment)}</strong> is due by <strong>${fmtDate(p.dueDate)}</strong>.
    </p>
    ${signOff()}`;

  return {
    subject: `Your Loan Has Been Approved — ${p.loanId}`,
    html: renderEmailTemplate(content),
    text: `Dear ${p.clientName},\n\nYour loan ${p.loanId} has been approved! Principal: K${fmt(p.principal)}, Due: ${fmtDate(p.dueDate)}.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LOAN REJECTED
// ═══════════════════════════════════════════════════════════════════════════════
export function templateLoanRejected(p: {
  clientName: string; loanId: string; rejectionReason: string;
}): EmailTemplate {
  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <p>We have reviewed your loan application (<strong>${p.loanId}</strong>) and unfortunately we are unable to approve it at this time.</p>

    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:14px 18px;margin:20px 0;">
      <p style="margin:0;font-size:13px;"><strong style="color:#991b1b;">Reason:</strong> ${p.rejectionReason}</p>
    </div>

    <p>You are welcome to reapply with additional collateral or a lower amount. If you have questions, please visit your nearest Philix Finance branch.</p>
    <p style="font-size:13px;color:#555;">We appreciate your interest in Philix Finance and hope to serve you successfully in the future.</p>
    ${signOff()}`;

  return {
    subject: `Loan Application Update — ${p.loanId}`,
    html: renderEmailTemplate(content),
    text: `Dear ${p.clientName},\n\nYour loan application ${p.loanId} was not approved at this time. Reason: ${p.rejectionReason}.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PAYMENT RECEIVED
// ═══════════════════════════════════════════════════════════════════════════════
export function templatePaymentReceived(p: {
  clientName: string; loanId: string; paymentAmount: number;
  paymentDate: string; paymentMethod: string; receiptNumber: string;
  remainingBalance: number; totalPaid: number; totalDue: number;
}): EmailTemplate {
  const pct = p.totalDue > 0 ? Math.min(100, Math.round((p.totalPaid / p.totalDue) * 100)) : 0;
  const progressBar = `
    <p style="font-size:12px;font-weight:bold;color:${NAVY};margin-bottom:6px;">Repayment Progress: ${pct}%</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:4px;overflow:hidden;">
      <tr>
        <td width="${pct}%" style="background:${NAVY};height:12px;border-radius:4px 0 0 4px;"></td>
        <td style="background:#e0d8c8;height:12px;border-radius:0 4px 4px 0;"></td>
      </tr>
    </table>`;

  const fullyPaid = p.remainingBalance <= 0;
  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-weight:700;font-size:16px;color:#166534;">✅ We have received your payment. Thank you!</p>
    </div>

    <p style="font-weight:bold;color:${NAVY};font-size:13px;margin-bottom:4px;">PAYMENT DETAILS</p>
    ${detailsTable([
      ["Amount Paid",     `K${fmt(p.paymentAmount)}`],
      ["Date",            fmtDate(p.paymentDate)],
      ["Method",          p.paymentMethod],
      ["Receipt",         p.receiptNumber],
    ])}

    <p style="font-weight:bold;color:${NAVY};font-size:13px;margin-bottom:4px;">LOAN STATUS</p>
    ${detailsTable([
      ["Total Repayment Due",  `K${fmt(p.totalDue)}`],
      ["Total Paid to Date",   `K${fmt(p.totalPaid)}`],
      ["Remaining Balance",    `K${fmt(p.remainingBalance)}`],
    ])}

    <div style="margin:20px 0;">${progressBar}</div>

    ${fullyPaid ? `<div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:8px;padding:16px;text-align:center;margin-top:20px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#166534;">🎊 Congratulations! Your loan is fully repaid.</p>
      <p style="margin:8px 0 0;font-size:13px;color:#555;">Please visit the branch to collect your collateral.</p>
    </div>` : ""}

    ${signOff()}`;

  return {
    subject: `Payment Received — K${fmt(p.paymentAmount)} on Loan ${p.loanId}`,
    html: renderEmailTemplate(content),
    text: `Dear ${p.clientName},\n\nPayment of K${fmt(p.paymentAmount)} received for loan ${p.loanId}. Remaining balance: K${fmt(p.remainingBalance)}.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PAYMENT REMINDER
// ═══════════════════════════════════════════════════════════════════════════════
export function templatePaymentReminder(p: {
  clientName: string; loanId: string; instalmentAmount: number;
  dueDate: string; daysUntilDue: number; remainingBalance: number;
}): EmailTemplate {
  const urgency = p.daysUntilDue <= 1 ? "#dc2626" : p.daysUntilDue <= 3 ? "#d97706" : NAVY;
  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <p>This is a friendly reminder that your next payment is due soon.</p>

    <div style="background:#fff8dc;border:2px solid ${urgency};border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:800;color:${urgency};">K${fmt(p.instalmentAmount)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#555;">Due on <strong>${fmtDate(p.dueDate)}</strong> — ${p.daysUntilDue} day${p.daysUntilDue !== 1 ? "s" : ""} remaining</p>
    </div>

    ${detailsTable([
      ["Amount Due",           `K${fmt(p.instalmentAmount)}`],
      ["Due Date",             fmtDate(p.dueDate)],
      ["Days Remaining",       String(p.daysUntilDue)],
      ["Outstanding Balance",  `K${fmt(p.remainingBalance)}`],
      ["Loan Reference",       p.loanId],
    ])}

    <p style="font-weight:bold;color:${NAVY};font-size:13px;">HOW TO PAY</p>
    ${paymentMethods()}

    <p style="font-size:13px;color:#555;font-style:italic;">Paying on time protects your credit score and keeps you eligible for lower rates on future loans.</p>
    ${signOff()}`;

  return {
    subject: `Payment Reminder — K${fmt(p.instalmentAmount)} due on ${fmtDate(p.dueDate)}`,
    html: renderEmailTemplate(content),
    text: `Dear ${p.clientName},\n\nReminder: K${fmt(p.instalmentAmount)} is due on ${fmtDate(p.dueDate)} for loan ${p.loanId}.\n\nPhilix Finance`,
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
  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <div style="background:#fff5f5;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-weight:800;font-size:16px;color:#991b1b;">⚠️ OVERDUE PAYMENT</p>
      <p style="margin:6px 0 0;font-size:13px;color:#dc2626;">Your payment of <strong>K${fmt(p.overdueAmount)}</strong> on loan <strong>${p.loanId}</strong> was due on <strong>${fmtDate(p.dueDate)}</strong> and is now <strong>${p.daysOverdue} day${p.daysOverdue !== 1 ? "s" : ""} overdue</strong>.</p>
    </div>

    ${detailsTable([
      ["Original Amount Due",    `K${fmt(p.overdueAmount)}`],
      ["Due Date",               fmtDate(p.dueDate)],
      ["Days Overdue",           `${p.daysOverdue} days`],
      ["Late Penalty Rate",      p.penaltyRate],
      ["Penalty Charged So Far", `K${fmt(p.penaltyAmount)}`],
      ["Total Now Owed",         `K${fmt(p.totalOwed)}`],
    ])}

    <div style="background:#fff5f5;border-left:4px solid #dc2626;padding:12px 16px;margin:20px 0;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:13px;color:#7f1d1d;">A late payment penalty of <strong>${p.penaltyRate} per week</strong> is being applied to your outstanding balance. The longer the delay, the more you will owe.</p>
    </div>

    <p><strong>Please make your payment as soon as possible</strong> to avoid further penalties and to protect your credit standing with Philix Finance.</p>

    <p style="font-weight:bold;color:${NAVY};font-size:13px;">HOW TO PAY</p>
    ${paymentMethods()}

    <p style="font-size:13px;color:#555;">If you are experiencing difficulties, please contact your loan officer to discuss a resolution. We are here to help.</p>
    ${signOff()}`;

  return {
    subject: `OVERDUE: Payment of K${fmt(p.overdueAmount)} was due on ${fmtDate(p.dueDate)}`,
    html: renderEmailTemplate(content),
    text: `OVERDUE NOTICE: Dear ${p.clientName},\n\nYour payment of K${fmt(p.overdueAmount)} for loan ${p.loanId} is ${p.daysOverdue} days overdue. Total now owed: K${fmt(p.totalOwed)}.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. LOAN FULLY REPAID
// ═══════════════════════════════════════════════════════════════════════════════
export function templateLoanRepaid(p: {
  clientName: string; loanId: string; productName: string;
  totalPaid: number; repaidDate: string;
  collateralDescription: string; collectionDeadline: string; applyUrl: string;
}): EmailTemplate {
  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
      <p style="margin:0;font-size:26px;font-weight:800;color:#166534;">🎉 Congratulations!</p>
      <p style="margin:8px 0 0;font-size:16px;color:#166534;font-weight:600;">Your loan has been fully repaid.</p>
    </div>

    ${detailsTable([
      ["Loan ID",        p.loanId],
      ["Product",        p.productName],
      ["Total Paid",     `K${fmt(p.totalPaid)}`],
      ["Date Repaid",    fmtDate(p.repaidDate)],
    ])}

    <div style="background:#fff8dc;border:1px solid ${GOLD};border-radius:6px;padding:14px 18px;margin:20px 0;">
      <p style="margin:0;font-size:14px;">
        📦 Your collateral <strong>(${p.collateralDescription})</strong> is ready for collection at your branch.<br><br>
        Please collect by <strong>${fmtDate(p.collectionDeadline)}</strong> (30 days from today). Bring your NRC and this email or your Collateral Receipt.
      </p>
    </div>

    <p style="font-size:14px;color:#555;">Thank you for banking with Philix Finance. You are now eligible for our <strong style="color:${GOLD};">Loyalty rates</strong> on your next loan!</p>

    ${goldButton("Apply for a New Loan", p.applyUrl)}
    ${signOff()}`;

  return {
    subject: `Congratulations! Loan ${p.loanId} Fully Repaid`,
    html: renderEmailTemplate(content),
    text: `Congratulations ${p.clientName}! Your loan ${p.loanId} is fully repaid. Collect your collateral by ${fmtDate(p.collectionDeadline)}.\n\nPhilix Finance`,
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
  const loanRows = p.loans.map(l => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:8px 10px;font-size:12px;font-family:monospace;">${l.loanId}</td>
      <td style="padding:8px 10px;font-size:12px;">${l.product}</td>
      <td style="padding:8px 10px;font-size:12px;">K${fmt(l.disbursed)}</td>
      <td style="padding:8px 10px;font-size:12px;">K${fmt(l.totalDue)}</td>
      <td style="padding:8px 10px;font-size:12px;color:#166534;">K${fmt(l.totalPaid)}</td>
      <td style="padding:8px 10px;font-size:12px;color:${l.remaining <= 0 ? "#166534" : "#dc2626"};">K${fmt(l.remaining)}</td>
      <td style="padding:8px 10px;font-size:12px;">${l.status}</td>
    </tr>`).join("");

  const paymentRows = p.payments.slice(0, 20).map(pay => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:8px 10px;font-size:12px;">${fmtDate(pay.date)}</td>
      <td style="padding:8px 10px;font-size:12px;color:#166534;">K${fmt(pay.amount)}</td>
      <td style="padding:8px 10px;font-size:12px;">${pay.method}</td>
      <td style="padding:8px 10px;font-size:12px;font-family:monospace;">${pay.loanId}</td>
    </tr>`).join("");

  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <p>Here is your account statement for <strong>${p.statementPeriod}</strong>.</p>

    <p style="font-weight:bold;color:${NAVY};font-size:13px;margin-bottom:8px;">ACTIVE LOANS</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0d8c8;border-radius:6px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:${NAVY};color:#fff;">
        <th style="padding:8px 10px;text-align:left;font-size:11px;">LOAN ID</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">PRODUCT</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">DISBURSED</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">TOTAL DUE</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">PAID</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">REMAINING</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">STATUS</th>
      </tr>
      ${loanRows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#888;font-size:12px;">No active loans</td></tr>'}
    </table>

    ${p.payments.length > 0 ? `
    <p style="font-weight:bold;color:${NAVY};font-size:13px;margin-bottom:8px;">PAYMENT HISTORY (${p.statementPeriod})</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0d8c8;border-radius:6px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:${NAVY};color:#fff;">
        <th style="padding:8px 10px;text-align:left;font-size:11px;">DATE</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">AMOUNT</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">METHOD</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;">LOAN</th>
      </tr>
      ${paymentRows}
    </table>` : ""}

    <div style="background:#f9f6ef;border:2px solid ${GOLD};border-radius:8px;padding:16px;text-align:center;margin-top:8px;">
      <p style="margin:0;font-size:12px;color:#555;">TOTAL OUTSTANDING BALANCE</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:${NAVY};">K${fmt(p.totalOutstanding)}</p>
    </div>

    <p style="font-size:13px;color:#555;margin-top:20px;">Log in to your account for full details and to make payments.</p>
    ${signOff()}`;

  return {
    subject: `Your Philix Finance Account Statement — ${p.statementPeriod}`,
    html: renderEmailTemplate(content),
    text: `Dear ${p.clientName},\n\nYour statement for ${p.statementPeriod}. Outstanding: K${fmt(p.totalOutstanding)}.\n\nPhilix Finance`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. CUSTOM EMAIL
// ═══════════════════════════════════════════════════════════════════════════════
export function templateCustom(p: {
  clientName: string; customSubject: string; customBody: string; staffName: string;
}): EmailTemplate {
  // Basic XSS sanitization — strip script tags and event handlers
  const safeBody = p.customBody
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=/gi, "data-blocked=")
    .replace(/javascript:/gi, "");

  const content = `
    <p>Dear <strong>${p.clientName}</strong>,</p>
    <div style="line-height:1.7;font-size:14px;">${safeBody}</div>
    ${signOff(p.staffName)}`;

  return {
    subject: p.customSubject,
    html: renderEmailTemplate(content),
    text: `Dear ${p.clientName},\n\n${p.customBody.replace(/<[^>]+>/g, "")}\n\n${p.staffName}, Philix Finance`,
  };
}

// ── Template dispatcher ───────────────────────────────────────────────────────
export function buildTemplate(key: string, params: Record<string, any>): EmailTemplate {
  switch (key) {
    case "welcome":                    return templateWelcome(params as any);
    case "loan_application_received":  return templateLoanApplicationReceived(params as any);
    case "loan_approved":              return templateLoanApproved(params as any);
    case "loan_rejected":              return templateLoanRejected(params as any);
    case "payment_received":           return templatePaymentReceived(params as any);
    case "payment_reminder":           return templatePaymentReminder(params as any);
    case "overdue_notice":             return templateOverdueNotice(params as any);
    case "loan_repaid":                return templateLoanRepaid(params as any);
    case "monthly_statement":          return templateMonthlyStatement(params as any);
    case "custom":                     return templateCustom(params as any);
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
