import { useState, useEffect } from "react";
import { Send, Mail, Users, ChevronDown, CheckCircle, AlertCircle, Eye, X } from "lucide-react";
import { EMAIL_TEMPLATES, EmailTemplate } from "../lib/emailTemplates";
import { staffApi, type PortalAccount } from "../lib/api";

type SendStatus = "idle" | "sending" | "sent" | "error";

const CATEGORY_COLORS: Record<string, string> = {
  LOAN: "text-blue-400 bg-blue-900/30 border-blue-800/40",
  PAYMENT: "text-emerald-400 bg-emerald-900/30 border-emerald-800/40",
  KYC: "text-purple-400 bg-purple-900/30 border-purple-800/40",
  ACCOUNT: "text-indigo-400 bg-indigo-900/30 border-indigo-800/40",
  COLLECTION: "text-red-400 bg-red-900/30 border-red-800/40",
  GENERAL: "text-slate-400 bg-slate-800 border-slate-700",
};

export default function EmailComposerPage() {
  const [portalAccounts, setPortalAccounts] = useState<PortalAccount[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);

  useEffect(() => {
    staffApi.getPortalAccounts().then(setPortalAccounts).catch(() => {});
  }, []);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<SendStatus>("idle");
  const [preview, setPreview] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"select" | "all" | "manual">("select");
  const [manualEmail, setManualEmail] = useState("");
  const [sentCount, setSentCount] = useState(0);

  const [vars, setVars] = useState<Record<string, string>>({
    clientName: "Client Name", loanNumber: "PHX-L-2024-0001",
    product: "Salary Advance", amount: "5,000", term: "6",
    monthly: "1,050", rate: "5", disbursementDate: "25 June 2025",
    firstPaymentDate: "25 July 2025", date: new Date().toLocaleDateString("en-GB"),
    officerName: "Patricia Mwanza", clientNumber: "PHX-C-0001",
    nrcNumber: "123456/78/9", method: "Bank Transfer",
    reference: "TXN-20250625-001", receiptNumber: "RCP-001",
    outstanding: "3,000", nextAmount: "1,050", nextDueDate: "25 July 2025",
    dueDate: "15 June 2025", daysOverdue: "10", penalty: "150",
    totalDue: "1,200", email: "client@email.com",
    reason: "Document unclear", corrections: "- Please upload a clearer NRC front photo\n- Ensure the selfie shows your face clearly",
    message: "", signature: "Philix Finance Ltd",
  });

  const applyTemplate = (t: EmailTemplate) => {
    setSelectedTemplate(t);
    setSubject(t.subject);
    setBody(t.body(vars));
  };

  const refreshBody = () => {
    if (selectedTemplate) setBody(selectedTemplate.body(vars));
  };

  const addRecipient = (email: string) => {
    if (!recipients.includes(email)) setRecipients(p => [...p, email]);
  };

  const finalRecipients = recipientMode === "all"
    ? portalAccounts.map(c => c.email).filter(Boolean)
    : recipientMode === "manual" && manualEmail
      ? [manualEmail]
      : recipients;

  const send = async () => {
    if (!subject || !body || finalRecipients.length === 0) return;
    setStatus("sending");
    await new Promise(r => setTimeout(r, 1800));
    setSentCount(finalRecipients.length);
    setStatus("sent");
  };

  const reset = () => {
    setStatus("idle");
    setSelectedTemplate(null);
    setSubject("");
    setBody("");
    setRecipients([]);
    setManualEmail("");
    setRecipientMode("select");
  };

  if (status === "sent") {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Email{sentCount > 1 ? "s" : ""} Queued!</h2>
        <p className="text-slate-400 mb-2">
          <span className="text-white font-semibold">{sentCount}</span> email{sentCount > 1 ? "s" : ""} added to the outgoing mail queue.
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 text-left text-sm space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Subject</span><span className="text-slate-200 truncate max-w-[200px]">{subject}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Recipients</span><span className="text-slate-200">{sentCount} client{sentCount > 1 ? "s" : ""}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Template</span><span className="text-slate-200">{selectedTemplate?.name ?? "Custom"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Sent via</span><span className="text-slate-200">SMTP (Gmail Workspace)</span></div>
        </div>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300 mb-6">
          In production, this connects to Gmail Workspace SMTP via Nodemailer. Emails are sent from noreply@philixfinance.com.
        </div>
        <button onClick={reset} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl">
          Compose Another Email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Email Composer</h1>
          <p className="text-slate-500 text-sm mt-1">Send notifications, receipts and updates to clients via SMTP</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
          <Mail size={12} /> SMTP — Gmail Workspace
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — template + recipients */}
        <div className="space-y-4">
          {/* Templates */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Email Templates</h3>
            <div className="space-y-1.5">
              {EMAIL_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${selectedTemplate?.id === t.id ? "bg-indigo-600/20 border-indigo-600" : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300 font-medium">{t.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[t.category]}`}>{t.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recipients</h3>
            <div className="space-y-2 mb-3">
              {[
                { v: "select", label: "Select individual clients" },
                { v: "all", label: `All clients (${portalAccounts.length})` },
                { v: "manual", label: "Enter email manually" },
              ].map(o => (
                <label key={o.v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${recipientMode === o.v ? "border-indigo-600 bg-indigo-600/10" : "border-slate-800 hover:border-slate-700"}`}>
                  <input type="radio" name="mode" value={o.v} checked={recipientMode === o.v}
                    onChange={() => setRecipientMode(o.v as "select" | "all" | "manual")} className="accent-indigo-600" />
                  <span className="text-sm text-slate-300">{o.label}</span>
                </label>
              ))}
            </div>

            {recipientMode === "select" && (
              <div className="space-y-1">
                <div className="relative">
                  <select onChange={e => { if (e.target.value) addRecipient(e.target.value); e.target.value = ""; }}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                    <option value="">+ Add client...</option>
                    {portalAccounts.map(c => (
                      <option key={c.id} value={c.email}>{c.firstName} {c.lastName} — {c.email}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                {recipients.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {recipients.map(r => (
                      <div key={r} className="flex items-center justify-between bg-slate-800 rounded-lg px-2 py-1.5">
                        <span className="text-xs text-slate-400 truncate">{r}</span>
                        <button onClick={() => setRecipients(p => p.filter(x => x !== r))} className="text-slate-600 hover:text-red-400 flex-shrink-0 ml-1">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {recipientMode === "manual" && (
              <input type="email" placeholder="client@email.com" value={manualEmail}
                onChange={e => setManualEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600" />
            )}

            <div className="mt-3 text-xs text-slate-600 flex items-center gap-1">
              <Users size={10} /> {finalRecipients.length} recipient{finalRecipients.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Right — compose */}
        <div className="lg:col-span-2 space-y-4">
          {/* Variables panel (shown when template is selected) */}
          {selectedTemplate && selectedTemplate.id !== "custom" && (
            <div className="bg-amber-900/10 border border-amber-900/30 rounded-2xl p-4">
              <div className="text-xs font-semibold text-amber-400 mb-3">Template Variables — Edit to Personalise</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(vars).filter(([k]) => selectedTemplate.body({}).includes(`{${k}`) === false && selectedTemplate.body({ [k]: `{${k}}` }).includes(`{${k}}`)).slice(0, 10).map(([k, v]) => (
                  <div key={k}>
                    <label className="text-[10px] text-slate-600 block mb-0.5">{k}</label>
                    <input value={v} onChange={e => { setVars(p => ({ ...p, [k]: e.target.value })); }}
                      onBlur={refreshBody}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  </div>
                ))}
              </div>
              <button onClick={refreshBody} className="mt-2 text-xs text-amber-400 hover:text-amber-300">↺ Refresh preview</button>
            </div>
          )}

          {/* Compose area */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                placeholder="Email subject..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Body *</label>
                <button onClick={() => setPreview(!preview)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <Eye size={11} /> {preview ? "Edit" : "Preview"}
                </button>
              </div>
              {preview ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 whitespace-pre-wrap font-mono min-h-[300px] overflow-y-auto">
                  {body || <span className="text-slate-600">No content yet...</span>}
                </div>
              ) : (
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={14}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 resize-y font-mono"
                  placeholder="Compose your email here, or select a template on the left..." />
              )}
            </div>

            {selectedTemplate?.id === "custom" && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Custom Message Body</label>
                <textarea rows={5} value={vars.message} onChange={e => { setVars(p => ({ ...p, message: e.target.value })); refreshBody(); }}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                  placeholder="Type your custom message..." />
              </div>
            )}
          </div>

          {/* Send controls */}
          <div className="flex items-center gap-3">
            <button onClick={send}
              disabled={!subject || !body || finalRecipients.length === 0 || status === "sending"}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
              {status === "sending"
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending to {finalRecipients.length} recipient{finalRecipients.length !== 1 ? "s" : ""}...</>
                : <><Send size={14} /> Send to {finalRecipients.length} recipient{finalRecipients.length !== 1 ? "s" : ""}</>}
            </button>
            {(subject || body) && (
              <button onClick={reset} className="px-4 py-3 text-slate-500 border border-slate-700 rounded-xl hover:text-slate-300 text-sm">
                Clear
              </button>
            )}
          </div>

          {finalRecipients.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded-xl px-3 py-2">
              <AlertCircle size={12} /> Add at least one recipient before sending
            </div>
          )}
        </div>
      </div>

      {/* SMTP config info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-300 text-sm mb-3">SMTP Configuration (Backend)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[
            { l: "Provider", v: "Gmail Workspace / Hosting SMTP" },
            { l: "From Address", v: "noreply@philixfinance.com" },
            { l: "Port", v: "587 (TLS)" },
            { l: "Library", v: "Nodemailer (free, open-source)" },
          ].map(r => (
            <div key={r.l}>
              <div className="text-slate-600 mb-0.5">{r.l}</div>
              <div className="text-slate-300 font-medium">{r.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-600">
          In production: configure <code className="text-slate-500 bg-slate-800 px-1 rounded">SMTP_HOST</code>, <code className="text-slate-500 bg-slate-800 px-1 rounded">SMTP_USER</code>, and <code className="text-slate-500 bg-slate-800 px-1 rounded">SMTP_PASS</code> environment variables. Zero cost — uses your existing domain email.
        </div>
      </div>
    </div>
  );
}
