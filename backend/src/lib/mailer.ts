import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";
import { prisma } from "./prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface MailOptions {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  htmlOverride?: string;
  category?: string;
  clientId?: string;
  loanId?: string;
  portalAccountId?: string;
}

const LOGO_SVG = `<svg width="160" height="44" viewBox="0 0 160 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="em-gold" cx="60%" cy="35%" r="65%"><stop offset="0%" stop-color="#FFD166"/><stop offset="100%" stop-color="#E8940A"/></radialGradient>
    <radialGradient id="em-silver" cx="40%" cy="65%" r="65%"><stop offset="0%" stop-color="#C8C8C8"/><stop offset="100%" stop-color="#7A7A7A"/></radialGradient>
  </defs>
  <g transform="scale(0.625 0.625)">
    <path d="M33 5 C48 5 60 17 60 32 C60 42 55 50 47 54 C43 56 39 56 36 54 C32 52 30 48 31 43 C32 38 36 33 38 27 C40 20 39 11 33 5 Z" fill="url(#em-gold)"/>
    <path d="M31 59 C16 59 4 47 4 32 C4 22 9 14 17 10 C21 8 25 8 28 10 C32 12 34 16 33 21 C32 26 28 31 26 37 C24 44 25 53 31 59 Z" fill="url(#em-silver)"/>
  </g>
  <text x="48" y="22" font-family="'Segoe UI',Arial,sans-serif" font-weight="800" font-size="19" fill="#FFFFFF" letter-spacing="-0.5">PHILIX</text>
  <text x="49" y="37" font-family="'Segoe UI',Arial,sans-serif" font-weight="500" font-size="11" fill="rgba(255,255,255,0.55)" letter-spacing="2.5">FINANCE</text>
</svg>`;

function buildBaseHtml(headerContent: string, bodyContent: string, to: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="background:#0B1F3A;border-radius:16px 16px 0 0;padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>${LOGO_SVG}</td>
                <td align="right" style="color:#64748b;font-size:11px;">${headerContent}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="background:#1e293b;padding:40px;">${bodyContent}</td></tr>
        <tr>
          <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:24px 40px;border-top:1px solid #1e293b;">
            <p style="color:#475569;font-size:11px;margin:0;text-align:center;">
              © ${new Date().getFullYear()} Philix Finance Ltd · Lusaka, Zambia · Bank of Zambia Licensed<br>
              This email was sent to ${to}. This is a confidential communication.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(opts: MailOptions): Promise<boolean> {
  const fromName = process.env.COMPANY_NAME || "Philix Finance";
  const fromEmail = process.env.SMTP_FROM || "noreply@philixfinance.com";

  const html = opts.htmlOverride ?? buildBaseHtml(
    new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    `<pre style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.8;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;margin:0;">${opts.body}</pre>`,
    opts.to,
  );

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [opts.to],
        subject: opts.subject,
        text: opts.body,
        html,
      });
    } else {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
        subject: opts.subject,
        text: opts.body,
        html,
      });
    }

    // Log in DB
    await prisma.emailLog.create({
      data: {
        to: opts.to,
        toName: opts.toName,
        subject: opts.subject,
        template: opts.category,
        body: opts.body,
        status: "SENT",
        clientId: opts.clientId,
        loanId: opts.loanId,
        triggeredBy: "SYSTEM",
      },
    });

    // Save in-app notification if portal account
    if (opts.portalAccountId) {
      await prisma.clientNotification.create({
        data: {
          accountId: opts.portalAccountId,
          subject: opts.subject,
          body: opts.body,
          category: opts.category || "GENERAL",
          sentViaEmail: true,
        },
      });
    }

    logger.info(`Email sent to ${opts.to}: ${opts.subject}`);
    return true;
  } catch (err) {
    logger.error(`Email send failed to ${opts.to}: ${err}`);
    await prisma.emailLog.create({
      data: {
        to: opts.to,
        toName: opts.toName,
        subject: opts.subject,
        status: "FAILED",
        error: String(err),
        triggeredBy: "SYSTEM",
      },
    }).catch(() => {});
    return false;
  }
}

