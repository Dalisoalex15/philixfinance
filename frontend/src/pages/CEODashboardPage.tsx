import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle, Users,
  Zap, ArrowUpRight, Crown, Clock, XCircle, Activity, FileText,
  ThumbsUp, ThumbsDown, Banknote, RefreshCw,
} from "lucide-react";
import {
  mockKPIs, mockCapitalUtilization, mockPAR, mockTopOfficers,
  mockCampusPerformance,
  mockRepaymentTrend, mockMonthlyDisbursements, formatKwacha,
} from "../lib/mock-data";
import { useLoanApplicationStore } from "../store/loanApplicationStore";
import { staffApi } from "../lib/api";

interface ActivityEvent {
  id: string;
  type: string;
  client: string;
  ref: string;
  amount: number;
  description: string;
  timestamp: string;
}

const EVENT_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  APPLICATION_SUBMITTED: { icon: FileText,    color: "text-blue-700",    bg: "bg-blue-100" },
  APPLICATION_REVIEWING: { icon: Clock,       color: "text-amber-700",   bg: "bg-amber-100" },
  APPLICATION_APPROVED:  { icon: ThumbsUp,    color: "text-emerald-700", bg: "bg-emerald-100" },
  APPLICATION_REJECTED:  { icon: ThumbsDown,  color: "text-red-700",     bg: "bg-red-100" },
  LOAN_DISBURSED:        { icon: Banknote,    color: "text-indigo-700",  bg: "bg-indigo-100" },
  APPLICATION_UPDATED:   { icon: RefreshCw,   color: "text-navy-600",    bg: "bg-navy-100" },
};

const profitData = mockMonthlyDisbursements.map((m) => ({
  month: m.month.split(" ")[0],
  revenue: m.amount * 0.18,
  expenses: m.amount * 0.04 + 57000,
  profit: m.amount * 0.14 - 57000,
}));

