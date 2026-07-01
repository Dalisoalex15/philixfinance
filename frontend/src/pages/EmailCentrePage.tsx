import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mail, Send, Users, FileText, Search, ChevronDown, Eye, RefreshCw,
  Download, CheckCircle, XCircle, Clock, AlertTriangle, X, Loader2,
  MailCheck, MailX, ChevronLeft, ChevronRight, FlaskConical,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClientResult {
  id: string; name: string; email: string; clientNumber: string;
  loans: { id: string; reference: string; status: string; amountRequested: number; productType: string }[];
}

interface EmailLog {
  id: string; to: string; toName?: string; subject: string; template?: string;
  status: string; triggerType?: string; triggeredBy?: string;
  resendId?: string; openedAt?: string; createdAt: string; error?: string;
  accountId?: string; loanId?: string; bodyHtml?: string;
}

const TEMPLATES = [
  { key: "welcome",                   label: "Welcome Email",          needsLoan: false },
  { key: "loan_application_received", label: "Application Received",   needsLoan: true  },
  { key: "loan_approved",             label: "Loan Approved",          needsLoan: true  },
  { key: "loan_rejected",             label: "Loan Rejected",          needsLoan: true  },
  { key: "payment_received",          label: "Payment Received",       needsLoan: true  },
  { key: "payment_reminder",          label: "Payment Reminder",       needsLoan: true  },
  { key: "overdue_notice",            label: "Overdue Notice",         needsLoan: true  },
  { key: "loan_repaid",               label: "Loan Fully Repaid",      needsLoan: true  },
  { key: "monthly_statement",         label: "Monthly Statement",      needsLoan: false },
  { key: "custom",                    label: "Custom Email",           needsLoan: false },
];

