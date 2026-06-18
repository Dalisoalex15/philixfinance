import { useState, useEffect, useCallback } from "react";
import { BookOpen, TrendingUp, TrendingDown, DollarSign, PlusCircle, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { formatKwacha, formatDate } from "../lib/mock-data";

type AccountType = "ALL" | "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
type ViewTab = "coa" | "journal" | "trial";

interface CoaEntry { id: string; code: string; name: string; type: string; balance: number; }
interface JournalLine { debitAccount: string; creditAccount: string; amount: number; }
interface JournalEntry {
  id: string; reference: string; date: string; description: string;
  status: string; totalAmount: number; lines: JournalLine[];
}
interface Ledger {
  chartOfAccounts: CoaEntry[];
  journalEntries: JournalEntry[];
  summary: { totalAssets: number; totalLiabilities: number; totalRevenue: number; totalExpenses: number; netProfit: number; };
  generatedAt: string;
}

function token() { return localStorage.getItem("philix_staff_token") ?? ""; }

export default function AccountingPage() {
  const [view, setView] = useState<ViewTab>("coa");
  const [filter, setFilter] = useState<AccountType>("ALL");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/accounting/ledger", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (r.ok) setLedger(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const coa = ledger?.chartOfAccounts ?? [];
  const entries = ledger?.journalEntries ?? [];
  const summary = ledger?.summary ?? { totalAssets: 0, totalLiabilities: 0, totalRevenue: 0, totalExpenses: 0, netProfit: 0 };

  const accounts = filter === "ALL" ? coa : coa.filter(a => a.type === filter);

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
          <p className="page-subtitle">
            Double-entry bookkeeping · Chart of Accounts · Journal Entries
            {ledger && <span className="ml-2 text-indigo-400">· Updated {new Date(ledger.generatedAt).toLocaleTimeString()}</span>}
          </p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-1.5">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {loading && !ledger ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-slate-800 mb-3" />
              <div className="h-6 bg-slate-800 rounded w-24 mb-1" />
              <div className="h-3 bg-slate-800 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Assets", value: formatKwacha(summary.totalAssets), icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Total Liabilities", value: formatKwacha(summary.totalLiabilities), icon: TrendingDown, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Est. Revenue (YTD)", value: formatKwacha(summary.totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Net Profit (Est.)", value: formatKwacha(summary.netProfit), icon: BookOpen, color: summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400", bg: summary.netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
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
      )}

      {/* View Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
        {(["coa", "journal", "trial"] as ViewTab[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${view === v ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            {v === "coa" ? "Chart of Accounts" : v === "journal" ? "Journal Entries" : "Trial Balance"}
          </button>
        ))}
      </div>

      {/* Chart of Accounts */}
      {view === "coa" && (
        <div className="philix-card overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
            <h3 className="section-title flex-1">Chart of Accounts</h3>
            <div className="flex gap-1 flex-wrap">
              {(["ALL", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as AccountType[]).map((t) => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${filter === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No accounts found. Add capital entries or disburse loans to see live balances.
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* Journal Entries */}
      {view === "journal" && (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="philix-card p-12 text-center text-slate-500">
              No journal entries yet. Loan disbursements and capital entries will appear here automatically.
            </div>
          ) : entries.map((je) => (
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
                      {je.lines.map((line, i) => (
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
            <h3 className="section-title">Trial Balance — {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h3>
            <p className="text-xs text-slate-500 mt-1">All account balances as of current date · derived from live data</p>
          </div>
          <table className="data-table">
            <thead><tr><th>Code</th><th>Account</th><th className="text-right">Debit (Dr)</th><th className="text-right">Credit (Cr)</th></tr></thead>
            <tbody>
              {coa.map((acc) => {
                const isDrNormal = acc.type === "ASSET" || acc.type === "EXPENSE";
                return (
                  <tr key={acc.id} className="table-row-hover">
                    <td className="font-mono text-xs text-slate-500">{acc.code}</td>
                    <td className="text-slate-300">{acc.name}</td>
                    <td className="text-right font-mono text-sm">{isDrNormal && acc.balance > 0 ? formatKwacha(acc.balance) : "—"}</td>
                    <td className="text-right font-mono text-sm">{!isDrNormal && acc.balance > 0 ? formatKwacha(acc.balance) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 font-bold">
                <td colSpan={2} className="px-4 py-3 text-slate-200">TOTALS</td>
                <td className="text-right px-4 py-3 font-mono text-blue-400">{formatKwacha(summary.totalAssets + summary.totalExpenses)}</td>
                <td className="text-right px-4 py-3 font-mono text-amber-400">{formatKwacha(summary.totalLiabilities + summary.totalRevenue + (coa.find(a => a.id === "3000")?.balance ?? 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
