// Pure HTML builder — no DB, no sending. Safe to import from anywhere.
const PORTAL = process.env.FRONTEND_URL || "https://philix-finance.vercel.app";
const WHATSAPP_NUMBER = "260777158901";

export const fmt  = (n: number) => Number(n ?? 0).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtK = (n: number) => `ZMW ${fmt(n)}`;
export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// ── Shared blocks ─────────────────────────────────────────────────────────────
function philixHeader(ref: string, subtitle?: string): string {
  return `
  <tr>
    <td style="background:linear-gradient(135deg,#0B1F3A 0%,#1a3358 100%);padding:28px 32px;text-align:center;">
      <div style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:3px;font-family:Arial,sans-serif;">PHILIX FINANCE</div>
      ${subtitle ? `<div style="color:#d97706;font-size:11px;letter-spacing:2px;margin-top:4px;font-family:Arial,sans-serif;">${subtitle}</div>` : ""}
      ${ref ? `<div style="color:#94a3b8;font-size:11px;letter-spacing:1.5px;margin-top:5px;font-family:Arial,sans-serif;">CLIENT REF: ${ref}</div>` : ""}
    </td>
  </tr>`;
}

function philixCongrats(): string {
  return `
  <tr>
    <td style="padding:24px 32px 0;text-align:center;background:#ffffff;">
      <div style="color:#16a34a;font-size:28px;font-weight:900;letter-spacing:2px;font-family:Arial,sans-serif;">CONGRATULATIONS!</div>
      <div style="color:#64748b;font-size:11px;letter-spacing:3px;margin-top:4px;font-family:Arial,sans-serif;">LOAN FULLY SETTLED</div>
    </td>
  </tr>`;
}

function philixParticularsTable(rows: Array<{ label: string; value: string }>): string {
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:9px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;font-family:Arial,sans-serif;">${r.label}</td>
      <td style="padding:9px 16px;color:#1e293b;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;font-family:Arial,sans-serif;">${r.value}</td>
    </tr>`).join("");

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
    <tr>
      <td colspan="2" style="padding:10px 16px;background:#fafafa;border-bottom:1px solid #e2e8f0;">
        <span style="color:#d97706;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670; Loan Particulars</span>
      </td>
    </tr>
    ${rowsHtml}
  </table>`;
}

function philixBreakdownTable(
  rows: Array<{ label: string; value: string; color?: string; bold?: boolean }>,
  totalDue: number,
  totalPaid: number,
  progressPct?: number,
): string {
  const outstanding = Math.max(0, totalDue - totalPaid);
  const pct = progressPct ?? (totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0);

  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:9px 16px;color:${r.color ?? "#64748b"};font-size:13px;font-weight:${r.bold ? "700" : "400"};border-top:1px solid #f1f5f9;font-family:Arial,sans-serif;">${r.label}</td>
      <td style="padding:9px 16px;color:${r.color ?? "#1e293b"};font-size:13px;font-weight:${r.bold ? "700" : "400"};text-align:right;border-top:1px solid #f1f5f9;font-family:Arial,sans-serif;">${r.value}</td>
    </tr>`).join("");

  const progressBar = (pct > 0 && pct < 100) ? `
    <tr><td colspan="2" style="padding:8px 16px 12px;">
      <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
        <div style="height:7px;background:#f59e0b;border-radius:4px;width:${pct}%;"></div>
      </div>
    </td></tr>` : "";

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
    <tr>
      <td colspan="2" style="padding:10px 16px;background:#fafafa;border-bottom:1px solid #e2e8f0;">
        <span style="color:#d97706;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670; Financial Breakdown</span>
      </td>
    </tr>
    ${rowsHtml}
    <tr>
      <td style="padding:12px 16px;color:#1e293b;font-size:14px;font-weight:700;border-top:2px solid #e2e8f0;font-family:Arial,sans-serif;">OUTSTANDING</td>
      <td style="padding:12px 16px;color:${outstanding <= 0 ? "#16a34a" : "#ef4444"};font-size:16px;font-weight:900;text-align:right;border-top:2px solid #e2e8f0;font-family:Arial,sans-serif;">
        ZMW ${outstanding.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    </tr>
    ${progressBar}
  </table>`;
}

