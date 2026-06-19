import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import {
  FileText, Shield, ChevronRight, CheckCircle, Bell,
  Zap, Phone, Calculator, BadgeCheck, AlertCircle,
  Star, Quote, CreditCard, RefreshCw, ShieldCheck,
  Receipt, ArrowUpRight, Sparkles,
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

const K = (n: number) =>
  `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS: Record<string, { label: string; text: string; bg: string; dot: string }> = {
  SUBMITTED:    { label: "Submitted",    text: "text-amber-400",   bg: "bg-amber-400/10",   dot: "bg-amber-400" },
  UNDER_REVIEW: { label: "Under Review", text: "text-sky-400",     bg: "bg-sky-400/10",     dot: "bg-sky-400 animate-pulse" },
  APPROVED:     { label: "Approved",     text: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
  DISBURSED:    { label: "Active",       text: "text-violet-400",  bg: "bg-violet-400/10",  dot: "bg-violet-400" },
  REJECTED:     { label: "Declined",     text: "text-red-400",     bg: "bg-red-400/10",     dot: "bg-red-400" },
};

// ── Credit score calc ─────────────────────────────────────────────────────
function calcScore(apps: PortalApplication[], kycVerified: boolean, joinedAt: string) {
  let s = 300;
  if (kycVerified) s += 150;
  const months = Math.floor((Date.now() - new Date(joinedAt).getTime()) / (30 * 86400000));
  s += Math.min(80, months * 8);
  s += Math.min(60, apps.length * 20);
  s += Math.min(140, apps.filter(a => a.status === "APPROVED" || a.status === "DISBURSED").length * 70);
  s += Math.min(80, apps.filter(a => a.status === "DISBURSED").length * 80);
  if (apps.length > 0 && !apps.some(a => a.status === "REJECTED")) s += 100;
  return Math.min(850, Math.max(300, s));
}

function scoreMeta(s: number) {
  if (s >= 780) return { label: "Excellent",  color: "#10b981" };
  if (s >= 720) return { label: "Very Good",  color: "#34d399" };
  if (s >= 650) return { label: "Good",       color: "#F5A623" };
  if (s >= 550) return { label: "Fair",       color: "#f97316" };
  return              { label: "Building",    color: "#ef4444" };
}

// ── Score arc gauge ───────────────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const [shown, setShown] = useState(300);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const delta = score - 300;
    const steps = 60;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(Math.round(300 + (delta * i) / steps));
      if (i >= steps) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [score]);

  const meta = scoreMeta(shown);
  const pct = (shown - 300) / 550;
  const R = 72, cx = 90, cy = 90;
  const arcLen = Math.PI * R;
  const filled = pct * arcLen;
  const a = Math.PI - pct * Math.PI;
  const nx = cx + (R - 14) * Math.cos(a);
  const ny = cy - (R - 14) * Math.sin(a);

  return (
    <div className="flex items-center gap-5">
      <div className="flex-shrink-0">
        <svg viewBox="0 0 180 100" width={176} height={100}>
          <defs>
            <linearGradient id="arc-g" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#ef4444" />
              <stop offset="33%"  stopColor="#f97316" />
              <stop offset="60%"  stopColor="#F5A623" />
              <stop offset="85%"  stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"/>
          {filled > 0 && (
            <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
              fill="none" stroke="url(#arc-g)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${filled} ${arcLen}`}/>
          )}
          <line x1={cx} y1={cy} x2={nx} y2={ny}
            stroke={meta.color} strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx={cx} cy={cy} r="5" fill={meta.color}/>
          <circle cx={cx} cy={cy} r="2.5" fill="#0a1628"/>
          <text x={cx-R+2} y={cy+14} fill="rgba(100,116,139,0.5)" fontSize="7" fontWeight="600">300</text>
          <text x={cx+R-14} y={cy+14} fill="rgba(100,116,139,0.5)" fontSize="7" fontWeight="600">850</text>
        </svg>
      </div>
      <div>
        <p className="text-4xl font-black tracking-tight" style={{ color: meta.color, lineHeight: 1 }}>{shown}</p>
        <p className="text-sm font-bold mt-1" style={{ color: meta.color }}>{meta.label}</p>
        <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wide">Philix Credit Score</p>
        <div className="flex flex-wrap gap-1 mt-2.5">
          {(["Poor","Fair","Good","Excellent"] as const).map((t, i) => {
            const thresholds = [0, 550, 650, 720];
            const isActive = shown >= thresholds[i] && (i === 3 ? true : shown < thresholds[i+1]);
            return (
              <span key={t}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isActive ? "text-white" : "text-slate-700"}`}
                style={isActive ? { background: meta.color + "20", border: `1px solid ${meta.color}40` } : {}}>
                {t}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {children}
    </div>
  );
}

function SectionHead({ title, linkTo, linkLabel }: { title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className="text-[11px] font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-0.5">
          {linkLabel ?? "View all"}<ChevronRight size={10}/>
        </Link>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function ClientDashboardPage() {
  const client = useClientAuthStore(s => s.client);
  const token  = useClientAuthStore(s => s.accessToken);
  const [apps, setApps] = useState<PortalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [ann, setAnn] = useState<{ id: string; subject: string; body: string; createdAt: string }[]>([]);
  const [annIdx, setAnnIdx] = useState(0);

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
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const score     = calcScore(apps, kycOk, client.joinedAt ?? new Date().toISOString());

  const active    = apps.find(a => a.status === "DISBURSED" || a.status === "APPROVED");
  const pending   = apps.filter(a => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW");

  const termMonths    = active?.termMonths ?? 3;
  const subMs         = active ? new Date(active.createdAt).getTime() : 0;
  const monthsElapsed = subMs ? Math.min(termMonths, Math.floor((Date.now() - subMs) / (30 * 86400000))) : 0;
  const pct           = termMonths ? Math.round((monthsElapsed / termMonths) * 100) : 0;
  const nextMs        = subMs ? subMs + (monthsElapsed + 1) * 30 * 86400000 : 0;
  const nextDate      = nextMs ? new Date(nextMs).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
  const daysLeft      = nextMs ? Math.ceil((nextMs - Date.now()) / 86400000) : 0;
  const monthly       = active ? Math.round((active.amountRequested * 1.04) / Math.max(termMonths, 1)) : 0;

  const obSteps = [
    { label: "Create your account",  done: true },
    { label: "Verify your identity", done: kycOk,           href: "/portal/kyc" },
    { label: "Apply for a loan",     done: apps.length > 0, href: "/portal/apply" },
    { label: "Receive disbursement", done: apps.some(a => a.status === "DISBURSED") },
  ];

  return (
    <div className="max-w-xl mx-auto pb-16 space-y-4">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            {initials}
          </div>
          {kycOk && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ background: "#10b981", borderColor: "#050d1a" }}>
              <BadgeCheck size={8} className="text-white"/>
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-600">{greeting},</p>
          <p className="text-sm font-bold text-white truncate">{client.firstName} {client.lastName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/portal/apply"
            className="text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
            style={{ background: "#F5A623", color: "#0B1F3A" }}>
            <Zap size={11}/> Apply
          </Link>
          <Link to="/portal/notifications"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <Bell size={14} className="text-slate-500"/>
            {apps.filter(a => a.status !== "SUBMITTED").length > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"/>
            )}
          </Link>
        </div>
      </div>

      {/* ── KYC BANNER ─────────────────────────────────────────────────── */}
      {!kycOk && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.15)" }}>
          <Shield size={14} className="text-amber-400 flex-shrink-0"/>
          <p className="text-xs text-amber-300 flex-1">Verify your identity to boost your credit score and access higher amounts.</p>
          <Link to="/portal/kyc"
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: "#F5A623", color: "#0B1F3A" }}>Verify</Link>
        </div>
      )}

      {/* ── CREDIT SCORE ───────────────────────────────────────────────── */}
      <Card className="px-5 pt-5 pb-4">
        <ScoreGauge score={score}/>
        <div className="h-px bg-white/[0.05] my-4"/>
        <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
          <div className="text-center pr-3">
            <p className={`text-xs font-bold ${kycOk ? "text-emerald-400" : "text-amber-400"}`}>
              {kycOk ? "Verified" : "Pending"}
            </p>
            <p className="text-[10px] text-slate-700 mt-0.5">KYC Status</p>
          </div>
          <div className="text-center px-3">
            <p className="text-xs font-bold text-slate-300">{apps.filter(a=>a.status==="DISBURSED").length}</p>
            <p className="text-[10px] text-slate-700 mt-0.5">Loans Taken</p>
          </div>
          <div className="text-center pl-3">
            <p className={`text-xs font-bold ${!active || daysLeft >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {active ? (daysLeft >= 0 ? "On Track" : "Overdue") : "—"}
            </p>
            <p className="text-[10px] text-slate-700 mt-0.5">Repayment</p>
          </div>
        </div>
      </Card>

      {/* ── ACTIVE LOAN ────────────────────────────────────────────────── */}
      {loading ? (
        <Card className="flex items-center justify-center py-10">
          <RefreshCw size={16} className="animate-spin text-slate-700"/>
        </Card>
      ) : active ? (
        <Card>
          <div className="px-5 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Active Loan</p>
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-3xl font-black text-white" style={{ letterSpacing: "-1px" }}>
                  {K(active.amountRequested)}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {active.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} · {termMonths} months
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-white">{K(monthly)}</p>
                <p className="text-xs text-slate-600 mt-0.5">per month</p>
              </div>
            </div>

            {/* repayment progress */}
            <div className="flex justify-between text-[10px] text-slate-600 mb-1.5">
              <span>{monthsElapsed} of {termMonths} months paid</span>
              <span className="font-semibold text-slate-500">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4f46e5,#818cf8)" }}/>
            </div>

            <div className="flex items-center justify-between pb-4">
              <p className="text-[10px] text-slate-600">
                Next payment: <span className="text-slate-400 font-medium">{nextDate}</span>
              </p>
              {daysLeft > 0
                ? <span className={`text-[10px] font-semibold ${daysLeft <= 3 ? "text-amber-400" : "text-slate-500"}`}>
                    in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                  </span>
                : <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                    <AlertCircle size={9}/> Overdue
                  </span>
              }
            </div>
          </div>

          <div className="h-px bg-white/[0.05]"/>

          <div className="grid grid-cols-2 gap-2 p-3">
            <Link to="/portal/loans"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-400/10 transition-colors"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.12)" }}>
              <Receipt size={11}/> Submit Payment
            </Link>
            <Link to="/portal/loans"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <FileText size={11}/> Loan Agreement
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(79,70,229,0.1)", border: "1px solid rgba(79,70,229,0.15)" }}>
            <CreditCard size={20} className="text-indigo-400"/>
          </div>
          <p className="text-sm font-semibold text-slate-300 mb-1">No active loan</p>
          <p className="text-xs text-slate-600 mb-4">Apply and receive funds within 24 hours</p>
          <Link to="/portal/apply"
            className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl"
            style={{ background: "#F5A623", color: "#0B1F3A" }}>
            <Zap size={12}/> Apply Now
          </Link>
        </Card>
      )}

      {/* ── PENDING NOTICE ─────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.12)" }}>
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse flex-shrink-0"/>
          <p className="text-xs text-sky-300 flex-1">
            <span className="font-semibold">{pending.length}</span> application{pending.length > 1 ? "s" : ""} under review
          </p>
          <Link to="/portal/loans" className="text-[11px] font-semibold text-sky-400">Track →</Link>
        </div>
      )}

      {/* ── QUICK ACTIONS ──────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Quick Actions"/>
        <div className="grid grid-cols-4 gap-2">
          {[
            { to:"/portal/apply",      Icon:FileText,   label:"Apply",      c:"#4f46e5" },
            { to:"/portal/loans",      Icon:CreditCard, label:"My Loans",   c:"#059669" },
            { to:"/portal/calculator", Icon:Calculator, label:"Calculator", c:"#d97706" },
            { to:"/portal/kyc",        Icon:ShieldCheck,label:"KYC",        c:"#9333ea" },
          ].map(({ to, Icon, label, c }) => (
            <Link key={to} to={to}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.02]"
              style={{ background: c + "10", border: `1px solid ${c}20` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c + "18" }}>
                <Icon size={16} style={{ color: c }}/>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── APPLICATIONS ───────────────────────────────────────────────── */}
      {apps.length > 0 && (
        <div>
          <SectionHead title="My Applications" linkTo="/portal/loans"/>
          <Card>
            {apps.slice(0, 5).map((app, i) => {
              const cfg = STATUS[app.status] ?? STATUS.SUBMITTED;
              return (
                <Link key={app.id} to="/portal/loans"
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors ${i > 0 ? "border-t border-white/[0.04]" : ""}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {app.productType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                      {app.reference} · {new Date(app.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-200">{K(app.amountRequested)}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── ANNOUNCEMENTS ──────────────────────────────────────────────── */}
      {ann.length > 0 && (
        <div>
          <SectionHead title="From Philix Finance"/>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:"rgba(245,166,35,0.1)" }}>
                <Sparkles size={10} style={{ color:"#F5A623" }}/>
              </div>
              <p className="text-xs font-semibold text-white flex-1 truncate">{ann[annIdx].subject}</p>
              <p className="text-[10px] text-slate-700 flex-shrink-0">
                {new Date(ann[annIdx].createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Quote size={13} className="flex-shrink-0 mt-0.5" style={{ color:"rgba(245,166,35,0.3)" }}/>
              <p className="text-sm text-slate-400 leading-relaxed">{ann[annIdx].body}</p>
            </div>
            {ann.length > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex gap-1">
                  {ann.map((_,i) => (
                    <button key={i} onClick={() => setAnnIdx(i)}
                      className="rounded-full transition-all"
                      style={{ width: i===annIdx ? 14 : 4, height: 4, background: i===annIdx ? "#F5A623" : "rgba(255,255,255,0.1)" }}/>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setAnnIdx(i => Math.max(0,i-1))} disabled={annIdx===0}
                    className="w-6 h-6 rounded-lg text-xs text-slate-500 hover:text-slate-300 disabled:opacity-20"
                    style={{ background:"rgba(255,255,255,0.04)" }}>‹</button>
                  <button onClick={() => setAnnIdx(i => Math.min(ann.length-1,i+1))} disabled={annIdx===ann.length-1}
                    className="w-6 h-6 rounded-lg text-xs text-slate-500 hover:text-slate-300 disabled:opacity-20"
                    style={{ background:"rgba(255,255,255,0.04)" }}>›</button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── GETTING STARTED ────────────────────────────────────────────── */}
      {obSteps.filter(s => !s.done).length > 0 && (
        <div>
          <SectionHead title="Getting Started"/>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-600">{obSteps.filter(s=>s.done).length} of 4 steps complete</p>
              <p className="text-xs font-bold" style={{ color:"#F5A623" }}>{Math.round((obSteps.filter(s=>s.done).length/4)*100)}%</p>
            </div>
            <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full" style={{ width:`${(obSteps.filter(s=>s.done).length/4)*100}%`, background:"linear-gradient(90deg,#4f46e5,#F5A623)" }}/>
            </div>
            <div className="space-y-3">
              {obSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-emerald-500" : "border border-slate-800"}`}>
                    {step.done
                      ? <CheckCircle size={11} className="text-white"/>
                      : <span className="text-[9px] text-slate-700 font-bold">{i+1}</span>}
                  </div>
                  <span className={`text-xs flex-1 ${step.done ? "line-through text-slate-700" : "text-slate-400"}`}>{step.label}</span>
                  {!step.done && step.href && (
                    <Link to={step.href} className="text-[10px] font-semibold" style={{ color:"#F5A623" }}>Start →</Link>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── LOAN PRODUCTS ──────────────────────────────────────────────── */}
      <div>
        <SectionHead title="Our Products" linkTo="/portal/apply" linkLabel="Apply now"/>
        <div className="grid grid-cols-2 gap-3">
          {mockLoanProducts.filter(p => p.isActive).slice(0, 4).map((prod, i) => {
            const minRate = Math.min(...prod.rates.map(r => r.interestRate));
            const accents = ["#4f46e5","#059669","#d97706","#9333ea"];
            return (
              <Card key={prod.id} className="p-4 hover:border-white/10 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: accents[i%4] + "15", border: `1px solid ${accents[i%4]}25` }}>
                  <CreditCard size={14} style={{ color: accents[i%4] }}/>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                  {prod.productType.replace(/_/g, " ")}
                </p>
                <p className="text-xl font-black text-white" style={{ letterSpacing:"-0.5px" }}>
                  K{prod.maxAmount.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5 mb-3">Up to · from {minRate}%</p>
                <Link to="/portal/apply"
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
                  style={{ color: accents[i%4] }}>
                  Apply <ArrowUpRight size={9}/>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── LOYALTY CARD ───────────────────────────────────────────────── */}
      <Card className="px-5 py-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:"rgba(245,166,35,0.08)", border:"1px solid rgba(245,166,35,0.12)" }}>
          <Star size={15} style={{ color:"#F5A623" }}/>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-300">
            {active ? "Loyal Client Benefit" : "First-Time Borrower Offer"}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {active
              ? "Repay on time to unlock lower rates and higher limits on your next loan."
              : "New clients enjoy reduced fees on their first loan."}
          </p>
        </div>
      </Card>

      {/* ── SUPPORT ────────────────────────────────────────────────────── */}
      <a href="tel:+260777158901"
        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs text-slate-600 hover:text-slate-500 transition-colors"
        style={{ border:"1px solid rgba(255,255,255,0.05)" }}>
        <Phone size={12}/> +260 777 158 901 · Customer Support
      </a>
    </div>
  );
}
