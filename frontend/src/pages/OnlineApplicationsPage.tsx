import { useEffect, useState } from "react";
import { ExternalLink, Eye, CheckCircle, XCircle, AlertCircle, Clock, Send, RefreshCw, User, Briefcase, Shield, Users } from "lucide-react";
import { formatKwacha, formatDate, getStatusColor } from "../lib/mock-data";
import { useLoanApplicationStore, type LoanApplication } from "../store/loanApplicationStore";
import { staffApi } from "../lib/api";
import { toast } from "../store/toastStore";

export default function OnlineApplicationsPage() {
  const { applications, updateStatus, syncFromApi } = useLoanApplicationStore();
  const [selected, setSelected] = useState<LoanApplication | null>(null);
  const [note, setNote] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

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
    } catch {
      toast.error("Action failed — please try again");
    } finally {
      setActionLoading(null);
    }
  };

  const statusMeta: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    PENDING:      { icon: Clock,         color: "text-amber-400",   bg: "bg-amber-900/20 border-amber-800/40",   label: "Pending" },
    UNDER_REVIEW: { icon: Eye,           color: "text-blue-400",    bg: "bg-blue-900/20 border-blue-800/40",     label: "Under Review" },
    APPROVED:     { icon: CheckCircle,   color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/40", label: "Approved" },
    REJECTED:     { icon: XCircle,       color: "text-red-400",     bg: "bg-red-900/20 border-red-800/40",       label: "Rejected" },
    DISBURSED:    { icon: Send,          color: "text-indigo-400",  bg: "bg-indigo-900/20 border-indigo-800/40", label: "Disbursed" },
  };

  const counts: Record<string, number> = {};
  applications.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });

  const filtered = statusFilter === "ALL" ? applications : applications.filter(a => a.status === statusFilter);

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
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Online Applications</h1>
          <p className="page-subtitle">Review and process client self-service loan applications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> Refresh
          </button>
          <span className="text-xs text-slate-500">Portal URL:</span>
          <span className="text-xs font-mono text-indigo-400 bg-slate-800 px-2 py-1 rounded">apply.philixfinance.com</span>
          <button className="btn-secondary text-xs py-1.5"><ExternalLink size={12} /> Visit</button>
        </div>
      </div>

      {/* Status Tabs */}
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
            {meta.label} {counts[status] ? `(${counts[status]})` : "(0)"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Application List — 2 cols */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.length === 0 && (
            <div className="philix-card p-10 text-center text-slate-500 text-sm">
              {statusFilter === "ALL" ? "No applications yet. They appear here when clients submit through the portal." : `No ${statusMeta[statusFilter]?.label} applications.`}
            </div>
          )}
          {filtered.map(app => {
            const meta = statusMeta[app.status] ?? statusMeta.PENDING;
            const initials = app.clientName.split(" ").map(p => p[0]).slice(0, 2).join("");
            return (
              <button key={app.id} onClick={() => { setSelected(app); setNote(""); }}
                className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected?.id === app.id ? "border-indigo-600 border" : ""}`}>
                <div className="flex items-center gap-3">
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
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel — 3 cols */}
        {selected ? (
          <div className="lg:col-span-3 philix-card p-5 space-y-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
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
                <Field label="Term" value={selected.termMonths ? `${selected.termMonths} months` : selected.rateDuration} />
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
            {(selected.collateralType || selected.collateralDescription || selected.collateralValue) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded bg-amber-600/20 flex items-center justify-center">
                    <Shield size={12} className="text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Collateral</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Type" value={selected.collateralType} />
                  <Field label="Description" value={selected.collateralDescription} />
                  <Field label="Estimated Value" value={selected.collateralValue ? formatKwacha(selected.collateralValue) : undefined} />
                  {selected.collateralCondition && <Field label="Condition" value={selected.collateralCondition} />}
                </div>
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
              <textarea className="input-base" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add notes for client or internal records..." />
            </section>

            {/* Actions */}
            {(selected.status === "PENDING" || selected.status === "UNDER_REVIEW") && (
              <div className="flex gap-2">
                <button onClick={() => handleAction(selected.id, "APPROVED")} disabled={actionLoading === selected.id}
                  className="btn-success flex-1 disabled:opacity-50">
                  <CheckCircle size={13} /> Approve
                </button>
                <button onClick={() => handleAction(selected.id, "UNDER_REVIEW")} disabled={actionLoading === selected.id}
                  className="btn-secondary flex-1 disabled:opacity-50">
                  <Eye size={13} /> Under Review
                </button>
                <button onClick={() => handleAction(selected.id, "REJECTED")} disabled={actionLoading === selected.id}
                  className="btn-danger flex-1 disabled:opacity-50">
                  <XCircle size={13} /> Reject
                </button>
              </div>
            )}
            {selected.status === "APPROVED" && (
              <button onClick={() => handleAction(selected.id, "DISBURSED")} disabled={actionLoading === selected.id}
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
            <Eye size={32} className="mb-3 opacity-30" />
            <div className="text-sm font-medium">Select an application</div>
            <div className="text-xs mt-1">to review all details</div>
          </div>
        )}
      </div>
    </div>
  );
}
