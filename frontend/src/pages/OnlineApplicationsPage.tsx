import { useState } from "react";
import { ExternalLink, Eye, CheckCircle, XCircle, AlertCircle, Clock, Send } from "lucide-react";
import { formatKwacha, formatDate, getStatusColor } from "../lib/mock-data";
import { useLoanApplicationStore, type LoanApplication } from "../store/loanApplicationStore";

// Adapter: map store LoanApplication → display shape used by this page
function toDisplayApp(a: LoanApplication) {
  const parts = a.clientName.split(" ");
  return {
    id: a.id,
    firstName: parts[0] ?? a.clientName,
    lastName: parts.slice(1).join(" ") || "",
    nrcNumber: "—",
    phone: a.clientPhone,
    email: a.clientEmail,
    collateralType: a.collateralType || "—",
    collateralBrand: a.collateralDescription || "—",
    collateralModel: "",
    loanAmount: a.amount,
    loanPurpose: a.purpose,
    status: a.status === "PENDING" ? "SUBMITTED" : a.status,
    applicationRef: a.ref,
    submittedAt: a.submittedAt,
    clientType: a.occupation || "Individual",
    reviewNotes: "",
    // extra
    productName: a.productName,
    rateDuration: a.rateDuration,
    totalRepayable: a.totalRepayable,
    storeId: a.id,
  };
}

export default function OnlineApplicationsPage() {
  const { applications: storeApps, updateStatus } = useLoanApplicationStore();
  const displayApps = storeApps.map(toDisplayApp);
  type DisplayApp = ReturnType<typeof toDisplayApp>;
  const [selected, setSelected] = useState<DisplayApp | null>(null);
  const [note, setNote] = useState("");

  const handleAction = (id: string, newStatus: string) => {
    updateStatus(id, newStatus as LoanApplication["status"]);
    setSelected(prev => prev?.storeId === id ? { ...prev, status: newStatus } : prev);
  };

  const counts: Record<string, number> = {};
  displayApps.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });

  const statusMeta: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    DRAFT: { icon: Clock, color: "text-slate-400", label: "Draft" },
    SUBMITTED: { icon: Send, color: "text-blue-400", label: "Submitted" },
    UNDER_REVIEW: { icon: Eye, color: "text-amber-400", label: "Under Review" },
    INFO_REQUIRED: { icon: AlertCircle, color: "text-orange-400", label: "Info Required" },
    APPROVED: { icon: CheckCircle, color: "text-emerald-400", label: "Approved" },
    REJECTED: { icon: XCircle, color: "text-red-400", label: "Rejected" },
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Online Applications</h1>
          <p className="page-subtitle">Review and process client self-service loan applications</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Portal URL:</span>
          <span className="text-xs font-mono text-indigo-400 bg-slate-800 px-2 py-1 rounded">apply.philixfinance.com</span>
          <button className="btn-secondary text-xs py-1.5"><ExternalLink size={12} /> Visit</button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusMeta).map(([status, meta]) => (
          <div key={status} className="philix-card p-3 text-center">
            <meta.icon size={18} className={`${meta.color} mx-auto mb-1`} />
            <div className={`text-xl font-bold ${meta.color}`}>{counts[status] || 0}</div>
            <div className="text-xs text-slate-500">{meta.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application List */}
        <div className="space-y-3">
          {displayApps.length === 0 && (
            <div className="philix-card p-10 text-center text-slate-500 text-sm">
              No client applications yet. They will appear here when clients submit loan applications through the portal.
            </div>
          )}
          {displayApps.map(app => {
            const meta = statusMeta[app.status] ?? statusMeta.SUBMITTED;
            return (
              <button key={app.id} onClick={() => setSelected(app)}
                className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected?.id === app.id ? "border-indigo-600 border" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center font-bold text-indigo-400 flex-shrink-0">
                    {app.firstName[0]}{app.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{app.firstName} {app.lastName}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${meta.color} bg-slate-800`}>{meta.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{app.applicationRef} · {app.collateralType}: {app.collateralBrand} {app.collateralModel}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-100">{formatKwacha(app.loanAmount)}</div>
                    <div className="text-xs text-slate-500">{app.submittedAt ? formatDate(app.submittedAt) : "Draft"}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="philix-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center font-bold text-indigo-400 text-lg flex-shrink-0">
                {selected.firstName[0]}{selected.lastName[0]}
              </div>
              <div>
                <div className="font-bold text-slate-100 text-lg">{selected.firstName} {selected.lastName}</div>
                <div className="text-xs text-slate-500">{selected.applicationRef} · {selected.clientType}</div>
              </div>
              <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(selected.status)}`}>{selected.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "NRC", value: selected.nrcNumber },
                { label: "Phone", value: selected.phone },
                { label: "Email", value: selected.email || "—" },
                { label: "Loan Amount", value: formatKwacha(selected.loanAmount) },
                { label: "Collateral", value: `${selected.collateralBrand} ${selected.collateralModel}` },
                { label: "Type", value: selected.collateralType },
              ].map(f => (
                <div key={f.label} className="bg-slate-800/50 rounded p-2.5">
                  <div className="text-xs text-slate-500">{f.label}</div>
                  <div className="text-sm font-medium text-slate-200 mt-0.5">{f.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Loan Purpose</div>
              <div className="text-sm text-slate-300">{selected.loanPurpose}</div>
            </div>

            {selected.reviewNotes && (
              <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-300">
                <AlertCircle size={12} className="inline mr-1" />{selected.reviewNotes}
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Review Notes</label>
              <textarea className="input-base" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Add notes for client or internal..." />
            </div>

            {(selected.status === "SUBMITTED" || selected.status === "UNDER_REVIEW") && (
              <div className="flex gap-2">
                <button onClick={() => handleAction(selected.storeId, "APPROVED")} className="btn-success flex-1">
                  <CheckCircle size={13} /> Approve
                </button>
                <button onClick={() => handleAction(selected.storeId, "UNDER_REVIEW")} className="btn-secondary flex-1">
                  <AlertCircle size={13} /> Under Review
                </button>
                <button onClick={() => handleAction(selected.storeId, "REJECTED")} className="btn-danger flex-1">
                  <XCircle size={13} /> Reject
                </button>
              </div>
            )}
            {selected.status === "APPROVED" && (
              <button onClick={() => handleAction(selected.storeId, "DISBURSED")} className="btn-primary w-full">
                Mark as Disbursed →
              </button>
            )}
          </div>
        ) : (
          <div className="philix-card flex items-center justify-center text-slate-500 text-sm" style={{ minHeight: 300 }}>
            Select an application to review
          </div>
        )}
      </div>
    </div>
  );
}
