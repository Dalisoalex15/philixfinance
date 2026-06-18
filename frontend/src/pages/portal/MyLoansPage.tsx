import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, Calendar, Receipt,
  FileText, ArrowRight, RefreshCw, TrendingUp, ArrowUpCircle,
  ChevronDown, ChevronUp, X, Zap, AlertTriangle, Info,
} from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";

const API = "/api";
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number; // represents weeks for short-term loans
  purpose: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "DISBURSED";
  createdAt: string;
  reviewedAt: string | null;
  rejectedReason: string | null;
  autoUpgraded?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED:    "bg-amber-900/30 text-amber-400 border-amber-800/40",
  UNDER_REVIEW: "bg-blue-900/30 text-blue-400 border-blue-800/40",
  APPROVED:     "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  REJECTED:     "bg-red-900/30 text-red-400 border-red-800/40",
  DISBURSED:    "bg-indigo-900/30 text-indigo-400 border-indigo-800/40",
};

const STATUS_DESC: Record<string, string> = {
  SUBMITTED:    "Submitted — awaiting initial review",
  UNDER_REVIEW: "Being reviewed by a Loan Officer",
  APPROVED:     "Approved! Funds being prepared for disbursement",
  REJECTED:     "Application was not approved at this time",
  DISBURSED:    "Funds have been disbursed to you",
};

const ACTIVE = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"];
const CAN_UPGRADE = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"];
const CAN_RELOAN  = ["DISBURSED", "REJECTED"];

