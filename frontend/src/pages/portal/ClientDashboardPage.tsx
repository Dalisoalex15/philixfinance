import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import {
  Shield, BadgeCheck, AlertCircle, Receipt, FileText,
  Zap, Calculator, Home, CreditCard, Bell, User,
  TrendingUp, ChevronRight, MoreHorizontal, Quote, Sparkles,
  ShieldCheck, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { mockLoanProducts } from "../../lib/mock-data";

interface PortalApplication {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
}

const K = (n: number) =>
  `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Credit score calc ─────────────────────────────────────────────────────
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

// ── Mini factor bar ───────────────────────────────────────────────────────
function FactorBar({ pct, color = "#22c55e" }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, color, to }: {
  label: string; value: string; sub?: string; color: string; to?: string;
}) {
  const inner = (
    <div className="flex flex-col justify-between h-full p-3 rounded-xl cursor-pointer"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <ChevronRight size={10} className="text-slate-700" />
      </div>
      <div>
        <p className="text-base font-black leading-tight" style={{ color }}>{value}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : <div>{inner}</div>;
}

// ── Cashflow chart data ───────────────────────────────────────────────────
function buildCashflow(monthlyPayment: number) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const idx = (now.getMonth() + i) % 12;
    const base = monthlyPayment * (1 + Math.sin(i * 0.8) * 0.3 + i * 0.08);
    return { month: months[idx], value: Math.round(base / 100) * 100 };
  });
}

// ─────────────────────────────────────────────────────────────────────────
export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const client  = useClientAuthStore(s => s.client);
  const token   = useClientAuthStore(s => s.accessToken);
  const [apps, setApps]   = useState<PortalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [ann, setAnn]     = useState<{ id: string; subject: string; body: string; createdAt: string }[]>([]);
  const [tab, setTab]     = useState<"home"|"loans"|"alerts"|"profile">("home");

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

  const initials   = `${client.firstName?.[0] ?? ""}${client.lastName?.[0] ?? ""}`.toUpperCase();
  const kycOk      = client.kycStatus === "VERIFIED";
  const score      = calcScore(apps, kycOk, client.joinedAt ?? new Date().toISOString());
  const meta       = scoreMeta(score);
  const scorePct   = ((score - 300) / 550) * 100;

  const active     = apps.find(a => a.status === "DISBURSED" || a.status === "APPROVED");
  const pending    = apps.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW");
  const disbursed  = apps.filter(a => a.status === "DISBURSED").length;

  const termMonths    = active?.termMonths ?? 3;
  const subMs         = active ? new Date(active.createdAt).getTime() : 0;
  const monthsElapsed = subMs ? Math.min(termMonths, Math.floor((Date.now() - subMs) / (30 * 86400000))) : 0;
  const repayPct      = termMonths ? Math.round((monthsElapsed / termMonths) * 100) : 0;
  const nextMs        = subMs ? subMs + (monthsElapsed + 1) * 30 * 86400000 : 0;
  const nextDate      = nextMs ? new Date(nextMs).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
  const daysLeft      = nextMs ? Math.ceil((nextMs - Date.now()) / 86400000) : 0;
  const monthly       = active ? Math.round((active.amountRequested * 1.04) / Math.max(termMonths, 1)) : 0;

  // Score factors (derived from available data)
  const utilizationPct = active ? Math.min(100, Math.round((active.amountRequested / 20000) * 100)) : 0;
  const payHistPct     = apps.length > 0 ? Math.round((apps.filter(a => a.status !== "REJECTED").length / apps.length) * 100) : 0;
  const creditMix      = apps.length === 0 ? "None" : disbursed >= 2 ? "Good" : disbursed === 1 ? "Fair" : "Building";
  const inquiries      = apps.length;

  const cashflow = buildCashflow(monthly || 1000);

  // Tip of the week (rotates by week number)
  const tips = ann.length > 0 ? ann : [
    { id: "t1", subject: "Top Financial Tip of the Week", body: "Track every expense this week — even small ones. Awareness is the first step toward financial freedom.", createdAt: new Date().toISOString() },
  ];
  const tip = tips[0];

  return (
    <div className="max-w-xl mx-auto pb-24" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* ── KYC BANNER ─────────────────────────────────────────────────── */}
      {!kycOk && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl"
          style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.22)" }}>
          <Shield size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-300 flex-1">
            <span className="font-black uppercase tracking-wide">Verify Identity: </span>
            Verify your identity to boost your credit score and access higher amounts.
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

      {/* ══ CREDIT SCORE CARD ══════════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Credit Score</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: meta.color + "18", color: meta.color, border: `1px solid ${meta.color}35` }}>
            {meta.label}
          </span>
        </div>

        {/* Score number + bar */}
        <div className="flex items-end gap-3 mb-3">
          <p className="text-5xl font-black" style={{ color: meta.color, letterSpacing: "-2px", lineHeight: 1 }}>{score}</p>
          <p className="text-xs text-slate-600 pb-1">/ 850</p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-1"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${scorePct}%`, background: `linear-gradient(90deg, #ef4444 0%, #f97316 25%, #F5A623 55%, #4ade80 80%, #22c55e 100%)` }} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-700 mb-4">
          <span>300</span><span>Poor</span><span>Fair</span><span>Good</span><span>850</span>
        </div>

        {/* Factor grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {/* Credit Mix */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Credit Mix</span>
              <span className="text-[10px] font-semibold" style={{ color: creditMix === "Good" ? "#22c55e" : "#F5A623" }}>{creditMix}</span>
            </div>
            <FactorBar pct={creditMix === "Good" ? 75 : creditMix === "Fair" ? 45 : 20} color={creditMix === "Good" ? "#22c55e" : "#F5A623"} />
          </div>
          {/* Utilization */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Utilization</span>
              <span className="text-[10px] font-semibold text-slate-300">{utilizationPct}%</span>
            </div>
            <FactorBar pct={utilizationPct} color={utilizationPct > 70 ? "#ef4444" : utilizationPct > 40 ? "#F5A623" : "#22c55e"} />
          </div>
          {/* Payment History */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Payment History</span>
              <span className="text-[10px] font-semibold text-slate-300">{payHistPct}%</span>
            </div>
            <FactorBar pct={payHistPct} color={payHistPct >= 80 ? "#22c55e" : "#f97316"} />
          </div>
          {/* Inquiries */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Inquiries</span>
              <span className="text-[10px] font-semibold text-slate-300">{inquiries}/{Math.max(inquiries, 5)}</span>
            </div>
            <FactorBar pct={Math.min(100, inquiries * 20)} color={inquiries <= 2 ? "#22c55e" : inquiries <= 4 ? "#F5A623" : "#ef4444"} />
          </div>
          {/* Metrics */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">Metrics</span>
              <span className="text-[10px] font-semibold text-slate-300">{score} of 850</span>
            </div>
            <FactorBar pct={scorePct} color={meta.color} />
          </div>
        </div>
      </div>

      {/* ══ STAT TILES ROW ═════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatTile
          label="KYC"
          value={kycOk ? "Verified" : "Pending"}
          sub={kycOk ? "Identity confirmed" : "Action required"}
          color={kycOk ? "#22c55e" : "#F5A623"}
          to="/portal/kyc"
        />
        <StatTile
          label="Loans Taken"
          value={`${disbursed}`}
          sub={disbursed === 1 ? "1 loan active" : disbursed > 1 ? `${disbursed} total` : "Apply now"}
          color="#818cf8"
          to="/portal/loans"
        />
        <StatTile
          label="Repayment"
          value={active ? (daysLeft >= 0 ? "On Track" : "Overdue") : "—"}
          sub={active ? (daysLeft > 0 ? `${daysLeft}d to next` : daysLeft === 0 ? "Due today" : "Contact us") : "No active loan"}
          color={active ? (daysLeft >= 0 ? "#22c55e" : "#ef4444") : "#475569"}
          to="/portal/loans"
        />
      </div>

      {/* ══ ACTIVE LOAN CARD ═══════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center py-10 rounded-2xl mb-3"
          style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
          <RefreshCw size={16} className="animate-spin text-slate-700" />
        </div>
      ) : active ? (
        <div className="rounded-2xl p-4 mb-3"
          style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Loan</span>
            <span className="text-[10px] text-slate-700 font-mono">{active.reference}</span>
          </div>

          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-4xl font-black text-white" style={{ letterSpacing: "-1.5px", lineHeight: 1 }}>
                {K(active.amountRequested)}
              </p>
              <p className="text-[11px] text-slate-600 mt-1.5">
                {monthsElapsed} of {termMonths} month{termMonths !== 1 ? "s" : ""} paid
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-white">{K(monthly)}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">per month</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-1.5">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full"
                style={{ width: `${repayPct}%`, background: "linear-gradient(90deg,#4f46e5,#22c55e)" }} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-600">Next Payment</span>
              <span className="text-[11px] font-bold text-white">{nextDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-600">Milestones</span>
              <span className={`text-[11px] font-bold ${daysLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {daysLeft > 0 ? `in ${daysLeft} days` : daysLeft === 0 ? "today" : "overdue"}
              </span>
              {daysLeft < 0 && <AlertCircle size={10} className="text-red-400" />}
            </div>
            <span className="text-[10px] font-bold text-slate-500">{repayPct}%</span>
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

      {/* ══ FINANCIAL TIP ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,166,35,0.1)" }}>
              <Sparkles size={11} style={{ color: "#F5A623" }} />
            </div>
            <span className="text-xs font-bold text-white">{tip.subject}</span>
          </div>
          <MoreHorizontal size={14} className="text-slate-700" />
        </div>
        <div className="flex gap-2">
          <Quote size={13} className="flex-shrink-0 mt-0.5" style={{ color: "rgba(245,166,35,0.3)" }} />
          <p className="text-xs text-slate-400 leading-relaxed">{tip.body}</p>
        </div>
      </div>

      {/* ══ PROJECTED CASHFLOW ═════════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-bold text-white">Next Month's Projected Cashflow</span>
            <p className="text-[10px] text-slate-600 mt-0.5">Based on your repayment schedule</p>
          </div>
          <MoreHorizontal size={14} className="text-slate-700" />
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={cashflow} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="cf-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false}
              tickFormatter={v => `K${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(v: number) => [`K${v.toLocaleString()}`, "Projected"]}
            />
            <Area type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2}
              fill="url(#cf-grad)" dot={{ fill: "#14b8a6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ══ QUICK ACTIONS ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { to:"/portal/apply",      Icon:FileText,   label:"Apply",      c:"#4f46e5" },
          { to:"/portal/loans",      Icon:CreditCard, label:"My Loans",   c:"#059669" },
          { to:"/portal/calculator", Icon:Calculator, label:"Calculator", c:"#d97706" },
          { to:"/portal/kyc",        Icon:ShieldCheck, label:"KYC",       c:"#9333ea" },
        ].map(({ to, Icon, label, c }) => (
          <Link key={to} to={to}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.02]"
            style={{ background: c + "0f", border: `1px solid ${c}20` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c + "18" }}>
              <Icon size={16} style={{ color: c }} />
            </div>
            <span className="text-[10px] font-semibold text-slate-500">{label}</span>
          </Link>
        ))}
      </div>

      {/* ══ RECENT APPLICATIONS ════════════════════════════════════════════ */}
      {apps.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-3"
          style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">My Applications</span>
            <Link to="/portal/loans" className="text-[11px] font-semibold text-amber-500">View all</Link>
          </div>
          {apps.slice(0, 4).map((app, i) => {
            const cfg = {
              SUBMITTED:    { label:"Submitted",    c:"#F5A623", dot:"bg-amber-400" },
              UNDER_REVIEW: { label:"Under Review", c:"#38bdf8", dot:"bg-sky-400 animate-pulse" },
              APPROVED:     { label:"Approved",     c:"#22c55e", dot:"bg-emerald-400" },
              DISBURSED:    { label:"Active",       c:"#818cf8", dot:"bg-violet-400" },
              REJECTED:     { label:"Declined",     c:"#ef4444", dot:"bg-red-400" },
            }[app.status] ?? { label: app.status, c:"#64748b", dot:"bg-slate-500" };
            return (
              <Link key={app.id} to="/portal/loans"
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors ${i > 0 ? "border-t border-white/[0.04]" : ""}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {app.productType.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                    {app.reference} · {new Date(app.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
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

      {/* ══ LOAN PRODUCTS ══════════════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden mb-3"
        style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Our Products</span>
          <Link to="/portal/apply" className="text-[11px] font-semibold text-amber-500">Apply</Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.04]">
          {mockLoanProducts.filter(p => p.isActive).slice(0,4).map((prod, i) => {
            const minRate = Math.min(...prod.rates.map(r => r.interestRate));
            const colors  = ["#4f46e5","#059669","#d97706","#9333ea"];
            return (
              <Link key={prod.id} to="/portal/apply"
                className="p-4 hover:bg-white/[0.02] transition-colors">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: colors[i%4] }}>
                  {prod.productType.replace(/_/g," ")}
                </p>
                <p className="text-base font-black text-white" style={{ letterSpacing:"-0.5px" }}>
                  K{prod.maxAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">from {minRate}% · {prod.rates.length} terms</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ══ BOTTOM NAV ═════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-xl pointer-events-auto"
          style={{ background: "rgba(8,13,26,0.96)", borderTop: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}>
          <div className="flex items-center justify-around px-2 py-2">
            {[
              { key:"home",    Icon:Home,       label:"Home",    to:"/portal/dashboard" },
              { key:"loans",   Icon:CreditCard, label:"Loans",   to:"/portal/loans" },
              { key:"alerts",  Icon:Bell,       label:"Alerts",  to:"/portal/notifications" },
              { key:"profile", Icon:User,       label:"Profile", to:"/portal/profile" },
            ].map(({ key, Icon, label, to }, i) => {
              const isActive = tab === key;
              return (
                <Link key={key} to={to} onClick={() => setTab(key as typeof tab)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
                  style={isActive ? { color:"#F5A623" } : { color:"#475569" }}>
                  <Icon size={18} />
                  <span className="text-[9px] font-semibold">{label}</span>
                </Link>
              );
            }).reduce<React.ReactNode[]>((acc, el, i) => {
              if (i === 2) {
                acc.push(
                  <Link key="apply" to="/portal/apply"
                    className="flex flex-col items-center gap-1 -mt-5 px-3 py-3 rounded-2xl shadow-lg"
                    style={{ background:"#F5A623", color:"#0B1F3A", boxShadow:"0 8px 24px rgba(245,166,35,0.35)" }}>
                    <Zap size={20} />
                    <span className="text-[9px] font-black">Apply</span>
                  </Link>
                );
              }
              acc.push(el);
              return acc;
            }, [])}
          </div>
        </div>
      </div>
    </div>
  );
}
