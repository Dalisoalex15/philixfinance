export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: "LOAN" | "PAYMENT" | "KYC" | "ACCOUNT" | "COLLECTION" | "GENERAL";
  body: (vars: Record<string, string>) => string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "loan_approved",
    name: "Loan Approved",
    subject: "Your Loan Application Has Been Approved — Philix Finance",
    category: "LOAN",
    body: (v) => `Dear ${v.clientName},

We are pleased to inform you that your loan application has been APPROVED.

LOAN DETAILS
─────────────────────────────
Loan Reference:    ${v.loanNumber}
Product:           ${v.product}
Amount Approved:   K${v.amount}
Term:              ${v.term} months
Monthly Payment:   K${v.monthly}
Interest Rate:     ${v.rate}% per month
Disbursement Date: ${v.disbursementDate}
─────────────────────────────

WHAT HAPPENS NEXT
Your funds will be disbursed to your registered account within 24 hours of signing your loan agreement.

Please visit our offices or call us to complete the final signing process.

REPAYMENT SCHEDULE
Your first payment of K${v.monthly} is due on ${v.firstPaymentDate}.

Thank you for choosing Philix Finance.

Warm regards,
${v.officerName}
Loan Officer — Philix Finance
Tel: +260 777 158 901
Email: loans@philixfinance.com

─────────────────────────────
Philix Finance Ltd · Lusaka, Zambia · Bank of Zambia Licensed
This email and its contents are confidential.`,
  },
  {
    id: "loan_disbursed",
    name: "Loan Disbursed",
    subject: "Loan Disbursement Confirmation — Philix Finance",
    category: "LOAN",
    body: (v) => `Dear ${v.clientName},

Your loan has been successfully DISBURSED.

DISBURSEMENT DETAILS
─────────────────────────────
Loan Reference:  ${v.loanNumber}
Amount:          K${v.amount}
Date:            ${v.date}
Method:          ${v.method}
Reference No:    ${v.reference}
─────────────────────────────

Your first repayment of K${v.monthly} is due on ${v.firstPaymentDate}.

You can view your loan details and payment schedule by logging in to the Philix Finance Client Portal at: https://philixfinance.com/portal

Thank you for banking with Philix Finance.

Philix Finance Ltd`,
  },
  {
    id: "payment_received",
    name: "Payment Received",
    subject: "Payment Receipt Confirmation — Philix Finance",
    category: "PAYMENT",
    body: (v) => `Dear ${v.clientName},

We confirm receipt of your payment.

PAYMENT DETAILS
─────────────────────────────
Loan Reference:   ${v.loanNumber}
Amount Paid:      K${v.amount}
Payment Date:     ${v.date}
Receipt No:       ${v.receiptNumber}
Outstanding:      K${v.outstanding}
─────────────────────────────

${Number(v.outstanding) === 0 ? `🎉 CONGRATULATIONS! Your loan has been FULLY REPAID. Thank you for being a valued client.` : `Your next payment of K${v.nextAmount} is due on ${v.nextDueDate}.`}

Thank you for your prompt payment.

Philix Finance Ltd`,
  },
  {
    id: "payment_overdue",
    name: "Payment Overdue",
    subject: "IMPORTANT: Overdue Payment Notice — Philix Finance",
    category: "COLLECTION",
    body: (v) => `Dear ${v.clientName},

This is a reminder that your loan payment is OVERDUE.

OVERDUE DETAILS
─────────────────────────────
Loan Reference:   ${v.loanNumber}
Due Date:         ${v.dueDate}
Amount Due:       K${v.amount}
Days Overdue:     ${v.daysOverdue} days
Penalty Applied:  K${v.penalty}
Total Now Due:    K${v.totalDue}
─────────────────────────────

ACTION REQUIRED
Please make your payment immediately to avoid further penalties. Contact us today to discuss a repayment arrangement.

📞 Call: +260 777 158 901
📧 Email: collections@philixfinance.com

Philix Finance Ltd`,
  },
  {
    id: "kyc_verified",
    name: "KYC Verified",
    subject: "Identity Verification Complete — Philix Finance",
    category: "KYC",
    body: (v) => `Dear ${v.clientName},

Your identity verification (KYC) has been successfully completed.

VERIFICATION DETAILS
─────────────────────────────
Client Number:  ${v.clientNumber}
NRC Number:     ${v.nrcNumber}
Verified On:    ${v.date}
Status:         VERIFIED ✓
─────────────────────────────

You now have full access to all Philix Finance loan products. Log in to the Client Portal to apply for a loan.

Philix Finance Ltd`,
  },
  {
    id: "kyc_rejected",
    name: "KYC Rejected",
    subject: "Identity Verification — Action Required — Philix Finance",
    category: "KYC",
    body: (v) => `Dear ${v.clientName},

Unfortunately, we were unable to verify your identity documents.

REASON: ${v.reason}

Please re-submit your documents with the following corrections:
${v.corrections}

Log in to the Client Portal to re-submit your documents, or visit our offices for assistance.

Philix Finance Ltd`,
  },
  {
    id: "welcome",
    name: "Welcome New Client",
    subject: "Welcome to Philix Finance!",
    category: "ACCOUNT",
    body: (v) => `Dear ${v.clientName},

Welcome to Philix Finance! We are excited to have you as a client.

YOUR ACCOUNT DETAILS
─────────────────────────────
Client Number:  ${v.clientNumber}
Email:          ${v.email}
Portal Access:  https://philixfinance.com/portal
─────────────────────────────

GETTING STARTED
1. Log in to your Client Portal account
2. Complete your KYC (identity verification)
3. Apply for your first loan

We are committed to helping you achieve your financial goals.

Philix Finance Ltd`,
  },
  {
    id: "custom",
    name: "Custom Message",
    subject: "",
    category: "GENERAL",
    body: (v) => `Dear ${v.clientName},

${v.message}

${v.signature ?? "Philix Finance Ltd"}`,
  },
];
