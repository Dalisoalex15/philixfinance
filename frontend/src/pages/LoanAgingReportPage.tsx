import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle, Clock, Download, RefreshCw, TrendingDown } from "lucide-react";

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
  status: string;
  submittedAt: string;
  termMonths: number;
  clientName?: string;
  officerName?: string;
  portalAccount?: { firstName: string; lastName: string };
  assignedOfficer?: { name: string };
}

type Bucket = "CURRENT" | "DAYS_1_30" | "DAYS_31_60" | "DAYS_60_PLUS";

function getBucket(daysOverdue: number): Bucket {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "DAYS_1_30";
  if (daysOverdue <= 60) return "DAYS_31_60";
  return "DAYS_60_PLUS";
}

function getDaysOverdue(app: LoanApp): number {
  const termWeeks = app.termMonths ?? 1;
  const subMs = new Date(app.submittedAt).getTime();
  const dueMs = subMs + termWeeks * 7 * 86400000;
  return Math.max(0, Math.ceil((Date.now() - dueMs) / 86400000));
}

const BUCKET_CONFIG: Record<Bucket, { label: string; subLabel: string; cardBg: string; cardBorder: string; textColor: string; rowBg: string; badgeBg: string }> = {
  CURRENT:      { label: "Current",     subLabel: "0 days",    cardBg: "bg-emerald-900/20", cardBorder: "border-emerald-700/50", textColor: "text-emerald-400", rowBg: "",                     badgeBg: "bg-emerald-900/30 text-emerald-300" },
  DAYS_1_30:    { label: "1–30 Days",   subLabel: "1–30 days", cardBg: "bg-amber-900/20",   cardBorder: "border-amber-700/50",   textColor: "text-amber-400",   rowBg: "bg-amber-900/5",       badgeBg: "bg-amber-900/30 text-amber-300" },
  DAYS_31_60:   { label: "31–60 Days",  subLabel: "31–60",     cardBg: "bg-orange-900/20",  cardBorder: "border-orange-700/50",  textColor: "text-orange-400",  rowBg: "bg-orange-900/5",      badgeBg: "bg-orange-900/30 text-orange-300" },
  DAYS_60_PLUS: { label: "60+ Days",    subLabel: "60+ days",  cardBg: "bg-red-900/20",     cardBorder: "border-red-700/50",     textColor: "text-red-400",     rowBg: "bg-red-900/5",         badgeBg: "bg-red-900/30 text-red-300" },
};

export default function LoanAgingReportPage() {
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterBucket, setFilterBucket] = useState<Bucket | "ALL">("ALL");

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/dashboard/defaults?limit=200`, { headers: authH() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const raw: LoanApp[] = d.loans ?? d.defaults ?? d ?? [];
      setLoans(Array.isArray(raw) ? raw : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const enriched = loans.map(app => ({
    ...app,
    daysOverdue: getDaysOverdue(app),
    bucket: getBucket(getDaysOverdue(app)),
    clientName: app.portalAccount
      ? `${app.portalAccount.firstName} ${app.portalAccount.lastName}`
      : app.clientName ?? "—",
    officerName: app.assignedOfficer?.name ?? app.officerName ?? "Unassigned",
  }));

  const buckets: Bucket[] = ["CURRENT", "DAYS_1_30", "DAYS_31_60", "DAYS_60_PLUS"];
  const bucketStats = buckets.map(b => ({
    bucket: b,
    count: enriched.filter(l => l.bucket === b).length,
    total: enriched.filter(l => l.bucket === b).reduce((s, l) => s + (l.totalRepayable ?? l.amountRequested), 0),
  }));

  const filtered = filterBucket === "ALL" ? enriched : enriched.filter(l => l.bucket === filterBucket);

  function exportCSV() {
    const header = "Loan Ref,Client Name,Product,Principal,Total Due,Days Overdue,Bucket,Officer";
    const rows = filtered.map(l =>
      `${l.reference},${l.clientName},${l.productType},${l.amountRequested},${l.totalRepayable ?? l.amountRequested},${l.daysOverdue},${BUCKET_CONFIG[l.bucket].label},${l.officerName}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-aging-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-[#C9A227]" />
              PAR Aging Report
            </h1>
            <p className="text-sm text-slate-500 mt-1">Portfolio At Risk — aging analysis across all active loans</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchLoans}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#0B1F3A]/20 text-[#0B1F3A] hover:bg-[#0B1F3A]/5 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-white hover:bg-[#b8911f] text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Bucket Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {bucketStats.map(({ bucket, count, total }) => {
            const cfg = BUCKET_CONFIG[bucket];
            const isActive = filterBucket === bucket;
            return (
              <button
                key={bucket}
                onClick={() => setFilterBucket(isActive ? "ALL" : bucket)}
                className={`p-4 rounded-xl border text-left transition-all ${cfg.cardBg} ${cfg.cardBorder} ${isActive ? "ring-2 ring-[#C9A227]" : "hover:opacity-90"}`}
              >
                <p className={`text-xs font-medium uppercase tracking-wide ${cfg.textColor} mb-1`}>{cfg.label}</p>
                <p className="text-2xl font-bold text-[#0B1F3A] font-mono">{count}</p>
                <p className={`text-sm font-mono mt-1 ${cfg.textColor}`}>{K(total)}</p>
                <p className="text-xs text-slate-500 mt-1">{cfg.subLabel} overdue</p>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="text-slate-500">Filter:</span>
          {(["ALL", ...buckets] as (Bucket | "ALL")[]).map(b => (
            <button
              key={b}
              onClick={() => setFilterBucket(b)}
              className={`px-3 py-1 rounded-full border transition-colors ${filterBucket === b ? "bg-[#0B1F3A] text-white border-[#0B1F3A]" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            >
              {b === "ALL" ? "All" : BUCKET_CONFIG[b as Bucket].label}
            </button>
          ))}
          <span className="ml-auto text-slate-400">{filtered.length} loans</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading aging data...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-red-400 gap-2">
              <AlertTriangle className="w-5 h-5" /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <p className="font-medium">No overdue loans in this bucket</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B1F3A] text-white">
                    {["Loan Ref", "Client Name", "Product", "Principal", "Total Due", "Days Overdue", "Bucket", "Officer", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((loan, i) => {
                    const cfg = BUCKET_CONFIG[loan.bucket];
                    return (
                      <tr key={loan.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${loan.bucket !== "CURRENT" ? cfg.rowBg : ""} ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                        <td className="px-4 py-3 font-mono text-xs text-[#0B1F3A] font-medium">{loan.reference}</td>
                        <td className="px-4 py-3 text-[#0B1F3A] font-medium">{loan.clientName}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{loan.productType}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#0B1F3A]">{K(loan.amountRequested)}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0B1F3A]">{K(loan.totalRepayable ?? loan.amountRequested)}</td>
                        <td className="px-4 py-3 font-mono text-center">
                          <span className={`font-bold ${loan.daysOverdue === 0 ? "text-emerald-500" : loan.daysOverdue <= 30 ? "text-amber-500" : loan.daysOverdue <= 60 ? "text-orange-500" : "text-red-500"}`}>
                            {loan.daysOverdue}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeBg}`}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{loan.officerName}</td>
                        <td className="px-4 py-3">
                          <button className="px-3 py-1 text-xs rounded-lg bg-[#0B1F3A] text-white hover:bg-[#0B1F3A]/80 transition-colors">
                            {loan.daysOverdue === 0 ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Monitor</span> : <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Chase</span>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-3 text-right">
          Generated {new Date().toLocaleString()} · {enriched.length} total loans analysed
        </p>
      </div>
    </div>
  );
}
