import {
  Users, CheckCircle, Clock, ArrowUpRight, ArrowDownRight,
  Download, Zap, CreditCard, TrendingUp, BarChart2, Banknote, DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLoanApplicationStore } from "../store/loanApplicationStore";
import { useAuthStore } from "../store/auth";
import { formatKwacha } from "../lib/mock-data";

interface AdminSummary {
  totalPortalAccounts: number;
  pendingApplications: number;
  approvedToday: number;
  submittedToday: number;
  totalApplications: number;
  totalDisbursedAmount: number;
  totalInterestEarned: number;
  totalRepayable: number;
}

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
  const { applications, updateStatus, syncFromApi } = useLoanApplicationStore();
  const user = useAuthStore(s => s.user);
  const [summary, setSummary] = useState<AdminSummary>({
    totalPortalAccounts: 0,
    pendingApplications: 0,
    approvedToday: 0,
    submittedToday: 0,
    totalApplications: 0,
    totalDisbursedAmount: 0,
    totalInterestEarned: 0,
    totalRepayable: 0,
  });

  const pendingApps = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const approvedDisbursed = applications.filter(a => a.status === "APPROVED" || a.status === "DISBURSED").length;

  const isCEO = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER";
  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? "Good morning" : hourOfDay < 17 ? "Good afternoon" : "Good evening";
  const roleTitle = isCEO ? "Executive Dashboard" : "My Dashboard";
  const roleSubtitle = isCEO
    ? "Philix Finance — Real-time portal overview"
    : `${greeting}, ${user?.firstName ?? ""}. Here's your work queue for today.`;

  useEffect(() => {
    syncFromApi();
    const token = localStorage.getItem("philix_staff_token");
    if (!token) return;
    fetch("/api/admin/summary", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSummary(data); })
      .catch(() => {});
  }, []);

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

      {/* Portal Activity KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Portal Accounts"
          value={summary.totalPortalAccounts.toString()}
          sub="Registered clients"
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Pending Applications"
          value={pendingApps.length.toString()}
          sub="Awaiting review"
          icon={Clock}
          color="amber"
        />
        <KPICard
          title="Submitted Today"
          value={summary.submittedToday.toString()}
          sub="New today"
          icon={Zap}
          color="indigo"
        />
        <KPICard
          title="Approved Today"
          value={summary.approvedToday.toString()}
          sub="Approved today"
          icon={CheckCircle}
          color="emerald"
        />
        <KPICard
          title="Total Applications"
          value={summary.totalApplications.toString()}
          sub="All-time"
          icon={CreditCard}
          color="indigo"
        />
        <KPICard
          title="Approved / Disbursed"
          value={approvedDisbursed.toString()}
          sub="Approved or paid out"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Financial totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
            <Banknote size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-navy-900 truncate">
              {formatKwacha(summary.totalDisbursedAmount)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Loans Disbursed</div>
            <div className="text-xs text-navy-500">Principal paid out to clients</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-amber-700 truncate">
              {formatKwacha(summary.totalInterestEarned)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Interest Earned</div>
            <div className="text-xs text-navy-500">Revenue from all disbursed loans</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700 flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-navy-900 truncate">
              {formatKwacha(summary.totalRepayable)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Amount Repayable</div>
            <div className="text-xs text-navy-500">Principal + interest combined</div>
          </div>
        </div>
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

      {/* Financial Data — empty state */}
      <div className="philix-card p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="section-title mb-1">Financial Reporting</h3>
            <p className="text-sm text-navy-600">
              Financial reporting (disbursements, collections, PAR) will populate automatically as loans are issued.
            </p>
            <p className="text-xs text-navy-500 mt-2">
              Once loans are disbursed and repayments begin, charts for monthly disbursements, repayment trends,
              portfolio-at-risk, and capital utilization will appear here in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
