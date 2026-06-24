import { useState, useEffect } from "react";
import { X, Mail, Send, RefreshCw, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "/api";

export interface EmailContext {
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  clientNumber?: string;
  // optional loan context — pre-populates the template
  loanRef?: string;
  loanAmount?: number;
  loanStatus?: string;
  loanProduct?: string;
  loanId?: string;
  loanTermMonths?: number;
  loanDueDate?: string;
}

interface Props {
  context: EmailContext;
  onClose: () => void;
}

interface Template {
  label: string;
  subject: (ctx: EmailContext) => string;
  body: (ctx: EmailContext) => string;
}

const fmtK = (n: number) => `K${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TEMPLATES: Template[] = [
  {
    label: "Blank — write from scratch",
    subject: () => "",
    body:    () => "",
  },
  {
    label: "Loan Approved",
    subject: ctx => ctx.loanRef ? `Your loan ${ctx.loanRef} has been approved — Philix Finance` : "Your loan application has been approved",
    body: ctx => `Dear ${ctx.firstName},

We are pleased to inform you that your loan application${ctx.loanRef ? ` (Ref: ${ctx.loanRef})` : ""}${ctx.loanAmount ? ` for ${fmtK(ctx.loanAmount)}` : ""} has been APPROVED.

Your funds will be disbursed to your registered mobile money account shortly.

${ctx.loanDueDate ? `Repayment due: ${ctx.loanDueDate}\n` : ""}Please ensure your mobile money wallet is active and has sufficient capacity to receive the funds.

If you have any questions, please contact us at info@philixfinance.com or call +260 777 158 901.

Thank you for choosing Philix Finance.

Warm regards,
Philix Finance Loan Team`,
  },
  {
    label: "Loan Disbursed",
    subject: ctx => `Funds Disbursed — ${ctx.loanRef || "Your Loan"}`,
    body: ctx => `Dear ${ctx.firstName},

Great news! Your loan${ctx.loanRef ? ` (Ref: ${ctx.loanRef})` : ""}${ctx.loanAmount ? ` of ${fmtK(ctx.loanAmount)}` : ""} has been successfully disbursed to your mobile money account.

Please check your mobile wallet to confirm receipt of the funds.

${ctx.loanDueDate ? `Your first repayment is due on: ${ctx.loanDueDate}\n` : ""}To make repayments, send money to our Airtel Money / MTN Mobile Money number and use your reference number as the reason.

Reference: ${ctx.loanRef || "—"}

Contact us immediately if you did not receive your funds.

Philix Finance Ltd
+260 777 158 901`,
  },
  {
    label: "Payment Reminder",
    subject: ctx => `Payment Reminder — ${ctx.loanRef || "Your Loan"} — Philix Finance`,
    body: ctx => `Dear ${ctx.firstName},

This is a friendly reminder that your loan repayment${ctx.loanRef ? ` (Ref: ${ctx.loanRef})` : ""} is due soon.

${ctx.loanDueDate ? `Due Date: ${ctx.loanDueDate}\n` : ""}Please ensure payment is made on time to avoid any late fees or penalties.

How to pay:
• Airtel Money: Send to 0977 XXX XXX
• MTN Mobile Money: Send to 0966 XXX XXX
• Use your loan reference as the reason/message

Reference: ${ctx.loanRef || "—"}

If you are experiencing financial difficulties, please contact us as soon as possible so we can discuss your options.

Philix Finance Collections Team
+260 777 158 901`,
  },
  {
    label: "Payment Overdue",
    subject: ctx => `URGENT: Overdue Payment — ${ctx.loanRef || "Your Account"}`,
    body: ctx => `Dear ${ctx.firstName},

We have noticed that your loan repayment${ctx.loanRef ? ` (Ref: ${ctx.loanRef})` : ""} is now OVERDUE.

This requires your immediate attention. Continued failure to repay may result in:
• Late payment penalties being added to your balance
• Negative impact on your credit record with Philix Finance
• Referral to our collections team

Please make your payment TODAY using your reference number: ${ctx.loanRef || "—"}

If you have already made payment, please ignore this notice and forward your payment confirmation to info@philixfinance.com.

If you are unable to pay, please contact us immediately at +260 777 158 901 to discuss your situation.

Philix Finance Collections Department`,
  },
  {
    label: "KYC Verification Update",
    subject: () => "KYC Verification Update — Action Required",
    body: ctx => `Dear ${ctx.firstName},

We are writing regarding your identity verification (KYC) with Philix Finance.

To process your loan application and provide you with our full range of services, we require you to complete your identity verification.

Please log in to your Philix Finance client portal and submit:
1. A clear photo of the front of your NRC
2. A clear photo of the back of your NRC
3. A selfie holding your NRC (face and NRC clearly visible)

Portal: https://philixfinance.vercel.app/portal

If you have already submitted your documents, our compliance team will review them within 1–2 business days and notify you of the outcome.

Thank you for your cooperation.

Philix Finance Compliance Team`,
  },
  {
    label: "Account Notice",
    subject: () => "Important Notice Regarding Your Account",
    body: ctx => `Dear ${ctx.firstName},

We are writing to you regarding your Philix Finance account (${ctx.clientNumber || "—"}).

[Add your message here]

If you have any questions or concerns, please do not hesitate to contact us:
📞 +260 777 158 901
✉️ info@philixfinance.com

Philix Finance Ltd`,
  },
];

export default function SendEmailModal({ context, onClose }: Props) {
  const [templateIdx, setTemplateIdx] = useState(0);
  const [subject, setSubject]         = useState("");
  const [body, setBody]               = useState("");
  const [sending, setSending]         = useState(false);
  const [result, setResult]           = useState<{ ok: boolean; msg: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Apply template when changed
  useEffect(() => {
    const t = TEMPLATES[templateIdx];
    setSubject(t.subject(context));
    setBody(t.body(context));
    setResult(null);
  }, [templateIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch(`${API}/admin/send-client-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          accountId: context.accountId,
          subject: subject.trim(),
          body: body.trim(),
          loanRef: context.loanRef,
          loanId: context.loanId,
        }),
      });
      const data = await r.json();
      setResult({ ok: r.ok && data.ok, msg: data.message || (r.ok ? "Email sent!" : data.error || "Send failed") });
    } catch {
      setResult({ ok: false, msg: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  };

  const charCount = body.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
              <Mail size={16} className="text-indigo-400" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm">Send Email</div>
              <div className="text-xs text-slate-500">
                To: <span className="text-indigo-300 font-medium">{context.firstName} {context.lastName}</span>
                <span className="text-slate-600 mx-1">·</span>
                <span className="font-mono">{context.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Loan context badge */}
          {context.loanRef && (
            <div className="flex items-center gap-3 bg-amber-900/10 border border-amber-800/30 rounded-xl px-4 py-2.5">
              <div className="w-1.5 h-8 bg-amber-500 rounded-full flex-shrink-0" />
              <div>
                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Loan Context</div>
                <div className="text-sm font-mono text-amber-300 font-bold">{context.loanRef}</div>
              </div>
              {context.loanAmount && (
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Amount</div>
                  <div className="text-sm font-bold text-slate-200">{fmtK(context.loanAmount)}</div>
                </div>
              )}
              {context.loanStatus && (
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Status</div>
                  <div className="text-xs font-bold text-slate-300">{context.loanStatus}</div>
                </div>
              )}
            </div>
          )}

          {/* Template picker */}
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1.5 block flex items-center gap-1">
              <ChevronDown size={11} /> Quick Template
            </label>
            <select
              value={templateIdx}
              onChange={e => setTemplateIdx(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TEMPLATES.map((t, i) => (
                <option key={i} value={i}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Subject *</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line…"
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 font-semibold">Message *</label>
              <button
                onClick={() => setShowPreview(p => !p)}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {showPreview ? "Edit" : "Preview"}
              </button>
            </div>

            {showPreview ? (
              <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                <div className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">To: {context.email}</div>
                <div className="text-xs text-slate-400 mb-3 font-semibold">Subject: {subject || "(no subject)"}</div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{body || "(empty)"}</div>
              </div>
            ) : (
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                placeholder="Write your message here…"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 resize-none leading-relaxed"
              />
            )}
            <div className="flex items-center justify-between mt-1">
              <div className="text-xs text-slate-600">{charCount} characters</div>
              {!showPreview && (
                <button onClick={() => setBody("")} className="text-xs text-slate-600 hover:text-slate-400">Clear</button>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${result.ok ? "bg-emerald-900/20 border border-emerald-700/40 text-emerald-300" : "bg-amber-900/20 border border-amber-700/40 text-amber-300"}`}>
              {result.ok
                ? <CheckCircle size={15} className="mt-0.5 flex-shrink-0" />
                : <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
              <span>{result.msg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-800 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:text-slate-200 hover:border-slate-600 transition-all">
            {result?.ok ? "Close" : "Cancel"}
          </button>
          <button
            onClick={send}
            disabled={sending || !subject.trim() || !body.trim() || result?.ok === true}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition-all"
          >
            {sending
              ? <><RefreshCw size={14} className="animate-spin" /> Sending…</>
              : <><Send size={14} /> Send Email to {context.firstName}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
