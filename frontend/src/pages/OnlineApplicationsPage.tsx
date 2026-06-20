import { useEffect, useState, useMemo } from "react";
import {
  ExternalLink, Eye, CheckCircle, XCircle, AlertCircle, Clock, Send,
  RefreshCw, User, Briefcase, Shield, Users, Square, CheckSquare,
  Download, ChevronDown, ChevronRight, Calendar, Filter,
} from "lucide-react";
import { formatKwacha, formatDate, getStatusColor } from "../lib/mock-data";
import { useLoanApplicationStore, type LoanApplication } from "../store/loanApplicationStore";
import { staffApi } from "../lib/api";
import { toast } from "../store/toastStore";

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(apps: LoanApplication[]) {
  const headers = ["Reference","Client","Phone","Email","Product","Amount","Term (weeks)","Status","Submitted","Reviewed"];
  const rows = apps.map(a => [
    a.ref, a.clientName, a.clientPhone, a.clientEmail ?? "",
    a.productName, a.amount, a.termMonths ?? "",
    a.status, a.submittedAt ? new Date(a.submittedAt).toISOString().slice(0, 10) : "",
    a.reviewedAt ? new Date(a.reviewedAt).toISOString().slice(0, 10) : "",
  ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `philix-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: "PENDING",      label: "Submitted",    icon: Clock },
  { key: "UNDER_REVIEW", label: "Under Review", icon: Eye },
  { key: "APPROVED",     label: "Approved",     icon: CheckCircle },
  { key: "DISBURSED",    label: "Disbursed",    icon: Send },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, UNDER_REVIEW: 1, APPROVED: 2, DISBURSED: 3, REJECTED: 99,
};

function StatusTimeline({ app }: { app: LoanApplication }) {
  const isRejected = app.status === "REJECTED";
  const currentIdx = STATUS_ORDER[app.status] ?? 0;

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/40 rounded-xl">
        <XCircle size={14} className="text-red-400 flex-shrink-0" />
        <div>
          <div className="text-xs font-bold text-red-400">Application Rejected</div>
          {app.reviewedAt && <div className="text-xs text-slate-600 mt-0.5">{formatDate(app.reviewedAt)}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const future = i > currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                done ? "bg-emerald-600 border-emerald-500" :
                active ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/40" :
                "bg-slate-800 border-slate-700"
              }`}>
                {done ? (
                  <CheckCircle size={13} className="text-white" />
                ) : (
                  <step.icon size={11} className={active ? "text-white" : "text-slate-600"} />
                )}
              </div>
              <div className={`text-[9px] mt-1 text-center leading-tight ${
                done ? "text-emerald-400" : active ? "text-indigo-400 font-semibold" : "text-slate-700"
              }`}>
                {step.label}
              </div>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-3 rounded-full ${done ? "bg-emerald-600" : "bg-slate-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OnlineApplicationsPage() {
  const { applications, updateStatus, syncFromApi } = useLoanApplicationStore();
  const [selected, setSelected] = useState<LoanApplication | null>(null);
  const [note, setNote] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { syncFromApi(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncFromApi();
    setSyncing(false);
  };

  const handleAction = async (id: string, newStatus: string) => {
    setActionLoading(id);
    try {
      await staffApi.updateApplicationStatus(id, newStatus, note || undefined);
      updateStatus(id, newStatus as LoanApplication["status"]);
      setSelected(prev => prev?.id === id ? { ...prev, status: newStatus as LoanApplication["status"] } : prev);
      const app = applications.find(a => a.id === id);
      const label = newStatus === "APPROVED" ? "approved" : newStatus === "REJECTED" ? "rejected" : newStatus === "DISBURSED" ? "marked as disbursed" : newStatus.toLowerCase().replace("_", " ");
      const type = newStatus === "REJECTED" ? "error" : newStatus === "APPROVED" || newStatus === "DISBURSED" ? "success" : "info";
      toast[type](`Application ${app?.ref ?? id} ${label}`);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch {
      toast.error("Action failed — please try again");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = [...selectedIds];
    let successCount = 0;
    for (const id of ids) {
      try {
        await staffApi.updateApplicationStatus(id, newStatus, note || undefined);
        updateStatus(id, newStatus as LoanApplication["status"]);
        successCount++;
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      } catch { /* continue */ }
    }
    const type = newStatus === "REJECTED" ? "error" : "success";
    const label = newStatus === "APPROVED" ? "approved" : newStatus === "REJECTED" ? "rejected" : newStatus.toLowerCase();
    toast[type](`${successCount} application${successCount !== 1 ? "s" : ""} ${label}`);
    if (selected && ids.includes(selected.id)) setSelected(null);
    setBulkLoading(false);
  };

  const statusMeta: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    PENDING:      { icon: Clock,       color: "text-amber-400",   bg: "bg-amber-900/20 border-amber-800/40",     label: "Pending" },
    UNDER_REVIEW: { icon: Eye,         color: "text-blue-400",    bg: "bg-blue-900/20 border-blue-800/40",       label: "Under Review" },
    APPROVED:     { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/40", label: "Approved" },
    REJECTED:     { icon: XCircle,     color: "text-red-400",     bg: "bg-red-900/20 border-red-800/40",         label: "Rejected" },
    DISBURSED:    { icon: Send,        color: "text-indigo-400",  bg: "bg-indigo-900/20 border-indigo-800/40",   label: "Disbursed" },
  };

  // Today's stats
  const today = new Date().toISOString().slice(0, 10);
  const todayNew = applications.filter(a => a.submittedAt?.slice(0, 10) === today).length;
  const todayReviewed = applications.filter(a => a.reviewedAt?.slice(0, 10) === today).length;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weekDisbursed = applications.filter(a => a.status === "DISBURSED" && (a.reviewedAt ?? "") >= weekAgo).length;
  const totalPending = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;

  const counts: Record<string, number> = {};
  applications.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });

  const filtered = useMemo(() => {
    return applications.filter(a => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (dateFrom && a.submittedAt && a.submittedAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && a.submittedAt && a.submittedAt.slice(0, 10) > dateTo) return false;
      if (amountMin && a.amount < parseFloat(amountMin)) return false;
      if (amountMax && a.amount > parseFloat(amountMax)) return false;
      return true;
    });
  }, [applications, statusFilter, dateFrom, dateTo, amountMin, amountMax]);

  const hasFilters = dateFrom || dateTo || amountMin || amountMax;

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  }

  function Field({ label, value }: { label: string; value?: string | number | null }) {
    if (!value && value !== 0) return null;
    return (
      <div className="bg-slate-800/50 rounded-lg p-2.5">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-medium text-slate-200 mt-0.5">{value}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Online Applications</h1>
          <p className="page-subtitle">Review and process client self-service loan applications</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportCSV(filtered)} className="btn-secondary text-xs py-1.5">
            <Download size={12} /> Export CSV
          </button>
          <button onClick={handleSync} disabled={syncing} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> Refresh
          </button>
          <span className="text-xs text-slate-500 hidden lg:block">Portal:</span>
          <span className="text-xs font-mono text-indigo-400 bg-slate-800 px-2 py-1 rounded hidden lg:block">apply.philixfinance.com</span>
          <a href="https://philixfinance.com" target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 hidden lg:flex">
            <ExternalLink size={12} /> Visit
          </a>
        </div>
      </div>

      {/* Today's Activity Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "New Today", value: todayNew, color: "amber" },
          { label: "Reviewed Today", value: todayReviewed, color: "blue" },
          { label: "Disbursed This Week", value: weekDisbursed, color: "emerald" },
          { label: "Awaiting Review", value: totalPending, color: "indigo", highlight: totalPending > 0 },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 flex items-center justify-between ${
            s.highlight ? "bg-indigo-900/20 border-indigo-800/40" : "bg-slate-900 border-slate-800"
          }`}>
            <div className={`text-2xl font-black ${s.highlight ? "text-indigo-400" : `text-${s.color}-400`}`}>{s.value}</div>
            <div className="text-xs text-slate-500 text-right leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status Tabs + Filter Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          All ({applications.length})
        </button>
        {Object.entries(statusMeta).map(([status, meta]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === status ? "bg-slate-700 text-white" : "bg-slate-800/50 text-slate-400 hover:text-slate-200"}`}
          >
            <meta.icon size={12} className={meta.color} />
            {meta.label} ({counts[status] ?? 0})
          </button>
        ))}
        <button onClick={() => setShowFilters(v => !v)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            hasFilters ? "bg-amber-900/20 border-amber-800/40 text-amber-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
          }`}>
          <Filter size={12} />
          Filters {hasFilters ? "•" : ""}
          {showFilters ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="philix-card p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Submitted From</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="input-base text-xs pl-7" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Submitted To</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="input-base text-xs pl-7" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Amount Min (K)</label>
              <input type="number" value={amountMin} onChange={e => setAmountMin(e.target.value)}
                className="input-base text-xs" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Amount Max (K)</label>
              <input type="number" value={amountMax} onChange={e => setAmountMax(e.target.value)}
                className="input-base text-xs" placeholder="999999" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-slate-500">{filtered.length} of {applications.length} shown</span>
            <button onClick={() => { setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); }}
              className="text-xs text-red-400 hover:text-red-300">Clear filters</button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="philix-card p-3 border-indigo-800/40 bg-indigo-900/10 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-indigo-300">{selectedIds.size} selected</span>
          <button onClick={() => handleBulkAction("APPROVED")} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            <CheckCircle size={12} /> Approve All
          </button>
          <button onClick={() => handleBulkAction("UNDER_REVIEW")} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            <Eye size={12} /> Mark Under Review
          </button>
          <button onClick={() => handleBulkAction("REJECTED")} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            <XCircle size={12} /> Reject All
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300">Clear selection</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Application List */}
        <div className="lg:col-span-2 space-y-2">
          {/* Select All */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {selectedIds.size === filtered.length && filtered.length > 0
                  ? <CheckSquare size={14} className="text-indigo-400" />
                  : <Square size={14} />}
                {selectedIds.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}
              </button>
              <span className="text-xs text-slate-600">{filtered.length} application{filtered.length !== 1 ? "s" : ""}</span>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="philix-card p-10 text-center text-slate-500 text-sm">
              {statusFilter === "ALL" && !hasFilters
                ? "No applications yet. They appear here when clients submit through the portal."
                : `No applications match the current filter.`}
            </div>
          )}
          {filtered.map(app => {
            const meta = statusMeta[app.status] ?? statusMeta.PENDING;
            const initials = app.clientName.split(" ").map(p => p[0]).slice(0, 2).join("");
            const isSelected = selectedIds.has(app.id);
            return (
              <div key={app.id} className={`philix-card p-4 transition-all cursor-pointer ${
                selected?.id === app.id ? "border-indigo-600 border" : isSelected ? "border-indigo-800 border bg-indigo-900/5" : "hover:border-slate-700"
              }`}>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); toggleSelect(app.id); }}
                    className="flex-shrink-0 text-slate-600 hover:text-indigo-400 transition-colors">
                    {isSelected ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} />}
                  </button>
                  <button onClick={() => { setSelected(app); setNote(""); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center font-bold text-indigo-400 flex-shrink-0 text-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200 text-sm">{app.clientName}</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${meta.color} bg-slate-800`}>{meta.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{app.ref} · {app.productName}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-slate-100 text-sm">{formatKwacha(app.amount)}</div>
                      <div className="text-xs text-slate-500">{app.submittedAt ? formatDate(app.submittedAt) : "—"}</div>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="lg:col-span-3 philix-card p-5 space-y-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {/* Status Timeline */}
            <StatusTimeline app={selected} />

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-full bg-indigo-600/20 flex items-center justify-center font-bold text-indigo-400 text-xl flex-shrink-0">
                {selected.clientName.split(" ").map(p => p[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-100 text-lg leading-tight">{selected.clientName}</div>
                <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                  {selected.clientNumber && <span className="font-mono">{selected.clientNumber}</span>}
                  <span>{selected.clientEmail}</span>
                </div>
                <div className="text-xs text-slate-500">{selected.clientPhone}</div>
              </div>
              <div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusMeta[selected.status]?.bg ?? ""} ${statusMeta[selected.status]?.color ?? ""}`}>
                  {statusMeta[selected.status]?.label ?? selected.status}
                </span>
                {selected.reviewedAt && (
                  <div className="text-xs text-slate-500 mt-1 text-right">Reviewed {formatDate(selected.reviewedAt)}</div>
                )}
              </div>
            </div>

            {selected.rejectedReason && (
              <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800/40 rounded-xl">
                <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-red-400">Rejection Reason</div>
                  <div className="text-xs text-red-300 mt-0.5">{selected.rejectedReason}</div>
                </div>
              </div>
            )}

            {/* Loan Details */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-indigo-600/20 flex items-center justify-center">
                  <Send size={12} className="text-indigo-400" />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Loan Details</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Reference" value={selected.ref} />
                <Field label="Product" value={selected.productName} />
                <Field label="Amount Requested" value={formatKwacha(selected.amount)} />
                <Field label="Term" value={selected.termMonths ? `${selected.termMonths} weeks` : selected.rateDuration} />
                {selected.totalRepayable > selected.amount && (
                  <Field label="Total Repayable" value={formatKwacha(selected.totalRepayable)} />
                )}
                <Field label="Purpose" value={selected.purpose} />
                {selected.description && <Field label="Description" value={selected.description} />}
                <Field label="Submitted" value={selected.submittedAt ? formatDate(selected.submittedAt) : undefined} />
              </div>
            </section>

            {/* Employment & Income */}
            {(selected.occupation || selected.employer || selected.monthlyIncome) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-emerald-600/20 flex items-center justify-center">
                    <Briefcase size={12} className="text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Employment & Income</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Occupation" value={selected.occupation} />
                  <Field label="Employer" value={selected.employer} />
                  <Field label="Employer Phone" value={selected.employerPhone} />
                  <Field label="Monthly Income" value={selected.monthlyIncome ? formatKwacha(selected.monthlyIncome) : undefined} />
                  <Field label="Pay Date" value={selected.payDate} />
                </div>
              </section>
            )}

            {/* Collateral */}
            {(selected.collateralType || selected.collateralDescription || selected.collateralValue || (selected.collateralPhotos && selected.collateralPhotos.length > 0)) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-amber-600/20 flex items-center justify-center">
                    <Shield size={12} className="text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Collateral</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Field label="Type" value={selected.collateralType} />
                  <Field label="Description" value={selected.collateralDescription} />
                  <Field label="Estimated Value" value={selected.collateralValue ? formatKwacha(selected.collateralValue) : undefined} />
                  {selected.collateralCondition && <Field label="Condition" value={selected.collateralCondition} />}
                </div>
                {selected.collateralPhotos && selected.collateralPhotos.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2">{selected.collateralPhotos.length} photo{selected.collateralPhotos.length > 1 ? "s" : ""} uploaded</div>
                    <div className="grid grid-cols-2 gap-2">
                      {selected.collateralPhotos.map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={src} alt={`Collateral photo ${i + 1}`}
                            className="w-full h-36 object-cover rounded-xl border border-slate-700 hover:border-amber-500 transition-colors cursor-zoom-in" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* References */}
            {(selected.ref1Name || selected.ref2Name) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-blue-600/20 flex items-center justify-center">
                    <Users size={12} className="text-blue-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">References</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {selected.ref1Name && (
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Reference 1</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.ref1Name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{selected.ref1Phone}{selected.ref1Relation ? ` · ${selected.ref1Relation}` : ""}</div>
                    </div>
                  )}
                  {selected.ref2Name && (
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Reference 2</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.ref2Name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{selected.ref2Phone}{selected.ref2Relation ? ` · ${selected.ref2Relation}` : ""}</div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Client Identity */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-slate-600/40 flex items-center justify-center">
                  <User size={12} className="text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Client</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Full Name" value={selected.clientName} />
                <Field label="Client Number" value={selected.clientNumber} />
                <Field label="Email" value={selected.clientEmail} />
                <Field label="Phone" value={selected.clientPhone} />
              </div>
            </section>

            {/* Review Notes */}
            <section>
              <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Review Notes</label>
              <textarea className="input-base" rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Add notes for client or internal records..." />
            </section>

            {/* Actions */}
            {(selected.status === "PENDING" || selected.status === "UNDER_REVIEW") && (
              <div className="flex gap-2">
                <button onClick={() => handleAction(selected.id, "APPROVED")} disabled={!!actionLoading}
                  className="btn-success flex-1 disabled:opacity-50">
                  <CheckCircle size={13} /> Approve
                </button>
                <button onClick={() => handleAction(selected.id, "UNDER_REVIEW")} disabled={!!actionLoading}
                  className="btn-secondary flex-1 disabled:opacity-50">
                  <Eye size={13} /> Under Review
                </button>
                <button onClick={() => handleAction(selected.id, "REJECTED")} disabled={!!actionLoading}
                  className="btn-danger flex-1 disabled:opacity-50">
                  <XCircle size={13} /> Reject
                </button>
              </div>
            )}
            {selected.status === "APPROVED" && (
              <button onClick={() => handleAction(selected.id, "DISBURSED")} disabled={!!actionLoading}
                className="btn-primary w-full disabled:opacity-50">
                Mark as Disbursed →
              </button>
            )}
            {(selected.status === "REJECTED" || selected.status === "DISBURSED") && (
              <div className="text-center text-xs text-slate-500 py-2">
                {selected.status === "DISBURSED" ? "This application has been disbursed." : "This application was rejected."}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-3 philix-card flex flex-col items-center justify-center text-center py-16 text-slate-500">
            <AlertCircle size={32} className="mb-3 opacity-30" />
            <div className="text-sm font-medium">Select an application</div>
            <div className="text-xs mt-1">to review all details and take action</div>
          </div>
        )}
      </div>
    </div>
  );
}
