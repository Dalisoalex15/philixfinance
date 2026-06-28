import { useState, useEffect, useCallback } from "react";
import { FileText, Download, Printer, RefreshCw, AlertCircle, Calendar } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";

const API = "/api";
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PaymentRecord {
  id: string;
  amount: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reference?: string;
  provider?: string;
}

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  totalRepayable?: number;
  status: string;
  createdAt: string;
  paymentSubmissions?: PaymentRecord[];
}

interface StatementRow {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: "disbursement" | "payment" | "fee";
}

function buildStatement(loans: LoanApp[], from: string, to: string): StatementRow[] {
  const rows: StatementRow[] = [];
  let balance = 0;
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime() + 86400000;

  loans.forEach(loan => {
    const loanDate = new Date(loan.createdAt).getTime();
    if (loanDate >= fromMs && loanDate <= toMs) {
      balance += loan.amountRequested;
      rows.push({
        date: loan.createdAt.slice(0, 10),
        description: `Loan Disbursed — ${loan.reference} (${loan.productType})`,
        debit: loan.amountRequested,
        credit: 0,
        balance,
        type: "disbursement",
      });
    }

    (loan.paymentSubmissions ?? [])
      .filter(p => p.status === "APPROVED")
      .forEach(p => {
        const pDate = new Date(p.createdAt).getTime();
        if (pDate >= fromMs && pDate <= toMs) {
          const amt = p.amount ?? 0;
          balance -= amt;
          rows.push({
            date: p.createdAt.slice(0, 10),
            description: `Payment — ${loan.reference}${p.reference ? ` · Ref: ${p.reference}` : ""}${p.provider ? ` via ${p.provider}` : ""}`,
            debit: 0,
            credit: amt,
            balance: Math.max(0, balance),
            type: "payment",
          });
        }
      });
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}
function defaultTo() { return new Date().toISOString().slice(0, 10); }

export default function AccountStatementPage() {
  const { accessToken: token, client: user } = useClientAuthStore();
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());

  const fetchLoans = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/portal/applications`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setLoans(d.applications ?? d ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const rows = buildStatement(loans, from, to);
  const totalDisbursed = rows.filter(r => r.type === "disbursement").reduce((s, r) => s + r.debit, 0);
  const totalPaid = rows.filter(r => r.type === "payment").reduce((s, r) => s + r.credit, 0);
  const currentBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0;

  function downloadCSV() {
    const header = "Date,Description,Debit,Credit,Balance";
    const dataRows = rows.map(r => `${r.date},"${r.description}",${r.debit.toFixed(2)},${r.credit.toFixed(2)},${r.balance.toFixed(2)}`);
    const csv = [header, ...dataRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `philix-statement-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0B1F3A] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C9A227]" /> Account Statement
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Your loan and payment history</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#C9A227] text-white text-xs hover:bg-[#b8911f] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> PDF / Print
            </button>
          </div>
        </div>

        {/* Statement Header (also shows in print) */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 mb-4 print:bg-white print:border-slate-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-[#C9A227] font-semibold uppercase tracking-wider">Philix Finance</p>
              <h2 className="text-lg font-bold text-white mt-0.5">{user?.firstName} {user?.lastName}</h2>
              <p className="text-sm text-slate-400 font-mono">{user?.clientNumber}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Statement generated</p>
              <p className="font-mono">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C9A227]" />
              <span className="text-slate-500 text-sm">to</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#C9A227]" />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total Disbursed", value: K(totalDisbursed), color: "text-red-400" },
            { label: "Total Paid", value: K(totalPaid), color: "text-emerald-400" },
            { label: "Current Balance", value: K(currentBalance), color: currentBalance > 0 ? "text-[#C9A227]" : "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        {/* Statement Table */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading statement...
            </div>
          ) : error ? (
            <div className="h-48 flex items-center justify-center text-red-400 gap-2 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2">
              <FileText className="w-8 h-8 opacity-40" />
              <p className="text-sm">No transactions in selected date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-700/50">
                    {["Date", "Description", "Debit", "Credit", "Balance"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-3 text-xs text-slate-300 max-w-xs truncate">{row.description}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.debit > 0 ? <span className="text-red-400">{K(row.debit)}</span> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.credit > 0 ? <span className="text-emerald-400">{K(row.credit)}</span> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-white">{K(row.balance)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-slate-700/30 border-t-2 border-slate-600">
                    <td colSpan={2} className="px-4 py-3 text-xs font-bold text-slate-300">TOTALS</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-red-400">{K(totalDisbursed)}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-400">{K(totalPaid)}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#C9A227]">{K(currentBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3 text-center">
          This statement is for informational purposes only. Contact Philix Finance for official documentation.
        </p>
      </div>
    </div>
  );
}
