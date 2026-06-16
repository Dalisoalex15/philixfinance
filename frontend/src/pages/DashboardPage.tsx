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
    indigo: "bg-indigo-600/20 text-indigo-400",
    emerald: "bg-emerald-600/20 text-emerald-400",
    amber: "bg-amber-600/20 text-amber-400",
    red: "bg-red-600/20 text-red-400",
    blue: "bg-blue-600/20 text-blue-400",
    slate: "bg-slate-700 text-slate-400",
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
      <div className="text-2xl font-bold text-slate-100 tracking-tight">{value}</div>
      <div className="text-xs font-medium text-slate-400 mt-1">{title}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
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
  PENDING:      "bg-amber-900/30 text-amber-400 border-amber-800/40",
  UNDER_REVIEW: "bg-blue-900/30 text-blue-400 border-blue-800/40",
  APPROVED:     "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  REJECTED:     "bg-red-900/30 text-red-400 border-red-800/40",
  DISBURSED:    "bg-indigo-900/30 text-indigo-400 border-indigo-800/40",
};

export default function DashboardPage() {
  const kpis = mockKPIs;
  const { applications, updateStatus, syncFromApi } = useLoanApplicationStore();
  const pendingApps = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const totalClients = applications
    .map(a => a.clientId)
    .filter((id, i, arr) => arr.indexOf(id) === i).length;

  useEffect(() => { syncFromApi(); }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Philix Finance — Real-time portfolio overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-800/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
          <span className="text-xs text-slate-500">Updated just now</span>
        </div>
      </div>

      {/* Announcements Banner */}
      {mockAnnouncements.filter(a => a.isPinned).slice(0, 1).map(ann => (
        <div key={ann.id} className="flex items-start gap-3 p-4 rounded-lg bg-indigo-900/20 border border-indigo-800/50">
          <Zap size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Pinned — </span>
            <span className="text-sm font-medium text-slate-200">{ann.title}</span>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ann.content}</p>
          </div>
          <span className="text-xs text-slate-600 flex-shrink-0">{formatDate(ann.createdAt)}</span>
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

      {/* Live Loan Applications Queue */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              Live Loan Applications
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Submitted by clients — awaiting review</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-amber-900/30 text-amber-400 border border-amber-800/40 px-2.5 py-1 rounded-full">
              {pendingApps.length} pending
            </span>
            {applications.length > 0 && (
              <button onClick={() => exportCSV(applications)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-full transition-colors">
                <Download size={11} /> Export CSV
              </button>
            )}
          </div>
        </div>
        {applications.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">No applications submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-800">
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
                  <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{app.ref}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-slate-200 text-xs">{app.clientName}</div>
                      <div className="text-slate-500 text-[10px]">{app.clientEmail}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300 text-xs max-w-[140px] truncate">{app.productName}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-200 text-xs font-semibold">{K(app.amount)}</td>
                    <td className="py-2.5 pr-3 text-right text-emerald-400 text-xs font-semibold">{K(app.totalRepayable)}</td>
                    <td className="py-2.5 pr-3 text-slate-400 text-xs">{app.rateDuration}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[app.status] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(app.submittedAt).toLocaleDateString("en-ZM", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5">
                      {app.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button onClick={() => updateStatus(app.id, "UNDER_REVIEW")}
                            className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors border border-blue-800/40">
                            Review
                          </button>
                          <button onClick={() => updateStatus(app.id, "APPROVED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-colors border border-emerald-800/40">
                            Approve
                          </button>
                          <button onClick={() => updateStatus(app.id, "REJECTED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors border border-red-800/40">
                            Reject
                          </button>
                        </div>
                      )}
                      {app.status === "UNDER_REVIEW" && (
                        <div className="flex gap-1">
                          <button onClick={() => updateStatus(app.id, "APPROVED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition-colors border border-emerald-800/40">
                            Approve
                          </button>
                          <button onClick={() => updateStatus(app.id, "REJECTED")}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors border border-red-800/40">
                            Reject
                          </button>
                        </div>
                      )}
                      {app.status === "APPROVED" && (
                        <button onClick={() => updateStatus(app.id, "DISBURSED")}
                          className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 transition-colors border border-indigo-800/40">
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
              <p className="text-xs text-slate-500 mt-0.5">Loan capital deployed over 12 months</p>
            </div>
            <select className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1">
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
            <p className="text-xs text-slate-500 mt-0.5">Loan status breakdown</p>
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
                  <span className="text-slate-400">{item.status}</span>
                </div>
                <span className="font-medium text-slate-300">{item.count}</span>
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
              <p className="text-xs text-slate-500 mt-0.5">Weekly collections over 12 weeks</p>
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
            <p className="text-xs text-slate-500 mt-0.5">Deployed vs available</p>
          </div>
          <div className="text-center mt-2">
            <div className="text-4xl font-bold text-indigo-400">{mockCapitalUtilization.utilizationPct}%</div>
            <div className="text-xs text-slate-500 mt-1">Utilization Rate</div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Total Capital</span>
                <span className="text-slate-300 font-medium">{formatKwacha(mockCapitalUtilization.totalCapital)}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full">
                <div className="h-full bg-slate-600 rounded-full w-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Deployed in Loans</span>
                <span className="text-indigo-400 font-medium">{formatKwacha(mockCapitalUtilization.capitalLoaned)}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${mockCapitalUtilization.utilizationPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Available Capital</span>
                <span className="text-emerald-400 font-medium">{formatKwacha(mockCapitalUtilization.availableCapital)}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full">
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
            <p className="text-xs text-slate-500 mt-0.5">Key microfinance health indicator</p>
          </div>
          <div className="space-y-3">
            {mockPAR.map((p) => (
              <div key={p.days}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-300">PAR {p.days}+</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatKwacha(p.amount)}</span>
                    <span className={`text-xs font-bold ${p.percentage > 10 ? "text-red-400" : p.percentage > 5 ? "text-amber-400" : "text-emerald-400"}`}>
                      {p.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full">
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
            <p className="text-xs text-slate-500 mt-0.5">By loans issued this month</p>
          </div>
          <div className="space-y-3">
            {mockTopOfficers.slice(0, 5).map((officer, i) => (
              <div key={officer.id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-600/50 text-slate-400" : "bg-slate-800 text-slate-500"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-200 truncate">{officer.name}</div>
                  <div className="text-xs text-slate-500">{officer.loansIssued} loans · {officer.collectionRate}% collected</div>
                </div>
                <div className="text-xs font-medium text-emerald-400">{formatKwacha(officer.totalCollected)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Collections */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Upcoming Collections</h3>
            <p className="text-xs text-slate-500 mt-0.5">Next 7 days</p>
          </div>
          <div className="space-y-2">
            {mockUpcomingCollections.map((item) => {
              const daysUntil = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400000);
              return (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-800 transition-colors cursor-pointer">
                  <div className={`flex-shrink-0 text-center w-10 ${daysUntil <= 1 ? "text-red-400" : daysUntil <= 3 ? "text-amber-400" : "text-slate-400"}`}>
                    <div className="text-lg font-bold leading-none">{daysUntil <= 0 ? "!" : daysUntil}</div>
                    <div className="text-[9px] uppercase tracking-wide">{daysUntil <= 0 ? "DUE" : "days"}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {item.loan.client.firstName} {item.loan.client.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{item.loan.loanNumber}</div>
                  </div>
                  <div className="text-xs font-medium text-slate-300">{formatKwacha(item.totalDue)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
