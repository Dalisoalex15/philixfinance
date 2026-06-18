import { useState } from "react";
import { BookOpen, TrendingUp, TrendingDown, DollarSign, PlusCircle, ChevronDown, ChevronRight } from "lucide-react";
import { mockChartOfAccounts, mockJournalEntries, formatKwacha, formatDate } from "../lib/mock-data";

type AccountType = "ALL" | "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export default function AccountingPage() {
  const [view, setView] = useState<"coa" | "journal" | "trial">("coa");
  const [filter, setFilter] = useState<AccountType>("ALL");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const accounts = filter === "ALL" ? mockChartOfAccounts : mockChartOfAccounts.filter(a => a.type === filter);

  const totalAssets = mockChartOfAccounts.filter(a => a.type === "ASSET").reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = mockChartOfAccounts.filter(a => a.type === "LIABILITY").reduce((s, a) => s + a.balance, 0);
  const totalRevenue = mockChartOfAccounts.filter(a => a.type === "REVENUE").reduce((s, a) => s + a.balance, 0);
  const totalExpenses = mockChartOfAccounts.filter(a => a.type === "EXPENSE").reduce((s, a) => s + a.balance, 0);
  const netProfit = totalRevenue - totalExpenses;

  const typeColors: Record<string, string> = {
    ASSET: "text-blue-400", LIABILITY: "text-amber-400",
    EQUITY: "text-purple-400", REVENUE: "text-emerald-400", EXPENSE: "text-red-400",
  };

  const typeBg: Record<string, string> = {
    ASSET: "bg-blue-500/10", LIABILITY: "bg-amber-500/10",
    EQUITY: "bg-purple-500/10", REVENUE: "bg-emerald-500/10", EXPENSE: "bg-red-500/10",
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">General Ledger & Accounting</h1>
          <p className="page-subtitle">Double-entry bookkeeping · Chart of Accounts · Journal Entries</p>
        </div>
        <button className="btn-primary"><PlusCircle size={14} /> New Journal Entry</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: formatKwacha(totalAssets), icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Total Liabilities", value: formatKwacha(totalLiabilities), icon: TrendingDown, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Total Revenue (YTD)", value: formatKwacha(totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Net Profit (YTD)", value: formatKwacha(netProfit), icon: BookOpen, color: netProfit >= 0 ? "text-emerald-400" : "text-red-400", bg: netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
        {[["coa", "Chart of Accounts"], ["journal", "Journal Entries"], ["trial", "Trial Balance"]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v as "coa" | "journal" | "trial")}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${view === v ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Chart of Accounts */}
      {view === "coa" && (
        <div className="philix-card overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
            <h3 className="section-title flex-1">Chart of Accounts</h3>
            <div className="flex gap-1">
              {(["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as AccountType[]).map((t) => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${filter === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Balance</th></tr></thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} className="table-row-hover">
                  <td className="font-mono text-xs text-slate-400">{acc.code}</td>
                  <td className="font-medium text-slate-200">{acc.name}</td>
                  <td>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeBg[acc.type]} ${typeColors[acc.type]}`}>
                      {acc.type}
                    </span>
                  </td>
                  <td className={`font-bold font-mono ${acc.balance >= 0 ? "text-slate-200" : "text-red-400"}`}>
                    {formatKwacha(Math.abs(acc.balance))}
                    {acc.balance < 0 && <span className="text-xs ml-1 text-red-400">(Cr)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Journal Entries */}
      {view === "journal" && (
        <div className="space-y-3">
          {mockJournalEntries.map((je) => (
            <div key={je.id} className="philix-card overflow-hidden">
              <button className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-800/30 transition-colors"
                onClick={() => setExpandedEntry(expandedEntry === je.id ? null : je.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-indigo-400 font-semibold">{je.reference}</span>
                    <span className="badge-green text-xs">{je.status}</span>
                  </div>
                  <div className="text-sm text-slate-300 mt-0.5">{je.description}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-100">{formatKwacha(je.totalAmount)}</div>
                  <div className="text-xs text-slate-500">{formatDate(je.date)}</div>
                </div>
                {expandedEntry === je.id ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
              </button>
              {expandedEntry === je.id && (
                <div className="border-t border-slate-800 p-4 bg-slate-800/20">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-slate-500"><th className="text-left pb-2">Debit Account</th><th className="text-left pb-2">Credit Account</th><th className="text-right pb-2">Amount</th></tr></thead>
                    <tbody>
                      {je.lines.map((line: any, i: number) => (
                        <tr key={i}>
                          <td className="py-1 text-slate-300">{line.debitAccount}</td>
                          <td className="py-1 text-slate-300">{line.creditAccount}</td>
                          <td className="py-1 text-right font-mono text-emerald-400">{formatKwacha(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trial Balance */}
      {view === "trial" && (
        <div className="philix-card overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="section-title">Trial Balance — June 2025</h3>
            <p className="text-xs text-slate-500 mt-1">All account balances as of current date</p>
          </div>
          <table className="data-table">
            <thead><tr><th>Code</th><th>Account</th><th className="text-right">Debit (Dr)</th><th className="text-right">Credit (Cr)</th></tr></thead>
            <tbody>
              {mockChartOfAccounts.map((acc) => {
                const isDrNormal = acc.type === "ASSET" || acc.type === "EXPENSE";
                return (
                  <tr key={acc.id} className="table-row-hover">
                    <td className="font-mono text-xs text-slate-500">{acc.code}</td>
                    <td className="text-slate-300">{acc.name}</td>
                    <td className="text-right font-mono text-sm">{isDrNormal && acc.balance >= 0 ? formatKwacha(acc.balance) : "—"}</td>
                    <td className="text-right font-mono text-sm">{!isDrNormal && acc.balance >= 0 ? formatKwacha(acc.balance) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 font-bold">
                <td colSpan={2} className="px-4 py-3 text-slate-200">TOTALS</td>
                <td className="text-right px-4 py-3 font-mono text-blue-400">{formatKwacha(totalAssets + totalExpenses)}</td>
                <td className="text-right px-4 py-3 font-mono text-amber-400">{formatKwacha(totalLiabilities + totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