const BULK_TEMPLATES = TEMPLATES.filter(t =>
  ["payment_reminder", "overdue_notice", "monthly_statement", "welcome", "custom"].includes(t.key)
);

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  SENT:      { icon: MailCheck,     color: "text-emerald-700",  bg: "bg-emerald-50 text-emerald-700" },
  DELIVERED: { icon: CheckCircle,   color: "text-blue-700",     bg: "bg-blue-50 text-blue-700" },
  FAILED:    { icon: MailX,         color: "text-red-700",      bg: "bg-red-50 text-red-700" },
  BOUNCED:   { icon: XCircle,       color: "text-orange-700",   bg: "bg-orange-50 text-orange-700" },
  QUEUED:    { icon: Clock,         color: "text-yellow-700",   bg: "bg-yellow-50 text-yellow-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SENT;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg}`}>
      <Icon size={11} /> {status}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 1 — SEND EMAIL
// ═════════════════════════════════════════════════════════════════════════════
function SendEmailTab() {
  const [clientQ, setClientQ]           = useState("");
  const [clients, setClients]           = useState<ClientResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<string>("");
  const [templateKey, setTemplateKey]   = useState("payment_reminder");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody]     = useState("");
  const [preview, setPreview]           = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending]           = useState(false);
  const [result, setResult]             = useState<{ ok: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [testSending, setTestSending]   = useState(false);
  const [testResult, setTestResult]     = useState<{ ok: boolean; message: string } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchClients = useCallback((q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q || q.length < 2) { setClients([]); return; }
    searchTimer.current = setTimeout(async () => {
      const token = localStorage.getItem("philix-auth-v3");
      const r = await fetch(`/api/emails/clients/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setClients(await r.json());
    }, 300);
  }, []);

  useEffect(() => { searchClients(clientQ); }, [clientQ, searchClients]);

  const loadPreview = useCallback(async () => {
    if (!templateKey) return;
    setPreviewLoading(true);
    const token = localStorage.getItem("philix-auth-v3");
    const r = await fetch(`/api/emails/preview/${templateKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) setPreview(await r.text());
    setPreviewLoading(false);
  }, [templateKey]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const handleSend = async () => {
    if (!selectedClient) return;
    setSending(true); setResult(null); setShowConfirm(false);
    const token = localStorage.getItem("philix-auth-v3");
    const body: any = { templateKey, accountId: selectedClient.id };
    if (selectedLoan) body.loanId = selectedLoan;
    if (templateKey === "custom") { body.customSubject = customSubject; body.customBody = customBody; }

    const r = await fetch("/api/emails/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    setResult({ ok: r.ok, message: r.ok ? `Email sent to ${selectedClient.email}` : data.error || "Send failed" });
    setSending(false);
  };

  const handleTestSend = async () => {
    setTestSending(true); setTestResult(null);
    const token = localStorage.getItem("philix-auth-v3") || localStorage.getItem("philix_staff_token") || "";
    const r = await fetch("/api/emails/send-test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey }),
    });
    const data = await r.json();
    setTestResult({
      ok: r.ok,
      message: r.ok
        ? `Test email sent to philixfinance15@gmail.com`
        : data.error || "Test send failed",
    });
    setTestSending(false);
  };

  const tpl = TEMPLATES.find(t => t.key === templateKey);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — form */}
      <div className="space-y-5">
        {/* Client picker */}
        <div>
          <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Client *</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={clientQ}
              onChange={e => { setClientQ(e.target.value); setClientDropOpen(true); }}
              onFocus={() => setClientDropOpen(true)}
              placeholder="Search by name, phone, email…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
            />
          </div>
          {clientDropOpen && clients.length > 0 && (
            <div className="border border-gray-200 rounded-lg mt-1 shadow-lg bg-white max-h-52 overflow-y-auto z-10 relative">
              {clients.map(c => (
                <button key={c.id} onClick={() => { setSelectedClient(c); setClientQ(c.name); setClientDropOpen(false); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#F5F0E6] border-b last:border-0">
                  <p className="text-sm font-semibold text-[#0B1F3A]">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email} · {c.clientNumber}</p>
                  {c.loans.length > 0 && <p className="text-xs text-emerald-600">{c.loans.length} loan(s)</p>}
                </button>
              ))}
            </div>
          )}
          {selectedClient && (
            <div className="mt-2 bg-[#F5F0E6] border border-[#C9A227]/30 rounded-lg p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0B1F3A] text-[#C9A227] flex items-center justify-center font-bold text-sm flex-shrink-0">
                {selectedClient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0B1F3A] truncate">{selectedClient.name}</p>
                <p className="text-xs text-gray-600 truncate">{selectedClient.email}</p>
              </div>
              <button onClick={() => { setSelectedClient(null); setClientQ(""); }} className="text-gray-400 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Template picker */}
        <div>
          <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Template *</label>
          <div className="relative">
            <select value={templateKey} onChange={e => setTemplateKey(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:border-[#C9A227]">
              {TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Loan picker (when template needs a loan) */}
        {tpl?.needsLoan && selectedClient && selectedClient.loans.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Loan Reference (optional)</label>
            <div className="relative">
              <select value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)}
                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:border-[#C9A227]">
                <option value="">— Use most recent loan —</option>
                {selectedClient.loans.map(l => (
                  <option key={l.id} value={l.id}>{l.reference} ({l.status})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Test Send — no client needed, uses sample data */}
        <div className="rounded-xl border border-[#C9A227]/30 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0B1F3A] flex items-center gap-1.5">
                <FlaskConical size={14} className="text-[#C9A227]" /> Send Test Email
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sends <strong>{TEMPLATES.find(t => t.key === templateKey)?.label}</strong> with sample data to <strong>philixfinance15@gmail.com</strong>
              </p>
            </div>
            <button
              onClick={handleTestSend}
              disabled={testSending}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A227] text-[#0B1F3A] rounded-lg text-sm font-bold hover:bg-[#C9A227]/90 disabled:opacity-50 transition-colors"
            >
              {testSending ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
              {testSending ? "Sending…" : "Send Test"}
            </button>
          </div>
          {testResult && (
            <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg p-2.5 ${testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {testResult.ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
              {testResult.message}
            </div>
          )}
        </div>

        {/* Custom fields */}
        {templateKey === "custom" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Subject *</label>
              <input value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                placeholder="Email subject line…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A227]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Body *</label>
              <p className="text-xs text-gray-500 mb-1">Basic HTML allowed (p, strong, em, br, ul, li). Scripts and event handlers are stripped.</p>
              <textarea value={customBody} onChange={e => setCustomBody(e.target.value)} rows={7}
                placeholder="<p>Dear [Client Name],</p><p>Your message here…</p>"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#C9A227] resize-none" />
            </div>
          </div>
        )}

        {/* Result feedback */}
        {result && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${result.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {result.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {result.message}
          </div>
        )}

        {/* Send button */}
        <button onClick={() => setShowConfirm(true)} disabled={!selectedClient || sending || (templateKey === "custom" && (!customSubject || !customBody))}
          className="w-full bg-[#0B1F3A] text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0B1F3A]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Send size={15} />
          Send Email
        </button>
      </div>

      {/* RIGHT — preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: 520 }}>
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0B1F3A]">Template Preview</p>
          <button onClick={loadPreview} className="text-xs text-[#C9A227] hover:underline flex items-center gap-1">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {previewLoading ? (
            <div className="h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
          ) : preview ? (
            <iframe srcDoc={preview} className="w-full h-full" style={{ minHeight: 480, border: "none" }} title="Email preview" />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Preview will appear here</div>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && selectedClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-[#0B1F3A] text-lg mb-2">Confirm Send</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send <strong>{TEMPLATES.find(t => t.key === templateKey)?.label}</strong> to{" "}
              <strong>{selectedClient.name}</strong> ({selectedClient.email})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSend} disabled={sending}
                className="flex-1 py-2 bg-[#0B1F3A] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? "Sending…" : "Confirm Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2 — BULK SEND
// ═════════════════════════════════════════════════════════════════════════════
function BulkSendTab() {
  const [templateKey, setTemplateKey] = useState("payment_reminder");
  const [filter, setFilter]           = useState({ status: "", kycStatus: "", loanStatus: "" });
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody]   = useState("");
  const [sending, setSending]         = useState(false);
  const [result, setResult]           = useState<{ ok: boolean; sent: number; failed: number; total: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress]       = useState(0);

  const handleBulkSend = async () => {
    setSending(true); setResult(null); setShowConfirm(false);
    const token = localStorage.getItem("philix-auth-v3");
    const body: any = { templateKey, clientFilter: filter };
    if (templateKey === "custom") { body.params = { customSubject, customBody, staffName: "Staff" }; }

    const interval = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 200);
    const r = await fetch("/api/emails/send-bulk", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    clearInterval(interval); setProgress(100);
    const data = await r.json();
    setResult({ ok: r.ok, sent: data.sent || 0, failed: data.failed || 0, total: data.total || 0 });
    setSending(false);
    setTimeout(() => setProgress(0), 1500);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <strong>Manager only.</strong> Bulk emails are sent to all matching clients simultaneously.
      </div>

      {/* Template */}
      <div>
        <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Template *</label>
        <div className="relative">
          <select value={templateKey} onChange={e => setTemplateKey(e.target.value)}
            className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:border-[#C9A227]">
            {BULK_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Custom fields */}
      {templateKey === "custom" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Subject *</label>
            <input value={customSubject} onChange={e => setCustomSubject(e.target.value)}
              placeholder="Email subject line…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A227]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0B1F3A] mb-1">Body *</label>
            <textarea value={customBody} onChange={e => setCustomBody(e.target.value)} rows={5}
              placeholder="<p>Message to all matching clients…</p>"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#C9A227] resize-none" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Client Status</label>
          <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]">
            <option value="">All Clients</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_KYC">Pending KYC</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">KYC Status</label>
          <select value={filter.kycStatus} onChange={e => setFilter(f => ({ ...f, kycStatus: e.target.value }))}
            className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]">
            <option value="">Any</option>
            <option value="VERIFIED">Verified</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Loan Status</label>
          <select value={filter.loanStatus} onChange={e => setFilter(f => ({ ...f, loanStatus: e.target.value }))}
            className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]">
            <option value="">Any</option>
            <option value="DISBURSED">Disbursed (Active)</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>
      </div>

      {/* Progress */}
      {sending && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Sending…</span><span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 bg-[#C9A227] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-lg border text-sm ${result.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <strong>Bulk Send Complete</strong>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-2">
            <div className="bg-white rounded-lg py-2 border border-gray-100">
              <p className="text-2xl font-bold text-[#0B1F3A]">{result.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-white rounded-lg py-2 border border-gray-100">
              <p className="text-2xl font-bold text-emerald-600">{result.sent}</p>
              <p className="text-xs text-gray-500">Sent</p>
            </div>
            <div className="bg-white rounded-lg py-2 border border-gray-100">
              <p className="text-2xl font-bold text-red-600">{result.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowConfirm(true)}
        disabled={sending || (templateKey === "custom" && (!customSubject || !customBody))}
        className="w-full bg-[#0B1F3A] text-white py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0B1F3A]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
        {sending ? "Sending…" : "Send to All Matching Clients"}
      </button>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-[#0B1F3A] text-lg mb-2">Confirm Bulk Send</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will send <strong>{BULK_TEMPLATES.find(t => t.key === templateKey)?.label}</strong> to{" "}
              <strong>all clients matching your filters</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleBulkSend}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                <Send size={14} /> Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3 — EMAIL LOG
// ═════════════════════════════════════════════════════════════════════════════
function EmailLogTab() {
  const [logs, setLogs]           = useState<EmailLog[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [viewLog, setViewLog]     = useState<EmailLog | null>(null);
  const [retrying, setRetrying]   = useState<string | null>(null);
  const [filters, setFilters]     = useState({ status: "", template: "", triggerType: "", search: "", dateFrom: "", dateTo: "" });
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("philix-auth-v3");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const r = await fetch(`/api/emails/log?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const d = await r.json(); setLogs(d.logs); setTotal(d.total); }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    const token = localStorage.getItem("philix-auth-v3");
    const r = await fetch(`/api/emails/log/${id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) fetchLogs();
    setRetrying(null);
  };

  const exportCSV = () => {
    const headers = ["Date", "To", "Name", "Subject", "Template", "Status", "Trigger", "Sent By"];
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString(),
      l.to, l.toName || "", l.subject, l.template || "",
      l.status, l.triggerType || "", l.triggeredBy || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `email-log-${Date.now()}.csv`; a.click();
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search email / name / subject…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]" />
        </div>
        {[
          { key: "status",      label: "Status",  options: ["SENT", "DELIVERED", "FAILED", "BOUNCED", "QUEUED"] },
          { key: "template",    label: "Template", options: TEMPLATES.map(t => t.key) },
          { key: "triggerType", label: "Trigger",  options: ["manual", "automatic"] },
        ].map(({ key, label, options }) => (
          <div key={key} className="relative">
            <select value={(filters as any)[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
              className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:border-[#C9A227]">
              <option value="">All {label}s</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ))}
        <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]" />
        <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]" />
        <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
          <Download size={13} /> Export CSV
        </button>
        <button onClick={fetchLogs} className="flex items-center gap-1 px-3 py-2 bg-[#0B1F3A] text-white rounded-lg text-sm">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Total */}
      <p className="text-xs text-gray-500">{total} emails total</p>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-[#0B1F3A] text-white">
              {["Date", "To", "Subject", "Template", "Status", "Trigger", "Sent By", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin inline" /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No emails found</td></tr>
            ) : logs.map((log, i) => (
              <tr key={log.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-[#F5F0E6]/40`}>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleDateString("en-GB")}<br />
                  <span className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[#0B1F3A] text-xs">{log.toName || "—"}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[140px]">{log.to}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 max-w-[180px] truncate">{log.subject}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{log.template || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500 capitalize">{log.triggerType || "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{log.triggeredBy || "system"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewLog(log)} title="View email"
                      className="p-1.5 text-gray-400 hover:text-[#0B1F3A] hover:bg-gray-100 rounded">
                      <Eye size={13} />
                    </button>
                    {log.status === "FAILED" && (
                      <button onClick={() => handleRetry(log.id)} disabled={retrying === log.id}
                        title="Retry send" className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                        {retrying === log.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page} of {pages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
              className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* View email modal */}
      {viewLog && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-[#0B1F3A]">Email Detail</h3>
                <p className="text-xs text-gray-500 mt-0.5">{viewLog.subject}</p>
              </div>
              <button onClick={() => setViewLog(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[["To", `${viewLog.toName || ""} <${viewLog.to}>`], ["Template", viewLog.template || "—"], ["Status", viewLog.status], ["Trigger", viewLog.triggerType || "—"], ["Sent By", viewLog.triggeredBy || "system"], ["Date", new Date(viewLog.createdAt).toLocaleString()], ["Resend ID", viewLog.resendId || "—"], ["Opened", viewLog.openedAt ? new Date(viewLog.openedAt).toLocaleString() : "Not yet"]].map(([k, v]) => (
                <div key={k}><span className="text-gray-500">{k}: </span><strong className="text-[#0B1F3A]">{String(v)}</strong></div>
              ))}
              {viewLog.error && <div className="col-span-2 text-red-600"><span className="font-semibold">Error: </span>{viewLog.error}</div>}
            </div>
            {viewLog.bodyHtml ? (
              <iframe srcDoc={viewLog.bodyHtml} className="w-full" style={{ minHeight: 500, border: "none" }} title="Email body" />
            ) : (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">Email HTML not stored for this entry</div>
            )}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              {viewLog.status === "FAILED" && (
                <button onClick={() => { handleRetry(viewLog.id); setViewLog(null); }}
                  className="flex items-center gap-1 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium">
                  <RefreshCw size={13} /> Retry
                </button>
              )}
              <button onClick={() => setViewLog(null)} className="px-4 py-2 bg-[#0B1F3A] text-white rounded-lg text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STATS HEADER
// ═════════════════════════════════════════════════════════════════════════════
interface Stats { total: number; sent: number; failed: number; delivered: number; deliveryRate: number; period: string }

function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("philix-auth-v3");
    fetch("/api/emails/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(setStats);
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Emails (30 days)", value: stats.total, color: "text-[#0B1F3A]", icon: Mail },
        { label: "Sent",            value: stats.sent,  color: "text-emerald-600", icon: MailCheck },
        { label: "Failed",          value: stats.failed, color: "text-red-600", icon: MailX },
        { label: "Delivery Rate",   value: `${stats.deliveryRate}%`, color: stats.deliveryRate >= 90 ? "text-emerald-600" : stats.deliveryRate >= 70 ? "text-amber-600" : "text-red-600", icon: CheckCircle },
      ].map(({ label, value, color, icon: Icon }) => (
        <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5F0E6] flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-[#0B1F3A]" />
          </div>
          <div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function EmailCentrePage() {
  const [tab, setTab] = useState<"send" | "bulk" | "log">("send");

  const TABS = [
    { key: "send", label: "Send Email",   icon: Send },
    { key: "bulk", label: "Bulk Send",    icon: Users },
    { key: "log",  label: "Email Log",    icon: FileText },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
            <Mail size={24} className="text-[#C9A227]" /> Email Centre
          </h1>
          <p className="text-sm text-gray-500 mt-1">Send branded emails to clients, run bulk campaigns, and monitor delivery logs.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-gray-500">Powered by Resend</span>
        </div>
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-colors flex-1 justify-center ${tab === key ? "text-[#0B1F3A] border-b-2 border-[#C9A227] bg-[#F5F0E6]/30" : "text-gray-500 hover:text-[#0B1F3A] hover:bg-gray-50"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "send" && <SendEmailTab />}
          {tab === "bulk" && <BulkSendTab />}
          {tab === "log"  && <EmailLogTab />}
        </div>
      </div>
    </div>
  );
}