// Pre-built email senders
export const Mailer = {
  async welcome(account: { email: string; firstName: string; lastName: string; clientNumber: string; id: string }) {
    return sendEmail({
      to: account.email,
      toName: `${account.firstName} ${account.lastName}`,
      subject: "Welcome to Philix Finance! 🎉",
      category: "ACCOUNT",
      portalAccountId: account.id,
      body: `Dear ${account.firstName},

Welcome to Philix Finance! We're excited to have you join us.

YOUR ACCOUNT DETAILS
─────────────────────────────
Client Number:  ${account.clientNumber}
Email:          ${account.email}
Portal:         ${process.env.FRONTEND_URL}/portal
─────────────────────────────

GETTING STARTED
1. Log in to your Client Portal
2. Complete your KYC identity verification
3. Apply for your first loan

We are here to help you achieve your financial goals.

Philix Finance Ltd
Tel: +260 777 158 901
Email: info@philixfinance.com`,
    });
  },

  async kycSubmitted(account: { email: string; firstName: string; id: string }) {
    return sendEmail({
      to: account.email,
      toName: account.firstName,
      subject: "KYC Documents Received — Under Review",
      category: "KYC",
      portalAccountId: account.id,
      body: `Dear ${account.firstName},

We have received your KYC identity verification documents.

STATUS: Under Review

Our compliance team will verify your documents within 1-2 business days. You will receive an email notification once the review is complete.

If you have any questions, please contact us.

Philix Finance Ltd`,
    });
  },

  async loanApplicationReceived(opts: { email: string; firstName: string; reference: string; amount: number; product: string; id: string }) {
    return sendEmail({
      to: opts.email,
      toName: opts.firstName,
      subject: `Loan Application Received — Ref: ${opts.reference}`,
      category: "LOAN",
      portalAccountId: opts.id,
      body: `Dear ${opts.firstName},

Your loan application has been received and is under review.

APPLICATION DETAILS
─────────────────────────────
Reference:   ${opts.reference}
Product:     ${opts.product}
Amount:      K${opts.amount.toLocaleString()}
Status:      Under Review
─────────────────────────────

A Philix Finance Loan Officer will contact you within 24-48 hours.

Philix Finance Ltd`,
    });
  },

  async passwordReset(email: string, firstName: string, token: string) {
    const link = `${process.env.FRONTEND_URL}/portal/reset-password?token=${token}`;
    return sendEmail({
      to: email,
      toName: firstName,
      subject: "Password Reset — Philix Finance",
      category: "ACCOUNT",
      body: `Dear ${firstName},

You requested a password reset for your Philix Finance Client Portal account.

Click the link below to reset your password (valid for 1 hour):
${link}

If you did not request this, please ignore this email.

Philix Finance Ltd`,
    });
  },

  async loanApproved(opts: {
    email: string;
    firstName: string;
    lastName: string;
    reference: string;
    productType: string;
    amountRequested: number;
    termMonths: number;
    createdAt: Date;
    accountId: string;
  }) {
    const fullName = `${opts.firstName} ${opts.lastName}`;
    const productLabel = opts.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const monthlyRate = 0.04;
    const interest = opts.amountRequested * monthlyRate * opts.termMonths;
    const totalRepayable = opts.amountRequested + interest;
    const monthlyPayment = totalRepayable / opts.termMonths;
    const approvedDate = new Date();
    const firstPayment = new Date(approvedDate);
    firstPayment.setMonth(firstPayment.getMonth() + 1);
    const finalPayment = new Date(approvedDate);
    finalPayment.setMonth(finalPayment.getMonth() + opts.termMonths);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const fmtK = (n: number) => `K${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const qr = `https://api.qrserver.com/v1/create-qrcode/?size=110x110&data=${opts.reference}&bgcolor=1e293b&color=F5A623&margin=8`;
    const portalUrl = process.env.FRONTEND_URL || "https://philix-finance.vercel.app";

    const body = `
<div style="text-align:center;padding:12px 0 28px;">
  <div style="display:inline-block;background:#16a34a;color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;padding:6px 16px;border-radius:20px;margin-bottom:18px;">APPROVED</div>
  <h2 style="color:#f8fafc;font-size:24px;font-weight:800;margin:0 0 8px;">Congratulations, ${opts.firstName}!</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Your loan application has been approved by Philix Finance.<br>Here are your full loan details.</p>
</div>

<!-- Loan Particulars -->
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:20px;">
  <tr><td colspan="2" style="background:#0B1F3A;padding:12px 16px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">LOAN PARTICULARS</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;width:50%;">Client Reference</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#F5A623;font-size:13px;font-weight:700;">${opts.reference}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Loan Product</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${productLabel}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Loan Term</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${opts.termMonths} Months</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Approval Date</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${fmt(approvedDate)}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Status</td><td style="padding:11px 16px;border-top:1px solid #1e293b;"><span style="background:#166534;color:#4ade80;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;">APPROVED</span></td></tr>
</table>

<!-- Financial Breakdown -->
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:20px;">
  <tr><td colspan="2" style="background:#0B1F3A;padding:12px 16px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">FINANCIAL BREAKDOWN</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;width:50%;">Principal Amount</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;font-weight:600;">${fmtK(opts.amountRequested)}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Interest (4%/month)</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${fmtK(interest)}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;"><strong style="color:#e2e8f0;">Total Repayable</strong></td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#F5A623;font-size:14px;font-weight:800;">${fmtK(totalRepayable)}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Monthly Payment</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;font-weight:600;">${fmtK(monthlyPayment)}</td></tr>
</table>

<!-- Repayment Schedule -->
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:24px;">
  <tr><td colspan="2" style="background:#0B1F3A;padding:12px 16px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">REPAYMENT SCHEDULE</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;width:50%;">First Payment Due</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${fmt(firstPayment)}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Final Payment Due</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${fmt(finalPayment)}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Number of Payments</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${opts.termMonths}</td></tr>
</table>

<!-- QR Code -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td align="center">
      <div style="background:#0B1F3A;border:1px solid #334155;border-radius:12px;padding:20px;display:inline-block;">
        <img src="${qr}" width="110" height="110" alt="Loan QR Code" style="display:block;border-radius:6px;" />
        <p style="color:#64748b;font-size:10px;margin:10px 0 0;letter-spacing:1px;">${opts.reference}</p>
      </div>
      <p style="color:#475569;font-size:11px;margin:10px 0 0;">Show this QR code when making repayments</p>
    </td>
  </tr>
</table>

<!-- CTA -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center">
      <a href="${portalUrl}/portal/dashboard" style="background:#4f46e5;color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;display:inline-block;">View My Loan Dashboard</a>
    </td>
  </tr>
</table>`;

    const notifBody = `Your loan application ${opts.reference} for ${productLabel} has been APPROVED.\n\nLoan Amount: ${fmtK(opts.amountRequested)}\nTotal Repayable: ${fmtK(totalRepayable)}\nMonthly Payment: ${fmtK(monthlyPayment)}\nFirst Payment Due: ${fmt(firstPayment)}\nFinal Payment Due: ${fmt(finalPayment)}\n\nLog in to your portal to view your full loan details.`;

    return sendEmail({
      to: opts.email,
      toName: fullName,
      subject: `Loan Approved — ${opts.reference} · Philix Finance`,
      category: "LOAN",
      portalAccountId: opts.accountId,
      body: notifBody,
      htmlOverride: buildBaseHtml(`CLIENT REF: ${opts.reference}`, body, opts.email),
    });
  },

  async loanRejected(opts: {
    email: string;
    firstName: string;
    lastName: string;
    reference: string;
    productType: string;
    amountRequested: number;
    rejectedReason?: string | null;
    accountId: string;
  }) {
    const fullName = `${opts.firstName} ${opts.lastName}`;
    const productLabel = opts.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const fmtK = (n: number) => `K${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const portalUrl = process.env.FRONTEND_URL || "https://philix-finance.vercel.app";

    const body = `
<div style="text-align:center;padding:12px 0 28px;">
  <div style="display:inline-block;background:#991b1b;color:#fca5a5;font-size:11px;font-weight:700;letter-spacing:1.5px;padding:6px 16px;border-radius:20px;margin-bottom:18px;">NOT APPROVED</div>
  <h2 style="color:#f8fafc;font-size:22px;font-weight:800;margin:0 0 8px;">Dear ${opts.firstName},</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Thank you for applying with Philix Finance.<br>After careful review, we are unable to approve your application at this time.</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:20px;">
  <tr><td colspan="2" style="background:#0B1F3A;padding:12px 16px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">APPLICATION DETAILS</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;width:50%;">Reference</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#F5A623;font-size:13px;font-weight:700;">${opts.reference}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Product</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${productLabel}</td></tr>
  <tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Amount Requested</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${fmtK(opts.amountRequested)}</td></tr>
  ${opts.rejectedReason ? `<tr><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#64748b;font-size:12px;">Reason</td><td style="padding:11px 16px;border-top:1px solid #1e293b;color:#fca5a5;font-size:13px;">${opts.rejectedReason}</td></tr>` : ""}
</table>

<div style="background:#1e1b4b;border:1px solid #3730a3;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
  <p style="color:#a5b4fc;font-size:13px;margin:0;line-height:1.7;">You are welcome to reapply after 30 days or contact our team to discuss improving your eligibility. We are committed to helping you achieve your financial goals.</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center">
      <a href="${portalUrl}/portal/apply" style="background:#4f46e5;color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;display:inline-block;">Apply Again</a>
    </td>
  </tr>
</table>`;

    const notifBody = `Your loan application ${opts.reference} for ${productLabel} was not approved at this time.${opts.rejectedReason ? `\n\nReason: ${opts.rejectedReason}` : ""}\n\nYou are welcome to reapply after 30 days or contact us to discuss your options.`;

    return sendEmail({
      to: opts.email,
      toName: fullName,
      subject: `Loan Application Update — ${opts.reference} · Philix Finance`,
      category: "LOAN",
      portalAccountId: opts.accountId,
      body: notifBody,
      htmlOverride: buildBaseHtml(`CLIENT REF: ${opts.reference}`, body, opts.email),
    });
  },
};
