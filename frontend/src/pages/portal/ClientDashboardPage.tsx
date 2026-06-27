import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import {
  Shield, BadgeCheck, AlertCircle, Receipt, FileText,
  Zap, Calculator, Home, CreditCard, Bell, User,
  ChevronRight, Quote, Sparkles, ShieldCheck, RefreshCw,
  CheckCircle2, TrendingUp, CalendarClock, Banknote, Info,
  CalendarDays, X, CheckCircle, Wallet, RotateCcw,
} from "lucide-react";
import { mockLoanProducts } from "../../lib/mock-data";

interface PaymentRecord {
  id: string;
  amount: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reference: string | null;
  provider: string | null;
  paymentMethod: string | null;
}

interface PortalApplication {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  interestRate?: number;
  purpose?: string;
  paymentSubmissions?: PaymentRecord[];
}

const K = (n: number) =>
  `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TERM_RATES: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 35 };

function calcScore(apps: PortalApplication[], kycOk: boolean, joinedAt: string) {
  let s = 300;
  if (kycOk) s += 150;
  const months = Math.floor((Date.now() - new Date(joinedAt).getTime()) / (30 * 86400000));
  s += Math.min(80, months * 8);
  s += Math.min(60, apps.length * 20);
  s += Math.min(140, apps.filter(a => a.status === "APPROVED" || a.status === "DISBURSED").length * 70);
  s += Math.min(80, apps.filter(a => a.status === "DISBURSED").length * 80);
  if (apps.length > 0 && !apps.some(a => a.status === "REJECTED")) s += 100;
  return Math.min(850, Math.max(300, s));
}

function scoreMeta(s: number) {
  if (s >= 780) return { label: "Excellent", color: "#22c55e" };
  if (s >= 720) return { label: "Very Good", color: "#4ade80" };
  if (s >= 650) return { label: "Good",      color: "#F5A623" };
  if (s >= 550) return { label: "Fair",      color: "#f97316" };
  return              { label: "Building",   color: "#ef4444" };
}

function FactorBar({ pct, color = "#22c55e" }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

function StatTile({ label, value, sub, color, to }: {
  label: string; value: string; sub?: string; color: string; to?: string;
}) {
  const inner = (
    <div className="flex flex-col justify-between h-full p-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <ChevronRight size={10} className="text-slate-700" />
      </div>
      <div>
        <p className="text-sm font-black leading-tight" style={{ color }}>{value}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : <div>{inner}</div>;
}

// ── Dashboard Pay Modal ────────────────────────────────────────────────────
function DashboardPayModal({ app, token, onClose, onDone }: {
  app: PortalApplication; token: string | null;
  onClose: () => void; onDone: (record: PaymentRecord) => void;
}) {
  const rate     = app.interestRate ?? TERM_RATES[app.termMonths] ?? 35;
  const totalDue = app.amountRequested * (1 + rate / 100);
  const totalPaid = (app.paymentSubmissions ?? [])
    .filter(p => p.status === "APPROVED")
    .reduce((s, p) => s + (p.amount ?? 0), 0);
  const remaining = Math.max(0, totalDue - totalPaid);
  const weeklyAmt = Math.ceil(totalDue / (app.termMonths || 1));

  const [amount,    setAmount]    = useState(String(weeklyAmt));
  const [method,    setMethod]    = useState("MOBILE_MONEY");
  const [provider,  setProvider]  = useState("Airtel Money");
  const [reference, setReference] = useState("");
  const [step,      setStep]      = useState<"form" | "confirm" | "success">("form");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const MOBILE: Record<string, string> = {
    "Airtel Money":   "0977 158 901",
    "MTN MoMo":       "0968 158 901",
    "Zamtel Kwacha":  "0955 158 901",
  };

  function submit() {
    if (!reference) { setError("Enter the transaction reference"); return; }
    setLoading(true);
    const optimistic: PaymentRecord = {
      id: `pending-${Date.now()}`,
      amount: parseFloat(amount) || 0,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      reference,
      provider: method === "MOBILE_MONEY" ? provider : null,
      paymentMethod: method,
    };
    setStep("success");
    onDone(optimistic);
    fetch(`/api/portal/applications/${app.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: parseFloat(amount), paymentMethod: method, provider, reference }),
    }).catch(() => {});
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: "#080d1a", border: "1px solid rgba(255,255,255,0.1)" }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h3 className="font-bold text-white text-base">Make a Repayment</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{app.reference}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Loan summary */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl text-center text-xs"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <div className="text-slate-500 mb-0.5">Total Loan</div>
              <div className="font-bold text-slate-200">{K(totalDue)}</div>
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
              <div className="text-slate-500 mb-0.5">Instalment</div>
              <div className="font-bold text-indigo-400">{K(weeklyAmt)}</div>
            </div>
          </div>

          {step === "form" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">How much are you paying?</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: `Weekly — ${K(weeklyAmt)}`, val: weeklyAmt },
                    { label: `Pay in Full — ${K(remaining)}`, val: remaining },
                  ].map(q => (
                    <button key={q.label} onClick={() => setAmount(String(q.val))}
                      className="py-2.5 text-xs font-semibold rounded-xl transition-all"
                      style={String(q.val) === amount
                        ? { background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.5)", color: "#C9A84C" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400">K</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl text-sm text-slate-100 font-semibold focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[["MOBILE_MONEY","📱 Mobile"],["BANK_TRANSFER","🏦 Bank"],["CASH","💵 Cash"]].map(([v,l]) => (
                    <button key={v} onClick={() => setMethod(v)}
                      className="py-2.5 text-xs font-semibold rounded-xl transition-all"
                      style={method === v
                        ? { background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {method === "MOBILE_MONEY" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {["Airtel Money","MTN MoMo","Zamtel Kwacha"].map(p => (
                      <button key={p} onClick={() => setProvider(p)}
                        className="py-2 text-xs font-semibold rounded-xl transition-all"
                        style={provider === p
                          ? { background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }
                          : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                        {p.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  {MOBILE[provider] && (
                    <div className="rounded-xl p-3"
                      style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
                      <p className="text-xs text-slate-400 mb-1">Send {K(Number(amount) || weeklyAmt)} to:</p>
                      <p className="text-lg font-black text-white tracking-widest">{MOBILE[provider]}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Philix Finance Ltd · {provider}</p>
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setStep("confirm")} disabled={!amount || Number(amount) <= 0}
                className="w-full py-3.5 font-bold rounded-[14px] text-sm disabled:opacity-40 transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#C9A84C 0%,#E8C96A 50%,#C9A84C 100%)", color: "#0A1F44", letterSpacing: "0.04em" }}>
                I've Sent the Payment →
              </button>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="flex items-center gap-2 text-xs rounded-xl px-3 py-2.5"
                style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "#C9A84C" }}>
                <CheckCircle size={12} /> {K(Number(amount))} sent via {provider || method.replace(/_/g," ")}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Transaction Reference *</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="e.g. AIR123456789"
                  className="w-full px-3 py-3 rounded-xl text-sm text-slate-100 font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
                <p className="text-[10px] text-slate-600 mt-1">Found in your SMS or transaction history</p>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep("form")}
                  className="px-4 py-3 text-sm font-semibold rounded-xl text-slate-400"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>← Back</button>
                <button onClick={submit} disabled={loading || !reference}
                  className="flex-1 py-3 font-bold rounded-[14px] text-sm disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg,#C9A84C 0%,#E8C96A 50%,#C9A84C 100%)", color: "#0A1F44" }}>
                  {loading ? "Submitting…" : "✓ Confirm Payment"}
                </button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "rgba(201,168,76,0.1)", border: "4px solid rgba(201,168,76,0.4)" }}>
                <CheckCircle size={38} style={{ color: "#C9A84C" }} />
              </div>
              <div>
                <p className="text-xl font-black text-white mb-1">Payment Submitted!</p>
                <p className="text-sm text-slate-400">Our team will verify within a few hours.</p>
                <p className="text-xs text-slate-600 mt-1">Ref: <span className="font-mono text-slate-300">{reference}</span></p>
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

// ── Dashboard Reloan Modal ─────────────────────────────────────────────────
function DashboardReloanModal({ sourceApp, token, onClose, onDone }: {
  sourceApp: PortalApplication; token: string | null;
  onClose: () => void; onDone: (created: PortalApplication) => void;
}) {
  const [amount,  setAmount]  = useState(sourceApp.amountRequested);
  const [weeks,   setWeeks]   = useState(sourceApp.termMonths || 1);
  const [purpose, setPurpose] = useState(sourceApp.purpose || "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const rate    = TERM_RATES[weeks] ?? 35;
  const total   = amount * (1 + rate / 100);
  const weekly  = Math.ceil(total / weeks);

  async function submit() {
    if (!purpose || amount < 500) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/portal/applications/${sourceApp.id}/reloan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountRequested: amount, termWeeks: weeks, purpose }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Failed. Please try again."); return; }
      setSuccess(true);
      onDone(data);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: "#0A1F44", border: "2px solid rgba(201,168,76,0.4)" }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
          <div>
            <h3 className="font-bold text-white text-base">Apply Again</h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(201,168,76,0.65)" }}>
              Pre-filled from your previous loan
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-70" style={{ color: "rgba(201,168,76,0.5)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)" }}>
            <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-300">You are eligible to re-apply</p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>
              Loan Amount (ZMW)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm"
                style={{ color: "rgba(201,168,76,0.6)" }}>K</span>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={500}
                className="w-full pl-8 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.25)" }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(201,168,76,0.7)" }}>
              Loan Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1,2,3,4].map(w => (
                <button key={w} onClick={() => setWeeks(w)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={weeks === w
                    ? { background: "#C9A84C", color: "#0A1F44", border: "none" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.55)" }}>
                  {w}W
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>
              Loan Purpose
            </label>
            <input value={purpose} onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. School fees, Business capital…"
              className="w-full px-3 py-3 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,76,0.25)" }} />
          </div>

          {/* Live repayment preview */}
          <div className="rounded-xl p-4"
            style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "rgba(201,168,76,0.65)" }}>
              Estimated Repayment
            </p>
            <p className="text-2xl font-black text-white">{K(total)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {K(weekly)}/week × {weeks} week{weeks > 1 ? "s" : ""} · {rate}% flat interest
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {success ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle size={40} className="mx-auto text-emerald-400" />
              <p className="font-bold text-white">Application Submitted!</p>
              <p className="text-sm text-slate-400">Our team will review within 24 hours.</p>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "rgba(255,255,255,0.08)" }}>Done</button>
            </div>
          ) : (
            <button onClick={submit} disabled={loading || !purpose || amount < 500}
              className="w-full py-3.5 font-bold rounded-[14px] text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              style={{ background: "#0A1F44", border: "2px solid #C9A84C", color: "#C9A84C", letterSpacing: "0.06em" }}>
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              SUBMIT APPLICATION
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Renew (Rollover) Modal ───────────────────────────────────────
function DashboardRenewModal({ app, token, onClose, onDone }: {
  app: PortalApplication; token: string | null;
  onClose: () => void; onDone: (record: PaymentRecord) => void;
}) {
  const rate      = app.interestRate ?? 20;
  const interest  = Math.ceil(app.amountRequested * (rate / 100));
  const principal = app.amountRequested;

  const [method,    setMethod]    = useState("MOBILE_MONEY");
  const [provider,  setProvider]  = useState("Airtel Money");
  const [reference, setReference] = useState("");
  const [step,      setStep]      = useState<"info" | "pay" | "confirm" | "success">("info");
  const [error,     setError]     = useState("");

  const MOBILE: Record<string, string> = {
    "Airtel Money":  "0977 158 901",
    "MTN MoMo":      "0968 158 901",
    "Zamtel Kwacha": "0955 158 901",
  };

  function submit() {
    if (!reference) { setError("Enter your transaction reference"); return; }
    const optimistic: PaymentRecord = {
      id: `rollover-${Date.now()}`, amount: interest, status: "PENDING",
      createdAt: new Date().toISOString(), reference,
      provider: method === "MOBILE_MONEY" ? provider : null, paymentMethod: method,
    };
    setStep("success");
    onDone(optimistic);
    fetch(`/api/portal/applications/${app.id}/rollover`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentMethod: method, provider, reference }),
    }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: "#070c18", border: "2px solid rgba(201,168,76,0.4)" }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#0A1F44", border: "1px solid rgba(201,168,76,0.4)" }}>
              <RotateCcw size={18} style={{ color: "#C9A84C" }} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Renew My Loan</h3>
              <p className="text-xs mt-0.5" style={{ color: "rgba(201,168,76,0.6)" }}>Pay interest only · keep {K(principal)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-70" style={{ color: "rgba(255,255,255,0.4)" }}><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {step === "info" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }}>
                  <div className="text-xs text-slate-500 mb-1">Principal (you keep)</div>
                  <div className="text-xl font-black text-emerald-400">{K(principal)}</div>
                </div>
                <div className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.25)" }}>
                  <div className="text-xs text-slate-500 mb-1">Pay this now</div>
                  <div className="text-xl font-black" style={{ color: "#C9A84C" }}>{K(interest)}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{rate}% interest</div>
                </div>
              </div>
              <div className="rounded-xl px-4 py-3 text-xs text-slate-400"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                Pay <span className="font-bold" style={{ color: "#C9A84C" }}>{K(interest)}</span> in interest and your <span className="font-bold text-white">{K(principal)}</span> principal is automatically renewed for another {app.termMonths} week{app.termMonths !== 1 ? "s" : ""}. Staff will verify and apply the renewal.
              </div>
              <button onClick={() => setStep("pay")}
                className="w-full py-4 font-bold rounded-[14px] text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: "#0A1F44", border: "2px solid #C9A84C", color: "#C9A84C", boxShadow: "0 8px 24px rgba(10,31,68,0.5)" }}>
                <RotateCcw size={16} /> Renew for {K(interest)}
              </button>
            </>
          )}

          {step === "pay" && (
            <>
              <div className="rounded-xl p-4 text-center"
                style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.25)" }}>
                <div className="text-xs text-slate-500 mb-1">Send to Philix Finance</div>
                <div className="text-4xl font-black" style={{ color: "#C9A84C" }}>{K(interest)}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(201,168,76,0.7)" }}>Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Airtel Money","MTN MoMo","Zamtel Kwacha"].map(p => (
                    <button key={p} onClick={() => setProvider(p)}
                      className="py-2 text-xs font-semibold rounded-xl transition-all"
                      style={provider === p
                        ? { background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.55)", color: "#C9A84C" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                      {p.split(" ")[0]}
                    </button>
                  ))}
                </div>
                {MOBILE[provider] && (
                  <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <p className="text-xs text-slate-500 mb-0.5">Send {K(interest)} to:</p>
                    <p className="text-xl font-black text-white tracking-widest">{MOBILE[provider]}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Philix Finance Ltd</p>
                  </div>
                )}
              </div>
              <button onClick={() => setStep("confirm")}
                className="w-full py-4 font-bold rounded-[14px] text-sm uppercase tracking-widest transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg,#C9A84C,#E8C96A,#C9A84C)", color: "#0A1F44", boxShadow: "0 8px 24px rgba(201,168,76,0.4)" }}>
                I've Sent {K(interest)} →
              </button>
            </>
          )}

          {step === "confirm" && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>Transaction Reference *</label>
                <input value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="e.g. AIR123456789"
                  className="w-full px-3 py-3 rounded-xl text-sm text-white font-mono focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.3)" }} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep("pay")}
                  className="px-4 py-3 text-sm font-semibold rounded-xl"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>← Back</button>
                <button onClick={submit} disabled={!reference}
                  className="flex-1 py-3 text-sm font-bold rounded-[14px] disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg,#C9A84C,#E8C96A,#C9A84C)", color: "#0A1F44" }}>
                  ✓ Confirm Renewal
                </button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "#0A1F44", border: "4px solid rgba(201,168,76,0.5)" }}>
                <RotateCcw size={36} style={{ color: "#C9A84C" }} />
              </div>
              <div>
                <p className="text-xl font-black text-white mb-1">Renewal Submitted! 🔄</p>
                <p className="text-sm text-slate-400">Once we verify your {K(interest)} payment, your {K(principal)} loan renews automatically.</p>
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

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function ClientDashboardPage() {
  const client = useClientAuthStore(s => s.client);
  const token  = useClientAuthStore(s => s.accessToken);
  const [apps, setApps]               = useState<PortalApplication[]>([]);
  const [loading, setLoading]         = useState(true);
  const [ann, setAnn]                 = useState<{ id: string; subject: string; body: string; createdAt: string }[]>([]);
  const [tab, setTab]                 = useState<"home" | "loans" | "alerts" | "profile">("home");
  const [payModalOpen, setPayModalOpen]       = useState(false);
  const [reloanModalOpen, setReloanModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen]   = useState(false);
  const [paySuccessMsg, setPaySuccessMsg]     = useState("");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/portal/applications", { headers: h }).then(r => r.ok ? r.json() : []),
      fetch("/api/portal/notifications/announcements", { headers: h }).then(r => r.ok ? r.json() : []),
    ])
      .then(([a, n]) => { setApps(Array.isArray(a) ? a : []); setAnn(Array.isArray(n) ? n : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Auto-poll every 10 s when PENDING payments exist — balance refreshes within seconds of approval
  useEffect(() => {
    if (!token) return;
    const hasPending = apps.some(a => (a.paymentSubmissions ?? []).some(p => p.status === "PENDING"));
    if (!hasPending) return;
    const h = { Authorization: `Bearer ${token}` };
    const tid = setInterval(() => {
      fetch("/api/portal/applications", { headers: h })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setApps(Array.isArray(data) ? data : []); })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(tid);
  }, [apps, token]);

  if (!client) return null;

  const initials  = `${client.firstName?.[0] ?? ""}${client.lastName?.[0] ?? ""}`.toUpperCase();
  const kycOk     = client.kycStatus === "VERIFIED";
  const score     = calcScore(apps, kycOk, client.joinedAt ?? new Date().toISOString());
  const meta      = scoreMeta(score);
  const scorePct  = ((score - 300) / 550) * 100;

  const active    = apps.find(a => a.status === "DISBURSED" || a.status === "APPROVED");
  const pending   = apps.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW");
  const disbursed = apps.filter(a => a.status === "DISBURSED").length;

  // Use stored interest rate if available, fall back to product-rate table
  const termWeeks     = active?.termMonths ?? 1;
  const rate          = active?.interestRate ?? TERM_RATES[termWeeks] ?? 35;
  const principal     = active?.amountRequested ?? 0;
  const interest      = principal * (rate / 100);
  const totalDue      = principal + interest;
  const totalPaid     = (active?.paymentSubmissions ?? [])
    .filter(p => p.status === "APPROVED")
    .reduce((s, p) => s + (p.amount ?? 0), 0);
  const remaining     = Math.max(0, totalDue - totalPaid);
  const isFullyPaid   = totalPaid > 0 && remaining === 0;

  const subMs      = active ? new Date(active.createdAt).getTime() : 0;
  const dueMs      = subMs ? subMs + termWeeks * 7 * 86400000 : 0;
  const daysUntilDue  = dueMs ? Math.ceil((dueMs - Date.now()) / 86400000) : 0;
  const loanDateFull  = subMs ? new Date(subMs).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  const dueDateFull   = dueMs ? new Date(dueMs).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  const dueDateShort  = dueMs ? new Date(dueMs).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const overdue    = dueMs > 0 && daysUntilDue < 0;
  const nearDue    = !overdue && daysUntilDue <= 3 && dueMs > 0;

  // Reloan eligibility: no active loan AND has a past loan to clone details from
  const reloanSource  = !active ? apps.find(a => a.status === "REPAID" || a.status === "REJECTED") : undefined;
  const eligibleForReloan = !!reloanSource;

  // Score factors
  const utilizationPct = active ? Math.min(100, Math.round((principal / 20000) * 100)) : 0;
  const payHistPct     = apps.length > 0 ? Math.round((apps.filter(a => a.status !== "REJECTED").length / apps.length) * 100) : 0;
  const creditMix      = apps.length === 0 ? "None" : disbursed >= 2 ? "Good" : disbursed === 1 ? "Fair" : "Building";
  const inquiries      = apps.length;

  const tip = ann[0] ?? {
    id: "t", subject: "Top Financial Tip of the Week",
    body: "Pay your full loan on the due date — consistent, on-time repayment is the single biggest factor in building a strong credit score.",
    createdAt: new Date().toISOString(),
  };

  const scoreTips = [
    { icon: CheckCircle2,  text: "Pay your full loan on the due date",                        impact: "+80 pts",      color: "#22c55e", done: disbursed > 0 && !overdue },
    { icon: ShieldCheck,   text: "Complete KYC identity verification",                        impact: "+150 pts",     color: "#4ade80", done: kycOk },
    { icon: TrendingUp,    text: "Build a repayment history by taking and repaying loans",    impact: "+70 pts each", color: "#F5A623", done: disbursed > 0 },
    { icon: CalendarClock, text: "Avoid too many applications in a short period",             impact: "Protects score",color: "#818cf8", done: inquiries <= 3 },
    { icon: Banknote,      text: "Keep your loan amount within what you can repay",           impact: "Lowers risk",  color: "#38bdf8", done: utilizationPct <= 60 },
    { icon: CalendarDays,  text: "Pay before or on the due date — never late",                impact: "+100 pts",     color: "#f97316", done: payHistPct === 100 },
  ];

  function handlePaymentDone(record: PaymentRecord) {
    if (!active) return;
    setApps(prev => prev.map(a =>
      a.id === active.id
        ? { ...a, paymentSubmissions: [record, ...(a.paymentSubmissions ?? [])] }
        : a
    ));
    setPayModalOpen(false);
    setRenewModalOpen(false);
    setPaySuccessMsg("Payment submitted! Our team will verify within a few hours.");
    setTimeout(() => setPaySuccessMsg(""), 6000);
  }

  function handleReloanDone(created: PortalApplication) {
    setApps(prev => [created, ...prev]);
    setReloanModalOpen(false);
    setPaySuccessMsg(`New application ${created.reference} submitted — we'll review within 24 hours.`);
    setTimeout(() => setPaySuccessMsg(""), 8000);
  }

  return (
    <div className="max-w-xl mx-auto pb-24" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes philix-shimmer {
          0%   { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(300%)  skewX(-15deg); }
        }
        .pay-loan-btn { position: relative; overflow: hidden; }
        .pay-loan-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.38) 50%, transparent 100%);
          animation: philix-shimmer 1.4s ease-out forwards;
          pointer-events: none;
        }
        .pay-loan-btn:hover { filter: brightness(1.08); }
        .pay-loan-btn:active { transform: translateY(0) !important; }
        .reloan-btn:hover { background: #122850 !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.22), 0 8px 24px rgba(10,31,68,0.35) !important; }
        .reloan-btn:active { transform: translateY(0) !important; }
      `}</style>

      {/* Modals */}
      {payModalOpen && active && (
        <DashboardPayModal app={active} token={token} onClose={() => setPayModalOpen(false)} onDone={handlePaymentDone} />
      )}
      {reloanModalOpen && reloanSource && (
        <DashboardReloanModal sourceApp={reloanSource} token={token} onClose={() => setReloanModalOpen(false)} onDone={handleReloanDone} />
      )}
      {renewModalOpen && active && (
        <DashboardRenewModal app={active} token={token} onClose={() => setRenewModalOpen(false)} onDone={handlePaymentDone} />
      )}

      {/* ── KYC BANNER ─────────────────────────────────────────────────── */}
      {!kycOk && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl"
          style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.22)" }}>
          <Shield size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-300 flex-1">
            <span className="font-black uppercase tracking-wide">Verify Identity: </span>
            Verify your identity to boost your credit score and access higher loan amounts.
          </p>
          <Link to="/portal/kyc"
            className="text-[11px] font-black px-3 py-1.5 rounded-xl flex-shrink-0 whitespace-nowrap"
            style={{ background: "#F5A623", color: "#0B1F3A" }}>Verify</Link>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            {initials}
          </div>
          {kycOk && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ background: "#22c55e", borderColor: "#080d1a" }}>
              <BadgeCheck size={8} className="text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-600">Welcome back,</p>
          <p className="text-sm font-bold text-white truncate">{client.firstName} {client.lastName}</p>
        </div>
        <span className="text-[10px] font-mono text-slate-700 bg-white/5 px-2 py-1 rounded-lg">{client.clientNumber}</span>
      </div>

      {/* ── SUCCESS TOAST ──────────────────────────────────────────────── */}
      {paySuccessMsg && (
        <div className="flex items-center gap-3 mb-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)" }}>
          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">{paySuccessMsg}</p>
        </div>
      )}

      {/* ══ 1. LOAN SUMMARY ════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center py-12 rounded-2xl mb-3"
          style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
          <RefreshCw size={16} className="animate-spin text-slate-700" />
        </div>
      ) : active ? (
        <div className="rounded-2xl overflow-hidden mb-3"
          style={{ background: "#0e1625", border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : nearDue ? "rgba(245,166,35,0.3)" : "rgba(255,255,255,0.08)"}` }}>

          {(overdue || nearDue) && (
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: overdue ? "rgba(239,68,68,0.1)" : "rgba(245,166,35,0.1)" }}>
              <AlertCircle size={12} style={{ color: overdue ? "#ef4444" : "#F5A623" }} />
              <p className="text-xs font-semibold" style={{ color: overdue ? "#ef4444" : "#F5A623" }}>
                {overdue
                  ? `Payment is ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""} overdue — please contact us immediately`
                  : `Payment due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} — prepare your full payment now`}
              </p>
            </div>
          )}

          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Loan</span>
              <span className="text-[10px] font-mono text-slate-700">{active.reference}</span>
            </div>

            {/* Balance hero — shows remaining if payments exist, else totalDue */}
            <div className="mb-5">
              {isFullyPaid ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(22,163,74,0.15)", border: "2px solid rgba(22,163,74,0.4)" }}>
                    <CheckCircle size={22} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-400">FULLY PAID</p>
                    <p className="text-xs text-slate-600 mt-0.5">Congratulations — loan fully cleared!</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                    {totalPaid > 0 ? "Outstanding Balance" : "Total Amount to Pay"}
                  </p>
                  <p className="text-5xl font-black text-white" style={{ letterSpacing: "-2px", lineHeight: 1 }}>
                    {K(totalPaid > 0 ? remaining : totalDue)}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    {totalPaid > 0
                      ? `${K(totalPaid)} paid of ${K(totalDue)} total`
                      : `${K(principal)} principal + ${K(interest)} interest (${rate}%)`}
                  </p>
                </>
              )}
            </div>

            {/* Date row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CalendarDays size={11} className="text-indigo-400" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Loan Date</p>
                </div>
                <p className="text-sm font-bold text-white">
                  {new Date(subMs).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{loanDateFull.split(",")[0]}</p>
              </div>

              <div className="rounded-xl p-3"
                style={{
                  background: overdue ? "rgba(239,68,68,0.07)" : nearDue ? "rgba(245,166,35,0.07)" : "rgba(34,197,94,0.07)",
                  border: `1px solid ${overdue ? "rgba(239,68,68,0.2)" : nearDue ? "rgba(245,166,35,0.2)" : "rgba(34,197,94,0.15)"}`,
                }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CalendarClock size={11} style={{ color: overdue ? "#ef4444" : nearDue ? "#F5A623" : "#22c55e" }} />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Due Date</p>
                </div>
                <p className="text-sm font-bold text-white">{dueDateShort}</p>
                <p className="text-[10px] mt-0.5 font-semibold"
                  style={{ color: overdue ? "#ef4444" : nearDue ? "#F5A623" : "#22c55e" }}>
                  {overdue ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? "Due today" : `${daysUntilDue} days left`}
                </p>
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="rounded-xl p-3.5 mb-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">Payment Breakdown</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Loan amount (principal)</span>
                  <span className="text-slate-300 font-semibold">{K(principal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Interest ({rate}% · {termWeeks} week{termWeeks > 1 ? "s" : ""})</span>
                  <span className="text-slate-300 font-semibold">{K(interest)}</span>
                </div>
                <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="flex justify-between text-sm font-black">
                  <span className="text-white">Total Due</span>
                  <span style={{ color: "#22c55e" }}>{K(totalDue)}</span>
                </div>
                {/* Show paid & outstanding when payments exist */}
                {totalPaid > 0 && (
                  <>
                    <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-500">Amount Paid</span>
                      <span className="text-emerald-400 font-semibold">– {K(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black">
                      <span className="text-white">Outstanding Balance</span>
                      <span style={{ color: "#C9A84C" }}>{K(remaining)}</span>
                    </div>
                  </>
                )}
              </div>
              {!isFullyPaid && (
                <p className="text-[10px] text-slate-600 mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {totalPaid > 0
                    ? `Outstanding balance of ${K(remaining)} is due on ${dueDateShort}.`
                    : `Full payment of ${K(totalDue)} is due on ${dueDateShort}.`}
                </p>
              )}
            </div>

            {/* Repayment progress bar */}
            {totalPaid > 0 && !isFullyPaid && (
              <div className="mb-5">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>{Math.round((totalPaid / totalDue) * 100)}% repaid</span>
                  <span>{K(remaining)} remaining</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (totalPaid / totalDue) * 100)}%`, background: "linear-gradient(90deg,#C9A84C,#E8C96A)" }} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Link to="/portal/loans"
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 4px 14px rgba(22,163,74,0.35)" }}>
                <Receipt size={14} /> 💳 Pay Now
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/portal/loans"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <FileText size={11} /> Agreement
                </Link>
                <Link to="/portal/loans"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-indigo-400 transition-colors"
                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}>
                  <TrendingUp size={11} /> History
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl mb-3 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,20,10,1) 100%)", border: "1px solid rgba(245,166,35,0.25)" }}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.3)", color: "#F5A623" }}>
                <Sparkles size={9} /> Get funded fast
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-100 mb-1">
              Loan in <span style={{ color: "#F5A623" }}>15 Minutes</span>
            </p>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Sign up → Verify KYC → Apply → Receive funds. No queues, no paperwork, no waiting.
            </p>
            <div className="flex gap-2">
              <Link to="/portal/get-a-loan"
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all hover:opacity-90"
                style={{ background: "#F5A623", color: "#0B1F3A" }}>
                <Zap size={11} fill="#0B1F3A" /> How It Works
              </Link>
              <Link to="/portal/apply"
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all border"
                style={{ borderColor: "rgba(245,166,35,0.3)", color: "#F5A623" }}>
                Apply Now <ChevronRight size={11} />
              </Link>
            </div>
          </div>
          {/* Progress indicator */}
          <div className="flex border-t" style={{ borderColor: "rgba(245,166,35,0.12)" }}>
            {[{ t: "Create Account", done: true }, { t: "Verify KYC", done: kycOk }, { t: "Apply", done: apps.length > 0 }, { t: "Get Funded", done: disbursed > 0 }].map((s, i) => (
              <div key={i} className="flex-1 px-2 py-2 text-center">
                <div className={`text-[9px] font-semibold ${s.done ? "text-emerald-400" : "text-slate-600"}`}>
                  {s.done ? "✓ " : `${i + 1}. `}{s.t}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PENDING PAYMENT AUTO-POLL NOTICE ──────────────────────────── */}
      {apps.some(a => (a.paymentSubmissions ?? []).some(p => p.status === "PENDING")) && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-3"
          style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)" }}>
          <RefreshCw size={11} className="animate-spin flex-shrink-0" style={{ color: "#C9A84C" }} />
          <p className="text-xs" style={{ color: "rgba(201,168,76,0.75)" }}>
            Payment pending verification — balance updates automatically when confirmed.
          </p>
        </div>
      )}

      {/* ── PENDING NOTICE ─────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-3"
          style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.14)" }}>
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse flex-shrink-0" />
          <p className="text-xs text-sky-300 flex-1">
            <span className="font-semibold">{pending.length}</span> application{pending.length > 1 ? "s" : ""} under review
          </p>
          <Link to="/portal/loans" className="text-[11px] font-semibold text-sky-400">Track →</Link>
        </div>
      )}

      {/* ══ QUICK ACTIONS ══════════════════════════════════════════════════ */}
      {(active?.status === "DISBURSED" || eligibleForReloan) && (
        <div className="mb-3 rounded-2xl overflow-hidden"
          style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "4px solid #C9A84C" }}>
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Quick Actions</p>
            <p className="text-xs text-slate-400">
              {active?.status === "DISBURSED"
                ? "Active loan — make a payment or renew by paying interest only."
                : apps.some(a => a.status === "REPAID")
                ? "Loan cleared. Ready to borrow again?"
                : "No active loan. Apply today."}
            </p>
          </div>
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            {active?.status === "DISBURSED" && !isFullyPaid && (
              <>
                {/* Gold PAY LOAN */}
                <button onClick={() => setPayModalOpen(true)}
                  className="pay-loan-btn flex-1 rounded-[14px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg,#C9A84C 0%,#E8C96A 50%,#C9A84C 100%)",
                    color: "#0A1F44", padding: "14px 18px", fontSize: 14,
                    letterSpacing: "0.08em", boxShadow: "0 8px 24px rgba(201,168,76,0.40)",
                  }}>
                  <div className="flex items-center gap-2"><Wallet size={16} /> PAY LOAN</div>
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>Outstanding: {K(remaining)}</span>
                </button>

                {/* Navy RENEW LOAN */}
                <button onClick={() => setRenewModalOpen(true)}
                  className="reloan-btn flex-1 rounded-[14px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "#0A1F44", color: "#C9A84C", padding: "14px 18px", fontSize: 14,
                    letterSpacing: "0.08em", border: "2px solid #C9A84C",
                    boxShadow: "0 8px 24px rgba(10,31,68,0.30)",
                  }}>
                  <div className="flex items-center gap-2"><RotateCcw size={16} /> RENEW LOAN</div>
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.65 }}>
                    Pay {K(Math.ceil(principal * (rate / 100)))} interest only
                  </span>
                </button>
              </>
            )}
            {eligibleForReloan && (
              <button onClick={() => setReloanModalOpen(true)}
                className="reloan-btn flex-1 rounded-[14px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-all hover:-translate-y-0.5"
                style={{
                  background: "#0A1F44", color: "#C9A84C", padding: "16px 24px", fontSize: 15,
                  letterSpacing: "0.08em", border: "2px solid #C9A84C",
                  boxShadow: "0 8px 24px rgba(10,31,68,0.30)", minWidth: 200,
                }}>
                <div className="flex items-center gap-2"><RefreshCw size={18} /> RELOAN</div>
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>Borrow again — fast approval</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ 2. STAT TILES ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatTile label="KYC" value={kycOk ? "Verified" : "Pending"}
          sub={kycOk ? "Identity confirmed" : "Action required"}
          color={kycOk ? "#22c55e" : "#F5A623"} to="/portal/kyc" />
        <StatTile label="Loans" value={`${disbursed}`}
          sub={disbursed === 1 ? "loan repaid" : disbursed > 1 ? "total repaid" : "Apply today"}
          color="#818cf8" to="/portal/loans" />
        <StatTile
          label="Due Status"
          value={active ? (overdue ? "Overdue" : nearDue ? "Due Soon" : isFullyPaid ? "Paid!" : "On Track") : "—"}
          sub={active ? (overdue ? `${Math.abs(daysUntilDue)}d overdue` : isFullyPaid ? "Cleared" : `${daysUntilDue}d left`) : "No active loan"}
          color={active ? (overdue ? "#ef4444" : isFullyPaid ? "#22c55e" : nearDue ? "#F5A623" : "#22c55e") : "#475569"}
          to="/portal/loans" />
      </div>

      {/* ══ 3. CREDIT SCORE ════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Credit Score</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: meta.color + "18", color: meta.color, border: `1px solid ${meta.color}35` }}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-end gap-3 mb-3">
          <p className="text-5xl font-black" style={{ color: meta.color, letterSpacing: "-2px", lineHeight: 1 }}>{score}</p>
          <p className="text-xs text-slate-600 pb-1">/ 850</p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full"
            style={{ width: `${scorePct}%`, background: "linear-gradient(90deg,#ef4444 0%,#f97316 25%,#F5A623 55%,#4ade80 80%,#22c55e 100%)" }} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-700 mb-4">
          <span>300</span><span>Poor</span><span>Fair</span><span>Good</span><span>850</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Credit Mix</span>
              <span className="text-[10px] font-semibold" style={{ color: creditMix === "Good" ? "#22c55e" : "#F5A623" }}>{creditMix}</span>
            </div>
            <FactorBar pct={creditMix === "Good" ? 75 : creditMix === "Fair" ? 45 : 20} color={creditMix === "Good" ? "#22c55e" : "#F5A623"} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Utilization</span>
              <span className="text-[10px] font-semibold text-slate-300">{utilizationPct}%</span>
            </div>
            <FactorBar pct={utilizationPct} color={utilizationPct > 70 ? "#ef4444" : utilizationPct > 40 ? "#F5A623" : "#22c55e"} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Payment History</span>
              <span className="text-[10px] font-semibold text-slate-300">{payHistPct}%</span>
            </div>
            <FactorBar pct={payHistPct} color={payHistPct >= 80 ? "#22c55e" : "#f97316"} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Inquiries</span>
              <span className="text-[10px] font-semibold text-slate-300">{inquiries}/{Math.max(inquiries, 5)}</span>
            </div>
            <FactorBar pct={Math.min(100, inquiries * 20)} color={inquiries <= 2 ? "#22c55e" : inquiries <= 4 ? "#F5A623" : "#ef4444"} />
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Overall Score</span>
              <span className="text-[10px] font-semibold text-slate-300">{score} of 850</span>
            </div>
            <FactorBar pct={scorePct} color={meta.color} />
          </div>
        </div>
      </div>

      {/* ══ 4. HOW TO BOOST YOUR SCORE ═════════════════════════════════════ */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,166,35,0.12)" }}>
            <TrendingUp size={12} style={{ color: "#F5A623" }} />
          </div>
          <span className="text-xs font-bold text-white">How to Boost Your Credit Score</span>
        </div>
        <div className="space-y-3">
          {scoreTips.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: t.done ? t.color + "18" : "rgba(255,255,255,0.04)", border: `1px solid ${t.done ? t.color + "40" : "rgba(255,255,255,0.07)"}` }}>
                <t.icon size={10} style={{ color: t.done ? t.color : "#475569" }} />
              </div>
              <p className={`text-xs flex-1 leading-snug ${t.done ? "text-slate-500" : "text-slate-300"}`}>{t.text}</p>
              <span className="text-[9px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-md"
                style={{ background: t.color + "12", color: t.color }}>{t.impact}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 flex items-start gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <Info size={11} className="text-slate-700 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-700 leading-relaxed">
            Your score updates whenever a loan is repaid, approved, or your KYC status changes. The single biggest boost is paying in full on the due date.
          </p>
        </div>
      </div>

      {/* ══ 5. QUICK LINKS ═════════════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { to: "/portal/apply",      Icon: FileText,   label: "Apply",      c: "#4f46e5" },
          { to: "/portal/loans",      Icon: CreditCard, label: "My Loans",   c: "#059669" },
          { to: "/portal/calculator", Icon: Calculator, label: "Calculator", c: "#d97706" },
          { to: "/portal/kyc",        Icon: ShieldCheck, label: "KYC",       c: "#9333ea" },
        ].map(({ to, Icon, label, c }) => (
          <Link key={to} to={to}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl hover:scale-[1.02] transition-all"
            style={{ background: c + "0f", border: `1px solid ${c}20` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c + "18" }}>
              <Icon size={16} style={{ color: c }} />
            </div>
            <span className="text-[10px] font-semibold text-slate-500">{label}</span>
          </Link>
        ))}
      </div>

      {/* ══ 6. FINANCIAL TIP ═══════════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,166,35,0.1)" }}>
            <Sparkles size={11} style={{ color: "#F5A623" }} />
          </div>
          <span className="text-xs font-bold text-white">{tip.subject}</span>
        </div>
        <div className="flex gap-2">
          <Quote size={13} className="flex-shrink-0 mt-0.5" style={{ color: "rgba(245,166,35,0.3)" }} />
          <p className="text-xs text-slate-400 leading-relaxed">{tip.body}</p>
        </div>
      </div>

      {/* ══ 7. RECENT APPLICATIONS ═════════════════════════════════════════ */}
      {apps.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-3"
          style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">My Applications</span>
            <Link to="/portal/loans" className="text-[11px] font-semibold text-amber-500">View all</Link>
          </div>
          {apps.slice(0, 4).map((app, i) => {
            const cfg = ({
              SUBMITTED:    { label: "Submitted",    c: "#F5A623", dot: "bg-amber-400" },
              UNDER_REVIEW: { label: "Under Review", c: "#38bdf8", dot: "bg-sky-400 animate-pulse" },
              APPROVED:     { label: "Approved",     c: "#22c55e", dot: "bg-emerald-400" },
              DISBURSED:    { label: "Active",       c: "#818cf8", dot: "bg-violet-400" },
              REJECTED:     { label: "Declined",     c: "#ef4444", dot: "bg-red-400" },
              REPAID:       { label: "Repaid",       c: "#22c55e", dot: "bg-emerald-400" },
            } as Record<string, { label: string; c: string; dot: string }>)[app.status]
              ?? { label: app.status, c: "#64748b", dot: "bg-slate-500" };
            const appRate  = app.interestRate ?? TERM_RATES[app.termMonths] ?? 35;
            const appTotal = app.amountRequested * (1 + appRate / 100);
            return (
              <Link key={app.id} to="/portal/loans"
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors ${i > 0 ? "border-t border-white/[0.04]" : ""}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {app.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                    {app.reference} · {app.termMonths}w · Total: {K(appTotal)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-200">{K(app.amountRequested)}</p>
                  <span className="text-[9px] font-bold" style={{ color: cfg.c }}>{cfg.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ══ 8. LOAN PRODUCTS ═══════════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Our Products</span>
          <Link to="/portal/apply" className="text-[11px] font-semibold text-amber-500">Apply</Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.04]">
          {mockLoanProducts.filter(p => p.isActive).slice(0, 4).map((prod, i) => {
            const minRate = Math.min(...prod.rates.map(r => r.interestRate));
            const colors  = ["#4f46e5", "#059669", "#d97706", "#9333ea"];
            return (
              <Link key={prod.id} to="/portal/apply" className="p-4 hover:bg-white/[0.02] transition-colors">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: colors[i % 4] }}>
                  {prod.productType.replace(/_/g, " ")}
                </p>
                <p className="text-base font-black text-white" style={{ letterSpacing: "-0.5px" }}>
                  K{prod.maxAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">from {minRate}% · full repayment</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ══ BOTTOM NAV ═════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-xl pointer-events-auto"
          style={{ background: "rgba(8,13,26,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center justify-around px-2 py-2">
            {(
              [
                { key: "home",    Icon: Home,       label: "Home",    to: "/portal/dashboard" },
                { key: "loans",   Icon: CreditCard, label: "Loans",   to: "/portal/loans" },
                { key: "_apply" },
                { key: "alerts",  Icon: Bell,       label: "Alerts",  to: "/portal/notifications" },
                { key: "profile", Icon: User,       label: "Profile", to: "/portal/profile" },
              ] as Array<{ key: string; Icon?: React.ElementType; label?: string; to?: string }>
            ).map(item => {
              if (item.key === "_apply") {
                return (
                  <Link key="apply" to="/portal/apply"
                    className="flex flex-col items-center gap-1 -mt-5 px-3 py-3 rounded-2xl"
                    style={{ background: "#F5A623", color: "#0B1F3A", boxShadow: "0 8px 24px rgba(245,166,35,0.35)" }}>
                    <Zap size={20} />
                    <span className="text-[9px] font-black">Apply</span>
                  </Link>
                );
              }
              const isActive = tab === item.key;
              return (
                <Link key={item.key} to={item.to!}
                  onClick={() => setTab(item.key as typeof tab)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
                  style={isActive ? { color: "#F5A623" } : { color: "#475569" }}>
                  {item.Icon && <item.Icon size={18} />}
                  <span className="text-[9px] font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
