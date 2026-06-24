import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";
import { prisma } from "./prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ── Base HTML template ─────────────────────────────────────────────────────
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

export function buildBaseHtml(headerRef: string, bodyContent: string, to: string): string {
  const year  = new Date().getFullYear();
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Philix Finance</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0B1F3A;border-radius:16px 16px 0 0;padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>${LOGO_SVG}</td>
                <td align="right" style="color:#475569;font-size:11px;vertical-align:middle;">
                  ${headerRef}<br>
                  <span style="color:#334155;">${today}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#1e293b;padding:36px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0B1F3A;border-radius:0 0 16px 16px;padding:20px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#475569;font-size:11px;line-height:1.7;">
                  <strong style="color:#64748b;">Philix Finance Ltd</strong><br>
                  Lusaka, Zambia · Bank of Zambia Licensed<br>
                  <a href="tel:+260777158901" style="color:#C9A84C;text-decoration:none;">+260 777 158 901</a> ·
                  <a href="mailto:info@philixfinance.com" style="color:#C9A84C;text-decoration:none;">info@philixfinance.com</a>
                </td>
                <td align="right" style="color:#334155;font-size:10px;vertical-align:bottom;">
                  © ${year} Philix Finance<br>
                  <span style="color:#1e293b;">Sent to ${to}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Reusable table row helper
function row(label: string, value: string, highlight = false): string {
  return `<tr>
    <td style="padding:11px 16px;border-top:1px solid #334155;color:#64748b;font-size:12px;width:45%;">${label}</td>
    <td style="padding:11px 16px;border-top:1px solid #334155;color:${highlight ? "#F5A623" : "#e2e8f0"};font-size:13px;font-weight:${highlight ? "700" : "400"};">${value}</td>
  </tr>`;
}

function section(title: string, rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:20px;">
    <tr><td colspan="2" style="background:#0B1F3A;padding:11px 16px;color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${title}</td></tr>
    ${rows}
  </table>`;
}

function cta(text: string, url: string, color = "#4f46e5"): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td align="center">
      <a href="${url}" style="background:${color};color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;display:inline-block;">${text}</a>
    </td></tr>
  </table>`;
}

function badge(text: string, bg: string, color: string): string {
  return `<div style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;letter-spacing:1.5px;padding:5px 14px;border-radius:20px;">${text}</div>`;
}

function highlight(content: string, borderColor = "#C9A84C"): string {
  return `<div style="background:#1e293b;border-left:4px solid ${borderColor};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:18px;">${content}</div>`;
}

// ── Email Log helper ───────────────────────────────────────────────────────
async function logEmail(data: {
  to: string; toName?: string; subject: string; template?: string;
  body?: string; status: string; accountId?: string; clientId?: string;
  loanId?: string; triggeredBy?: string; error?: string; resendId?: string;
}) {
  try {
    await (prisma as any).emailLog.create({ data });
  } catch { /* schema may not be migrated on prod yet */ }
}

// ── Core send function ─────────────────────────────────────────────────────
export interface MailOptions {
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

export async function sendEmail(opts: MailOptions): Promise<{ ok: boolean; resendId?: string }> {
  const fromName  = process.env.COMPANY_NAME || "Philix Finance";
  const fromEmail = process.env.SMTP_FROM    || "noreply@philixfinance.com";
  const html = opts.htmlOverride ?? buildBaseHtml(
    "Philix Finance",
    `<p style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.8;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;">${opts.body}</p>`,
    opts.to,
  );

  let resendId: string | undefined;

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to:   [opts.to],
        subject: opts.subject,
        text: opts.body,
        html,
      });
      resendId = (result as any).data?.id;
    } else {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to:   opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
        subject: opts.subject,
        text: opts.body,
        html,
      });
    }

    await logEmail({
      to: opts.to, toName: opts.toName, subject: opts.subject,
      template: opts.category, body: opts.body, status: "SENT",
      clientId: opts.clientId, loanId: opts.loanId,
      accountId: opts.portalAccountId, triggeredBy: "SYSTEM", resendId,
    });

    if (opts.portalAccountId) {
      try {
        await prisma.clientNotification.create({
          data: {
            accountId: opts.portalAccountId,
            subject: opts.subject,
            body: opts.body,
            category: opts.category || "GENERAL",
            sentViaEmail: true,
          },
        });
      } catch { /* non-fatal */ }
    }

    logger.info(`Email sent to ${opts.to}: ${opts.subject}`);
    return { ok: true, resendId };

  } catch (err) {
    logger.error(`Email send failed to ${opts.to}: ${err}`);
    await logEmail({
      to: opts.to, toName: opts.toName, subject: opts.subject,
      template: opts.category, status: "FAILED",
      accountId: opts.portalAccountId, triggeredBy: "SYSTEM",
      error: String(err),
    });
    return { ok: false };
  }
}

