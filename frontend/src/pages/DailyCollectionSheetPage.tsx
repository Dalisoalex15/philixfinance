import { useState, useEffect, useCallback } from "react";
import { Calendar, CheckCircle, Clock, AlertCircle, Printer, RefreshCw, X, DollarSign } from "lucide-react";

const API = "/api";
function getToken() { return localStorage.getItem("philix-auth-v3") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  totalRepayable: number;
  termMonths: number;
  status: string;
  submittedAt: string;
  portalAccount?: { firstName: string; lastName: string; phone?: string };
  paymentSubmissions?: { status: string; amount: number | null; createdAt: string }[];
}

interface CollectionRow {
  id: string;
  reference: string;
  clientName: string;
  phone: string;
  monthlyPayment: number;
  status: "PAID" | "PENDING" | "OVERDUE";
  dueDate: string;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function computeMonthly(app: LoanApp): number {
  const weeks = app.termMonths ?? 1;
  return weeks > 0 ? Math.ceil((app.totalRepayable ?? app.amountRequested) / weeks) : app.amountRequested;
}

function getPaymentStatus(app: LoanApp, selectedDate: string): "PAID" | "PENDING" | "OVERDUE" {
  const approvedPay = (app.paymentSubmissions ?? []).find(p => p.status === "APPROVED");
  if (approvedPay) {
    const paidDate = approvedPay.createdAt?.slice(0, 10);
    if (paidDate === selectedDate) return "PAID";
  }
  const dueMs = new Date(app.submittedAt).getTime() + (app.termMonths ?? 1) * 7 * 86400000;
  if (Date.now() > dueMs && selectedDate <= todayStr()) return "OVERDUE";
  return "PENDING";
}

export default function DailyCollectionSheetPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paidIds, setPaidIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("philix_paid_today") ?? "[]")); } catch { return new Set(); }
  });
  const [modalLoan, setModalLoan] = useState<CollectionRow | null>(null);
  const [modalAmount, setModalAmount] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchLoans = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/admin/applications?limit=200`, { headers: authH() });
      if (!r.ok) {
        // Fallback to defaults endpoint
        const r2 = await fetch(`${API}/dashboard/defaults?limit=200`, { headers: authH() });
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
        const d2 = await r2.json();
        setLoans(Array.isArray(d2.loans ?? d2) ? (d2.loans ?? d2) : []);
        return;
      }
      const d = await r.json();
      const all: LoanApp[] = d.applications ?? d.data ?? d ?? [];
      const active = all.filter(a => ["APPROVED", "DISBURSED"].includes(a.status));
      setLoans(active);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load loans");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const rows: CollectionRow[] = loans.map(app => ({
    id: app.id,
    reference: app.reference,
    clientName: app.portalAccount
      ? `${app.portalAccount.firstName} ${app.portalAccount.lastName}`
      : "—",
    phone: app.portalAccount?.phone ?? "—",
    monthlyPayment: computeMonthly(app),
    status: paidIds.has(app.id) ? "PAID" : getPaymentStatus(app, selectedDate),
    dueDate: new Date(new Date(app.submittedAt).getTime() + (app.termMonths ?? 1) * 7 * 86400000).toISOString().slice(0, 10),
  }));

  const paid = rows.filter(r => r.status === "PAID");
  const pending = rows.filter(r => r.status === "PENDING");
  const overdue = rows.filter(r => r.status === "OVERDUE");
  const totalExpected = rows.reduce((s, r) => s + r.monthlyPayment, 0);
  const totalCollected = paid.reduce((s, r) => s + r.monthlyPayment, 0);
  const remaining = totalExpected - totalCollected;
  const collectionPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  function markPaid(row: CollectionRow) {
    setModalLoan(row);
    setModalAmount(String(row.monthlyPayment));
  }

  async function confirmPaid() {
    if (!modalLoan) return;
    setModalLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const next = new Set(paidIds);
    next.add(modalLoan.id);
    setPaidIds(next);
    localStorage.setItem("philix_paid_today", JSON.stringify([...next]));
    setModalLoan(null);
    setModalLoading(false);
  }

  const STATUS_CFG = {
    PAID:    { color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle className="w-3 h-3" /> },
    PENDING: { color: "text-amber-600",   bg: "bg-amber-50 text-amber-700 border border-amber-200",       icon: <Clock className="w-3 h-3" /> },
    OVERDUE: { color: "text-red-600",     bg: "bg-red-50 text-red-700 border border-red-200",             icon: <AlertCircle className="w-3 h-3" /> },
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#C9A227]" />
              Daily Collection Sheet
            </h1>
            <p className="text-sm text-slate-500 mt-1">Track expected payments and mark collections</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0B1F3A] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#0B1F3A]/20 text-[#0B1F3A] hover:bg-[#0B1F3A]/5 text-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Sheet
            </button>
            <button
              onClick={fetchLoans}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-white hover:bg-[#b8911f] text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Expected", value: K(totalExpected), sub: `${rows.length} loans`, color: "text-[#0B1F3A]", bg: "bg-white" },
            { label: "Already Collected", value: K(totalCollected), sub: `${paid.length} paid`, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Remaining", value: K(remaining), sub: `${pending.length + overdue.length} outstanding`, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Collection Rate", value: `${collectionPct}%`, sub: collectionPct >= 80 ? "On track" : collectionPct >= 60 ? "Needs attention" : "Below target", color: collectionPct >= 80 ? "text-emerald-600" : collectionPct >= 60 ? "text-amber-600" : "text-red-600", bg: "bg-white" },
          ].map(c => (
            <div key={c.label} className={`p-4 rounded-xl border border-slate-200 shadow-sm ${c.bg}`}>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{c.label}</p>
              <p className={`text-xl font-bold font-mono ${c.color}`}>{c.value}</p>
              <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Collection Progress</span>
            <span className="font-mono font-bold text-[#0B1F3A]">{collectionPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${collectionPct >= 80 ? "bg-emerald-500" : collectionPct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${collectionPct}%` }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading collection data...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-red-400 gap-2">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <Calendar className="w-8 h-8" />
              <p>No active loans found for collection</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B1F3A] text-white">
                    {["Client Name", "Loan Ref", "Monthly Payment", "Due Date", "Status", "Phone", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const cfg = STATUS_CFG[row.status];
                    return (
                      <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                        <td className="px-4 py-3 font-medium text-[#0B1F3A]">{row.clientName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.reference}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-[#0B1F3A]">{K(row.monthlyPayment)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{row.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}>
                            {cfg.icon} {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{row.phone}</td>
                        <td className="px-4 py-3">
                          {row.status !== "PAID" ? (
                            <button
                              onClick={() => markPaid(row)}
                              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex items-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" /> Mark Paid
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Collected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mark Paid Modal */}
      {modalLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0B1F3A] text-lg">Confirm Payment</h3>
              <button onClick={() => setModalLoan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div className="bg-[#F5F0E6] rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Client</p>
                <p className="font-semibold text-[#0B1F3A]">{modalLoan.clientName}</p>
                <p className="text-xs text-slate-400 font-mono">{modalLoan.reference}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Received</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">K</span>
                  <input
                    type="number"
                    value={modalAmount}
                    onChange={e => setModalAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalLoan(null)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={confirmPaid}
                disabled={modalLoading || !modalAmount}
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {modalLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
