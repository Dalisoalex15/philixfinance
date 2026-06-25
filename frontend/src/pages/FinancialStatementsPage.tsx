import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const token = () => localStorage.getItem("philix_staff_token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

type Tab = "pl" | "balance" | "cashflow";

interface PLMonth { month: string; revenue: number; interestIncome: number; portalCollections: number; principalRepaid: number; capitalDeployed: number; netProfit: number; }
interface BalanceSheet { assets: { loanPortfolio: number; portalLoanPortfolio: number; totalAssets: number }; liabilities: { total: number }; equity: { totalEquity: number; retainedEarnings: number }; }
interface CashMonth { month: string; cashIn: number; cashOut: number; net: number; }

export default function FinancialStatementsPage() {
  const [tab, setTab] = useState<Tab>("pl");
  const [pl, setPl] = useState<PLMonth[]>([]);
  const [bs, setBs] = useState<BalanceSheet | null>(null);
  const [cf, setCf] = useState<CashMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plR, bsR, cfR] = await Promise.all([
        fetch("/api/reports/financials/pl", { headers: authH() }),
        fetch("/api/reports/financials/balance-sheet", { headers: authH() }),
        fetch("/api/reports/financials/cash-flow", { headers: authH() }),
      ]);
      if (plR.ok) setPl(await plR.json());
      if (bsR.ok) setBs(await bsR.json());
      if (cfR.ok) setCf(await cfR.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalRevenue   = pl.reduce((s, m) => s + m.revenue, 0);
  const totalDeployed  = pl.reduce((s, m) => s + m.capitalDeployed, 0);
  const totalNetProfit = pl.reduce((s, m) => s + m.netProfit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financial Statements</h1>
          <p className="text-navy-600 text-sm mt-0.5">P&L · Balance Sheet · Cash Flow — last 12 months</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-navy-100/50 rounded-xl w-fit">
        {([["pl", "Profit & Loss"], ["balance", "Balance Sheet"], ["cashflow", "Cash Flow"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "pl" && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue (12m)", value: K(totalRevenue), icon: TrendingUp, color: "emerald" },
              { label: "Capital Deployed", value: K(totalDeployed), icon: DollarSign, color: "indigo" },
              { label: "Net Profit (est.)", value: K(totalNetProfit), icon: BarChart2, color: totalNetProfit >= 0 ? "emerald" : "red" },
              { label: "Avg Monthly Revenue", value: K(Math.round(totalRevenue / 12)), icon: TrendingUp, color: "amber" },
            ].map(kpi => (
              <div key={kpi.label} className="philix-card p-4">
                <div className={`w-8 h-8 rounded-lg bg-${kpi.color}-100 text-${kpi.color}-600 flex items-center justify-center mb-3`}>
                  <kpi.icon size={16} />
                </div>
                <div className="text-xl font-bold text-navy-900">{kpi.value}</div>
                <div className="text-xs text-navy-500 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Monthly P&L table */}
          <div className="philix-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="font-bold text-navy-900">Monthly Profit & Loss</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy-50/50">
                  <tr>
                    {["Month", "Revenue", "Capital Deployed", "Collections", "Net Profit", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pl.map(m => (
                    <>
                      <tr key={m.month} className="hover:bg-navy-50/30 cursor-pointer" onClick={() => setExpandedRow(expandedRow === m.month ? null : m.month)}>
                        <td className="px-4 py-3 font-medium text-navy-900">{m.month}</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">{K(m.revenue)}</td>
                        <td className="px-4 py-3 text-indigo-600">{K(m.capitalDeployed)}</td>
                        <td className="px-4 py-3 text-navy-700">{K(m.portalCollections)}</td>
                        <td className={`px-4 py-3 font-bold ${m.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{K(m.netProfit)}</td>
                        <td className="px-4 py-3 text-navy-400">
                          {expandedRow === m.month ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {expandedRow === m.month && (
                        <tr key={m.month + "-detail"} className="bg-navy-50/60">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div><span className="text-navy-500">Interest Income:</span> <span className="font-semibold text-navy-800">{K(m.interestIncome)}</span></div>
                              <div><span className="text-navy-500">Portal Collections:</span> <span className="font-semibold text-navy-800">{K(m.portalCollections)}</span></div>
                              <div><span className="text-navy-500">Principal Repaid:</span> <span className="font-semibold text-navy-800">{K(m.principalRepaid)}</span></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot className="bg-navy-50 border-t-2 border-navy-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-navy-900">Total</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{K(totalRevenue)}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{K(totalDeployed)}</td>
                    <td className="px-4 py-3 font-bold text-navy-700">{K(pl.reduce((s, m) => s + m.portalCollections, 0))}</td>
                    <td className={`px-4 py-3 font-bold text-lg ${totalNetProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{K(totalNetProfit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "balance" && bs && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Assets */}
          <div className="philix-card p-5">
            <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" /> Assets
            </h3>
            <div className="space-y-3">
              {[
                { label: "Staff Loan Portfolio", value: bs.assets.loanPortfolio },
                { label: "Portal Loan Portfolio", value: bs.assets.portalLoanPortfolio },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-navy-600">{row.label}</span>
                  <span className="font-semibold text-navy-900">{K(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 mt-2 border-t-2 border-navy-200">
                <span className="font-bold text-navy-900">Total Assets</span>
                <span className="font-bold text-xl text-emerald-600">{K(bs.assets.totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities */}
          <div className="philix-card p-5">
            <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
              <TrendingDown size={16} className="text-red-500" /> Liabilities
            </h3>
            <div className="space-y-3">
              <div className="py-8 text-center text-sm text-navy-400">
                No recorded liabilities
              </div>
              <div className="flex justify-between items-center py-2 border-t-2 border-navy-200">
                <span className="font-bold text-navy-900">Total Liabilities</span>
                <span className="font-bold text-xl text-navy-600">{K(bs.liabilities.total)}</span>
              </div>
            </div>
          </div>

          {/* Equity */}
          <div className="philix-card p-5">
            <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-indigo-600" /> Equity
            </h3>
            <div className="space-y-3">
              {[
                { label: "Invested Capital", value: bs.equity.totalEquity },
                { label: "Retained Earnings", value: bs.equity.retainedEarnings },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-navy-600">{row.label}</span>
                  <span className="font-semibold text-navy-900">{K(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 mt-2 border-t-2 border-navy-200">
                <span className="font-bold text-navy-900">Total Equity</span>
                <span className="font-bold text-xl text-indigo-600">{K(bs.equity.totalEquity + bs.equity.retainedEarnings)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "cashflow" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Cash In (12m)", value: K(cf.reduce((s, m) => s + m.cashIn, 0)), color: "emerald" },
              { label: "Total Cash Out (12m)", value: K(cf.reduce((s, m) => s + m.cashOut, 0)), color: "red" },
              { label: "Net Cash Flow", value: K(cf.reduce((s, m) => s + m.net, 0)), color: cf.reduce((s, m) => s + m.net, 0) >= 0 ? "emerald" : "red" },
            ].map(kpi => (
              <div key={kpi.label} className="philix-card p-4 text-center">
                <div className={`text-2xl font-bold text-${kpi.color}-600`}>{kpi.value}</div>
                <div className="text-xs text-navy-500 mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          <div className="philix-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="font-bold text-navy-900">Monthly Cash Flow</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-navy-50/50">
                <tr>
                  {["Month", "Cash In", "Cash Out", "Net Flow", "Trend"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cf.map(m => (
                  <tr key={m.month} className="hover:bg-navy-50/30">
                    <td className="px-4 py-3 font-medium text-navy-900">{m.month}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">{K(m.cashIn)}</td>
                    <td className="px-4 py-3 text-red-500">{K(m.cashOut)}</td>
                    <td className={`px-4 py-3 font-bold ${m.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>{K(m.net)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {m.net >= 0
                          ? <TrendingUp size={14} className="text-emerald-500" />
                          : <TrendingDown size={14} className="text-red-500" />}
                        <div className="flex-1 h-1.5 bg-navy-100 rounded-full overflow-hidden max-w-16">
                          <div
                            className={`h-full rounded-full ${m.net >= 0 ? "bg-emerald-500" : "bg-red-400"}`}
                            style={{ width: `${Math.min(100, Math.abs(m.net) / (Math.max(...cf.map(x => Math.abs(x.net))) || 1) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === "balance" && !bs && (
        <div className="philix-card p-10 text-center text-navy-400">Balance sheet data unavailable</div>
      )}
    </div>
  );
}
