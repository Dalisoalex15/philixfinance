import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, Calendar, Receipt,
  FileText, ArrowRight, RefreshCw, TrendingUp, ArrowUpCircle,
  ChevronDown, ChevronUp, X, Zap, AlertTriangle, Info, Download,
  Wallet, RotateCcw, Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";
import { useClientAuthStore } from "../../store/clientAuth";

const API = "/api";
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface PaymentRecord {
  id: string;
  amount: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reference: string | null;
  provider: string | null;
  paymentMethod: string | null;
}

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number; // represents weeks for short-term loans
  interestRate?: number; // flat rate % stored at submission time
  purpose: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "DISBURSED" | "REPAID";
  createdAt: string;
  reviewedAt: string | null;
  rejectedReason: string | null;
  autoUpgraded?: boolean;
  paymentSubmissions?: PaymentRecord[];
}

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED:    "bg-amber-900/30 text-amber-400 border-amber-800/40",
  UNDER_REVIEW: "bg-blue-900/30 text-blue-400 border-blue-800/40",
  APPROVED:     "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  REJECTED:     "bg-red-900/30 text-red-400 border-red-800/40",
  DISBURSED:    "bg-indigo-900/30 text-indigo-400 border-indigo-800/40",
  REPAID:       "bg-emerald-900/40 text-emerald-300 border-emerald-700/60",
};

const STATUS_DESC: Record<string, string> = {
  SUBMITTED:    "Submitted — awaiting initial review",
  UNDER_REVIEW: "Being reviewed by a Loan Officer",
  APPROVED:     "Approved! Funds being prepared for disbursement",
  REJECTED:     "Application was not approved at this time",
  DISBURSED:    "Funds have been disbursed to you",
  REPAID:       "Loan fully repaid — thank you!",
};

