import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X, AlertCircle, Layers, Clock, Calendar, User } from "lucide-react";

const API = "/api";
function getToken() { return localStorage.getItem("philix-auth-v3") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  status: string;
  submittedAt: string;
  updatedAt?: string;
  portalAccount?: { firstName: string; lastName: string };
  clientName?: string;
  purpose?: string;
  termMonths?: number;
}

type PipelineStatus = "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "DISBURSED" | "REPAID";

const COLUMNS: { key: PipelineStatus; label: string; color: string; headerBg: string; cardBg: string; badgeBg: string }[] = [
  { key: "SUBMITTED",    label: "Applied",       color: "text-slate-600",   headerBg: "bg-slate-700",     cardBg: "bg-white",       badgeBg: "bg-slate-100 text-slate-700" },
  { key: "UNDER_REVIEW", label: "Under Review",  color: "text-blue-600",    headerBg: "bg-blue-700",      cardBg: "bg-blue-50/50",  badgeBg: "bg-blue-100 text-blue-700" },
  { key: "APPROVED",     label: "Approved",      color: "text-emerald-600", headerBg: "bg-emerald-700",   cardBg: "bg-emerald-50/50", badgeBg: "bg-emerald-100 text-emerald-700" },
  { key: "DISBURSED",    label: "Disbursed",     color: "text-indigo-600",  headerBg: "bg-indigo-700",    cardBg: "bg-indigo-50/50", badgeBg: "bg-indigo-100 text-indigo-700" },
  { key: "REPAID",       label: "Completed",     color: "text-green-600",   headerBg: "bg-green-700",     cardBg: "bg-green-50/50",  badgeBg: "bg-green-100 text-green-700" },
];

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function LoanPipelinePage() {
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<LoanApp | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/admin/applications?limit=500`, { headers: authH() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const all: LoanApp[] = d.applications ?? d.data ?? d ?? [];
      setLoans(all);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  function clientName(app: LoanApp) {
    return app.portalAccount
      ? `${app.portalAccount.firstName} ${app.portalAccount.lastName}`
      : app.clientName ?? "Unknown";
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = loans.filter(l => l.status === col.key);
    return acc;
  }, {} as Record<PipelineStatus, LoanApp[]>);

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#C9A227]" />
              Loan Pipeline
            </h1>
            <p className="text-sm text-slate-500 mt-1">Kanban view of all loan applications by status</p>
          </div>
          <button
            onClick={fetchLoans}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-white hover:bg-[#b8911f] text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Pipeline Columns */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colLoans = grouped[col.key] ?? [];
            const total = colLoans.reduce((s, l) => s + l.amountRequested, 0);
            return (
              <div key={col.key} className="flex-shrink-0 w-72">
                {/* Column Header */}
                <div className={`${col.headerBg} text-white rounded-t-xl px-4 py-3 flex items-center justify-between`}>
                  <span className="font-semibold text-sm">{col.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono opacity-80">{K(total)}</span>
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{colLoans.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className={`rounded-b-xl border border-t-0 border-slate-200 min-h-32 p-2 space-y-2 max-h-[70vh] overflow-y-auto ${col.cardBg}`}>
                  {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading...
                    </div>
                  ) : colLoans.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-slate-300 text-xs">No applications</div>
                  ) : (
                    colLoans.map(loan => {
                      const days = daysSince(loan.updatedAt ?? loan.submittedAt);
                      return (
                        <button
                          key={loan.id}
                          onClick={() => setSelected(loan)}
                          className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:border-[#C9A227] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-semibold text-[#0B1F3A] text-sm leading-tight">{clientName(loan)}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${col.badgeBg}`}>
                              {K(loan.amountRequested)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mb-2">{loan.reference}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {loan.productType}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {days === 0 ? "Today" : `${days}d ago`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(loan.submittedAt).toLocaleDateString()}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Side Panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto">
            <div className="bg-[#0B1F3A] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{clientName(selected)}</h3>
                <p className="text-sm opacity-70 font-mono">{selected.reference}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: "Loan Amount", value: K(selected.amountRequested), mono: true },
                { label: "Product Type", value: selected.productType, mono: false },
                { label: "Term", value: `${selected.termMonths ?? "—"} weeks`, mono: false },
                { label: "Purpose", value: selected.purpose ?? "—", mono: false },
                { label: "Status", value: selected.status, mono: false },
                { label: "Applied Date", value: new Date(selected.submittedAt).toLocaleDateString(), mono: false },
                { label: "Days in Pipeline", value: `${daysSince(selected.submittedAt)} days`, mono: true },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className={`text-sm font-medium text-[#0B1F3A] ${item.mono ? "font-mono" : ""}`}>{item.value}</span>
                </div>
              ))}
              <div className="mt-4 bg-[#F5F0E6] rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-2">Current Stage</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#0B1F3A]">
                    {COLUMNS.find(c => c.key === selected.status)?.label ?? selected.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
