import { useState, useEffect, useCallback } from "react";
import { Shield, CheckCircle, XCircle, AlertCircle, Clock, Eye, RefreshCw, FileText } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "/api";

interface KycAccount {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nrcNumber?: string;
  kycStatus: string;
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycRejectedReason?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  address?: string;
  city?: string;
  createdAt: string;
  kycDocuments?: { id: string; docType: string; uploadedAt: string }[];
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUBMITTED:   "bg-amber-900/40 text-amber-300 border border-amber-700/50",
    IN_REVIEW:   "bg-blue-900/40 text-blue-300 border border-blue-700/50",
    VERIFIED:    "bg-emerald-900/40 text-emerald-300 border border-emerald-700/50",
    REJECTED:    "bg-red-900/40 text-red-300 border border-red-700/50",
    NOT_STARTED: "bg-slate-800 text-slate-500 border border-slate-700",
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-slate-400"}`}>{status.replace("_", " ")}</span>;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function docLabel(key: string) {
  const map: Record<string, string> = {
    nrcFront: "NRC Front", nrcBack: "NRC Back", selfie: "Selfie w/ NRC", proofOfAddress: "Proof of Address",
  };
  return map[key] || key;
}

export default function KYCPage() {
  const [accounts, setAccounts] = useState<KycAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"SUBMITTED" | "IN_REVIEW" | "ALL">("SUBMITTED");
  const [selected, setSelected] = useState<KycAccount | null>(null);
  const [rejReason, setRejReason] = useState("");
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch(`${API}/admin/portal-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Failed to load accounts");
      const data: KycAccount[] = await r.json();
      // Attach kycDocuments from individual account fetches if needed
      const kyc = data.filter(a => ["SUBMITTED","IN_REVIEW","VERIFIED","REJECTED"].includes(a.kycStatus));
      setAccounts(kyc);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load detail (with kycDocuments) when an account is selected
  const loadDetail = async (id: string) => {
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch(`${API}/admin/portal-accounts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setSelected(data);
      }
    } catch { /* non-fatal */ }
  };

  useEffect(() => { load(); }, [load]);

  const updateKyc = async (newStatus: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const body: Record<string, string> = { kycStatus: newStatus };
      if (newStatus === "REJECTED" && rejReason) body.kycRejectedReason = rejReason;

      const r = await fetch(`${API}/admin/portal-accounts/${selected.id}/kyc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Update failed");

      showToast(`KYC ${newStatus === "VERIFIED" ? "approved" : newStatus === "IN_REVIEW" ? "moved to In Review" : "rejected"} successfully`);
      setRejReason("");
      await load();
      setSelected(prev => prev ? { ...prev, kycStatus: newStatus } : null);
    } catch {
      showToast("Failed to update KYC status");
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter === "ALL"
    ? accounts
    : accounts.filter(a => a.kycStatus === filter);

  const counts = {
    SUBMITTED: accounts.filter(a => a.kycStatus === "SUBMITTED").length,
    IN_REVIEW: accounts.filter(a => a.kycStatus === "IN_REVIEW").length,
    VERIFIED:  accounts.filter(a => a.kycStatus === "VERIFIED").length,
    REJECTED:  accounts.filter(a => a.kycStatus === "REJECTED").length,
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm shadow-lg animate-in">
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">KYC Verification Centre</h1>
          <p className="page-subtitle">Review and approve client identity documents</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pending",   key: "SUBMITTED",  color: "text-amber-400",   icon: Clock },
          { label: "In Review", key: "IN_REVIEW",  color: "text-blue-400",    icon: Eye },
          { label: "Verified",  key: "VERIFIED",   color: "text-emerald-400", icon: CheckCircle },
          { label: "Rejected",  key: "REJECTED",   color: "text-red-400",     icon: XCircle },
        ].map(({ label, key, color, icon: Icon }) => (
          <div key={key} className="philix-card p-3 text-center">
            <Icon size={16} className={`mx-auto mb-1 ${color}`} />
            <div className="text-lg font-bold text-slate-200">{counts[key as keyof typeof counts]}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["SUBMITTED", "IN_REVIEW", "ALL"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${filter === f ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            {f === "ALL" ? `All (${accounts.length})` : f === "SUBMITTED" ? `Pending (${counts.SUBMITTED})` : `In Review (${counts.IN_REVIEW})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <RefreshCw size={16} className="animate-spin" /> Loading KYC records…
        </div>
      ) : filtered.length === 0 ? (
        <div className="philix-card flex flex-col items-center justify-center py-16 text-center">
          <Shield size={40} className="text-slate-700 mb-3" />
          <div className="text-slate-400 font-semibold">No {filter === "ALL" ? "" : filter.replace("_", " ").toLowerCase() + " "}KYC submissions</div>
          <div className="text-slate-600 text-xs mt-1">When clients submit their KYC documents, they will appear here for review.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-2">
            {filtered.map(a => (
              <button key={a.id} onClick={() => loadDetail(a.id)}
                className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected?.id === a.id ? "border-indigo-600 border" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-indigo-300">
                    {a.firstName[0]}{a.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 text-sm truncate">{a.firstName} {a.lastName}</div>
                    <div className="text-xs text-slate-500">{a.clientNumber} · {a.email}</div>
                    {a.nrcNumber && <div className="text-xs text-slate-600 font-mono">{a.nrcNumber}</div>}
                  </div>
                  <div className="flex-shrink-0">{statusBadge(a.kycStatus)}</div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                  <span>Submitted {fmtDate(a.kycSubmittedAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="philix-card p-5 space-y-4 sticky top-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-100 text-lg">{selected.firstName} {selected.lastName}</div>
                  <div className="text-xs text-slate-500">{selected.clientNumber} · {selected.email}</div>
                </div>
                {statusBadge(selected.kycStatus)}
              </div>

              {/* Personal info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { l: "NRC",        v: selected.nrcNumber },
                  { l: "Phone",      v: selected.phone },
                  { l: "City",       v: selected.city },
                  { l: "Occupation", v: selected.occupation },
                  { l: "Employer",   v: selected.employer },
                  { l: "Income",     v: selected.monthlyIncome ? `K${selected.monthlyIncome.toLocaleString()}` : undefined },
                ].filter(r => r.v).map(row => (
                  <div key={row.l} className="bg-slate-800/50 rounded p-2">
                    <div className="text-slate-500">{row.l}</div>
                    <div className="text-slate-300 font-medium truncate">{row.v}</div>
                  </div>
                ))}
              </div>

              {/* Documents */}
              {selected.kycDocuments && selected.kycDocuments.length > 0 ? (
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Submitted Documents</div>
                  <div className="space-y-1.5">
                    {selected.kycDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                        <FileText size={13} className="text-indigo-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-300">{docLabel(doc.docType)}</div>
                          <div className="text-xs text-slate-600">{fmtDate(doc.uploadedAt)}</div>
                        </div>
                        <CheckCircle size={12} className="text-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500 flex items-center gap-2">
                  <AlertCircle size={12} /> No document metadata available
                </div>
              )}

              {/* Timeline */}
              <div className="text-xs space-y-1">
                {selected.kycSubmittedAt && (
                  <div className="flex justify-between text-slate-500">
                    <span>Submitted</span><span className="text-slate-400">{fmtDate(selected.kycSubmittedAt)}</span>
                  </div>
                )}
                {selected.kycVerifiedAt && (
                  <div className="flex justify-between text-slate-500">
                    <span>Verified</span><span className="text-emerald-400">{fmtDate(selected.kycVerifiedAt)}</span>
                  </div>
                )}
              </div>

              {/* Rejection reason input */}
              {selected.kycStatus !== "VERIFIED" && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Rejection reason <span className="text-slate-600">(optional)</span></label>
                  <textarea
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-slate-600 resize-none"
                    placeholder="e.g. Documents are blurry, please resubmit…"
                    value={rejReason}
                    onChange={e => setRejReason(e.target.value)}
                  />
                </div>
              )}

              {/* Action buttons */}
              {(selected.kycStatus === "SUBMITTED" || selected.kycStatus === "IN_REVIEW") && (
                <div className="flex gap-2">
                  {selected.kycStatus === "SUBMITTED" && (
                    <button onClick={() => updateKyc("IN_REVIEW")} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white py-2 rounded-lg">
                      <Eye size={12} /> {saving ? "…" : "Mark In Review"}
                    </button>
                  )}
                  <button onClick={() => updateKyc("VERIFIED")} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white py-2 rounded-lg">
                    <CheckCircle size={12} /> {saving ? "Saving…" : "Approve"}
                  </button>
                  <button onClick={() => updateKyc("REJECTED")} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white py-2 rounded-lg">
                    <XCircle size={12} /> {saving ? "…" : "Reject"}
                  </button>
                </div>
              )}

              {selected.kycStatus === "VERIFIED" && (
                <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-3 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle size={14} /> This client's identity is verified.
                </div>
              )}

              {selected.kycStatus === "REJECTED" && (
                <div className="space-y-2">
                  <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3 text-red-300 text-xs">
                    Rejected. Client can re-submit documents.
                  </div>
                  <button onClick={() => updateKyc("SUBMITTED")} disabled={saving}
                    className="w-full text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg">
                    Reset to Pending
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="philix-card flex items-center justify-center text-slate-500 text-sm" style={{ minHeight: 300 }}>
              Select a record to review
            </div>
          )}
        </div>
      )}
    </div>
  );
}
