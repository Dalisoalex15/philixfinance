import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import {
  Shield, BadgeCheck, AlertCircle, Receipt, FileText,
  Zap, Calculator, Home, CreditCard, Bell, User,
  ChevronRight, Quote, Sparkles, ShieldCheck, RefreshCw,
  CheckCircle2, TrendingUp, CalendarClock, Banknote, Info,
  CalendarDays,
} from "lucide-react";
import { mockLoanProducts } from "../../lib/mock-data";

interface PortalApplication {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number; // actually weeks for short-term loans
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
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

export default function ClientDashboardPage() {
  const client = useClientAuthStore(s => s.client);
  const token  = useClientAuthStore(s => s.accessToken);
  const [apps, setApps]       = useState<PortalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [ann, setAnn]         = useState<{ id: string; subject: string; body: string; createdAt: string }[]>([]);
  const [tab, setTab]         = useState<"home" | "loans" | "alerts" | "profile">("home");

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

  if (!client) return null;

  const initials  = `${client.firstName?.[0] ?? ""}${client.lastName?.[0] ?? ""}`.toUpperCase();
  const kycOk     = client.kycStatus === "VERIFIED";
  const score     = calcScore(apps, kycOk, client.joinedAt ?? new Date().toISOString());
  const meta      = scoreMeta(score);
  const scorePct  = ((score - 300) / 550) * 100;

  const active    = apps.find(a => a.status === "DISBURSED" || a.status === "APPROVED");
  const pending   = apps.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW");
  const disbursed = apps.filter(a => a.status === "DISBURSED").length;

  // Loan financials
  const termWeeks  = active?.termMonths ?? 1;
  const rate       = TERM_RATES[termWeeks] ?? 35;
  const principal  = active?.amountRequested ?? 0;
  const interest   = principal * (rate / 100);
  const totalDue   = principal + interest;
  const subMs      = active ? new Date(active.createdAt).getTime() : 0;
  const dueMs      = subMs ? subMs + termWeeks * 7 * 86400000 : 0;
  const daysUntilDue  = dueMs ? Math.ceil((dueMs - Date.now()) / 86400000) : 0;
  const loanDateFull  = subMs ? new Date(subMs).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  const dueDateFull   = dueMs ? new Date(dueMs).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
  const dueDateShort  = dueMs ? new Date(dueMs).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const overdue    = dueMs > 0 && daysUntilDue < 0;
  const nearDue    = !overdue && daysUntilDue <= 3 && dueMs > 0;

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

  return (
    <div className="max-w-xl mx-auto pb-24" style={{ fontFamily: "system-ui, sans-serif" }}>

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

      {/* ══ 1. LOAN SUMMARY — first thing shown ════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center py-12 rounded-2xl mb-3"
          style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
          <RefreshCw size={16} className="animate-spin text-slate-700" />
        </div>
      ) : active ? (
        <div className="rounded-2xl overflow-hidden mb-3"
          style={{ background: "#0e1625", border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : nearDue ? "rgba(245,166,35,0.3)" : "rgba(255,255,255,0.08)"}` }}>

          {/* Overdue / Near-due alert strip */}
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

            {/* Total amount to pay — hero number */}
            <div className="mb-5">
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Total Amount to Pay</p>
              <p className="text-5xl font-black text-white" style={{ letterSpacing: "-2px", lineHeight: 1 }}>
                {K(totalDue)}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                {K(principal)} principal + {K(interest)} interest ({rate}%)
              </p>
            </div>

            {/* Date row: loan date → due date */}
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
                  {overdue
                    ? `${Math.abs(daysUntilDue)}d overdue`
                    : daysUntilDue === 0 ? "Due today"
                    : `${daysUntilDue} days left`}
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
              </div>
              <p className="text-[10px] text-slate-600 mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                Full payment of <span className="text-white font-semibold">{K(totalDue)}</span> is due on <span className="text-white font-semibold">{dueDateShort}</span>. The entire amount must be paid at once — partial payments are not accepted.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link to="/portal/loans"
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold text-emerald-300 transition-colors"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.18)" }}>
                <Receipt size={12} /> Submit Payment
              </Link>
              <Link to="/portal/loans"
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold text-slate-400 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <FileText size={12} /> Loan Agreement
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-6 mb-3 text-center"
          style={{ background: "#0e1625", border: "1px dashed rgba(79,70,229,0.25)" }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "rgba(79,70,229,0.1)" }}>
            <CreditCard size={20} className="text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-slate-300 mb-1">No active loan</p>
          <p className="text-xs text-slate-600 mb-4">Apply and receive funds within 24 hours</p>
          <Link to="/portal/apply"
            className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl"
            style={{ background: "#F5A623", color: "#0B1F3A" }}>
            <Zap size={12} /> Apply Now
          </Link>
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
          value={active ? (overdue ? "Overdue" : nearDue ? "Due Soon" : "On Track") : "—"}
          sub={active ? (overdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`) : "No active loan"}
          color={active ? (overdue ? "#ef4444" : nearDue ? "#F5A623" : "#22c55e") : "#475569"}
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

      {/* ══ 5. QUICK ACTIONS ═══════════════════════════════════════════════ */}
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
            } as Record<string, { label: string; c: string; dot: string }>)[app.status]
              ?? { label: app.status, c: "#64748b", dot: "bg-slate-500" };
            const appRate  = TERM_RATES[app.termMonths] ?? 35;
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
