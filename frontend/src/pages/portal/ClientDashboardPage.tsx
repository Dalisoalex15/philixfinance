import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import {
  CreditCard, FileText, Shield, ChevronRight, TrendingUp, Clock,
  CheckCircle, Bell, Wallet, Zap, Phone, Calculator, BadgeCheck,
  ListChecks, Gift, Star, AlertCircle, ArrowRight, Sparkles,
  ShieldCheck, Receipt, RefreshCw, Quote,
} from "lucide-react";
import { mockLoanProducts } from "../../lib/mock-data";

interface PortalApplication {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number;
  purpose?: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
}

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  SUBMITTED:    { label: "Submitted",    color: "text-amber-400",   bg: "bg-amber-900/30 border-amber-700/40",   dot: "bg-amber-400" },
  UNDER_REVIEW: { label: "Under Review", color: "text-blue-400",    bg: "bg-blue-900/30 border-blue-700/40",     dot: "bg-blue-400 animate-pulse" },
  APPROVED:     { label: "Approved",     color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-700/40", dot: "bg-emerald-400" },
  DISBURSED:    { label: "Disbursed",    color: "text-indigo-400",  bg: "bg-indigo-900/30 border-indigo-700/40", dot: "bg-indigo-400" },
  REJECTED:     { label: "Not Approved", color: "text-red-400",     bg: "bg-red-900/30 border-red-700/40",       dot: "bg-red-400" },
};

