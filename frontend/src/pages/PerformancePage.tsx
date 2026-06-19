import { useEffect } from "react";
import { Activity, TrendingUp, CreditCard, Users, RefreshCw } from "lucide-react";
import { useLoanApplicationStore } from "../store/loanApplicationStore";
import { formatKwacha } from "../lib/mock-data";

export default function PerformancePage() {
  const { applications, syncFromApi } = useLoanApplicationStore();
  useEffect(() => { syncFromApi(); }, []);

  // Summary stats derived from real portal applications
  const total = applications.length;
  const disbursed = applications.filter(a => a.status === "DISBURSED");
  const approved = applications.filter(a => a.status === "APPROVED");
  const pending = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const rejected = applications.filter(a => a.status === "REJECTED");
  const totalDisbursedAmt = disbursed.reduce((s, a) => s + a.amount, 0);
  const totalInterest = disbursed.reduce((s, a) => s + (a.totalRepayable - a.amount), 0);
  const approvalRate = total > 0 ? Math.round(((disbursed.length + approved.length) / total) * 100) : 0;

  // Monthly breakdown
  const monthlyMap: Record<string, { count: number; total: number }> = {};
  disbursed.forEach(a => {
    const m = new Date(a.submittedAt).toLocaleString("en-GB", { month: "short", year: "2-digit" });
    if (!monthlyMap[m]) monthlyMap[m] = { count: 0, total: 0 };
    monthlyMap[m].count++;
    monthlyMap[m].total += a.amount;
  });

  const monthlyData = Object.entries(monthlyMap)
    .slice(-6)
    .map(([month, d]) => ({ month, ...d }));

  // Product breakdown
  const productMap: Record<string, number> = {};
  applications.forEach(a => {
    const name = a.productName || "Unknown";
    productMap[name] = (productMap[name] || 0) + 1;
  });
  const topProducts = Object.entries(productMap).sort(([, a], [, b]) => b - a).slice(0, 5);

  const stats = [
    { label: "Total Applications", value: total, icon: Activity, color: "indigo" },
    { label: "Disbursed Loans", value: disbursed.length, icon: CreditCard, color: "emerald" },
    { label: "Total Disbursed", value: formatKwacha(totalDisbursedAmt), icon: TrendingUp, color: "blue" },
    { label: "Interest Earned", value: formatKwacha(totalInterest), icon: Users, color: "amber" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance Analytics</h1>
          <p className="page-subtitle">Portfolio performance metrics from real loan data</p>
        </div>
        <button onClick={() => syncFromApi()} className="btn-secondary text-xs py-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="philix-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${s.color}-600/20 text-${s.color}-400`}>
              <s.icon size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="philix-card p-5">
          <h3 className="section-title mb-4">Application Pipeline</h3>
          <div className="space-y-3">
            {[
              { label: "Disbursed", count: disbursed.length, total, color: "bg-emerald-500" },
              { label: "Approved", count: approved.length, total, color: "bg-indigo-500" },
              { label: "Under Review", count: pending.length, total, color: "bg-amber-500" },
              { label: "Rejected", count: rejected.length, total, color: "bg-red-500" },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="text-slate-300 font-semibold">{row.count}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${row.color} transition-all`}
                    style={{ width: total > 0 ? `${Math.round((row.count / total) * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Overall Approval Rate</span>
              <span className={`font-bold ${approvalRate >= 70 ? "text-emerald-400" : approvalRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {approvalRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Top products */}
        <div className="philix-card p-5">
          <h3 className="section-title mb-4">Most Popular Products</h3>
          {topProducts.length === 0 ? (
            <div className="py-10 text-center text-slate-600 text-sm">
              No loan data yet
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map(([name, count], i) => (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">
                      <span className="text-slate-600 mr-2">#{i + 1}</span>
                      {name}
                    </span>
                    <span className="text-slate-400">{count} app{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly disbursements */}
      <div className="philix-card p-5">
        <h3 className="section-title mb-4">Monthly Disbursements (Last 6 Months)</h3>
        {monthlyData.length === 0 ? (
          <div className="py-10 text-center text-slate-600 text-sm">No disbursed loans yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Loans</th>
                  <th>Total Disbursed</th>
                  <th>Avg Loan Size</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(row => (
                  <tr key={row.month} className="table-row-hover">
                    <td className="font-medium text-slate-200">{row.month}</td>
                    <td className="text-slate-300">{row.count}</td>
                    <td className="text-indigo-400 font-medium">{formatKwacha(row.total)}</td>
                    <td className="text-slate-400">{formatKwacha(row.count > 0 ? row.total / row.count : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total === 0 && (
        <div className="philix-card p-12 text-center">
          <Activity size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No loan data yet</p>
          <p className="text-slate-700 text-sm mt-1">Performance metrics will appear here as clients submit loan applications</p>
        </div>
      )}
    </div>
  );
}