function UpgradeModal({
  app, onClose, onDone, token,
}: { app: LoanApp; onClose: () => void; onDone: (updated: LoanApp) => void; token: string | null }) {
  const currentWeeks = app.termMonths;
  const options = [1, 2, 3, 4].filter(w => w > currentWeeks);
  const [chosen, setChosen] = useState(options[0] ?? 4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/portal/applications/${app.id}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newTermWeeks: chosen }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Upgrade failed"); return; }
      onDone(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={16} /></button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle size={18} className="text-indigo-400" />
          </div>
          <div>
            <div className="font-bold text-slate-100">Upgrade Loan Term</div>
            <div className="text-xs text-slate-500 font-mono">{app.reference}</div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 mb-4 text-sm">
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Current term</span>
            <span className="font-semibold text-slate-200">{currentWeeks} week{currentWeeks !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Amount</span>
            <span className="font-semibold text-slate-200">{K(app.amountRequested)}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wide">Upgrade to</div>
          <div className="grid grid-cols-3 gap-2">
            {options.map(w => (
              <button key={w} onClick={() => setChosen(w)}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${chosen === w ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-600/50"}`}>
                {w}W
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Maximum term is <span className="text-amber-400 font-semibold">4 weeks</span>. Upgrading extends your repayment window — additional interest applies.
          </p>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button onClick={submit} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
          Upgrade to {chosen} Weeks
        </button>
      </div>
    </div>
  );
}

function ReloanModal({
  app, onClose, onDone, token,
}: { app: LoanApp; onClose: () => void; onDone: (created: LoanApp) => void; token: string | null }) {
  const [amount, setAmount] = useState(app.amountRequested);
  const [weeks, setWeeks] = useState(app.termMonths);
  const [purpose, setPurpose] = useState(app.purpose);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/portal/applications/${app.id}/reloan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountRequested: amount, termWeeks: weeks, purpose }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Reloan failed"); return; }
      onDone(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X size={16} /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
            <RefreshCw size={18} className="text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-slate-100">Quick Reloan</div>
            <div className="text-xs text-slate-500">{app.productType.replace(/_/g, " ")} — pre-filled from previous loan</div>
          </div>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs text-slate-500 mb-1 block font-semibold uppercase tracking-wide">Loan Amount (K)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={500}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-2 block font-semibold uppercase tracking-wide">Term</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(w => (
                <button key={w} onClick={() => setWeeks(w)}
                  className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${weeks === w ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-600/50"}`}>
                  {w}W
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block font-semibold uppercase tracking-wide">Purpose</label>
            <input value={purpose} onChange={e => setPurpose(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-xl p-3 mb-4 text-xs text-slate-400">
          <span className="text-indigo-400 font-semibold">All your KYC, employment and collateral details are pre-filled</span> — just confirm the amount and term.
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button onClick={submit} disabled={loading || !purpose || amount < 500}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          Submit Reloan
        </button>
      </div>
    </div>
  );
}

function PaymentModal({
  app, onClose, onDone, token,
}: { app: LoanApp; onClose: () => void; onDone: () => void; token: string | null }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [provider, setProvider] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Screenshot must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!amount) { setError("Enter the amount you paid"); return; }
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/portal/applications/${app.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(amount), paymentMethod: method, provider, reference, screenshotData: screenshot, notes }),
      });
      if (r.ok) { onDone(); onClose(); }
      else { const d = await r.json(); setError(d.error || "Failed to submit"); }
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-slate-200">Submit Payment Proof</h3>
            <p className="text-xs text-slate-500 mt-0.5">{app.reference} — {K(app.amountRequested)}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Amount Paid (ZMW) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">K</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[["MOBILE_MONEY","Mobile Money"],["BANK_TRANSFER","Bank Transfer"],["CASH","Cash"]].map(([v,l]) => (
                <button key={v} onClick={() => setMethod(v)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${method === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Provider / Bank</label>
            <input type="text" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Airtel Money, Zanaco"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Transaction Reference</label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. TXN123456"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Screenshot of Transaction *</label>
            <label className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${screenshot ? "border-emerald-700 bg-emerald-900/10" : "border-slate-700 hover:border-indigo-600"}`}>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              {screenshot ? (
                <><img src={screenshot} alt="preview" className="max-h-32 rounded-lg object-cover" /><span className="text-xs text-emerald-400">Screenshot attached ✓ (tap to change)</span></>
              ) : (
                <><Receipt size={24} className="text-slate-600" /><span className="text-xs text-slate-500">Tap to attach screenshot</span><span className="text-[10px] text-slate-700">JPG, PNG — max 5MB</span></>
              )}
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes…" rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>

          {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">{error}</div>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800">Cancel</button>
            <button onClick={submit} disabled={loading || !amount}
              className="flex-1 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">
              {loading ? "Submitting…" : "Submit Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyLoansPage() {
  const token = useClientAuthStore(s => s.accessToken);
  const [apps, setApps] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<LoanApp | null>(null);
  const [reloanTarget, setReloanTarget] = useState<LoanApp | null>(null);
  const [payApp, setPayApp] = useState<LoanApp | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const authHeader = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/portal/applications`, { headers: authHeader });
      if (r.ok) setApps(await r.json());
      else setError("Could not load your loans. Please try again.");
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const autoUpgrades = apps.filter(a => (a as any).autoUpgraded);
  const activeApps   = apps.filter(a => ACTIVE.includes(a.status));
  const historyApps  = apps.filter(a => !ACTIVE.includes(a.status));

  function daysLeft(app: LoanApp) {
    if (!app.reviewedAt) return null;
    const due = new Date(app.reviewedAt).getTime() + app.termMonths * 7 * 86400000;
    return Math.ceil((due - Date.now()) / 86400000);
  }

  function pct(app: LoanApp) {
    if (!app.reviewedAt) return 0;
    const total = app.termMonths * 7 * 86400000;
    const elapsed = Date.now() - new Date(app.reviewedAt).getTime();
    return Math.min(100, Math.round((elapsed / total) * 100));
  }

  function handleUpgradeDone(updated: LoanApp) {
    setApps(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    setUpgradeTarget(null);
    setSuccessMsg(`Loan ${updated.reference} upgraded to ${updated.termMonths} weeks.`);
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  function handleReloanDone(created: LoanApp) {
    setApps(prev => [created, ...prev]);
    setReloanTarget(null);
    setSuccessMsg(`New loan application ${created.reference} submitted successfully!`);
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Modals */}
      {upgradeTarget && (
        <UpgradeModal app={upgradeTarget} token={token}
          onClose={() => setUpgradeTarget(null)} onDone={handleUpgradeDone} />
      )}
      {reloanTarget && (
        <ReloanModal app={reloanTarget} token={token}
          onClose={() => setReloanTarget(null)} onDone={handleReloanDone} />
      )}
      {payApp && (
        <PaymentModal
          app={payApp}
          token={token}
          onClose={() => setPayApp(null)}
          onDone={load}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Loans</h1>
          <p className="text-slate-500 text-sm mt-1">Applications, upgrades and repayment records</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl transition-all">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-900/30 border border-emerald-800/40 rounded-xl px-4 py-3">
          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300">{successMsg}</p>
        </div>
      )}

      {/* Auto-upgrade notice */}
      {autoUpgrades.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Loan auto-upgraded to 4 weeks</p>
            <p className="text-xs text-slate-500 mt-0.5">Your loan was within 3 days of its due date without payment, so it was automatically extended to 4 weeks. Additional interest applies.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Loans",       value: activeApps.filter(a => a.status === "DISBURSED").length,  color: "text-emerald-400" },
          { label: "Applications",        value: apps.length,                                              color: "text-slate-200"   },
          { label: "Pending Review",      value: apps.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW").length, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="text-center py-12 text-slate-500 text-sm flex items-center justify-center gap-2">
          <RefreshCw size={14} className="animate-spin" /> Loading your loans…
        </div>
      )}
      {!loading && error && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 text-sm text-red-400">{error}</div>
      )}

      {/* Active applications */}
      {!loading && activeApps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Active Loans & Applications</h2>
          </div>

          {activeApps.map(app => {
            const isOpen = expanded === app.id;
            const canUpgrade = CAN_UPGRADE.includes(app.status) && app.termMonths < 4;
            const days = daysLeft(app);
            const progress = pct(app);
            const nearDue = days !== null && days <= 3 && days >= 0;
            const overdue = days !== null && days < 0;

            return (
              <div key={app.id} className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${nearDue ? "border-amber-700/60" : overdue ? "border-red-700/60" : "border-slate-800"}`}>
                <button onClick={() => setExpanded(isOpen ? null : app.id)}
                  className="w-full text-left p-5 hover:bg-slate-800/30 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-bold text-slate-200">{app.productType.replace(/_/g, " ")}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{app.reference}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[app.status]}`}>
                        {app.status.replace("_", " ")}
                      </span>
                      {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                    </div>
                  </div>

                  {/* Progress bar (only for disbursed) */}
                  {app.status === "DISBURSED" && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{app.termMonths} week{app.termMonths !== 1 ? "s" : ""} term</span>
                        {days !== null && (
                          <span className={overdue ? "text-red-400 font-semibold" : nearDue ? "text-amber-400 font-semibold" : "text-slate-400"}>
                            {overdue ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `${days} days left`}
                          </span>
                        )}
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${overdue ? "bg-red-500" : nearDue ? "bg-amber-500" : "bg-gradient-to-r from-emerald-600 to-emerald-400"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Application progress bar */}
                  {app.status !== "DISBURSED" && (
                    <div className="flex items-center gap-1 mb-3">
                      {(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"] as const).map((s, i) => {
                        const steps = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"];
                        const idx = steps.indexOf(app.status);
                        return (
                          <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
                            style={{ background: i <= idx ? "#6366f1" : "#1e293b" }} />
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><div className="text-slate-500 mb-0.5">Amount</div><div className="font-semibold text-slate-200">{K(app.amountRequested)}</div></div>
                    <div><div className="text-slate-500 mb-0.5">Term</div><div className="font-semibold text-slate-200">{app.termMonths}W</div></div>
                    <div><div className="text-slate-500 mb-0.5">Purpose</div><div className="font-semibold text-slate-200 truncate">{app.purpose}</div></div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-800 px-5 py-4 space-y-4">
                    <p className="text-xs text-slate-500">{STATUS_DESC[app.status]}</p>

                    {app.status === "REJECTED" && app.rejectedReason && (
                      <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-400">
                        <span className="font-semibold">Reason: </span>{app.rejectedReason}
                      </div>
                    )}

                    {/* Upgrade section */}
                    {canUpgrade && (
                      <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <ArrowUpCircle size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-indigo-300 mb-0.5">Upgrade Your Term</div>
                            <div className="text-xs text-slate-500">
                              Current: <span className="text-slate-300 font-semibold">{app.termMonths} week{app.termMonths !== 1 ? "s" : ""}</span>.
                              Upgrade to 3 or 4 weeks to extend your repayment window.
                            </div>
                            {nearDue && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-1.5">
                                <AlertTriangle size={11} /> Due in {days} day{days !== 1 ? "s" : ""} — upgrade now to avoid penalties
                              </div>
                            )}
                          </div>
                          <button onClick={() => setUpgradeTarget(app)}
                            className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all">
                            <ArrowUpCircle size={12} /> Upgrade
                          </button>
                        </div>
                      </div>
                    )}

                    {app.termMonths >= 4 && app.status === "DISBURSED" && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/40 border border-slate-700 rounded-xl px-3 py-2">
                        <Info size={11} className="text-slate-600" /> At maximum 4-week term. No further upgrade available.
                      </div>
                    )}

                    {app.status === "DISBURSED" && (
                      <button
                        onClick={() => setPayApp(app)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50 rounded-xl transition-colors"
                      >
                        <Receipt size={13} /> Mark as Paid
                      </button>
                    )}

                    <div className="text-xs text-slate-600">
                      Applied: {new Date(app.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      {app.reviewedAt && ` · Reviewed: ${new Date(app.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {!loading && historyApps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Past Loans</h2>
          </div>

          {historyApps.map(app => {
            const isOpen = expanded === app.id;
            const canReloan = CAN_RELOAN.includes(app.status) && !activeApps.some(a => ACTIVE.includes(a.status));

            return (
              <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : app.id)}
                  className="w-full text-left p-5 hover:bg-slate-800/30 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <CreditCard size={15} className="text-slate-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-300">{app.productType.replace(/_/g, " ")}</div>
                        <div className="text-xs text-slate-600 font-mono">{app.reference}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[app.status]}`}>
                        {app.status}
                      </span>
                      {isOpen ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs mt-3">
                    <div><div className="text-slate-600 mb-0.5">Amount</div><div className="text-slate-400">{K(app.amountRequested)}</div></div>
                    <div><div className="text-slate-600 mb-0.5">Term</div><div className="text-slate-400">{app.termMonths}W</div></div>
                    <div><div className="text-slate-600 mb-0.5">Date</div><div className="text-slate-400">{new Date(app.createdAt).toLocaleDateString("en-GB")}</div></div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-800 px-5 py-4 space-y-3">
                    {app.rejectedReason && (
                      <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-400">
                        <span className="font-semibold">Rejection reason: </span>{app.rejectedReason}
                      </div>
                    )}

                    {canReloan && (
                      <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <TrendingUp size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-emerald-300 mb-0.5">Apply Again (Reloan)</div>
                            <div className="text-xs text-slate-500">
                              All your details are saved. Just confirm the amount and term — no need to re-enter anything.
                            </div>
                          </div>
                          <button onClick={() => setReloanTarget(app)}
                            className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all">
                            <RefreshCw size={12} /> Reloan
                          </button>
                        </div>
                      </div>
                    )}

                    {!canReloan && activeApps.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/40 border border-slate-700 rounded-xl px-3 py-2">
                        <Clock size={11} /> You have an active loan. Reloan will be available once it is disbursed.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && apps.length === 0 && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <CreditCard size={32} className="text-slate-700 mx-auto mb-3" />
          <div className="text-slate-400 font-semibold mb-1">No loans yet</div>
          <p className="text-slate-600 text-sm mb-4">Apply for your first loan and track it here.</p>
          <Link to="/portal/apply" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
            Apply Now <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Bottom CTA */}
      {!loading && apps.length > 0 && !activeApps.some(a => ACTIVE.includes(a.status)) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-slate-300 text-sm">Need a new loan?</div>
            <div className="text-xs text-slate-600 mt-0.5">Your previous details are saved — apply in seconds</div>
          </div>
          <Link to="/portal/apply" className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
            Apply <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Support */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
        <div className="font-semibold text-slate-300 mb-1">Need help with a loan?</div>
        <div className="text-xs text-slate-500 mb-3">Contact our support team for repayment assistance or loan restructuring</div>
        <a href="tel:+260211000000" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">📞 +260 211 XXX XXX</a>
      </div>
    </div>
  );
}