// Circular progress SVG
function CircularProgress({ pct, size = 80, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#prog-grad)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <defs>
        <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Premium loan card (credit-card style)
function LoanCard({ app, pct, monthlyPayment, daysToNext, nextPaymentDate, termMonths, monthsElapsed }: {
  app: PortalApplication; pct: number; monthlyPayment: number;
  daysToNext: number; nextPaymentDate: string; termMonths: number; monthsElapsed: number;
}) {
  const productLabel = app.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const overdue = daysToNext < 0;
  const nearDue = daysToNext >= 0 && daysToNext <= 3;

  return (
    <div className="relative overflow-hidden rounded-2xl p-6"
      style={{ background: "linear-gradient(135deg, #0f1f3d 0%, #1a1155 50%, #0e1f3a 100%)" }}>
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #F5A623 0%, transparent 70%)" }} />
      <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }} />

      {/* Card header */}
      <div className="relative flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#F5A623", opacity: 0.8 }}>
            {productLabel}
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{app.reference}</p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[app.status]?.bg ?? ""} ${STATUS_CONFIG[app.status]?.color ?? ""}`}>
          {STATUS_CONFIG[app.status]?.label ?? app.status}
        </span>
      </div>

      {/* Amount */}
      <div className="relative mb-6">
        <p className="text-xs text-slate-500 mb-1">Loan Amount</p>
        <p className="text-4xl font-black text-white tracking-tight">{K(app.amountRequested)}</p>
        <p className="text-xs text-slate-500 mt-1">{termMonths} month term</p>
      </div>

      {/* Progress + stats row */}
      <div className="relative flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <CircularProgress pct={pct} size={72} stroke={6} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-black text-white">{pct}%</div>
              <div className="text-[8px] text-slate-500">elapsed</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Monthly Repayment</p>
            <p className="text-lg font-bold text-white">{K(monthlyPayment)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Next Payment</p>
            <p className={`text-sm font-semibold ${overdue ? "text-red-400" : nearDue ? "text-amber-400" : "text-slate-200"}`}>
              {nextPaymentDate
                ? new Date(nextPaymentDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                : "—"}
              {" "}
              <span className="text-[10px] font-normal opacity-70">
                {overdue ? `${Math.abs(daysToNext)}d overdue` : daysToNext === 0 ? "today" : `in ${daysToNext}d`}
              </span>
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Progress</p>
          <p className="text-xs text-slate-400">{monthsElapsed}<span className="text-slate-600"> / {termMonths}</span></p>
          <p className="text-[10px] text-slate-600">months</p>
        </div>
      </div>

      {/* Overdue warning */}
      {overdue && (
        <div className="relative mt-4 flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-xl px-3 py-2">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">Payment is overdue. Please contact us immediately.</p>
        </div>
      )}

      {/* Near due warning */}
      {!overdue && nearDue && (
        <div className="relative mt-4 flex items-center gap-2 bg-amber-900/30 border border-amber-700/40 rounded-xl px-3 py-2">
          <Clock size={13} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">Payment due in {daysToNext} day{daysToNext !== 1 ? "s" : ""} — plan your payment now.</p>
        </div>
      )}

      {/* Bottom row */}
      <div className="relative mt-5 flex items-center justify-between">
        <Link to="/portal/loans"
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
          View full details <ArrowRight size={12} />
        </Link>
        <Link to="/portal/loans"
          className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition-all">
          <Receipt size={11} /> Pay Now
        </Link>
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  const client = useClientAuthStore(s => s.client);
  const accessToken = useClientAuthStore(s => s.accessToken);
  const [myApplications, setMyApplications] = useState<PortalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<{ id: string; subject: string; body: string; createdAt: string }[]>([]);
  const [annIdx, setAnnIdx] = useState(0);

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    const h = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      fetch("/api/portal/applications", { headers: h }).then(r => r.ok ? r.json() : []),
      fetch("/api/portal/notifications/announcements", { headers: h }).then(r => r.ok ? r.json() : []),
    ])
      .then(([apps, anns]) => {
        setMyApplications(Array.isArray(apps) ? apps : []);
        setAnnouncements(Array.isArray(anns) ? anns : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!client) return null;

  const initials = `${client.firstName?.[0] ?? ""}${client.lastName?.[0] ?? ""}`.toUpperCase();
  const activeLoanApp = myApplications.find(a => a.status === "DISBURSED" || a.status === "APPROVED");
  const hasActiveLoan = !!activeLoanApp;
  const pendingApps = myApplications.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW");
  const unreadCount = myApplications.filter(a => a.status !== "SUBMITTED").length;
  const kycVerified = client.kycStatus === "VERIFIED";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const termMonths = activeLoanApp?.termMonths ?? 3;
  const submittedMs = activeLoanApp ? (new Date(activeLoanApp.createdAt).getTime() || 0) : 0;
  const monthsElapsed = submittedMs > 0
    ? Math.min(termMonths, Math.floor((Date.now() - submittedMs) / (30 * 86400000)))
    : 0;
  const pct = termMonths > 0 ? Math.round((monthsElapsed / termMonths) * 100) : 0;
  const nextPaymentMs = submittedMs > 0 ? submittedMs + (monthsElapsed + 1) * 30 * 86400000 : 0;
  const nextPaymentDate = nextPaymentMs > 0 ? new Date(nextPaymentMs).toISOString().slice(0, 10) : "";
  const daysToNext = nextPaymentDate
    ? Math.ceil((new Date(nextPaymentDate).getTime() - Date.now()) / 86400000)
    : 0;
  const monthlyPayment = activeLoanApp
    ? Math.round((activeLoanApp.amountRequested * 1.04 * termMonths) / Math.max(termMonths, 1))
    : 0;

  const onboardingSteps = [
    { label: "Create your account", done: true },
    { label: "Verify your identity (KYC)", done: kycVerified, href: "/portal/kyc" },
    { label: "Apply for your first loan", done: myApplications.length > 0, href: "/portal/apply" },
    { label: "Receive disbursement", done: myApplications.some(a => a.status === "DISBURSED") },
  ];
  const onboardingDone = onboardingSteps.filter(s => s.done).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl"
        style={{ background: "linear-gradient(135deg, #0B1F3A 0%, #0f2d4a 60%, #1a1155 100%)", minHeight: 180 }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 20%, #F5A623 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle at 20% 80%, #6366f1 0%, transparent 60%)" }} />

        <div className="relative p-6 pb-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                {initials}
              </div>
              {kycVerified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                  <BadgeCheck size={10} className="text-white" />
                </div>
              )}
            </div>

            {/* Name + number */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">{greeting},</p>
              <h1 className="text-xl font-black text-white truncate">{client.firstName} {client.lastName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                  {client.clientNumber}
                </span>
                {kycVerified ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-700/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BadgeCheck size={8} /> KYC Verified
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
                    Verify ID
                  </span>
                )}
              </div>
            </div>

            {/* Apply button */}
            <Link to="/portal/apply"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex-shrink-0 transition-all hover:opacity-90"
              style={{ background: "#F5A623", color: "#0B1F3A" }}>
              <Zap size={13} /> Apply Now
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                label: "Total Applied",
                value: myApplications.length > 0 ? `K${myApplications.reduce((s, a) => s + a.amountRequested, 0).toLocaleString()}` : "—",
                sub: `${myApplications.length} application${myApplications.length !== 1 ? "s" : ""}`,
                color: "text-indigo-300",
              },
              {
                label: "Active Loan",
                value: activeLoanApp ? K(activeLoanApp.amountRequested) : "None",
                sub: activeLoanApp ? activeLoanApp.status : "Apply today",
                color: activeLoanApp ? "text-amber-300" : "text-slate-400",
              },
              {
                label: "Notifications",
                value: unreadCount > 0 ? String(unreadCount) : "0",
                sub: "loan updates",
                color: unreadCount > 0 ? "text-red-400" : "text-slate-400",
              },
            ].map(s => (
              <div key={s.label}
                className="rounded-2xl px-3 py-2.5 text-center"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
                <p className="text-[8px] text-slate-700 leading-tight">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KYC ALERT ── */}
      {!kycVerified && (
        <div className="flex items-center gap-4 rounded-2xl p-4"
          style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.15), rgba(120,53,15,0.1))", border: "1px solid rgba(217,119,6,0.3)" }}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-300">Complete your identity verification</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload your NRC to unlock full loan access and higher limits</p>
          </div>
          <Link to="/portal/kyc"
            className="flex-shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-all hover:opacity-90"
            style={{ background: "#F5A623", color: "#0B1F3A" }}>
            Verify
          </Link>
        </div>
      )}

      {/* ── PENDING REVIEW PILLS ── */}
      {pendingApps.length > 0 && (
        <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-700/30 rounded-2xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
          <p className="text-sm text-blue-300 flex-1">
            <span className="font-bold">{pendingApps.length}</span> application{pendingApps.length > 1 ? "s" : ""} being reviewed by our team
          </p>
          <Link to="/portal/loans" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
            Track <ChevronRight size={11} />
          </Link>
        </div>
      )}

      {/* ── ACTIVE LOAN CARD ── */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-600">
          <RefreshCw size={18} className="animate-spin mr-2" /> Loading your loan…
        </div>
      ) : hasActiveLoan && activeLoanApp ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Loan</h2>
            <Link to="/portal/loans" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
              Manage <ChevronRight size={11} />
            </Link>
          </div>
          <LoanCard
            app={activeLoanApp} pct={pct} monthlyPayment={monthlyPayment}
            daysToNext={daysToNext} nextPaymentDate={nextPaymentDate}
            termMonths={termMonths} monthsElapsed={monthsElapsed}
          />
        </div>
      ) : (
        /* No loan empty state */
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center"
          style={{ background: "rgba(15,23,42,0.6)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.2), rgba(99,102,241,0.1))" }}>
            <CreditCard size={24} className="text-indigo-400" />
          </div>
          <p className="font-bold text-slate-300 mb-1">No active loan</p>
          <p className="text-xs text-slate-600 mb-5 max-w-xs mx-auto">
            Apply for your first loan and manage everything from this dashboard.
          </p>
          <Link to="/portal/apply"
            className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:opacity-90"
            style={{ background: "#F5A623", color: "#0B1F3A" }}>
            <FileText size={14} /> Apply for a Loan
          </Link>
        </div>
      )}

      {/* ── ANNOUNCEMENTS FROM PHILIX ── */}
      {announcements.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">From Philix Finance</h2>
          <div className="relative overflow-hidden rounded-2xl"
            style={{ background: "linear-gradient(135deg, #0B1F3A 0%, #0f1f40 60%, #1a1155 100%)", border: "1px solid rgba(245,166,35,0.22)" }}>
            {/* Gold glow */}
            <div className="absolute top-0 right-0 w-48 h-48 opacity-15 pointer-events-none"
              style={{ background: "radial-gradient(circle at 90% 10%, #F5A623 0%, transparent 65%)" }} />
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,166,35,0.15)" }}>
                  <Sparkles size={14} style={{ color: "#F5A623" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">From Philix Finance</p>
                  <p className="text-xs font-bold text-white">{announcements[annIdx].subject}</p>
                </div>
                <div className="text-[9px] text-slate-600">
                  {new Date(announcements[annIdx].createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>

              {/* Quote body */}
              <div className="flex gap-3 mb-4">
                <Quote size={20} className="flex-shrink-0 mt-0.5 opacity-20" style={{ color: "#F5A623" }} />
                <p className="text-sm text-slate-300 leading-relaxed italic">{announcements[annIdx].body}</p>
              </div>

              {/* Navigation dots */}
              {announcements.length > 1 && (
                <div className="flex items-center gap-2">
                  {announcements.map((_, i) => (
                    <button key={i} onClick={() => setAnnIdx(i)}
                      className="transition-all rounded-full"
                      style={{
                        width: i === annIdx ? 20 : 6, height: 6,
                        background: i === annIdx ? "#F5A623" : "rgba(255,255,255,0.15)",
                      }} />
                  ))}
                  <div className="ml-auto flex gap-1.5">
                    <button onClick={() => setAnnIdx(i => Math.max(0, i - 1))}
                      disabled={annIdx === 0}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"
                      style={{ background: "rgba(255,255,255,0.06)" }}>‹</button>
                    <button onClick={() => setAnnIdx(i => Math.min(announcements.length - 1, i + 1))}
                      disabled={annIdx === announcements.length - 1}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"
                      style={{ background: "rgba(255,255,255,0.06)" }}>›</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { to: "/portal/apply",      icon: FileText,    label: "Apply",      grad: "from-indigo-600 to-violet-700",  shadow: "rgba(99,102,241,0.3)" },
            { to: "/portal/loans",      icon: CreditCard,  label: "My Loans",   grad: "from-emerald-600 to-teal-700",  shadow: "rgba(16,185,129,0.3)" },
            { to: "/portal/calculator", icon: Calculator,  label: "Calculator", grad: "from-amber-500 to-orange-600",  shadow: "rgba(245,158,11,0.3)" },
            { to: "/portal/kyc",        icon: ShieldCheck, label: "KYC",        grad: "from-rose-600 to-pink-700",     shadow: "rgba(244,63,94,0.3)" },
          ].map(a => (
            <Link key={a.to} to={a.to}
              className={`bg-gradient-to-br ${a.grad} rounded-2xl p-3 flex flex-col items-center gap-2 text-center transition-all hover:opacity-90 hover:scale-105`}
              style={{ boxShadow: `0 4px 16px ${a.shadow}` }}>
              <a.icon size={20} className="text-white/90" />
              <span className="text-[10px] font-bold text-white leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── APPLICATION TIMELINE ── */}
      {myApplications.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">My Applications</h2>
            <Link to="/portal/loans" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
              View all <ChevronRight size={11} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {myApplications.slice(0, 3).map(app => {
              const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.SUBMITTED;
              return (
                <Link key={app.id} to="/portal/loans"
                  className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all hover:border-slate-600"
                  style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(30,41,59,1)" }}>
                  <div className="flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {app.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">{app.reference}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-200">{K(app.amountRequested)}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-slate-700 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ONBOARDING CHECKLIST (new clients only) ── */}
      {!hasActiveLoan && onboardingDone < 4 && (
        <div className="rounded-2xl p-5" style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(30,41,59,1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ListChecks size={15} className="text-indigo-400" />
            <span className="text-sm font-bold text-slate-300">Getting Started</span>
            <span className="ml-auto text-xs font-bold" style={{ color: "#F5A623" }}>{onboardingDone}/4</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 mb-4 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(onboardingDone / 4) * 100}%`, background: "linear-gradient(90deg, #4f46e5, #F5A623)" }} />
          </div>
          <div className="space-y-2">
            {onboardingSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border transition-all ${s.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-700 text-slate-600"}`}>
                  {s.done ? <CheckCircle size={11} /> : i + 1}
                </div>
                <span className={`text-sm flex-1 ${s.done ? "line-through text-slate-600" : "text-slate-300"}`}>{s.label}</span>
                {!s.done && s.href && (
                  <Link to={s.href} className="text-[10px] font-bold flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                    style={{ color: "#F5A623" }}>
                    Start <ChevronRight size={10} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOAN PRODUCTS GRID ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Our Products</h2>
          <Link to="/portal/apply" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
            Apply <ChevronRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mockLoanProducts.filter(p => p.isActive).map((prod, i) => {
            const grads = [
              "linear-gradient(135deg, #1e1b4b, #312e81)",
              "linear-gradient(135deg, #064e3b, #065f46)",
              "linear-gradient(135deg, #451a03, #78350f)",
              "linear-gradient(135deg, #4a044e, #6b21a8)",
            ];
            const accentColors = ["#818cf8", "#34d399", "#fbbf24", "#c084fc"];
            const grad = grads[i % grads.length];
            const accent = accentColors[i % accentColors.length];
            const lowestRate = Math.min(...prod.rates.map(r => r.interestRate));

            return (
              <div key={prod.id} className="relative overflow-hidden rounded-2xl p-4"
                style={{ background: grad, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute right-2 top-2 opacity-[0.07]">
                  <Wallet size={52} />
                </div>
                <div className="relative">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: accent, opacity: 0.9 }}>
                    {prod.productType.replace(/_/g, " ")}
                  </p>
                  <p className="text-lg font-black text-white mb-0.5">
                    K{prod.maxAmount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mb-3">Up to · from {lowestRate}%/mo</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {prod.rates.filter(r => r.isActive).slice(0, 2).map(r => (
                      <span key={r.id} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.1)", color: accent }}>
                        {r.displayLabel}
                      </span>
                    ))}
                  </div>
                  <Link to="/portal/apply"
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>
                    Apply <ArrowRight size={9} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── NOTIFICATIONS SHORTCUT ── */}
      <Link to="/portal/notifications"
        className="flex items-center gap-4 rounded-2xl px-4 py-4 transition-all hover:border-slate-600 group"
        style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(30,41,59,1)" }}>
        <div className="relative w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
          <Bell size={16} className="text-indigo-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-300">Notifications</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} update${unreadCount > 1 ? "s" : ""} on your account` : "No new notifications"}
          </p>
        </div>
        <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
      </Link>

      {/* ── LOYALTY / PROMO BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, rgba(120,53,15,0.3), rgba(180,83,9,0.15))", border: "1px solid rgba(245,166,35,0.2)" }}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-10 pointer-events-none">★</div>
        <div className="relative flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(245,166,35,0.15)" }}>
            {hasActiveLoan ? <Star size={18} style={{ color: "#F5A623" }} /> : <Gift size={18} style={{ color: "#F5A623" }} />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "#F5A623" }}>
              {hasActiveLoan ? "Loyal Client Benefit" : "First-Time Borrower Offer"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasActiveLoan
                ? "Repay on time to unlock lower rates and higher limits on your next loan."
                : "New clients enjoy reduced processing fees on their first loan. Apply today!"}
            </p>
          </div>
        </div>
      </div>

      {/* ── TIPS (new clients) ── */}
      {!hasActiveLoan && (
        <div className="rounded-2xl p-4"
          style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(30,41,59,1)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tips for faster approval</span>
          </div>
          <ul className="space-y-2">
            {[
              "Upload a clear photo of your NRC (front and back)",
              "Provide your employer details and latest payslip",
              "Applications submitted before 2 PM are reviewed same day",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-indigo-900/50 text-indigo-400 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── MOBILE CTA ── */}
      <div className="sm:hidden space-y-2.5">
        <Link to="/portal/apply"
          className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-sm shadow-lg transition-all hover:opacity-90"
          style={{ background: "#F5A623", color: "#0B1F3A" }}>
          <Zap size={15} /> Apply for a New Loan
        </Link>
        <a href="tel:+260777158901"
          className="w-full flex items-center justify-center gap-2 text-slate-400 py-3.5 rounded-2xl text-sm font-semibold border transition-all"
          style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(30,41,59,1)" }}>
          <Phone size={14} /> +260 777 158 901 — Need help?
        </a>
      </div>
    </div>
  );
}
