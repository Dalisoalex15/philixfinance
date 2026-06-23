import { useState, useEffect, useCallback } from "react";
import { Receipt, CheckCircle, XCircle, RefreshCw, Eye, X, Clock, Loader2 } from "lucide-react";

const API = "/api";
function token() { return localStorage.getItem("philix_staff_token") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface Submission {
  id: string;
  applicationId: string;
  amount: number | null;
  paymentMethod: string | null;
  provider: string | null;
  reference: string | null;
  screenshotData: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  application: {
    reference: string;
    productType: string;
    amountRequested: number;
    account: { firstName: string; lastName: string; clientNumber: string; email: string };
  };
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

export default function PaymentSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/payment-submissions`, { headers: authH() });
      if (r.ok) setSubmissions(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function approve(id: string) {
    setActionLoading(id);
    const sub = selected;
    try {
      const r = await fetch(`${API}/admin/payment-submissions/${id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (r.ok) {
        // Optimistic in-place update — no full reload needed
        const now = new Date().toISOString();
        setSubmissions(prev => prev.map(s =>
          s.id === id ? { ...s, status: "APPROVED" as const, reviewedAt: now } : s
        ));
        setSelected(null);
        showToast(`✅ Payment approved${sub ? ` for ${sub.application.account.firstName} ${sub.application.account.lastName}` : ""}${sub?.amount ? ` — ${K(sub.amount)}` : ""}`);
        load(); // background sync
      } else {
        showToast("Failed to approve. Please try again.", "error");
      }
    } finally { setActionLoading(null); }
  }

  async function reject(id: string) {
    setActionLoading(id);
    const sub = selected;
    try {
      const r = await fetch(`${API}/admin/payment-submissions/${id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "REJECTED", rejectedReason: rejectReason }),
      });
      if (r.ok) {
        const now = new Date().toISOString();
        setSubmissions(prev => prev.map(s =>
          s.id === id ? { ...s, status: "REJECTED" as const, reviewedAt: now, rejectedReason: rejectReason || null } : s
        ));
        setRejectReason(""); setShowReject(false);
        setSelected(null);
        showToast(`❌ Payment rejected${sub ? ` for ${sub.application.account.firstName} ${sub.application.account.lastName}` : ""}`);
        load(); // background sync
      } else {
        showToast("Failed to reject. Please try again.", "error");
      }
    } finally { setActionLoading(null); }
  }

  const pending = submissions.filter(s => s.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Payment Submissions</h1>
          <p className="page-subtitle">Client payment proofs awaiting approval</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-full">
              {pending.length} pending
            </span>
          )}
          <button onClick={load} className="btn-secondary py-2 px-3 flex items-center gap-1.5">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Submitted",  value: submissions.length,                                                                    color: "text-navy-900"    },
          { label: "Pending Review",   value: pending.length,                                                                        color: "text-amber-600"   },
          { label: "Approved",         value: submissions.filter(s => s.status === "APPROVED").length,                              color: "text-emerald-600" },
          {
            label: "Total Paid (ZMW)",
            value: K(submissions.filter(s => s.status === "APPROVED").reduce((sum, s) => sum + (s.amount ?? 0), 0)),
            color: "text-indigo-700",
          },
        ].map(s => (
          <div key={s.label} className="philix-card p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-navy-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="philix-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-warm-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-warm-100 rounded animate-pulse w-40" />
                  <div className="h-3 bg-warm-100 rounded animate-pulse w-24" />
                </div>
                <div className="h-3 bg-warm-100 rounded animate-pulse w-20" />
                <div className="h-3 bg-warm-100 rounded animate-pulse w-16" />
                <div className="h-6 bg-warm-100 rounded-full animate-pulse w-16" />
                <div className="h-3 bg-warm-100 rounded animate-pulse w-20" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16">
            <Receipt size={32} className="mx-auto mb-3 text-navy-300" />
            <div className="text-navy-500 font-medium">No payment submissions yet</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Loan Ref</th>
                <th>Amount Paid</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="table-row-hover">
                  <td>
                    <div className="font-semibold text-sm">{s.application.account.firstName} {s.application.account.lastName}</div>
                    <div className="text-xs font-mono text-indigo-600">{s.application.account.clientNumber}</div>
                  </td>
                  <td className="font-mono text-sm text-navy-700">{s.application.reference}</td>
                  <td className="font-bold text-sm text-navy-900">{s.amount ? K(s.amount) : "—"}</td>
                  <td className="text-sm text-navy-600">{s.paymentMethod?.replace("_", " ") || "—"}</td>
                  <td className="text-sm font-mono text-navy-600">{s.reference || "—"}</td>
                  <td>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-xs text-navy-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => setSelected(s)} className="text-indigo-600 hover:text-indigo-700 p-1">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setSelected(null); setShowReject(false); setRejectReason(""); }} />
          <div className="relative ml-auto w-full max-w-xl h-full bg-white flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200 flex-shrink-0">
              <div>
                <h2 className="font-bold text-navy-900 text-lg">Payment Proof</h2>
                <div className="text-xs text-navy-600 mt-0.5">
                  {selected.application.account.firstName} {selected.application.account.lastName} · {selected.application.reference}
                </div>
              </div>
              <button onClick={() => { setSelected(null); setShowReject(false); setRejectReason(""); }} className="text-navy-400 hover:text-navy-700"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Client", value: `${selected.application.account.firstName} ${selected.application.account.lastName}` },
                  { label: "Client #", value: selected.application.account.clientNumber },
                  { label: "Loan Ref", value: selected.application.reference },
                  { label: "Loan Amount", value: K(selected.application.amountRequested) },
                  { label: "Amount Paid", value: selected.amount ? K(selected.amount) : "Not specified" },
                  { label: "Payment Method", value: selected.paymentMethod?.replace("_", " ") || "—" },
                  { label: "Provider / Bank", value: selected.provider || "—" },
                  { label: "Transaction Ref", value: selected.reference || "—" },
                  { label: "Submitted", value: new Date(selected.createdAt).toLocaleString() },
                  { label: "Status", value: selected.status },
                ].map(r => (
                  <div key={r.label}>
                    <div className="text-[10px] text-navy-400 uppercase tracking-wider">{r.label}</div>
                    <div className="text-navy-800 font-medium">{r.value}</div>
                  </div>
                ))}
              </div>

              {selected.notes && (
                <div>
                  <div className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">Notes from Client</div>
                  <div className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-navy-700">{selected.notes}</div>
                </div>
              )}

              {selected.screenshotData ? (
                <div>
                  <div className="text-[10px] text-navy-400 uppercase tracking-wider mb-2">Transaction Screenshot</div>
                  <img src={selected.screenshotData} alt="Payment proof" className="w-full rounded-xl border border-warm-200 object-contain max-h-80" />
                </div>
              ) : (
                <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 text-center text-sm text-navy-500">
                  No screenshot attached
                </div>
              )}

              {selected.status === "REJECTED" && selected.rejectedReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                  <strong>Rejection reason:</strong> {selected.rejectedReason}
                </div>
              )}
            </div>

            {selected.status === "PENDING" && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-warm-200 space-y-3">
                {!showReject ? (
                  <div className="flex gap-3">
                    <button onClick={() => approve(selected.id)} disabled={actionLoading === selected.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">
                      {actionLoading === selected.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                      {actionLoading === selected.id ? "Approving…" : "Approve Payment"}
                    </button>
                    <button onClick={() => setShowReject(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-xl">
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      className="w-full px-3 py-2 border border-warm-300 rounded-xl text-sm focus:outline-none focus:border-red-400"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => reject(selected.id)} disabled={actionLoading === selected.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50">
                        {actionLoading === selected.id ? <Loader2 size={14} className="animate-spin" /> : null}
                        {actionLoading === selected.id ? "Rejecting…" : "Confirm Rejection"}
                      </button>
                      <button onClick={() => { setShowReject(false); setRejectReason(""); }}
                        className="flex-1 py-2 text-sm font-semibold border border-warm-300 text-navy-600 rounded-xl">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selected.status !== "PENDING" && (
              <div className={`flex-shrink-0 px-6 py-4 border-t ${selected.status === "APPROVED" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {selected.status === "APPROVED"
                    ? <><CheckCircle size={15} className="text-emerald-600" /><span className="text-emerald-700">Payment approved by {selected.reviewedBy}</span></>
                    : <><XCircle size={15} className="text-red-600" /><span className="text-red-700">Rejected by {selected.reviewedBy}</span></>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