// ── Pre-built email senders ────────────────────────────────────────────────
const PORTAL = process.env.FRONTEND_URL || "https://philixfinance.vercel.app";
const fmtK   = (n: number) => `K${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt    = (d: Date)   => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const Mailer = {

  // ── Welcome ──────────────────────────────────────────────────────────────
  async welcome(account: { email: string; firstName: string; lastName: string; clientNumber: string; id: string }) {
    const body = `
<div style="text-align:center;padding:8px 0 28px;">
  ${badge("ACCOUNT CREATED", "#14532d", "#4ade80")}
  <h2 style="color:#f8fafc;font-size:24px;font-weight:800;margin:18px 0 8px;">Welcome, ${account.firstName}!</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Your Philix Finance Client Portal account is ready.</p>
</div>
${section("YOUR ACCOUNT", [
  row("Client Number",  account.clientNumber, true),
  row("Full Name",      `${account.firstName} ${account.lastName}`),
  row("Email Address",  account.email),
  row("Portal Access",  `<a href="${PORTAL}/portal" style="color:#C9A84C;">${PORTAL}/portal</a>`),
].join(""))}
${highlight(`<p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.7;"><strong style="color:#e2e8f0;">Getting Started:</strong><br>
1. Log in to your Client Portal<br>
2. Complete KYC identity verification<br>
3. Apply for your first loan — funds within 24 hours</p>`, "#C9A84C")}
${cta("Open Client Portal", `${PORTAL}/portal/dashboard`, "#C9A84C")}`;

    return sendEmail({
      to: account.email, toName: `${account.firstName} ${account.lastName}`,
      subject: "Welcome to Philix Finance! 🎉",
      category: "WELCOME", portalAccountId: account.id,
      body: `Welcome to Philix Finance, ${account.firstName}!\n\nClient Number: ${account.clientNumber}\nPortal: ${PORTAL}/portal\n\nComplete your KYC and apply for a loan today.`,
      htmlOverride: buildBaseHtml("NEW ACCOUNT", body, account.email),
    });
  },

  // ── OTP Verification ─────────────────────────────────────────────────────
  async otp(email: string, firstName: string, otp: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET" | "EMAIL_CHANGE") {
    // Always log the code so it's findable during dev/testing when email isn't configured
    console.log(`\n🔑 OTP [${type}] for ${email}: ${otp} (expires 10 min)\n`);
    const titles: Record<string, string> = {
      EMAIL_VERIFY:  "Verify Your Email Address",
      PASSWORD_RESET:"Password Reset Request",
      EMAIL_CHANGE:  "Confirm Email Change",
    };
    const descs: Record<string, string> = {
      EMAIL_VERIFY:  "Please enter the code below to verify your email and activate your account.",
      PASSWORD_RESET:"Enter this code to reset your password. If you didn't request this, ignore this email.",
      EMAIL_CHANGE:  "Enter this code to confirm your new email address.",
    };

    const body = `
