import nodemailer from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";
import { prisma } from "./prisma";
import { buildPhilixEmail as _buildPhilixEmail, fmt as _fmt } from "./emailBuilder";
export { buildPhilixEmail as buildPhilixEmailBranded } from "./emailBuilder";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 2000,  // fail fast — 2s max to connect
  greetingTimeout: 2000,
  socketTimeout: 4000,
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

// ── Branded Philix Finance email template (matches design in screenshots) ──
function buildPhilixEmail(opts: {
  ref: string;
  firstName: string;
  isCongratulations?: boolean;
  quote: string;
  actionType: "Required" | "Completed";
  actionLine: string;
  subLine: string;
  particulars?: Array<{ label: string; value: string }>;
  breakdown: Array<{ label: string; value: string; color?: string; bold?: boolean }>;
  principal: number;
  totalPaid: number;
  totalDue: number;
  progressPct?: number;
  ctaType: "pay" | "growth";
}): string {
  const outstanding = Math.max(0, opts.totalDue - opts.totalPaid);
  const pct = opts.progressPct ?? (opts.totalDue > 0 ? Math.min(100, Math.round((opts.totalPaid / opts.totalDue) * 100)) : 0);
  const whatsapp = `https://wa.me/260777158901?text=Hi+Philix+Finance,+I+want+to+make+a+payment+for+loan+${encodeURIComponent(opts.ref)}`;
  const qr = `https://api.qrserver.com/v1/create-qrcode/?size=70x70&data=${encodeURIComponent(opts.ref)}&bgcolor=f0fdf4&color=166534&margin=4`;

  const particularsHtml = opts.particulars ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
    <tr><td colspan="2" style="padding:10px 16px;background:#fafafa;border-bottom:1px solid #e2e8f0;">
      <span style="color:#d97706;font-size:13px;font-weight:700;">&#9670;&#9670;&#9670;&#9670;&#9670; Loan Particulars</span>
    </td></tr>
    ${opts.particulars.map(p => `
    <tr>
      <td style="padding:9px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">${p.label}</td>
      <td style="padding:9px 16px;color:#1e293b;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">${p.value}</td>
    </tr>`).join("")}
  </table>` : "";

  const breakdownHtml = `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
    <tr><td colspan="2" style="padding:10px 16px;background:#fafafa;border-bottom:1px solid #e2e8f0;">
      <span style="color:#d97706;font-size:13px;font-weight:700;">&#9670;&#9670;&#9670;&#9670;&#9670; Financial Breakdown</span>
    </td></tr>
    ${opts.breakdown.map(b => `
    <tr>
      <td style="padding:9px 16px;color:${b.color ?? "#64748b"};font-size:13px;font-weight:${b.bold ? "700" : "400"};border-top:1px solid #f1f5f9;">${b.label}</td>
      <td style="padding:9px 16px;color:${b.color ?? "#1e293b"};font-size:13px;font-weight:${b.bold ? "700" : "400"};text-align:right;border-top:1px solid #f1f5f9;">${b.value}</td>
    </tr>`).join("")}
    <tr>
      <td style="padding:12px 16px;color:#1e293b;font-size:14px;font-weight:700;border-top:2px solid #e2e8f0;">OUTSTANDING</td>
      <td style="padding:12px 16px;color:${outstanding <= 0 ? "#16a34a" : "#ef4444"};font-size:16px;font-weight:900;text-align:right;border-top:2px solid #e2e8f0;">ZMW ${outstanding.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
    ${pct > 0 && pct < 100 ? `
    <tr><td colspan="2" style="padding:8px 16px 12px;">
      <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
        <div style="height:7px;background:#f59e0b;border-radius:4px;width:${pct}%;"></div>
      </div>
    </td></tr>` : ""}
  </table>`;

  const ctaHtml = opts.ctaType === "growth" ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3A;border-radius:8px;overflow:hidden;">
    <tr><td style="padding:22px 24px;text-align:center;">
      <div style="color:#d97706;font-weight:700;font-size:14px;margin-bottom:8px;">&#9670;&#9670;&#9670;&#9670;&#9670; Ready for Growth?</div>
      <p style="color:#94a3b8;font-size:12px;margin:0 0 14px;">Because you paid on time, you are now eligible for a higher limit with faster approval.</p>
      <a href="${PORTAL}/portal/apply" style="display:inline-block;background:#d97706;color:#ffffff;padding:11px 26px;border-radius:6px;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:1px;">GET NEXT LOAN</a>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr>
      <td align="center" style="color:#94a3b8;font-size:12px;padding:8px 0;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;</td>
      <td align="center" style="color:#94a3b8;font-size:12px;padding:8px 0;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;</td>
    </tr>
    <tr>
      <td align="center" style="color:#64748b;font-size:11px;">500+ Happy Clients</td>
      <td align="center" style="color:#64748b;font-size:11px;">500+ Happy Clients</td>
    </tr>
  </table>` : `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;">
    <tr>
      <td width="90" style="padding:16px 12px 16px 16px;vertical-align:middle;">
        <img src="${qr}" width="70" height="70" alt="QR Code" style="display:block;border-radius:4px;" />
      </td>
      <td style="padding:16px 16px 16px 4px;vertical-align:middle;">
        <div style="color:#166534;font-weight:700;font-size:13px;margin-bottom:4px;">Ready to Pay?</div>
        <div style="color:#64748b;font-size:11px;margin-bottom:10px;">Scan code or use the link below to contact support.</div>
        <a href="${whatsapp}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:700;font-size:12px;">Pay via WhatsApp</a>
      </td>
    </tr>
  </table>`;

  const congratsBlock = opts.isCongratulations ? `
  <tr>
    <td style="padding:24px 32px 0;text-align:center;background:#ffffff;">
      <div style="color:#16a34a;font-size:28px;font-weight:900;letter-spacing:2px;font-family:Arial,sans-serif;">CONGRATULATIONS!</div>
      <div style="color:#64748b;font-size:11px;letter-spacing:3px;margin-top:4px;">LOAN FULLY SETTLED</div>
    </td>
  </tr>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Philix Finance</title></head>
<body style="margin:0;padding:20px 0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:20px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
  <tr>
    <td style="background:linear-gradient(135deg,#0B1F3A 0%,#1a3358 100%);padding:28px 32px;text-align:center;">
      <div style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:3px;font-family:Arial,sans-serif;">PHILIX FINANCE</div>
      <div style="color:#94a3b8;font-size:11px;letter-spacing:1.5px;margin-top:5px;">CLIENT REF: ${opts.ref}</div>
    </td>
  </tr>
  ${congratsBlock}
  <tr>
    <td style="padding:28px 32px;background:#ffffff;">
      <p style="color:#1e293b;font-size:15px;margin:0 0 16px;font-family:Arial,sans-serif;">Hello ${opts.firstName},</p>
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:0 0 16px;border-radius:0 8px 8px 0;">
        <em style="color:#92400e;font-size:13px;">"${opts.quote}"</em>
      </div>
      <p style="color:#1e293b;font-size:13px;margin:0 0 3px;font-family:Arial,sans-serif;"><strong>Action ${opts.actionType}:</strong> ${opts.actionLine}</p>
      <p style="color:#64748b;font-size:12px;margin:0 0 20px;font-family:Arial,sans-serif;">&#9670; ${opts.subLine}</p>
      ${particularsHtml}
      ${breakdownHtml}
      ${ctaHtml}
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:10px;letter-spacing:1.5px;margin:0 0 4px;font-family:Arial,sans-serif;">POWERED BY PHILIX FINANCE</p>
      <p style="color:#cbd5e1;font-size:10px;margin:0;font-family:Arial,sans-serif;">Philix Finance Ltd · Lusaka, Zambia · BoZ Licensed · <a href="mailto:info@philixfinance.com" style="color:#94a3b8;text-decoration:none;">info@philixfinance.com</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

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
    const interest = Math.ceil(opts.amountRequested * (opts.interestRate / 100));
    const total    = opts.amountRequested + interest;
    const weekly   = Math.ceil(total / opts.termMonths);
    const dueDate  = new Date(Date.now() + opts.termMonths * 7 * 86400000);
    const daysUntil = opts.termMonths * 7;

    return sendEmail({
      to: opts.email, toName: `${opts.firstName} ${opts.lastName}`,
      subject: `Loan Approved — ${opts.reference} · Philix Finance`,
      category: "LOAN_APPROVED", portalAccountId: opts.accountId,
      body: `Your loan ${opts.reference} has been APPROVED.\n\nAmount: ${fmtK(opts.amountRequested)}\nTotal Repayable: ${fmtK(total)}\nWeekly Payment: ${fmtK(weekly)}\nDue: ${fmt(dueDate)}\n\nLog in to your portal to view details.`,
      htmlOverride: buildPhilixEmail({
        ref: opts.reference, firstName: opts.firstName,
        quote: "Your loan has been approved. We're excited to support your goals.",
        actionType: "Required", actionLine: "Review your loan details and prepare for disbursement.",
        subLine: "Thank you for choosing Philix Finance.",
        particulars: [
          { label: "Loan Type", value: productLabel },
          { label: "Due Date", value: fmt(dueDate) },
          { label: "Status", value: `Due in ${daysUntil} days` },
        ],
        breakdown: [
          { label: "Principal", value: `ZMW ${opts.amountRequested.toLocaleString()}` },
          { label: "Interest (${opts.interestRate}% flat)", value: `ZMW ${interest.toLocaleString()}` },
          { label: "Weekly Payment", value: `ZMW ${weekly.toLocaleString()}` },
          { label: "Total Paid", value: "- ZMW 0.00", color: "#16a34a", bold: true },
        ],
        principal: opts.amountRequested, totalPaid: 0, totalDue: total,
        ctaType: "pay",
      }),
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
    const interest = Math.ceil(opts.amountRequested * (opts.interestRate / 100));
    const total    = opts.amountRequested + interest;
    const weekly   = Math.ceil(total / opts.termMonths);
    const dueDate  = new Date(Date.now() + opts.termMonths * 7 * 86400000);
    const daysUntil = opts.termMonths * 7;

    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `Statement: ${opts.reference}`,
      category: "LOAN_DISBURSED", portalAccountId: opts.accountId,
      body: `Your loan ${opts.reference} has been disbursed!\n\nAmount: ZMW ${opts.amountRequested.toLocaleString()}\nWeekly Payment: ZMW ${weekly.toLocaleString()}\nFinal Due: ${fmt(dueDate)}\n\nFirst payment due in 7 days.`,
      htmlOverride: buildPhilixEmail({
        ref: opts.reference, firstName: opts.firstName,
        quote: "We appreciate your partnership with Philix Finance.",
        actionType: "Required", actionLine: "Review your statement.",
        subLine: "Thank you for your continued business.",
        particulars: [
          { label: "Loan Type", value: "Trusted Client" },
          { label: "Due Date", value: fmt(dueDate) },
          { label: "Status", value: `Due in ${daysUntil} days` },
        ],
        breakdown: [
          { label: "Principal", value: `ZMW ${opts.amountRequested.toLocaleString()}` },
          { label: "Interest", value: `ZMW ${interest.toLocaleString()}` },
          { label: "Total Paid", value: "- ZMW 0.00", color: "#16a34a", bold: true },
        ],
        principal: opts.amountRequested, totalPaid: 0, totalDue: total,
        ctaType: "pay",
      }),
    });
  },

  // ── Payment confirmed ─────────────────────────────────────────────────────
  async paymentConfirmed(opts: {
    email: string; firstName: string; reference: string;
    amount: number; totalPaid: number; remaining: number; totalDue: number; accountId: string;
  }) {
    const fullyPaid = opts.remaining <= 0;

    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: fullyPaid ? `Congratulations: ${opts.reference} Fully Repaid` : `Payment Confirmed — ${opts.reference}`,
      category: "PAYMENT_CONFIRMED", portalAccountId: opts.accountId,
      body: `Payment of ZMW ${opts.amount.toLocaleString()} confirmed for loan ${opts.reference}.\nTotal paid: ZMW ${opts.totalPaid.toLocaleString()}\nOutstanding: ${fullyPaid ? "CLEARED" : `ZMW ${opts.remaining.toLocaleString()}`}`,
      htmlOverride: buildPhilixEmail({
        ref: opts.reference, firstName: opts.firstName,
        isCongratulations: fullyPaid,
        quote: fullyPaid
          ? "Smart debt is the fuel for business growth. Use your next loan to stock up inventory in bulk or upgrade your equipment."
          : "Thank you for your payment. Every payment builds your credit profile.",
        actionType: "Completed",
        actionLine: "Payment Received.",
        subLine: "Thank you for your partnership with Philix Finance.",
        breakdown: fullyPaid ? [
          { label: "Principal Loaned", value: `ZMW ${(opts.totalDue > 0 ? opts.totalDue - (opts.totalDue - (opts.totalPaid || opts.totalDue)) : opts.amount).toLocaleString()}` },
          { label: "Total Repaid", value: `ZMW ${opts.totalPaid.toLocaleString()}`, color: "#16a34a", bold: true },
        ] : [
          { label: "Amount Confirmed", value: `ZMW ${opts.amount.toLocaleString()}`, color: "#16a34a", bold: true },
          { label: "Total Paid", value: `- ZMW ${opts.totalPaid.toLocaleString()}`, color: "#16a34a", bold: true },
        ],
        principal: opts.totalDue, totalPaid: opts.totalPaid, totalDue: opts.totalDue,
        ctaType: fullyPaid ? "growth" : "pay",
      }),
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
    amountDue: number; dueDate: Date; totalDue: number; totalPaid: number; accountId: string;
  }) {
    const daysUntil = Math.round((opts.dueDate.getTime() - Date.now()) / 86400000);
    const statusText = daysUntil <= 1 ? "Due tomorrow" : `Due in ${daysUntil} days`;

    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `Reminder: Payment due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} — ${opts.reference}`,
      category: "PAYMENT_REMINDER", portalAccountId: opts.accountId,
      body: `Reminder: Payment of ZMW ${opts.amountDue.toLocaleString()} for loan ${opts.reference} is due on ${fmt(opts.dueDate)}.`,
      htmlOverride: buildPhilixEmail({
        ref: opts.reference, firstName: opts.firstName,
        quote: "Your facility is maturing soon.",
        actionType: "Required", actionLine: "Please prepare your payment.",
        subLine: "Planning ahead ensures a stress-free financial life.",
        particulars: [
          { label: "Loan Type", value: "Trusted Client" },
          { label: "Due Date", value: fmt(opts.dueDate) },
          { label: "Status", value: statusText },
        ],
        breakdown: [
          { label: "Principal", value: `ZMW ${(opts.totalDue - Math.ceil((opts.totalDue - (opts.totalDue / (1 + 0.2))) )).toLocaleString()}` },
          { label: "Interest", value: `ZMW ${Math.ceil(opts.totalDue * 0.17).toLocaleString()}` },
          { label: "Total Paid", value: `- ZMW ${opts.totalPaid.toLocaleString()}`, color: "#16a34a", bold: true },
        ],
        principal: opts.amountDue, totalPaid: opts.totalPaid, totalDue: opts.totalDue,
        ctaType: "pay",
      }),
    });
  },

  // ── Overdue notice ────────────────────────────────────────────────────────
  async overdueNotice(opts: {
    email: string; firstName: string; reference: string;
    amountDue: number; daysOverdue: number; totalDue: number; totalPaid: number; accountId: string;
  }) {
    return sendEmail({
      to: opts.email, toName: opts.firstName,
      subject: `OVERDUE: Loan ${opts.reference} — ${opts.daysOverdue} days past due`,
      category: "PAYMENT_OVERDUE", portalAccountId: opts.accountId,
      body: `URGENT: Your payment of ZMW ${opts.amountDue.toLocaleString()} for loan ${opts.reference} is ${opts.daysOverdue} days overdue. Please pay immediately.`,
      htmlOverride: buildPhilixEmail({
        ref: opts.reference, firstName: opts.firstName,
        quote: "Settling overdue amounts protects your credit and keeps future loans available.",
        actionType: "Required", actionLine: `Make payment now — ${opts.daysOverdue} day${opts.daysOverdue !== 1 ? "s" : ""} overdue.`,
        subLine: "Continued non-payment may affect your credit score and eligibility.",
        particulars: [
          { label: "Loan Type", value: "Trusted Client" },
          { label: "Days Overdue", value: `${opts.daysOverdue} day${opts.daysOverdue !== 1 ? "s" : ""}` },
          { label: "Status", value: "OVERDUE — Action Required" },
        ],
        breakdown: [
          { label: "Amount Overdue", value: `ZMW ${opts.amountDue.toLocaleString()}`, color: "#ef4444", bold: true },
          { label: "Total Paid", value: `- ZMW ${opts.totalPaid.toLocaleString()}`, color: "#16a34a", bold: true },
        ],
        principal: opts.amountDue, totalPaid: opts.totalPaid, totalDue: opts.totalDue,
        ctaType: "pay",
      }),
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