export default function CEODashboardPage() {
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const { applications, syncFromApi, updateStatus } = useLoanApplicationStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [liveActivity, setLiveActivity] = useState<ActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [clockTime, setClockTime] = useState(new Date());
  const [portalSummary, setPortalSummary] = useState({ totalPortalAccounts: 0, pendingApplications: 0, submittedToday: 0, approvedToday: 0 });

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [actRes, sumRes] = await Promise.all([
        fetch("/api/admin/activity", { headers }),
        fetch("/api/admin/summary", { headers }),
      ]);
      if (actRes.ok) setLiveActivity(await actRes.json());
      if (sumRes.ok) setPortalSummary(await sumRes.json());
    } catch {
      // fall back to store-derived events below
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    syncFromApi();
    fetchActivity();
    const activityInterval = setInterval(() => { syncFromApi(); fetchActivity(); }, 30000);
    const clockInterval = setInterval(() => setClockTime(new Date()), 1000);
    return () => { clearInterval(activityInterval); clearInterval(clockInterval); };
  }, [fetchActivity]);

  const pendingApps = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");

  async function handleAction(id: string, action: "APPROVED" | "REJECTED") {
    setActionLoading(id);
    try {
      await staffApi.updateApplicationStatus(id, action);
      updateStatus(id, action);
      await syncFromApi();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  const monthlyInterest = mockMonthlyDisbursements[11].amount * 0.18;
  const monthlyExpenses = 58820;
  const netProfit = monthlyInterest - monthlyExpenses;

  return (
    <div className="space-y-6">
      {/* CEO Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown size={18} className="text-gold-500" />
            <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">CEO Dashboard</span>
          </div>
          <h1 className="page-title text-3xl">{greeting}, Daliso.</h1>
          <p className="text-navy-600 mt-1">
            Here's how Philix Finance is performing right now —{" "}
            <span className="text-emerald-600 font-medium">
              {today.toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-4xl font-bold font-mono text-navy-900">
            {clockTime.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-xs text-navy-600 mt-1 flex items-center justify-end gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            LIVE · CAT
          </div>
        </div>
      </div>

      {/* Critical KPIs — "In 30 seconds" */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Today's Collections", value: formatKwacha(24500), sub: "From 12 payments",
            icon: DollarSign, color: "emerald", change: "+K3,200 vs yesterday",
          },
          {
            label: "Outstanding Balance", value: formatKwacha(mockKPIs.totalOutstanding), sub: "Across 287 active loans",
            icon: TrendingUp, color: "indigo", change: `${mockKPIs.activeLoans} loans active`,
          },
          {
            label: "Default Rate", value: `${mockKPIs.defaultRate}%`, sub: "Industry avg: 5.0%",
            icon: AlertTriangle, color: mockKPIs.defaultRate < 5 ? "emerald" : "amber",
            change: `${mockKPIs.defaultedLoans} defaulted loans`,
          },
          {
            label: "Capital Utilization", value: `${mockCapitalUtilization.utilizationPct}%`, sub: formatKwacha(mockCapitalUtilization.availableCapital) + " free",
            icon: Zap, color: "indigo", change: `${formatKwacha(mockCapitalUtilization.capitalLoaned)} deployed`,
          },
          {
            label: "Portal Applications", value: String(portalSummary.pendingApplications || pendingApps.length),
            sub: `${portalSummary.submittedToday} submitted today`,
            icon: Users, color: portalSummary.pendingApplications > 0 ? "amber" : "emerald",
            change: `${portalSummary.totalPortalAccounts} client accounts`,
          },
        ].map((card) => (
          <div key={card.label} className="philix-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${
                card.color === "emerald" ? "bg-emerald-100 text-emerald-700" :
                card.color === "amber" ? "bg-amber-100 text-amber-700" :
                "bg-navy-100 text-navy-700"
              }`}>
                <card.icon size={18} />
              </div>
              <ArrowUpRight size={14} className="text-navy-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-navy-900">{card.value}</div>
            <div className="text-xs text-navy-600 mt-1 font-medium">{card.label}</div>
            <div className="text-xs text-navy-600 mt-0.5">{card.sub}</div>
            <div className="text-xs text-emerald-600 mt-2 font-medium">{card.change}</div>
          </div>
        ))}
      </div>

      {/* Pending Portal Applications */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Pending Loan Applications
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">Online portal submissions awaiting review</p>
          </div>
          {pendingApps.length > 0 && (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingApps.length} pending
            </span>
          )}
        </div>

        {pendingApps.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-700 font-medium">All caught up — no pending applications right now.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApps.map(app => (
              <div key={app.id} className="flex items-center justify-between p-4 bg-warm-50 border border-warm-200 rounded-xl hover:border-gold-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-navy-900">{app.clientName}</span>
                    <span className="text-xs text-navy-500">·</span>
                    <span className="text-xs text-navy-600 font-mono">{app.ref}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      app.status === "UNDER_REVIEW"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {app.status === "UNDER_REVIEW" ? "Under Review" : "Pending"}
                    </span>
                  </div>
                  <div className="text-xs text-navy-600 mt-1">
                    <span className="font-medium text-navy-700">{app.productName}</span>
                    {" · "}
                    <span className="font-mono font-semibold text-navy-800">{formatKwacha(app.amount)}</span>
                    {" · "}
                    {app.rateDuration}
                    {app.purpose && <span> · {app.purpose}</span>}
                  </div>
                  <div className="text-xs text-navy-500 mt-0.5">
                    {app.clientEmail}
                    {" · Submitted "}
                    {new Date(app.submittedAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  {app.collateralPhotos && app.collateralPhotos.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {app.collateralPhotos.slice(0, 4).map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                          <img src={src} alt={`Collateral ${i + 1}`} className="w-12 h-12 object-cover rounded-lg border border-warm-300 hover:border-gold-400 transition-colors" />
                        </a>
                      ))}
                      {app.collateralPhotos.length > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-warm-100 border border-warm-300 flex items-center justify-center text-xs font-semibold text-navy-600">
                          +{app.collateralPhotos.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleAction(app.id, "APPROVED")}
                    disabled={actionLoading === app.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(app.id, "REJECTED")}
                    disabled={actionLoading === app.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "Interest Revenue This Month", value: formatKwacha(monthlyInterest), color: "text-emerald-700", detail: "18% avg. interest rate" },
          { label: "Operating Expenses", value: formatKwacha(monthlyExpenses), color: "text-red-600", detail: "Salaries, rent, utilities" },
          { label: "Net Profit This Month", value: formatKwacha(netProfit), color: "text-navy-900", detail: `${((netProfit / monthlyInterest) * 100).toFixed(1)}% profit margin` },
        ].map((f) => (
          <div key={f.label} className="philix-card p-5 flex items-center gap-4">
            <div className="flex-1">
              <div className={`text-2xl font-bold font-mono ${f.color}`}>{f.value}</div>
              <div className="text-sm font-medium text-navy-700 mt-1">{f.label}</div>
              <div className="text-xs text-navy-600 mt-0.5">{f.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Profit Trend + Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Monthly P&L</h3>
            <p className="text-xs text-navy-600">Revenue, expenses & net profit trend</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={profitData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A227" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
              <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `K${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatKwacha(v)} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" fill="url(#revGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#C9A227" fill="url(#profGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* PAR Gauge */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Portfolio at Risk (PAR)</h3>
            <p className="text-xs text-navy-600">CGAP microfinance health indicators</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {mockPAR.map((p) => (
              <div key={p.days} className="text-center p-3 bg-warm-50 border border-warm-200 rounded-xl">
                <div className={`text-2xl font-bold font-mono ${
                  p.percentage > 15 ? "text-red-600" : p.percentage > 8 ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {p.percentage}%
                </div>
                <div className="text-xs font-semibold text-navy-600 mt-1">PAR {p.days}+</div>
                <div className="text-xs text-navy-600">{p.count} loans</div>
                <div className="text-xs font-mono text-navy-500 mt-1">{formatKwacha(p.amount)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-warm-200">
            <div className="text-xs text-navy-500 font-medium mb-2">Risk Classification Guide</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "Healthy", range: "< 5%", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Watch", range: "5–10%", color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Critical", range: "> 10%", color: "text-red-600", bg: "bg-red-50" },
              ].map((g) => (
                <div key={g.label} className={`text-center p-2 rounded-lg ${g.bg}`}>
                  <div className={`font-bold ${g.color}`}>{g.range}</div>
                  <div className="text-navy-600">{g.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Collectors + Projected */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Collectors */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Top Collectors — This Month</h3>
            <p className="text-xs text-navy-600">Collection performance leaderboard</p>
          </div>
          <div className="space-y-4">
            {mockTopOfficers.map((officer, i) => (
              <div key={officer.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? "bg-gold-500 text-navy-950" :
                  i === 1 ? "bg-warm-300 text-navy-700" :
                  i === 2 ? "bg-orange-100 text-orange-700" : "bg-warm-100 text-navy-600"
                }`}>
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-navy-800">{officer.name}</span>
                    <span className="text-sm font-bold text-emerald-700">{formatKwacha(officer.totalCollected)}</span>
                  </div>
                  <div className="h-1.5 bg-warm-200 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${officer.collectionRate}%`,
                        backgroundColor: i === 0 ? "#C9A227" : i === 1 ? "#94a3b8" : "#0B1F3A",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-navy-600 mt-0.5">
                    <span>{officer.loansIssued} loans</span>
                    <span>{officer.collectionRate}% rate</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projected Numbers */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Projected Metrics</h3>
            <p className="text-xs text-navy-600">Based on current trajectory</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Expected Collections This Month", value: formatKwacha(mockKPIs.totalCollected * 0.28), sub: "Based on active schedules", color: "text-emerald-700" },
              { label: "Projected Month-End Outstanding", value: formatKwacha(mockKPIs.totalOutstanding - mockKPIs.totalCollected * 0.15), sub: "After expected repayments", color: "text-navy-700" },
              { label: "Projected Monthly Profit", value: formatKwacha(netProfit * 1.08), sub: "+8% vs last month trajectory", color: "text-emerald-700" },
              { label: "Capital Available for New Loans", value: formatKwacha(mockCapitalUtilization.availableCapital + mockKPIs.totalCollected * 0.15), sub: "Current + projected collections", color: "text-gold-700" },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between p-3 bg-warm-50 border border-warm-200 rounded-lg">
                <div>
                  <div className="text-xs text-navy-600 font-medium">{p.label}</div>
                  <div className="text-xs text-navy-600 mt-0.5">{p.sub}</div>
                </div>
                <div className={`text-base font-bold font-mono ${p.color} ml-4 flex-shrink-0`}>{p.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campus Performance Breakdown (§5.8) */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title">Campus Performance</h3>
            <p className="text-xs text-navy-600">Portfolio breakdown by university campus — UNZA · CBU · UNILUS</p>
          </div>
          <span className="text-xs bg-gold-100 text-gold-800 border border-gold-300 px-2.5 py-1 rounded-full font-semibold">§5.8 Report</span>
        </div>

        {/* Summary totals */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Campus Clients", value: mockCampusPerformance.reduce((s, c) => s + c.clients, 0).toString() },
            { label: "Total Disbursed", value: formatKwacha(mockCampusPerformance.reduce((s, c) => s + c.totalDisbursed, 0)) },
            { label: "Avg. Collection Rate", value: `${(mockCampusPerformance.reduce((s, c) => s + c.collectionRate, 0) / mockCampusPerformance.length).toFixed(1)}%` },
          ].map(t => (
            <div key={t.label} className="text-center p-3 bg-navy-900 rounded-xl">
              <div className="text-lg font-bold font-mono text-gold-400">{t.value}</div>
              <div className="text-xs text-navy-500 mt-0.5">{t.label}</div>
            </div>
          ))}
        </div>

        {/* Campus cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {mockCampusPerformance.map((campus, i) => (
            <div key={campus.campus} className={`rounded-xl border p-4 ${
              i === 0 ? "border-gold-300 bg-gold-50" : "border-warm-200 bg-white"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-gold-500 text-navy-950" : "bg-navy-900 text-gold-400"
                  }`}>
                    {campus.campus.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-navy-900 text-sm" style={{ fontFamily: "Fraunces, serif" }}>{campus.campus}</div>
                    <div className="text-[10px] text-navy-600">{campus.clients} clients · {campus.activeLoans} active</div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  campus.par30 < 5 ? "bg-emerald-100 text-emerald-700" :
                  campus.par30 < 8 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}>
                  PAR30: {campus.par30}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Disbursed</span>
                  <span className="font-mono font-semibold text-navy-800">{formatKwacha(campus.totalDisbursed)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Outstanding</span>
                  <span className="font-mono font-semibold text-navy-800">{formatKwacha(campus.totalOutstanding)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Collected</span>
                  <span className="font-mono font-semibold text-emerald-700">{formatKwacha(campus.totalCollected)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Overdue Loans</span>
                  <span className={`font-semibold ${campus.overdueLoans > 10 ? "text-red-600" : "text-amber-600"}`}>{campus.overdueLoans}</span>
                </div>
              </div>
              {/* Collection rate bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-navy-600 mb-1">
                  <span>Collection Rate</span>
                  <span className="font-semibold text-navy-700">{campus.collectionRate}%</span>
                </div>
                <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${campus.collectionRate}%`,
                      backgroundColor: campus.collectionRate >= 92 ? "#059669" : campus.collectionRate >= 88 ? "#C9A227" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto border border-warm-200 rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-navy-900 text-navy-200">
                <th className="text-left px-4 py-3 font-semibold">Campus</th>
                <th className="text-right px-4 py-3 font-semibold">Clients</th>
                <th className="text-right px-4 py-3 font-semibold">Active Loans</th>
                <th className="text-right px-4 py-3 font-semibold">Disbursed</th>
                <th className="text-right px-4 py-3 font-semibold">Outstanding</th>
                <th className="text-right px-4 py-3 font-semibold">Collection %</th>
                <th className="text-right px-4 py-3 font-semibold">PAR &gt;30</th>
                <th className="text-right px-4 py-3 font-semibold">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {mockCampusPerformance.map((c) => (
                <tr key={c.campus} className="hover:bg-warm-50">
                  <td className="px-4 py-3 font-bold text-navy-900" style={{ fontFamily: "Fraunces, serif" }}>{c.campus}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-700">{c.clients}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-700">{c.activeLoans}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-800">{formatKwacha(c.totalDisbursed)}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-800">{formatKwacha(c.totalOutstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold font-mono ${
                      c.collectionRate >= 92 ? "text-emerald-700" : c.collectionRate >= 88 ? "text-amber-700" : "text-red-700"
                    }`}>{c.collectionRate}%</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold font-mono ${
                      c.par30 < 5 ? "text-emerald-700" : c.par30 < 8 ? "text-amber-700" : "text-red-700"
                    }`}>{c.par30}%</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">{c.overdueLoans}</td>
                </tr>
              ))}
              <tr className="bg-warm-50 border-t-2 border-warm-300">
                <td className="px-4 py-3 font-bold text-navy-900">Total</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{mockCampusPerformance.reduce((s, c) => s + c.clients, 0)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{mockCampusPerformance.reduce((s, c) => s + c.activeLoans, 0)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{formatKwacha(mockCampusPerformance.reduce((s, c) => s + c.totalDisbursed, 0))}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{formatKwacha(mockCampusPerformance.reduce((s, c) => s + c.totalOutstanding, 0))}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">
                  {(mockCampusPerformance.reduce((s, c) => s + c.collectionRate, 0) / mockCampusPerformance.length).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">
                  {(mockCampusPerformance.reduce((s, c) => s + c.par30, 0) / mockCampusPerformance.length).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-red-700">{mockCampusPerformance.reduce((s, c) => s + c.overdueLoans, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              Live Activity Feed
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">Real-time portal events — refreshes every 30 seconds</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE
            </div>
            <button
              onClick={() => { syncFromApi(); fetchActivity(); }}
              disabled={activityLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-warm-300 rounded-lg hover:bg-warm-50 text-navy-600 disabled:opacity-50"
            >
              <RefreshCw size={11} className={activityLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {(() => {
          // Merge API events with store-derived fallback
          const storeEvents: ActivityEvent[] = applications.slice(0, 10).map(a => ({
            id: a.id,
            type: a.status === "PENDING" ? "APPLICATION_SUBMITTED" :
                  a.status === "UNDER_REVIEW" ? "APPLICATION_REVIEWING" :
                  a.status === "APPROVED" ? "APPLICATION_APPROVED" :
                  a.status === "REJECTED" ? "APPLICATION_REJECTED" : "LOAN_DISBURSED",
            client: a.clientName,
            ref: a.ref,
            amount: a.amount,
            description: a.status === "PENDING"
              ? `${a.clientName} submitted a ${a.productName} application for ${formatKwacha(a.amount)}`
              : a.status === "APPROVED"
              ? `${a.clientName}'s loan of ${formatKwacha(a.amount)} was APPROVED`
              : a.status === "REJECTED"
              ? `${a.clientName}'s application was rejected`
              : `${a.clientName} — ${a.productName} · ${formatKwacha(a.amount)}`,
            timestamp: a.submittedAt,
          }));
          const events = liveActivity.length > 0 ? liveActivity : storeEvents;

          if (events.length === 0) {
            return (
              <div className="flex items-center gap-3 p-4 bg-warm-50 border border-warm-200 rounded-xl text-sm text-navy-600">
                <Activity size={16} className="text-navy-400 flex-shrink-0" />
                No activity yet — portal events will appear here as clients submit applications.
              </div>
            );
          }

          return (
            <div className="space-y-2">
              {events.slice(0, 12).map((evt) => {
                const meta = EVENT_ICONS[evt.type] ?? EVENT_ICONS.APPLICATION_UPDATED;
                const Icon = meta.icon;
                const ts = new Date(evt.timestamp);
                const isToday = ts.toDateString() === new Date().toDateString();
                const timeStr = isToday
                  ? ts.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })
                  : ts.toLocaleDateString("en-ZM", { day: "numeric", month: "short" });
                return (
                  <div key={evt.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-warm-50 transition-colors border border-transparent hover:border-warm-200">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${meta.bg}`}>
                      <Icon size={14} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy-800">{evt.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-navy-500">{evt.ref}</span>
                        <span className="text-navy-300">·</span>
                        <span className="text-xs text-navy-500">{timeStr}</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-navy-700 flex-shrink-0">
                      {evt.amount > 0 ? formatKwacha(evt.amount) : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* PAR >30 Alert Banner (CGAP standard) */}
      {(() => {
        const par30 = mockPAR.find(p => p.days === 30);
        if (!par30) return null;
        const isCritical = par30.percentage > 10;
        return (
          <div className={`rounded-xl border p-4 flex items-start gap-4 ${
            isCritical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
          }`}>
            <AlertTriangle size={20} className={isCritical ? "text-red-500 flex-shrink-0 mt-0.5" : "text-amber-500 flex-shrink-0 mt-0.5"} />
            <div className="flex-1">
              <div className={`font-bold text-sm ${isCritical ? "text-red-800" : "text-amber-800"}`} style={{ fontFamily: "Fraunces, serif" }}>
                PAR &gt;30 Days: {par30.percentage}% — {isCritical ? "Critical Risk Level" : "Watch Zone"} (CGAP Standard)
              </div>
              <div className={`text-xs mt-1 ${isCritical ? "text-red-600" : "text-amber-600"}`}>
                {par30.count} loans totalling {formatKwacha(par30.amount)} are overdue by more than 30 days.{" "}
                {isCritical
                  ? "Immediate action required — escalate to recovery team."
                  : "Monitor closely and initiate proactive follow-up with loan officers."}
              </div>
            </div>
            <div className={`text-3xl font-bold font-mono ${isCritical ? "text-red-700" : "text-amber-700"}`}>
              {par30.percentage}%
            </div>
          </div>
        );
      })()}
    </div>
  );
}