const ACTIVE = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"];
// REPAID is intentionally excluded from ACTIVE — it moves to history
const CAN_UPGRADE = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"];
const CAN_RELOAN  = ["DISBURSED", "REJECTED", "REPAID"];

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
}: { app: LoanApp; onClose: () => void; onDone: (appId: string, submission: PaymentRecord) => void; token: string | null }) {
  const totalDue = Math.ceil(app.amountRequested * (1 + (app.interestRate ?? 20) / 100));
  const totalPaid = (app.paymentSubmissions ?? [])
    .filter(p => p.status === "APPROVED")
    .reduce((s, p) => s + (p.amount ?? 0), 0);
  const remaining = Math.max(0, totalDue - totalPaid);
  const weeklyAmt = Math.ceil(totalDue / (app.termMonths || 1));

  const [amount, setAmount] = useState(String(weeklyAmt));
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [provider, setProvider] = useState("Airtel Money");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"send" | "confirm" | "success">("send");

  // Compress image to max 600px wide, 40% quality — keeps it fast
  function compressImage(file: File): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 600;
        let { width, height } = img;
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.4));
      };
      img.src = url;
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setScreenshot(compressed);
    } catch {
      setError("Failed to process image. Please try a different file.");
    }
  }

  function submit() {
    if (!amount) { setError("Enter the amount you paid"); return; }
    if (!reference) { setError("Enter the transaction reference number"); return; }

    const optimisticRecord: PaymentRecord = {
      id: `pending-${Date.now()}`,
      amount: parseFloat(amount),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      reference,
      provider: method === "MOBILE_MONEY" ? provider : null,
      paymentMethod: method,
    };

    // Show success immediately and inject optimistic record — no reload needed
    setStep("success");
    onDone(app.id, optimisticRecord);

    fetch(`${API}/portal/applications/${app.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: parseFloat(amount), paymentMethod: method, provider, reference, screenshotData: screenshot, notes }),
    }).catch(() => {}); // optimistic — user sees success immediately
  }

  const MOBILE_ACCOUNTS: Record<string, { number: string; name: string }> = {
    "Airtel Money": { number: "0977 158 901", name: "Philix Finance Ltd" },
    "MTN MoMo":     { number: "0968 158 901", name: "Philix Finance Ltd" },
    "Zamtel Kwacha":{ number: "0955 158 901", name: "Philix Finance Ltd" },
  };
  const mmAccount = MOBILE_ACCOUNTS[provider];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <style>{`
        @keyframes pay-shimmer {
          0%   { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(300%)  skewX(-15deg); }
        }
        .pay-submit-btn { position: relative; overflow: hidden; }
        .pay-submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.32) 50%, transparent 100%);
          animation: pay-shimmer 1.6s ease-out forwards;
          pointer-events: none;
        }
      `}</style>
      <div className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl"
        style={{ background: "#070c18", border: "1px solid rgba(201,168,76,0.18)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)" }}>
              <Wallet size={18} style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Make a Payment</h3>
              <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(201,168,76,0.6)" }}>{app.reference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-70" style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* Balance summary — 4 cells */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl text-center text-xs"
            style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
            <div>
              <div className="text-slate-500 mb-0.5">Total Loan</div>
              <div className="font-bold text-white">{K(totalDue)}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Outstanding</div>
              <div className="font-bold" style={{ color: "#C9A84C" }}>{K(remaining)}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Paid to Date</div>
              <div className="font-bold text-emerald-400">{K(totalPaid)}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Weekly Instalment</div>
              <div className="font-bold text-indigo-400">{K(weeklyAmt)}</div>
            </div>
          </div>

          {step === "send" ? (
            <>
              {/* Amount quick-select */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(201,168,76,0.7)" }}>How much are you paying?</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: `Weekly — ${K(weeklyAmt)}`,  value: weeklyAmt },
                    { label: `Pay in Full — ${K(remaining)}`, value: remaining },
                  ].map(q => (
                    <button key={q.label} onClick={() => setAmount(String(q.value))}
                      className="py-2.5 px-3 text-xs font-semibold rounded-xl transition-all"
                      style={String(q.value) === amount
                        ? { background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.6)", color: "#C9A84C" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#64748b" }}>
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm" style={{ color: "rgba(201,168,76,0.7)" }}>K</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="Custom amount"
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-sm text-white font-semibold focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)" }} />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(201,168,76,0.7)" }}>Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[["MOBILE_MONEY","📱 Mobile"],["BANK_TRANSFER","🏦 Bank"],["CASH","💵 Cash"]].map(([v,l]) => (
                    <button key={v} onClick={() => setMethod(v)}
                      className="py-2.5 text-xs font-semibold rounded-xl transition-all"
                      style={method === v
                        ? { background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.55)", color: "#C9A84C" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile money provider + account details */}
              {method === "MOBILE_MONEY" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(201,168,76,0.7)" }}>Select Provider</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Airtel Money", "MTN MoMo", "Zamtel Kwacha"].map(p => (
                        <button key={p} onClick={() => setProvider(p)}
                          className="py-2 text-xs font-semibold rounded-xl transition-all"
                          style={provider === p
                            ? { background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.55)", color: "#C9A84C" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                          {p.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mmAccount && (
                    <div className="rounded-xl p-4" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.22)" }}>
                      <div className="text-xs font-bold mb-2" style={{ color: "#C9A84C" }}>Send {K(Number(amount) || weeklyAmt)} to:</div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xl font-black text-white tracking-widest">{mmAccount.number}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{mmAccount.name} · {provider}</div>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(mmAccount.number.replace(/\s/g, ""))}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)" }}>
                          Copy
                        </button>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-500">After sending, tap Continue and enter your transaction reference</div>
                    </div>
                  )}
                </div>
              )}

              {method === "BANK_TRANSFER" && (
                <div className="rounded-xl p-4 text-xs space-y-1.5"
                  style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div className="font-bold text-indigo-400 mb-2">Bank Transfer Details</div>
                  <div className="text-slate-300"><span className="text-slate-500">Bank: </span>Zanaco</div>
                  <div className="text-slate-300"><span className="text-slate-500">Account Name: </span>Philix Finance Ltd</div>
                  <div className="text-slate-300"><span className="text-slate-500">Account No: </span>1234567890</div>
                  <div className="text-slate-500 mt-2">Reference: <span className="text-white font-mono font-bold">{app.reference}</span></div>
                </div>
              )}

              {method === "CASH" && (
                <div className="rounded-xl p-4 text-xs"
                  style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="font-bold text-amber-400 mb-1">Pay in person</div>
                  <div className="text-slate-400">Visit our office at <span className="text-slate-200">Cairo Road, Lusaka</span>, Mon–Fri 08:00–17:00. Reference: <span className="text-white font-mono font-bold">{app.reference}</span></div>
                </div>
              )}

              <button onClick={() => setStep("confirm")}
                disabled={!amount || Number(amount) <= 0}
                className="pay-submit-btn w-full py-4 font-bold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
                style={{
                  background: "linear-gradient(135deg,#C9A84C 0%,#E8C96A 50%,#C9A84C 100%)",
                  color: "#0A1F44",
                  boxShadow: "0 8px 28px rgba(201,168,76,0.40)",
                  letterSpacing: "0.1em",
                }}>
                <div className="flex items-center justify-center gap-2">
                  <Wallet size={16} /> I've Sent the Payment →
                </div>
              </button>
            </>
          ) : step === "confirm" ? (
            <>
              {/* Confirm step */}
              <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2.5"
                style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", color: "#C9A84C" }}>
                <CheckCircle size={12} /> {K(Number(amount))} sent via {provider || method.replace("_", " ")}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>Transaction Reference *</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="e.g. AIR123456789"
                  className="w-full px-3 py-3 rounded-xl text-sm text-white font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.25)" }} />
                <p className="text-[10px] text-slate-600 mt-1">Found in your SMS or transaction history</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>Screenshot (recommended)</label>
                <label className={`flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all`}
                  style={screenshot
                    ? { borderColor: "rgba(201,168,76,0.5)", background: "rgba(201,168,76,0.05)" }
                    : { borderColor: "rgba(255,255,255,0.1)", background: "transparent" }}>
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  {screenshot ? (
                    <><img src={screenshot} alt="preview" className="max-h-28 rounded-lg object-cover" /><span className="text-xs" style={{ color: "#C9A84C" }}>Screenshot attached ✓</span></>
                  ) : (
                    <><Receipt size={20} className="text-slate-600" /><span className="text-xs text-slate-500">Tap to attach screenshot</span></>
                  )}
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any message for our team…" rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm text-slate-200 focus:outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>

              {error && <div className="text-xs text-red-400 rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>{error}</div>}

              <div className="flex gap-3">
                <button onClick={() => setStep("send")}
                  className="px-4 py-3 text-sm font-semibold rounded-xl"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>← Back</button>
                <button onClick={submit} disabled={!reference}
                  className="flex-1 py-3 text-sm font-bold rounded-xl disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg,#C9A84C,#E8C96A,#C9A84C)", color: "#0A1F44" }}>
                  ✓ Confirm Payment
                </button>
              </div>
              <p className="text-[10px] text-slate-600 text-center">Our team will verify within a few hours and update your balance.</p>
            </>
          ) : null}

          {/* Success screen */}
          {step === "success" && (
            <div className="py-6 text-center space-y-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "rgba(201,168,76,0.1)", border: "4px solid rgba(201,168,76,0.45)" }}>
                <CheckCircle size={40} style={{ color: "#C9A84C" }} />
              </div>
              <div>
                <div className="text-xl font-black text-white mb-1">Payment Submitted! 🎉</div>
                <div className="text-sm text-slate-400">
                  <span className="font-bold" style={{ color: "#C9A84C" }}>{K(Number(amount))}</span> via {provider || method.replace("_", " ")}
                </div>
                <div className="text-xs text-slate-500 mt-1">Ref: <span className="font-mono text-slate-300">{reference}</span></div>
              </div>
              <div className="rounded-xl p-4 text-xs text-slate-400 space-y-1.5 text-left"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2"><CheckCircle size={11} style={{ color: "#C9A84C" }} className="flex-shrink-0" /> Payment proof received by Philix Finance</div>
                <div className="flex items-center gap-2"><Clock size={11} className="text-amber-400 flex-shrink-0" /> We'll verify within a few hours</div>
                <div className="flex items-center gap-2"><Sparkles size={11} className="text-indigo-400 flex-shrink-0" /> Balance updates automatically once confirmed</div>
              </div>
              <button onClick={onClose}
                className="w-full py-3 font-semibold rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Rollover Modal ─────────────────────────────────────────────────────────
function RolloverModal({ app, token, onClose, onDone }: {
  app: LoanApp; token: string | null;
  onClose: () => void; onDone: (appId: string, sub: PaymentRecord) => void;
}) {
  const rate           = app.interestRate ?? 20;
  const interest       = Math.ceil(app.amountRequested * (rate / 100));
  const principal      = app.amountRequested;

  const [method,    setMethod]    = useState("MOBILE_MONEY");
  const [provider,  setProvider]  = useState("Airtel Money");
  const [reference, setReference] = useState("");
  const [step,      setStep]      = useState<"info" | "pay" | "confirm" | "success">("info");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  const MOBILE: Record<string, string> = {
    "Airtel Money":  "0977 158 901",
    "MTN MoMo":      "0968 158 901",
    "Zamtel Kwacha": "0955 158 901",
  };

  function submit() {
    if (!reference) { setError("Enter your transaction reference"); return; }
    setLoading(true);
    const optimistic: PaymentRecord = {
      id: `rollover-${Date.now()}`, amount: interest, status: "PENDING",
      createdAt: new Date().toISOString(), reference,
      provider: method === "MOBILE_MONEY" ? provider : null, paymentMethod: method,
    };
    setStep("success");
    onDone(app.id, optimistic);
    fetch(`/api/portal/applications/${app.id}/rollover`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentMethod: method, provider, reference }),
    }).catch(() => {});
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl"
        style={{ background: "#070c18", border: "2px solid rgba(201,168,76,0.35)" }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(10,31,68,0.9)", border: "1px solid rgba(201,168,76,0.4)" }}>
              <RotateCcw size={18} style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Renew My Loan</h3>
              <p className="text-xs mt-0.5" style={{ color: "rgba(201,168,76,0.6)" }}>Pay interest only — keep the principal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-70" style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">

          {step === "info" && (
            <>
              {/* Hero explanation */}
              <div className="rounded-2xl p-5 text-center"
                style={{ background: "linear-gradient(135deg,rgba(10,31,68,0.95),rgba(20,40,80,0.95))", border: "1px solid rgba(201,168,76,0.3)" }}>
                <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: "rgba(201,168,76,0.65)" }}>How Loan Renewal Works</p>
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div>
                    <div className="text-2xl font-black text-white">1</div>
                    <div className="text-xs text-slate-400 mt-1">Pay just the interest</div>
                  </div>
                  <div className="flex items-center justify-center"><ArrowRight size={18} style={{ color: "#C9A84C" }} /></div>
                  <div>
                    <div className="text-2xl font-black text-white">2</div>
                    <div className="text-xs text-slate-400 mt-1">We verify your payment</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm font-bold py-2 px-4 rounded-xl"
                  style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                  ✓ Your K{K(principal)} is renewed for another {app.termMonths} week{app.termMonths !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-xs text-slate-500 mb-1">Principal (you keep)</div>
                  <div className="text-xl font-black text-emerald-400">{K(principal)}</div>
                </div>
                <div className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.25)" }}>
                  <div className="text-xs text-slate-500 mb-1">Interest to pay now</div>
                  <div className="text-xl font-black" style={{ color: "#C9A84C" }}>{K(interest)}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{rate}% of {K(principal)}</div>
                </div>
              </div>

              <button onClick={() => setStep("pay")}
                className="w-full py-4 font-bold rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: "#0A1F44", border: "2px solid #C9A84C", color: "#C9A84C", boxShadow: "0 8px 24px rgba(10,31,68,0.4), 0 0 0 0 rgba(201,168,76,0.3)" }}>
                <RotateCcw size={16} /> Renew for {K(interest)}
              </button>
            </>
          )}

          {step === "pay" && (
            <>
              <div className="rounded-xl p-4 text-center"
                style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.25)" }}>
                <div className="text-xs text-slate-500 mb-1">Send this amount</div>
                <div className="text-4xl font-black" style={{ color: "#C9A84C" }}>{K(interest)}</div>
                <div className="text-xs text-slate-500 mt-1">Renews your {K(principal)} loan</div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(201,168,76,0.7)" }}>Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[["MOBILE_MONEY","📱 Mobile"],["BANK_TRANSFER","🏦 Bank"],["CASH","💵 Cash"]].map(([v,l]) => (
                    <button key={v} onClick={() => setMethod(v)}
                      className="py-2.5 text-xs font-semibold rounded-xl transition-all"
                      style={method === v
                        ? { background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.6)", color: "#C9A84C" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#64748b" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {method === "MOBILE_MONEY" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {["Airtel Money","MTN MoMo","Zamtel Kwacha"].map(p => (
                      <button key={p} onClick={() => setProvider(p)}
                        className="py-2 text-xs font-semibold rounded-xl transition-all"
                        style={provider === p
                          ? { background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.55)", color: "#C9A84C" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#64748b" }}>
                        {p.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  {MOBILE[provider] && (
                    <div className="rounded-xl p-4" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.22)" }}>
                      <div className="text-xs font-bold mb-2" style={{ color: "#C9A84C" }}>Send {K(interest)} to:</div>
                      <div className="text-xl font-black text-white tracking-widest">{MOBILE[provider]}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Philix Finance Ltd · {provider}</div>
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setStep("confirm")}
                className="w-full py-4 font-bold rounded-2xl text-sm uppercase tracking-widest transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#C9A84C,#E8C96A,#C9A84C)", color: "#0A1F44", boxShadow: "0 8px 24px rgba(201,168,76,0.4)" }}>
                I've Sent {K(interest)} →
              </button>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2.5"
                style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", color: "#C9A84C" }}>
                <CheckCircle size={12} /> {K(interest)} sent via {provider || method.replace(/_/g, " ")}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>Transaction Reference *</label>
                <input value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="e.g. AIR123456789"
                  className="w-full px-3 py-3 rounded-xl text-sm text-white font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.25)" }} />
                <p className="text-[10px] text-slate-600 mt-1">Found in your SMS or transaction history</p>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep("pay")}
                  className="px-4 py-3 text-sm font-semibold rounded-xl"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>← Back</button>
                <button onClick={submit} disabled={loading || !reference}
                  className="flex-1 py-3 text-sm font-bold rounded-xl disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg,#C9A84C,#E8C96A,#C9A84C)", color: "#0A1F44" }}>
                  {loading ? "Submitting…" : "✓ Confirm Renewal"}
                </button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "rgba(10,31,68,0.9)", border: "4px solid rgba(201,168,76,0.5)" }}>
                <RotateCcw size={36} style={{ color: "#C9A84C" }} />
              </div>
              <div>
                <p className="text-xl font-black text-white mb-1">Renewal Submitted! 🔄</p>
                <p className="text-sm text-slate-400">We'll verify your {K(interest)} payment and automatically renew your {K(principal)} loan.</p>
              </div>
              <div className="rounded-xl p-4 text-xs text-slate-400 space-y-1.5 text-left"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2"><Clock size={11} className="text-amber-400" /> Verification takes a few hours</div>
                <div className="flex items-center gap-2"><RotateCcw size={11} style={{ color: "#C9A84C" }} /> Loan auto-renews once payment confirmed</div>
                <div className="flex items-center gap-2"><Sparkles size={11} className="text-indigo-400" /> You'll receive a notification when done</div>
              </div>
              <button onClick={onClose}
                className="w-full py-3 font-semibold rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SchedulePanel({ app }: { app: LoanApp }) {
  const rate     = app.interestRate ?? 20;
  const totalDue = Math.ceil(app.amountRequested * (1 + rate / 100));
  const weeklyAmt = Math.ceil(totalDue / (app.termMonths || 1));
  const totalPaid = (app.paymentSubmissions ?? [])
    .filter(p => p.status === "APPROVED")
    .reduce((s, p) => s + (p.amount ?? 0), 0);
  const paidCount  = totalPaid >= totalDue ? app.termMonths : Math.floor(totalPaid / weeklyAmt);
  const startDate  = app.reviewedAt ? new Date(app.reviewedAt) : new Date();
  const today      = new Date();

  const weeks = Array.from({ length: app.termMonths }, (_, i) => {
    const dueDate = new Date(startDate.getTime() + (i + 1) * 7 * 86400000);
    const isPaid     = i < paidCount;
    const isDue      = !isPaid && dueDate <= today;
    return { week: i + 1, dueDate, amount: weeklyAmt, isPaid, isDue };
  });

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">Repayment Schedule</span>
        </div>
        <span className="text-[10px] text-slate-500">{paidCount}/{app.termMonths} paid</span>
      </div>
      <div className="divide-y divide-slate-800/60">
        {weeks.map(w => (
          <div key={w.week} className={`flex items-center justify-between px-4 py-2.5 text-xs transition-colors
            ${w.isPaid ? "bg-emerald-900/10" : w.isDue ? "bg-amber-900/10" : ""}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0
                ${w.isPaid ? "bg-emerald-600/40 text-emerald-300" : w.isDue ? "bg-amber-600/40 text-amber-300" : "bg-slate-700 text-slate-500"}`}>
                {w.isPaid ? "✓" : w.week}
              </div>
              <div>
                <div className={`font-semibold ${w.isPaid ? "text-emerald-400" : w.isDue ? "text-amber-400" : "text-slate-400"}`}>
                  Week {w.week}
                </div>
                <div className="text-slate-600">
                  {w.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${w.isPaid ? "text-emerald-400" : w.isDue ? "text-amber-400" : "text-slate-400"}`}>
                {K(w.amount)}
              </div>
              <div className={`text-[10px] font-semibold ${w.isPaid ? "text-emerald-600" : w.isDue ? "text-amber-600" : "text-slate-600"}`}>
                {w.isPaid ? "PAID" : w.isDue ? "OVERDUE" : "UPCOMING"}
              </div>
            </div>
          </div>
        ))}
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
  const [rolloverTarget, setRolloverTarget] = useState<LoanApp | null>(null);
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

  // Auto-poll every 10 s while any loan has a PENDING payment — balance updates within seconds of staff approval
  useEffect(() => {
    const hasPending = apps.some(a =>
      (a.paymentSubmissions ?? []).some(p => p.status === "PENDING")
    );
    if (!hasPending) return;
    const tid = setInterval(load, 10000);
    return () => clearInterval(tid);
  }, [apps, load]);

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

  function handlePaymentDone(appId: string, submission: PaymentRecord) {
    // Inject optimistic PENDING record into the specific loan — no network round-trip
    setApps(prev => prev.map(a =>
      a.id === appId
        ? { ...a, paymentSubmissions: [submission, ...(a.paymentSubmissions ?? [])] }
        : a
    ));
    setPayApp(null);
    setSuccessMsg("Payment submitted! It will be confirmed by a loan officer shortly.");
    setTimeout(() => setSuccessMsg(""), 6000);
  }

  function handleReloanDone(created: LoanApp) {
    setApps(prev => [created, ...prev]);
    setReloanTarget(null);
    setSuccessMsg(`New loan application ${created.reference} submitted successfully!`);
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  function handleRolloverDone(appId: string, submission: PaymentRecord) {
    // Inject optimistic PENDING renewal record into the loan
    setApps(prev => prev.map(a =>
      a.id === appId
        ? { ...a, paymentSubmissions: [submission, ...(a.paymentSubmissions ?? [])] }
        : a
    ));
    setRolloverTarget(null);
    setSuccessMsg("Loan renewal submitted! Once we verify your interest payment, your principal will be renewed automatically.");
    setTimeout(() => setSuccessMsg(""), 8000);
  }

  function downloadAgreement(app: LoanApp) {
    const client = useClientAuthStore.getState().client;
    const fullName = client ? `${client.firstName} ${client.lastName}` : "Client";
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const flatRatePct = (app.interestRate ?? 20) / 100; // use stored flat rate; fall back to 20%
    const interest = app.amountRequested * flatRatePct;
    const total = app.amountRequested + interest;
    const monthly = total / (app.termMonths || 1);
    const fmtK = (n: number) => `K${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const approvedDate = app.reviewedAt ? new Date(app.reviewedAt) : new Date();
    const firstPayment = new Date(approvedDate.getTime() + 7 * 86400000); // 1 week after disbursement
    const finalPayment = new Date(approvedDate.getTime() + app.termMonths * 7 * 86400000); // N weeks after
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // Header
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("PHILIX FINANCE LIMITED", 105, 16, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 170, 185);
    doc.text("LOAN AGREEMENT  ·  Ref: " + app.reference, 105, 24, { align: "center" });
    doc.text("Creating A Future Together  ·  Bank of Zambia Licensed", 105, 31, { align: "center" });

    // Title
    doc.setTextColor(11, 31, 58);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("PERSONAL LOAN AGREEMENT", 105, 50, { align: "center" });

    let y = 62;
    const section = (title: string) => {
      doc.setFillColor(11, 31, 58);
      doc.rect(14, y - 4, 182, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(title, 18, y + 0.5);
      y += 10;
    };
    const row = (label: string, value: string) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(label, 18, y);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.text(value, 105, y);
      doc.setDrawColor(220, 225, 230);
      doc.line(14, y + 2, 196, y + 2);
      y += 9;
    };

    section("BORROWER DETAILS");
    row("Full Name", fullName);
    row("Client Email", client?.email ?? "—");
    y += 2;

    section("LOAN PARTICULARS");
    row("Loan Reference", app.reference);
    row("Loan Product", app.productType.replace(/_/g, " "));
    row("Loan Term", `${app.termMonths} Week${app.termMonths !== 1 ? "s" : ""}`);
    row("Purpose", app.purpose || "—");
    row("Approval Date", fmt(approvedDate));
    y += 2;

    section("FINANCIAL BREAKDOWN");
    row("Principal Amount", fmtK(app.amountRequested));
    row("Interest Rate", `${app.interestRate ?? 20}% flat (for ${app.termMonths} week${app.termMonths !== 1 ? "s" : ""})`);
    row("Total Interest Charged", fmtK(interest));
    doc.setTextColor(245, 166, 35);
    row("TOTAL REPAYABLE", fmtK(total));
    doc.setTextColor(20, 20, 20);
    row("Weekly Instalment", fmtK(monthly));
    y += 2;

    section("REPAYMENT SCHEDULE");
    row("First Weekly Payment Due", fmt(firstPayment));
    row("Final Payment Due", fmt(finalPayment));
    row("Number of Weekly Payments", String(app.termMonths));
    y += 8;

    // Signature
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Borrower Signature: _________________________", 18, y);
    doc.text("Date: _________________________", 130, y);
    y += 10;
    doc.text("Authorised by Philix Finance: _________________________", 18, y);
    y += 16;

    // Footer
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 282, 210, 15, "F");
    doc.setTextColor(140, 155, 170);
    doc.setFontSize(7);
    doc.text("Philix Finance Ltd  ·  Lusaka, Zambia  ·  info@philixfinance.com  ·  Bank of Zambia Licensed", 105, 290, { align: "center" });

    doc.save(`LoanAgreement-${app.reference}.pdf`);
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
        <PaymentModal app={payApp} token={token}
          onClose={() => setPayApp(null)} onDone={handlePaymentDone} />
      )}
      {rolloverTarget && (
        <RolloverModal app={rolloverTarget} token={token}
          onClose={() => setRolloverTarget(null)} onDone={handleRolloverDone} />
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

      {/* Auto-poll notice — shown when PENDING payments exist */}
      {apps.some(a => (a.paymentSubmissions ?? []).some(p => p.status === "PENDING")) && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <RefreshCw size={12} className="animate-spin flex-shrink-0" style={{ color: "#C9A84C" }} />
          <p className="text-xs" style={{ color: "rgba(201,168,76,0.8)" }}>
            Checking for payment updates every 10 seconds — your balance will refresh automatically once staff confirms.
          </p>
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
          { label: "Active Loans",   value: activeApps.filter(a => a.status === "DISBURSED").length,                           color: "text-emerald-400" },
          { label: "Fully Repaid",   value: apps.filter(a => a.status === "REPAID").length,                                    color: "text-indigo-400"  },
          { label: "Pending Review", value: apps.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW").length,  color: "text-amber-400"   },
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

                  {/* Balance strip — only for disbursed loans with payment history */}
                  {app.status === "DISBURSED" && (() => {
                    const tDue = Math.ceil(app.amountRequested * (1 + (app.interestRate ?? 20) / 100));
                    const tPaid = (app.paymentSubmissions ?? []).filter(p => p.status === "APPROVED").reduce((s, p) => s + (p.amount ?? 0), 0);
                    const tRem = Math.max(0, tDue - tPaid);
                    const paidPct = tDue > 0 ? Math.min(100, Math.round((tPaid / tDue) * 100)) : 0;
                    return (
                      <div className="mt-3 pt-3 border-t border-slate-800/60">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-500">Paid: <span className="text-emerald-400 font-semibold">{K(tPaid)}</span></span>
                          <span className="text-slate-500">Remaining: <span className="text-amber-400 font-semibold">{K(tRem)}</span></span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" style={{ width: `${paidPct}%` }} />
                        </div>
                        <div className="text-right text-[10px] text-slate-600 mt-0.5">{paidPct}% repaid of {K(tDue)}</div>
                      </div>
                    );
                  })()}

                  {/* PAY LOAN + RENEW LOAN — always visible for disbursed loans */}
                  {app.status === "DISBURSED" && (() => {
                    const tDue2 = Math.ceil(app.amountRequested * (1 + (app.interestRate ?? 20) / 100));
                    const tPaid2 = (app.paymentSubmissions ?? []).filter(p => p.status === "APPROVED").reduce((s, p) => s + (p.amount ?? 0), 0);
                    const tRem2 = Math.max(0, tDue2 - tPaid2);
                    const interestOnly = Math.ceil(app.amountRequested * ((app.interestRate ?? 20) / 100));
                    return (
                      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        {/* Gold PAY LOAN button */}
                        <button onClick={e => { e.stopPropagation(); setPayApp(app); }}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all hover:-translate-y-0.5"
                          style={{
                            background: overdue
                              ? "linear-gradient(135deg,#ef4444,#dc2626)"
                              : "linear-gradient(135deg,#C9A84C 0%,#E8C96A 50%,#C9A84C 100%)",
                            color: overdue ? "#fff" : "#0A1F44",
                            boxShadow: overdue
                              ? "0 8px 24px rgba(239,68,68,0.4)"
                              : "0 8px 24px rgba(201,168,76,0.4)",
                            letterSpacing: "0.08em",
                          }}>
                          <Wallet size={16} />
                          {overdue
                            ? `⚠️ PAY NOW — ${Math.abs(days!)}d overdue`
                            : nearDue
                            ? `PAY LOAN — Due in ${days}d`
                            : `PAY LOAN`}
                          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>
                            Outstanding: {K(tRem2)}
                          </span>
                        </button>

                        {/* Navy RENEW LOAN button */}
                        <button onClick={e => { e.stopPropagation(); setRolloverTarget(app); }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all hover:-translate-y-0.5"
                          style={{
                            background: "#0A1F44",
                            color: "#C9A84C",
                            border: "2px solid rgba(201,168,76,0.6)",
                            boxShadow: "0 4px 16px rgba(10,31,68,0.4)",
                            letterSpacing: "0.08em",
                          }}>
                          <RotateCcw size={15} />
                          RENEW LOAN
                          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.65, marginLeft: 4 }}>
                            Pay {K(interestOnly)} interest only
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-800 px-5 py-4 space-y-4">
                    <p className="text-xs text-slate-500">{STATUS_DESC[app.status]}</p>

                    {/* Payment history — shown for any loan that has submissions */}
                    {(app.paymentSubmissions ?? []).length > 0 && (
                      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-700 flex items-center gap-1.5">
                          <Receipt size={13} className="text-emerald-400" />
                          <span className="text-xs font-semibold text-slate-300">Payment History</span>
                        </div>
                        <div className="divide-y divide-slate-800">
                          {(app.paymentSubmissions ?? []).map(p => (
                            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                              <div>
                                <div className={`font-semibold ${p.status === "APPROVED" ? "text-emerald-400" : p.status === "REJECTED" ? "text-red-400" : "text-amber-400"}`}>
                                  {p.amount != null ? K(p.amount) : "—"}
                                </div>
                                <div className="text-slate-500 mt-0.5">{p.provider ?? p.paymentMethod ?? "Mobile Money"}{p.reference ? ` · ${p.reference}` : ""}</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.status === "APPROVED" ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/50" : p.status === "REJECTED" ? "bg-red-900/40 text-red-300 border-red-800/50" : "bg-amber-900/40 text-amber-300 border-amber-800/50"}`}>
                                  {p.status}
                                </div>
                                <div className="text-slate-600 mt-0.5">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {app.status === "REJECTED" && app.rejectedReason && (
                      <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-400">
                        <span className="font-semibold">Reason: </span>{app.rejectedReason}
                      </div>
                    )}

                    {/* Repayment schedule — for disbursed loans */}
                    {app.status === "DISBURSED" && <SchedulePanel app={app} />}

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

                    {(app.status === "APPROVED" || app.status === "DISBURSED") && (
                      <div className="flex items-center gap-2">
                        {app.status === "DISBURSED" && (
                          <button
                            onClick={() => setPayApp(app)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50 rounded-xl transition-colors"
                          >
                            <Receipt size={13} /> Mark as Paid
                          </button>
                        )}
                        <button
                          onClick={() => downloadAgreement(app)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-900/30 border border-indigo-700/50 text-indigo-400 hover:bg-indigo-900/50 rounded-xl transition-colors"
                        >
                          <Download size={13} /> Loan Agreement PDF
                        </button>
                      </div>
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

      {/* Loan Renewal CTA — shown when a disbursed loan is 90%+ through its term */}
      {!loading && activeApps.filter(a => a.status === "DISBURSED" && pct(a) >= 90).map(app => (
        <div key={`renew-${app.id}`} className="bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border border-indigo-700/50 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
              <RefreshCw size={18} className="text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-indigo-200 text-sm mb-1">🔄 Ready to Renew?</div>
              <div className="text-xs text-slate-400 mb-3">
                Your {app.productType.replace(/_/g, " ")} loan is almost complete. Apply for a new loan instantly — your profile and details are already saved.
              </div>
              <button
                onClick={() => setReloanTarget(app)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
              >
                <RefreshCw size={12} /> Renew Loan in One Tap
              </button>
            </div>
          </div>
        </div>
      ))}

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
                    {app.status === "REPAID" && (
                      <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                        <CheckCircle size={14} /> Loan fully repaid — well done! Your credit score has been updated.
                      </div>
                    )}

                    {app.rejectedReason && (
                      <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-xs text-red-400">
                        <span className="font-semibold">Rejection reason: </span>{app.rejectedReason}
                      </div>
                    )}

                    {/* Payment history for repaid loans */}
                    {(app.paymentSubmissions ?? []).length > 0 && (
                      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-700 flex items-center gap-1.5">
                          <Receipt size={13} className="text-emerald-400" />
                          <span className="text-xs font-semibold text-slate-300">Payment History</span>
                        </div>
                        <div className="divide-y divide-slate-800">
                          {(app.paymentSubmissions ?? []).map(p => (
                            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                              <div>
                                <div className={`font-semibold ${p.status === "APPROVED" ? "text-emerald-400" : p.status === "REJECTED" ? "text-red-400" : "text-amber-400"}`}>
                                  {p.amount != null ? K(p.amount) : "—"}
                                </div>
                                <div className="text-slate-500 mt-0.5">{p.provider ?? p.paymentMethod ?? "Mobile Money"}{p.reference ? ` · ${p.reference}` : ""}</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.status === "APPROVED" ? "bg-emerald-900/40 text-emerald-300 border-emerald-800/50" : p.status === "REJECTED" ? "bg-red-900/40 text-red-300 border-red-800/50" : "bg-amber-900/40 text-amber-300 border-amber-800/50"}`}>
                                  {p.status}
                                </div>
                                <div className="text-slate-600 mt-0.5">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Repayment schedule — for completed loans */}
                    {app.status === "REPAID" && <SchedulePanel app={app} />}

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
        <a href="tel:+260777158901" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">📞 +260 777 158 901</a>
      </div>
    </div>
  );
}
