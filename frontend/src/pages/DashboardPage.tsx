import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle,
  Users, Package, CheckCircle, Clock, ArrowUpRight, ArrowDownRight,
  Calendar, Zap, Download,
} from "lucide-react";
import {
  mockKPIs, mockLoanStatusChart, mockMonthlyDisbursements,
  mockRepaymentTrend, mockTopOfficers, mockUpcomingCollections,
  mockPAR, mockCapitalUtilization, mockAnnouncements,
  formatKwacha, formatDate,
} from "../lib/mock-data";
import { useEffect } from "react";
import { useLoanApplicationStore } from "../store/loanApplicationStore";
import { useAuthStore } from "../store/auth";

const COLORS = {
  ACTIVE: "#6366f1",
  OVERDUE: "#f59e0b",
  PAID: "#10b981",
  DEFAULTED: "#ef4444",
  PENDING: "#64748b",
};

function KPICard({
  title, value, sub, icon: Icon, trend, trendValue, color = "indigo",
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  trend?: "up" | "down" | "neutral"; trendValue?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-700 text-navy-600",
  };

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {trend && trendValue && (
          <div className={trend === "up" ? "kpi-change-positive" : "kpi-change-negative"}>
            {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-navy-900 tracking-tight">{value}</div>
      <div className="text-xs font-medium text-navy-600 mt-1">{title}</div>
      {sub && <div className="text-xs text-navy-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-warm-200 border border-warm-300 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-navy-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function exportCSV(applications: ReturnType<typeof useLoanApplicationStore.getState>["applications"]) {
  const rows = [
    ["Ref", "Client", "Email", "Phone", "Product", "Amount", "Total Repayable", "Duration", "Purpose", "Status", "Submitted"],
    ...applications.map(a => [
      a.ref, a.clientName, a.clientEmail, a.clientPhone,
      a.productName, a.amount, a.totalRepayable, a.rateDuration,
      a.purpose, a.status, new Date(a.submittedAt).toLocaleDateString("en-GB"),
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `philix-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:      "bg-amber-100 text-amber-700 border-amber-200",
  UNDER_REVIEW: "bg-blue-100 text-blue-700 border-blue-200",
  APPROVED:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED:     "bg-red-100 text-red-700 border-red-200",
  DISBURSED:    "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function DashboardPage() {
  const kpis = mockKPIs;
  const { applications, updateStatus, syncFromApi } = useLoanApplicationStore();
  const user = useAuthStore(s => s.user);
  const pendingApps = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const totalClients = applications
    .map(a => a.clientId)
    .filter((id, i, arr) => arr.indexOf(id) === i).length;

  const isCEO = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER";
  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? "Good morning" : hourOfDay < 17 ? "Good afternoon" : "Good evening";
  const roleTitle = isCEO ? "Executive Dashboard" : "My Dashboard";
  const roleSubtitle = isCEO
    ? "Philix Finance — Real-time portfolio overview"
    : `${greeting}, ${user?.firstName ?? ""}. Here's your work queue for today.`;

  useEffect(() => { syncFromApi(); }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{roleTitle}</h1>
          <p className="page-subtitle">{roleSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
          <span className="text-xs text-navy-500">Updated just now</span>
        </div>
      </div>

      {/* Announcements Banner */}
      {mockAnnouncements.filter(a => a.isPinned).slice(0, 1).map(ann => (
        <div key={ann.id} className="flex items-start gap-3 p-4 rounded-lg bg-indigo-50 border border-indigo-800/50">
          <Zap size={16} className="text-indigo-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Pinned — </span>
            <span className="text-sm font-medium text-navy-800">{ann.title}</span>
            <p className="text-xs text-navy-600 mt-0.5 line-clamp-1">{ann.content}</p>
          </div>
          <span className="text-xs text-navy-500 flex-shrink-0">{formatDate(ann.createdAt)}</span>
        </div>
      ))}

      {/* KPI Grid — Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Capital Deployed"
          value={formatKwacha(kpis.totalDisbursed)}
          sub="All-time disbursements"
          icon={DollarSign}
          color="indigo"
          trend="up"
          trendValue="+12.4% vs last month"
        />
        <KPICard
          title="Outstanding Balance"
          value={formatKwacha(kpis.totalOutstanding)}
          sub="Current + overdue"
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="Active Loans"
          value={kpis.activeLoans.toString()}
          sub={`${kpis.monthLoans} issued this month`}
          icon={CreditCard}
          color="indigo"
          trend="up"
          trendValue="+8 this week"
        />
        <KPICard
          title="Issued Today"
          value={kpis.todayLoans.toString()}
          sub={`${kpis.monthLoans} this month`}
          icon={Zap}
          color="emerald"
        />
        <KPICard
          title="Overdue Loans"
          value={kpis.overdueLoans.toString()}
          sub={`${kpis.defaultedLoans} defaulted`}
          icon={AlertTriangle}
          color={kpis.overdueLoans > 20 ? "amber" : "emerald"}
          trend="down"
          trendValue="-3 vs last week"
        />
        <KPICard
          title="Pending Approvals"
          value={applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW").length.toString()}
          sub={`${applications.filter(a => a.status === "APPROVED").length} approved`}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* KPI Grid — Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Default Rate"
          value={`${kpis.defaultRate}%`}
          sub="Industry avg: 5%"
          icon={AlertTriangle}
          color={kpis.defaultRate > 5 ? "red" : "emerald"}
        />
        <KPICard
          title="Recovery Rate"
          value={`${kpis.recoveryRate}%`}
          sub="Of defaulted loans"
          icon={CheckCircle}
          color="emerald"
        />
        <KPICard
          title="Registered Clients"
          value={totalClients.toString()}
          sub="Total portal accounts"
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Total Collected"
          value={formatKwacha(kpis.totalCollected)}
          sub="All-time repayments"
          icon={TrendingDown}
          color="emerald"
        />
        <KPICard
          title="Next 7-Day Collections"
          value={formatKwacha(kpis.next7DaysCollections)}
          sub={`${kpis.upcomingCount} payments due`}
          icon={Calendar}
          color="indigo"
        />
        <KPICard
          title="Interest Revenue"
          value={formatKwacha(kpis.totalCollected * 0.18)}
          sub="Estimated this month"
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Officer work-queue panel — only shown to non-CEO staff */}
      {!isCEO && (
        <div className="philix-card p-5">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse inline-block" />
            Your Work Queue
          </h3>
          {pendingApps.length === 0 ? (
            <div className="text-center py-8 text-navy-500 text-sm">
              <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500/40" />
              All clear — no pending applications right now
            </div>
          ) : (
            <div className="space-y-2">
              {pendingApps.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-warm-50 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-800 truncate">{a.clientName}</div>
                    <div className="text-xs text-navy-500 font-mono">{a.ref} · {a.productName}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-navy-900">K{a.amount.toLocaleString()}</div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${a.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
              {pendingApps.length > 5 && (
                <p className="text-xs text-center text-navy-500 pt-1">+{pendingApps.length - 5} more — <a href="/online-applications" className="text-indigo-700 hover:underline">view all</a></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Loan Applications Queue */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              Live Loan Applications
            </h3>
            <p className="text-xs text-navy-500 mt-0.5">Submitted by clients — awaiting review</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              {pendingApps.length} pending
            </span>
            {applications.length > 0 && (
              <button onClick={() => exportCSV(applications)}
                className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 border border-warm-300 hover:border-slate-600 px-2.5 py-1 rounded-full transition-colors">
                <Download size={11} /> Export CSV
              </button>
            )}
          </div>
        </div>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-navy-500 text-sm">No applications submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-navy-500 border-b border-warm-200">
                  <th className="text-left pb-2 font-medium">Ref</th>
                  <th className="text-left pb-2 font-medium">Client</th>
                  <th className="text-left pb-2 font-medium">Product</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                  <th className="text-right pb-2 font-medium">Repayable</th>
                  <th className="text-left pb-2 font-medium">Duration</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Submitted</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {applications.map(app => (
                  <tr key={app.id} className="hover:bg-warm-50 transition-colors">
                    <td className="py-2.5 pr-3 font-mono text-xs text-navy-600">{app.ref}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-navy-800 text-xs">{app.clientName}</div>
                      <div className="text-navy-500 text-[10px]">{app.clientEmail}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-navy-700 text-xs max-w-[140px] truncate">{app.productName}</td>
                    <td className="py-2.5 pr-3 text-right text-navy-800 text-xs font-semibold">{K(app.amount)}</td>
                    <td className="py-2.5 pr-3 text-right text-emerald-700 text-xs font-semibold">{K(app.totalRepayable)}</td>
                    <td className="py-2.5 pr-3 text-navy-600 text-xs">{app.rateDuration}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[app.status] ?? "bg-warm-200 text-navy-600 border-warm-300"}`}>
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-navy-500 text-xs whitespace-nowrap">
                      {new Date(app.submittedAt).toLocaleDateString("en-ZM", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5">
                      {app.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button onClick={() => updateStatus(app.id, "UNDER_REVIEW")}
                            className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-600/40 transition-colors border border-blue-200">
                            Review
                          </button>
                          <button onClick={() => updateStatus(app.id, "APPROVED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-600/40 transition-colors border border-emerald-200">
                            Approve
                          </button>
                          <button onClick={() => updateStatus(app.id, "REJECTED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-600/40 transition-colors border border-red-200">
                            Reject
                          </button>
                        </div>
                      )}
                      {app.status === "UNDER_REVIEW" && (
                        <div className="flex gap-1">
                          <button onClick={() => updateStatus(app.id, "APPROVED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-600/40 transition-colors border border-emerald-200">
                            Approve
                          </button>
                          <button onClick={() => updateStatus(app.id, "REJECTED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-600/40 transition-colors border border-red-200">
                            Reject
                          </button>
                        </div>
                      )}
                      {app.status === "APPROVED" && (
                        <button onClick={() => updateStatus(app.id, "DISBURSED")}
                          className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-600/40 transition-colors border border-indigo-200">
                          Disburse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Disbursements */}
        <div className="lg:col-span-2 philix-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Monthly Disbursements</h3>
              <p className="text-xs text-navy-500 mt-0.5">Loan capital deployed over 12 months</p>
            </div>
            <select className="text-xs bg-warm-200 border border-warm-300 text-navy-700 rounded px-2 py-1">
              <option>Last 12 months</option>
              <option>Last 6 months</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockMonthlyDisbursements} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `K${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip formatter={formatKwacha} />} />
              <Bar dataKey="amount" name="Disbursed" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Loan Status Distribution */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Portfolio Distribution</h3>
            <p className="text-xs text-navy-500 mt-0.5">Loan status breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={mockLoanStatusChart}
                cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                dataKey="count" paddingAngle={2}
              >
                {mockLoanStatusChart.map((entry) => (
                  <Cell key={entry.status} fill={COLORS[entry.status as keyof typeof COLORS] || "#64748b"} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v} loans`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {mockLoanStatusChart.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                  <span className="text-navy-600">{item.status}</span>
                </div>
                <span className="font-medium text-navy-700">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repayment Trend */}
        <div className="lg:col-span-2 philix-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Repayment Collection Trend</h3>
              <p className="text-xs text-navy-500 mt-0.5">Weekly collections over 12 weeks</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mockRepaymentTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `K${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip formatter={formatKwacha} />} />
              <Line type="monotone" dataKey="amount" name="Collected" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Capital Utilization */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Capital Utilization</h3>
            <p className="text-xs text-navy-500 mt-0.5">Deployed vs available</p>
          </div>
          <div className="text-center mt-2">
            <div className="text-4xl font-bold text-indigo-700">{mockCapitalUtilization.utilizationPct}%</div>
            <div className="text-xs text-navy-500 mt-1">Utilization Rate</div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-navy-600">Total Capital</span>
                <span className="text-navy-700 font-medium">{formatKwacha(mockCapitalUtilization.totalCapital)}</span>
              </div>
              <div className="h-1.5 bg-warm-200 rounded-full">
                <div className="h-full bg-slate-600 rounded-full w-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-navy-600">Deployed in Loans</span>
                <span className="text-indigo-700 font-medium">{formatKwacha(mockCapitalUtilization.capitalLoaned)}</span>
              </div>
              <div className="h-1.5 bg-warm-200 rounded-full">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${mockCapitalUtilization.utilizationPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-navy-600">Available Capital</span>
                <span className="text-emerald-700 font-medium">{formatKwacha(mockCapitalUtilization.availableCapital)}</span>
              </div>
              <div className="h-1.5 bg-warm-200 rounded-full">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${100 - mockCapitalUtilization.utilizationPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PAR Table */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Portfolio at Risk (PAR)</h3>
            <p className="text-xs text-navy-500 mt-0.5">Key microfinance health indicator</p>
          </div>
          <div className="space-y-3">
            {mockPAR.map((p) => (
              <div key={p.days}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-navy-700">PAR {p.days}+</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-navy-600">{formatKwacha(p.amount)}</span>
                    <span className={`text-xs font-bold ${p.percentage > 10 ? "text-red-700" : p.percentage > 5 ? "text-amber-700" : "text-emerald-700"}`}>
                      {p.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-warm-200 rounded-full">
                  <div
                    className={`h-full rounded-full ${p.percentage > 10 ? "bg-red-500" : p.percentage > 5 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, p.percentage * 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Officers */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Top Loan Officers</h3>
            <p className="text-xs text-navy-500 mt-0.5">By loans issued this month</p>
          </div>
          <div className="space-y-3">
            {mockTopOfficers.slice(0, 5).map((officer, i) => (
              <div key={officer.id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? "bg-amber-500/20 text-amber-700" : i === 1 ? "bg-slate-600/50 text-navy-600" : "bg-warm-200 text-navy-500"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-navy-800 truncate">{officer.name}</div>
                  <div className="text-xs text-navy-500">{officer.loansIssued} loans · {officer.collectionRate}% collected</div>
                </div>
                <div className="text-xs font-medium text-emerald-700">{formatKwacha(officer.totalCollected)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Collections */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Upcoming Collections</h3>
            <p className="text-xs text-navy-500 mt-0.5">Next 7 days</p>
          </div>
          <div className="space-y-2">
            {mockUpcomingCollections.map((item) => {
              const daysUntil = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400000);
              return (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-warm-200 transition-colors cursor-pointer">
                  <div className={`flex-shrink-0 text-center w-10 ${daysUntil <= 1 ? "text-red-700" : daysUntil <= 3 ? "text-amber-700" : "text-navy-600"}`}>
                    <div className="text-lg font-bold leading-none">{daysUntil <= 0 ? "!" : daysUntil}</div>
                    <div className="text-[9px] uppercase tracking-wide">{daysUntil <= 0 ? "DUE" : "days"}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-navy-800 truncate">
                      {item.loan.client.firstName} {item.loan.client.lastName}
                    </div>
                    <div className="text-xs text-navy-500">{item.loan.loanNumber}</div>
                  </div>
                  <div className="text-xs font-medium text-navy-700">{formatKwacha(item.totalDue)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