<div style="text-align:center;padding:8px 0 28px;">
  ${badge("SECURE CODE", "#1e1b4b", "#a5b4fc")}
  <h2 style="color:#f8fafc;font-size:22px;font-weight:800;margin:18px 0 8px;">${titles[type]}</h2>
  <p style="color:#94a3b8;font-size:13px;margin:0;">${descs[type]}</p>
</div>
<div style="text-align:center;margin:0 0 28px;">
  <div style="display:inline-block;background:#0B1F3A;border:2px solid #C9A84C;border-radius:14px;padding:20px 48px;">
    <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#C9A84C;font-family:'Courier New',monospace;">${otp}</div>
    <p style="color:#64748b;font-size:12px;margin:12px 0 0;">Expires in <strong style="color:#f59e0b;">10 minutes</strong></p>
  </div>
</div>
${highlight(`<p style="color:#94a3b8;font-size:12px;margin:0;">🔒 <strong style="color:#e2e8f0;">Security tip:</strong> Philix Finance will never ask for your OTP over the phone or by email. Do not share this code with anyone.</p>`, "#ef4444")}`;

    return sendEmail({
      to: email, toName: firstName,
      subject: `${otp} — Your Philix Finance Verification Code`,
      category: "OTP",
      body: `Hi ${firstName},\n\nYour verification code is: ${otp}\n\nExpires in 10 minutes. Do not share this code.`,
      htmlOverride: buildBaseHtml("SECURE CODE", body, email),
    });
  },

  // ── KYC submitted ────────────────────────────────────────────────────────
  async kycSubmitted(account: { email: string; firstName: string; id: string }) {
    return sendEmail({
      to: account.email, toName: account.firstName,
      subject: "KYC Documents Received — Under Review",
      category: "KYC", portalAccountId: account.id,
      body: `Dear ${account.firstName},\n\nWe have received your KYC documents. Our compliance team will verify within 1–2 business days.\n\nPhilix Finance Ltd`,
    });
  },

  // ── Loan application received ─────────────────────────────────────────────
  async loanApplicationReceived(opts: { email: string; firstName: string; reference: string; amount: number; product: string; id: string }) {
    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `Loan Application Received — ${opts.reference}`,
      category: "LOAN", portalAccountId: opts.id,
      body: `Dear ${opts.firstName},\n\nYour loan application has been received.\n\nRef: ${opts.reference}\nAmount: ${fmtK(opts.amount)}\nProduct: ${opts.product}\n\nA Loan Officer will contact you within 24–48 hours.\n\nPhilix Finance Ltd`,
    });
  },

  // ── Loan approved ─────────────────────────────────────────────────────────
  async loanApproved(opts: {
    email: string; firstName: string; lastName: string;
    reference: string; productType: string; amountRequested: number;
    termMonths: number; interestRate: number; accountId: string;
  }) {
    const productLabel = opts.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const interest     = opts.amountRequested * (opts.interestRate / 100);
    const total        = opts.amountRequested + interest;
    const weekly       = Math.ceil(total / opts.termMonths);
    const approvedDate = new Date();
    const dueDate      = new Date(approvedDate.getTime() + opts.termMonths * 7 * 86400000);
    const qr = `https://api.qrserver.com/v1/create-qrcode/?size=110x110&data=${opts.reference}&bgcolor=0B1F3A&color=C9A84C&margin=8`;

    const body = `
<div style="text-align:center;padding:8px 0 28px;">
  ${badge("APPROVED ✓", "#14532d", "#4ade80")}
  <h2 style="color:#f8fafc;font-size:24px;font-weight:800;margin:18px 0 8px;">Congratulations, ${opts.firstName}!</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Your loan has been approved. Here are your full details.</p>
</div>
${section("LOAN PARTICULARS", [
  row("Reference",    opts.reference, true),
  row("Product",      productLabel),
  row("Approval Date",fmt(approvedDate)),
  row("Due Date",     fmt(dueDate)),
  row("Status",       `<span style="background:#166534;color:#4ade80;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;">APPROVED</span>`),
].join(""))}
${section("FINANCIAL BREAKDOWN", [
  row("Principal Amount",    fmtK(opts.amountRequested)),
  row(`Interest (${opts.interestRate}% flat)`, fmtK(interest)),
  row("Total Repayable",     `<strong style="color:#F5A623;font-size:14px;">${fmtK(total)}</strong>`, true),
  row("Weekly Payment",      fmtK(weekly)),
  row("Term",                `${opts.termMonths} week${opts.termMonths > 1 ? "s" : ""}`),
].join(""))}
<div style="text-align:center;margin:0 0 24px;">
  <div style="display:inline-block;background:#0B1F3A;border:1px solid #334155;border-radius:12px;padding:16px;">
    <img src="${qr}" width="110" height="110" alt="QR Code" style="display:block;border-radius:6px;"/>
    <p style="color:#64748b;font-size:10px;margin:8px 0 0;letter-spacing:1px;">${opts.reference}</p>
  </div>
  <p style="color:#475569;font-size:11px;margin:8px 0 0;">Show this QR code when making repayments</p>
</div>
${cta("View Loan Dashboard", `${PORTAL}/portal/loans`, "#16a34a")}`;

    return sendEmail({
      to: opts.email, toName: `${opts.firstName} ${opts.lastName}`,
      subject: `✅ Loan Approved — ${opts.reference} · Philix Finance`,
      category: "LOAN_APPROVED", portalAccountId: opts.accountId,
      body: `Your loan ${opts.reference} has been APPROVED.\n\nAmount: ${fmtK(opts.amountRequested)}\nTotal Repayable: ${fmtK(total)}\nWeekly Payment: ${fmtK(weekly)}\nDue: ${fmt(dueDate)}\n\nLog in to your portal to view details.`,
      htmlOverride: buildBaseHtml(`REF: ${opts.reference}`, body, opts.email),
    });
  },

  // ── Loan rejected ─────────────────────────────────────────────────────────
  async loanRejected(opts: {
    email: string; firstName: string; lastName: string;
    reference: string; productType: string; amountRequested: number;
    rejectedReason?: string | null; accountId: string;
  }) {
    const productLabel = opts.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    const body = `
<div style="text-align:center;padding:8px 0 24px;">
  ${badge("NOT APPROVED", "#991b1b", "#fca5a5")}
  <h2 style="color:#f8fafc;font-size:22px;font-weight:800;margin:18px 0 8px;">Dear ${opts.firstName},</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">After careful review we are unable to approve your application at this time.</p>
</div>
${section("APPLICATION DETAILS", [
  row("Reference",       opts.reference, true),
  row("Product",         productLabel),
  row("Amount Requested",fmtK(opts.amountRequested)),
  opts.rejectedReason ? row("Reason", `<span style="color:#fca5a5;">${opts.rejectedReason}</span>`) : "",
].join(""))}
${highlight(`<p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.7;">You are welcome to reapply after 30 days or contact our team to discuss improving your eligibility. We remain committed to helping you achieve your financial goals.</p>`, "#6366f1")}
${cta("Apply Again", `${PORTAL}/portal/apply`, "#4f46e5")}`;

    return sendEmail({
      to: opts.email, toName: `${opts.firstName} ${opts.lastName}`,
      subject: `Loan Application Update — ${opts.reference} · Philix Finance`,
      category: "LOAN_REJECTED", portalAccountId: opts.accountId,
      body: `Your loan application ${opts.reference} was not approved at this time.${opts.rejectedReason ? `\nReason: ${opts.rejectedReason}` : ""}\n\nYou may reapply after 30 days.`,
      htmlOverride: buildBaseHtml(`REF: ${opts.reference}`, body, opts.email),
    });
  },

  // ── Loan disbursed ────────────────────────────────────────────────────────
  async loanDisbursed(opts: {
    email: string; firstName: string; reference: string;
    amountRequested: number; interestRate: number; termMonths: number; accountId: string;
  }) {
    const total  = opts.amountRequested * (1 + opts.interestRate / 100);
    const weekly = Math.ceil(total / opts.termMonths);
    const dueDate = new Date(Date.now() + opts.termMonths * 7 * 86400000);

    const body = `
<div style="text-align:center;padding:8px 0 24px;">
  ${badge("FUNDS DISBURSED 💰", "#1e3a5f", "#60a5fa")}
  <h2 style="color:#f8fafc;font-size:22px;font-weight:800;margin:18px 0 8px;">Your funds are on the way, ${opts.firstName}!</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Loan ${opts.reference} has been disbursed to your account.</p>
</div>
${section("DISBURSEMENT DETAILS", [
  row("Reference",       opts.reference, true),
  row("Amount Disbursed",`<strong style="color:#4ade80;font-size:15px;">${fmtK(opts.amountRequested)}</strong>`),
  row("Total Repayable", fmtK(total)),
  row("Weekly Instalment",fmtK(weekly)),
  row("Final Due Date",  fmt(dueDate)),
].join(""))}
${highlight(`<p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.7;"><strong style="color:#f59e0b;">Important:</strong> Your first weekly payment of <strong style="color:#e2e8f0;">${fmtK(weekly)}</strong> is due in 7 days. Please ensure funds are available to avoid late fees.</p>`, "#f59e0b")}
${cta("Make a Payment Now", `${PORTAL}/portal/loans`, "#C9A84C")}`;

    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `💰 Loan Disbursed — ${opts.reference} · Philix Finance`,
      category: "LOAN_DISBURSED", portalAccountId: opts.accountId,
      body: `Your loan ${opts.reference} has been disbursed!\n\nAmount: ${fmtK(opts.amountRequested)}\nWeekly Payment: ${fmtK(weekly)}\nFinal Due: ${fmt(dueDate)}\n\nFirst payment due in 7 days.`,
      htmlOverride: buildBaseHtml(`REF: ${opts.reference}`, body, opts.email),
    });
  },

  // ── Payment confirmed ─────────────────────────────────────────────────────
  async paymentConfirmed(opts: {
    email: string; firstName: string; reference: string;
    amount: number; totalPaid: number; remaining: number; accountId: string;
  }) {
    const fullyPaid = opts.remaining <= 0;
    const body = `
<div style="text-align:center;padding:8px 0 24px;">
  ${badge(fullyPaid ? "FULLY REPAID 🎉" : "PAYMENT CONFIRMED ✓", fullyPaid ? "#14532d" : "#1e3a5f", fullyPaid ? "#4ade80" : "#60a5fa")}
  <h2 style="color:#f8fafc;font-size:22px;font-weight:800;margin:18px 0 8px;">
    ${fullyPaid ? `Congratulations ${opts.firstName}! Loan fully cleared!` : `Payment received, ${opts.firstName}!`}
  </h2>
</div>
${section("PAYMENT DETAILS", [
  row("Loan Reference",   opts.reference, true),
  row("Amount Confirmed", `<strong style="color:#4ade80;">${fmtK(opts.amount)}</strong>`),
  row("Total Paid",       fmtK(opts.totalPaid)),
  row("Outstanding Balance", fullyPaid ? `<span style="color:#4ade80;">CLEARED ✓</span>` : `<strong style="color:#F5A623;">${fmtK(opts.remaining)}</strong>`),
  row("Date",             fmt(new Date())),
].join(""))}
${fullyPaid
  ? highlight(`<p style="color:#4ade80;font-size:14px;font-weight:700;margin:0;text-align:center;">🏆 Your loan is fully repaid. Thank you for banking with Philix Finance!</p>`, "#22c55e")
  : highlight(`<p style="color:#94a3b8;font-size:13px;margin:0;">Outstanding balance of <strong style="color:#F5A623;">${fmtK(opts.remaining)}</strong> remains. Your next payment will further reduce this balance.</p>`, "#C9A84C")}
${cta("View Loan Dashboard", `${PORTAL}/portal/loans`, "#16a34a")}`;

    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: fullyPaid
        ? `🎉 Loan ${opts.reference} Fully Repaid — Philix Finance`
        : `✅ Payment of ${fmtK(opts.amount)} Confirmed — ${opts.reference}`,
      category: "PAYMENT_CONFIRMED", portalAccountId: opts.accountId,
      body: `Payment of ${fmtK(opts.amount)} confirmed for loan ${opts.reference}.\nTotal paid: ${fmtK(opts.totalPaid)}\nOutstanding: ${fullyPaid ? "CLEARED" : fmtK(opts.remaining)}`,
      htmlOverride: buildBaseHtml(`REF: ${opts.reference}`, body, opts.email),
    });
  },

  // ── Payment rejected ──────────────────────────────────────────────────────
  async paymentRejected(opts: {
    email: string; firstName: string; reference: string;
    amount: number; reason?: string; accountId: string;
  }) {
    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `⚠️ Payment Proof Rejected — ${opts.reference}`,
      category: "PAYMENT_REJECTED", portalAccountId: opts.accountId,
      body: `Dear ${opts.firstName},\n\nYour payment submission of ${fmtK(opts.amount)} for loan ${opts.reference} could not be verified.${opts.reason ? `\nReason: ${opts.reason}` : ""}\n\nPlease resubmit with a clear screenshot of the transaction.\n\nPhilix Finance Ltd`,
    });
  },

  // ── Payment reminder (pre-due) ────────────────────────────────────────────
  async paymentReminder(opts: {
    email: string; firstName: string; reference: string;
    amountDue: number; dueDate: Date; accountId: string;
  }) {
    const body = `
<div style="text-align:center;padding:8px 0 24px;">
  ${badge("PAYMENT DUE SOON ⏰", "#451a03", "#fbbf24")}
  <h2 style="color:#f8fafc;font-size:22px;font-weight:800;margin:18px 0 8px;">Reminder, ${opts.firstName}</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Your loan payment is due in 3 days.</p>
</div>
${section("PAYMENT DETAILS", [
  row("Loan Reference", opts.reference, true),
  row("Amount Due",     `<strong style="color:#F5A623;font-size:15px;">${fmtK(opts.amountDue)}</strong>`),
  row("Due Date",       `<strong style="color:#f59e0b;">${fmt(opts.dueDate)}</strong>`),
].join(""))}
${highlight(`<p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.7;"><strong style="color:#e2e8f0;">How to pay:</strong><br>
• Airtel Money: 0977 158 901<br>
• MTN MoMo: 0968 158 901<br>
• Zamtel Kwacha: 0955 158 901<br>
<span style="color:#64748b;">Account Name: Philix Finance Ltd</span></p>`, "#f59e0b")}
${cta("Pay Now", `${PORTAL}/portal/loans`, "#f59e0b")}`;

    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `⏰ Payment Reminder — ${fmtK(opts.amountDue)} due ${fmt(opts.dueDate)}`,
      category: "PAYMENT_REMINDER", portalAccountId: opts.accountId,
      body: `Reminder: Payment of ${fmtK(opts.amountDue)} for loan ${opts.reference} is due on ${fmt(opts.dueDate)}.`,
      htmlOverride: buildBaseHtml(`REF: ${opts.reference}`, body, opts.email),
    });
  },

  // ── Overdue notice ────────────────────────────────────────────────────────
  async overdueNotice(opts: {
    email: string; firstName: string; reference: string;
    amountDue: number; daysOverdue: number; accountId: string;
  }) {
    const body = `
<div style="text-align:center;padding:8px 0 24px;">
  ${badge("OVERDUE ⚠️", "#7f1d1d", "#fca5a5")}
  <h2 style="color:#f8fafc;font-size:22px;font-weight:800;margin:18px 0 8px;">Urgent: Overdue Payment</h2>
  <p style="color:#94a3b8;font-size:14px;margin:0;">Dear ${opts.firstName}, your loan payment is ${opts.daysOverdue} day${opts.daysOverdue !== 1 ? "s" : ""} overdue.</p>
</div>
${section("OVERDUE DETAILS", [
  row("Loan Reference", opts.reference, true),
  row("Amount Overdue", `<strong style="color:#ef4444;font-size:15px;">${fmtK(opts.amountDue)}</strong>`),
  row("Days Overdue",   `<span style="color:#ef4444;font-weight:700;">${opts.daysOverdue} days</span>`),
].join(""))}
${highlight(`<p style="color:#fca5a5;font-size:13px;margin:0;line-height:1.7;"><strong>Continued non-payment may result in:</strong><br>
• Late payment fees<br>
• Negative impact on your credit score<br>
• Legal action<br><br>
Please contact us immediately on <a href="tel:+260777158901" style="color:#F5A623;">+260 777 158 901</a> to arrange payment.</p>`, "#ef4444")}
${cta("Pay Now", `${PORTAL}/portal/loans`, "#ef4444")}`;

    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `🚨 OVERDUE: Loan ${opts.reference} — ${opts.daysOverdue} days past due`,
      category: "PAYMENT_OVERDUE", portalAccountId: opts.accountId,
      body: `URGENT: Your payment of ${fmtK(opts.amountDue)} for loan ${opts.reference} is ${opts.daysOverdue} days overdue. Please pay immediately.`,
      htmlOverride: buildBaseHtml(`REF: ${opts.reference}`, body, opts.email),
    });
  },

  // ── Loan renewed (rollover) ───────────────────────────────────────────────
  async loanRenewed(opts: {
    email: string; firstName: string;
    oldReference: string; newReference: string;
    principal: number; interestPaid: number; accountId: string;
  }) {
    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `🔄 Loan Renewed — ${opts.newReference} · Philix Finance`,
      category: "LOAN_RENEWED", portalAccountId: opts.accountId,
      body: `Congratulations ${opts.firstName}!\n\nYour interest payment of ${fmtK(opts.interestPaid)} has been verified.\nLoan ${opts.oldReference} is now REPAID.\nNew loan ${opts.newReference} for ${fmtK(opts.principal)} is ACTIVE.\n\nLog in to your portal to view details.`,
    });
  },

  // ── Password reset ────────────────────────────────────────────────────────
  async passwordReset(email: string, firstName: string, otp: string) {
    return Mailer.otp(email, firstName, otp, "PASSWORD_RESET");
  },

  // ── Monthly statement ─────────────────────────────────────────────────────
  async monthlyStatement(opts: {
    email: string; firstName: string; accountId: string;
    totalLoans: number; totalPaid: number; activeLoans: number; repaidLoans: number;
  }) {
    const month = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `📊 Your Philix Finance Statement — ${month}`,
      category: "STATEMENT", portalAccountId: opts.accountId,
      body: `Monthly Account Statement — ${month}\n\nDear ${opts.firstName},\n\nTotal Loans: ${opts.totalLoans}\nActive Loans: ${opts.activeLoans}\nFully Repaid: ${opts.repaidLoans}\nTotal Paid This Month: ${fmtK(opts.totalPaid)}\n\nLog in to view your full statement at ${PORTAL}/portal/statement`,
    });
  },

  // ── Bulk / campaign send ──────────────────────────────────────────────────
  async bulk(recipients: Array<{ email: string; name: string; accountId?: string }>, subject: string, html: string, text: string) {
    let sent = 0; let failed = 0;
    for (const r of recipients) {
      const result = await sendEmail({
        to: r.email, toName: r.name, subject,
        body: text, htmlOverride: html,
        category: "CAMPAIGN", portalAccountId: r.accountId,
      });
      if (result.ok) sent++; else failed++;
      await new Promise(res => setTimeout(res, 120)); // 120ms between sends = ~500/min (under Resend limits)
    }
    return { sent, failed };
  },
};