function philixQRCta(ref: string): string {
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi+Philix+Finance,+I+want+to+make+a+payment+for+loan+${encodeURIComponent(ref)}`;
  const qr = `https://api.qrserver.com/v1/create-qrcode/?size=70x70&data=${encodeURIComponent(ref)}&bgcolor=f0fdf4&color=166534&margin=4`;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;">
    <tr>
      <td width="90" style="padding:16px 12px 16px 16px;vertical-align:middle;">
        <img src="${qr}" width="70" height="70" alt="QR" style="display:block;border-radius:4px;" />
      </td>
      <td style="padding:16px 16px 16px 4px;vertical-align:middle;">
        <div style="color:#166534;font-weight:700;font-size:13px;margin-bottom:4px;font-family:Arial,sans-serif;">Ready to Pay?</div>
        <div style="color:#64748b;font-size:11px;margin-bottom:10px;font-family:Arial,sans-serif;">Scan code or use the link below to contact support.</div>
        <a href="${wa}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:700;font-size:12px;font-family:Arial,sans-serif;">Pay via WhatsApp</a>
      </td>
    </tr>
  </table>`;
}

function philixGrowthCta(): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3A;border-radius:8px;overflow:hidden;">
    <tr><td style="padding:22px 24px;text-align:center;">
      <div style="color:#d97706;font-weight:700;font-size:14px;margin-bottom:8px;font-family:Arial,sans-serif;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670; Ready for Growth?</div>
      <p style="color:#94a3b8;font-size:12px;margin:0 0 14px;font-family:Arial,sans-serif;">Because you paid on time, you are now eligible for a higher limit with faster approval.</p>
      <a href="${PORTAL}/portal/apply" style="display:inline-block;background:#d97706;color:#ffffff;padding:11px 26px;border-radius:6px;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:1px;font-family:Arial,sans-serif;">GET NEXT LOAN</a>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr>
      <td align="center" style="color:#94a3b8;font-size:20px;padding:8px 0;font-family:Arial,sans-serif;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;</td>
      <td align="center" style="color:#94a3b8;font-size:20px;padding:8px 0;font-family:Arial,sans-serif;">&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;&#9670;</td>
    </tr>
    <tr>
      <td align="center" style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">500+ Happy Clients</td>
      <td align="center" style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">600+ Happy Clients</td>
    </tr>
  </table>`;
}

function philixNavButton(text: string, href: string, bg = "#0B1F3A", fg = "#ffffff"): string {
  return `<div style="text-align:center;margin:20px 0;">
    <a href="${href}" style="display:inline-block;background:${bg};color:${fg};padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;font-family:Arial,sans-serif;">${text}</a>
  </div>`;
}

function philixFooter(): string {
  return `
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:10px;letter-spacing:1.5px;margin:0 0 4px;font-family:Arial,sans-serif;">POWERED BY PHILIX FINANCE</p>
      <p style="color:#cbd5e1;font-size:10px;margin:0;font-family:Arial,sans-serif;">Philix Finance Ltd &middot; Lusaka, Zambia &middot; BoZ Licensed &middot;
        <a href="mailto:info@philixfinance.com" style="color:#94a3b8;text-decoration:none;">info@philixfinance.com</a>
      </p>
    </td>
  </tr>`;
}

// ── Main email builder ─────────────────────────────────────────────────────────
export interface PhilixEmailOpts {
  ref: string;
  firstName: string;
  isCongratulations?: boolean;
  headerSubtitle?: string;
  quote: string;
  actionType: "Required" | "Completed" | "Update";
  actionLine: string;
  subLine: string;
  particulars?: Array<{ label: string; value: string }>;
  breakdown?: Array<{ label: string; value: string; color?: string; bold?: boolean }>;
  totalPaid?: number;
  totalDue?: number;
  progressPct?: number;
  ctaType: "pay" | "growth" | "button" | "none";
  buttonText?: string;
  buttonUrl?: string;
  extraContent?: string;
}

export function buildPhilixEmail(opts: PhilixEmailOpts): string {
  const breakdown = opts.breakdown ?? [];
  const totalDue  = opts.totalDue  ?? 0;
  const totalPaid = opts.totalPaid ?? 0;

  const bodyContent = `
    <p style="color:#1e293b;font-size:15px;margin:0 0 16px;font-family:Arial,sans-serif;">Hello ${opts.firstName},</p>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:0 0 16px;border-radius:0 8px 8px 0;">
      <em style="color:#92400e;font-size:13px;font-family:Arial,sans-serif;">"${opts.quote}"</em>
    </div>
    <p style="color:#1e293b;font-size:13px;margin:0 0 3px;font-family:Arial,sans-serif;"><strong>Action ${opts.actionType}:</strong> ${opts.actionLine}</p>
    <p style="color:#64748b;font-size:12px;margin:0 0 20px;font-family:Arial,sans-serif;">&#9670; ${opts.subLine}</p>
    ${opts.particulars ? philixParticularsTable(opts.particulars) : ""}
    ${breakdown.length > 0 ? philixBreakdownTable(breakdown, totalDue, totalPaid, opts.progressPct) : ""}
    ${opts.extraContent ?? ""}
    ${opts.ctaType === "pay"    ? philixQRCta(opts.ref)    : ""}
    ${opts.ctaType === "growth" ? philixGrowthCta()         : ""}
    ${opts.ctaType === "button" ? philixNavButton(opts.buttonText!, opts.buttonUrl!) : ""}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Philix Finance</title></head>
<body style="margin:0;padding:20px 0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:20px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
  ${philixHeader(opts.ref, opts.headerSubtitle)}
  ${opts.isCongratulations ? philixCongrats() : ""}
  <tr><td style="padding:28px 32px;background:#ffffff;">${bodyContent}</td></tr>
  ${philixFooter()}
</table>
</td></tr>
</table>
</body>
</html>`;
}
