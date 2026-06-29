// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import {
  ScanLine, CheckCircle, XCircle, RefreshCw, Eye, X, Loader2,
  Clock, ZoomIn, Copy, AlertTriangle,
} from "lucide-react";

const API = "/api";
function token() { return localStorage.getItem("philix_staff_token") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }
const K = (n: number) => `K${Number(n).toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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

const isRollover = (s: Submission) => s.notes === "LOAN_ROLLOVER";

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_CHIP: Record<string, string> = {
  PENDING:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  REJECTED: "bg-red-500/15 text-red-400 border border-red-500/25",
};

type Tab = "ALL" | "PENDING" | "PAYMENTS" | "RENEWALS";

export default function PaymentSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [tab, setTab] = useState<Tab>("PENDING");
  const [zoomImg, setZoomImg] = useState(false);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/payment-submissions`, { headers: authH() });
      if (r.ok) setSubmissions(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setAmountReceived(selected?.amount != null ? String(selected.amount) : "");
    setShowReject(false);
    setRejectReason("");
    setZoomImg(false);
  }, [selected?.id]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(""), 2000); });
  };

  async function approve(id: string) {
    setActionLoading(id);
    const sub = selected;
    const received = amountReceived !== "" ? parseFloat(amountReceived) : sub?.amount ?? null;
    try {
      const r = await fetch(`${API}/admin/payment-submissions/${id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "APPROVED", ...(received != null ? { amountReceived: received } : {}) }),
      });
      if (r.ok) {
        setSelected(null);
        showToast(`✅ ${isRollover(sub!) ? "Renewal" : "Payment"} approved — ${sub!.application.account.firstName} ${sub!.application.account.lastName}`);
        load();
      } else {
        const d = await r.json().catch(() => ({}));
        showToast(d.error || "Failed to approve", "error");
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
        setRejectReason(""); setShowReject(false);
        setSelected(null);
        showToast(`❌ Rejected — ${sub!.application.account.firstName} ${sub!.application.account.lastName}`);
        load();
      } else {
        showToast("Failed to reject. Please try again.", "error");
      }
    } finally { setActionLoading(null); }
  }

  const pending = submissions.filter(s => s.status === "PENDING");
  const filtered = submissions.filter(s => {
    if (tab === "PENDING")  return s.status === "PENDING";
    if (tab === "PAYMENTS") return !isRollover(s);
    if (tab === "RENEWALS") return isRollover(s);
    return true;
  });

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "PENDING",  label: "Pending Review", count: pending.length },
    { key: "ALL",      label: "All",             count: submissions.length },
    { key: "PAYMENTS", label: "Payments",         count: submissions.filter(s => !isRollover(s)).length },
    { key: "RENEWALS", label: "Renewals",         count: submissions.filter(s => isRollover(s)).length },
  ];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Payment Proofs</h1>
          <p className="text-sm text-white/35 mt-0.5">Review client payment screenshots and loan renewals</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <Clock size={11} /> {pending.length} pending
            </span>
          )}
          <button onClick={load} className="p-2 rounded-xl text-white/25 hover:text-white/60 border border-white/5 hover:border-white/10 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Pending",        value: pending.length,                                                                                      color: "text-amber-400"   },
          { label: "Approved",       value: submissions.filter(s => s.status === "APPROVED").length,                                             color: "text-emerald-400" },
          { label: "Renewals",       value: submissions.filter(isRollover).length,                                                               color: "text-purple-400"  },
          { label: "Total Approved", value: K(submissions.filter(s => s.status === "APPROVED").reduce((a, s) => a + (s.amount ?? 0), 0)), color: "text-[#C9A227]"   },
        ].map(c => (
          <div key={c.label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</div>
            <div className="text-[11px] text-white/30 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.key ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? "bg-white/15 text-white" : "bg-white/5 text-white/30"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${toast.type === "error" ? "bg-red-600 border-red-500 text-white" : "bg-emerald-600 border-emerald-500 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-white/25 text-sm">
            <Loader2 size={15} className="animate-spin" /> Loading submissions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ScanLine size={28} className="mx-auto mb-3 text-white/10" />
            <div className="text-white/30 text-sm">
              {tab === "PENDING" ? "No pending submissions — all caught up!" : "No submissions in this category"}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {["Client", "Loan Ref", "Type", "Amount", "Method", "Status", "Submitted", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}
                    onClick={() => setSelected(s)}
                    className={`border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors ${i === filtered.length - 1 ? "border-none" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white/80 text-sm">{s.application.account.firstName} {s.application.account.lastName}</div>
                      <div className="text-[10px] font-mono text-white/30">{s.application.account.clientNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/40">{s.application.reference}</td>
                    <td className="px-4 py-3">
                      {isRollover(s) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">RENEWAL</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">PAYMENT</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-sm text-white/70">{s.amount ? K(s.amount) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {isRollover(s) ? "Renewal" : (s.paymentMethod?.replace(/_/g, " ") || "—")}
                      {s.provider && <div className="text-[10px] text-white/25">{s.provider}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CHIP[s.status]}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-white/30">{timeAgo(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Eye size={14} className="text-white/25" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail slide-in panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setSelected(null); setShowReject(false); setRejectReason(""); }} />
          <div className="relative ml-auto w-full max-w-lg h-full bg-[#0B1F3A] flex flex-col overflow-hidden shadow-2xl border-l border-white/5">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-white">
                    {isRollover(selected) ? "Loan Renewal Proof" : "Payment Proof"}
                  </h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CHIP[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="text-xs text-white/35 mt-0.5">
                  {selected.application.account.firstName} {selected.application.account.lastName} · {selected.application.reference}
                </div>
              </div>
              <button onClick={() => { setSelected(null); setShowReject(false); setRejectReason(""); }} className="text-white/25 hover:text-white/60 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Renewal alert */}
              {isRollover(selected) && (
                <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-300">
                    <strong>Loan Renewal</strong> — approving will automatically renew the client's{" "}
                    <strong>{K(selected.application.amountRequested)}</strong> loan for another term.
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Client",         value: `${selected.application.account.firstName} ${selected.application.account.lastName}` },
                  { label: "Client #",       value: selected.application.account.clientNumber },
                  { label: "Loan Ref",       value: selected.application.reference },
                  { label: "Loan Amount",    value: K(selected.application.amountRequested) },
                  { label: "Amount Paid",    value: selected.amount ? K(selected.amount) : "Not specified" },
                  { label: "Method",         value: isRollover(selected) ? "Loan Renewal" : (selected.paymentMethod?.replace(/_/g, " ") || "—") },
                  { label: "Provider / Bank",value: selected.provider || "—" },
                  { label: "Txn Reference",  value: selected.reference || "—", copy: true },
                  { label: "Submitted",      value: new Date(selected.createdAt).toLocaleString() },
                ].map(r => (
                  <div key={r.label} className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                    <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider">{r.label}</div>
                    <div className="text-sm text-white/70 font-medium mt-0.5 flex items-center gap-1">
                      <span className="truncate">{r.value}</span>
                      {r.copy && r.value !== "—" && (
                        <button onClick={() => copy(r.value, "ref")} className="flex-shrink-0 text-white/20 hover:text-white/50 ml-1">
                          {copied === "ref" ? <CheckCircle size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Client notes */}
              {selected.notes && selected.notes !== "LOAN_ROLLOVER" && (
                <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-1">Client Notes</div>
                  <div className="text-sm text-white/60">{selected.notes}</div>
                </div>
              )}

              {/* Screenshot */}
              {selected.screenshotData ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Transaction Screenshot</div>
                    <button onClick={() => setZoomImg(true)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      <ZoomIn size={11} /> View Full Size
                    </button>
                  </div>
                  <img
                    src={selected.screenshotData}
                    alt="Payment proof"
                    className="w-full rounded-xl border border-white/10 object-contain max-h-72 cursor-zoom-in bg-black/20"
                    onClick={() => setZoomImg(true)}
                  />
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-8 text-center">
                  <ScanLine size={24} className="mx-auto mb-2 text-white/15" />
                  <div className="text-sm text-white/25">No screenshot attached</div>
                </div>
              )}

              {/* Rejection reason */}
              {selected.status === "REJECTED" && selected.rejectedReason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider mb-1">Rejection Reason</div>
                  <div className="text-sm text-red-300">{selected.rejectedReason}</div>
                </div>
              )}
            </div>

            {/* Action footer — only shown for PENDING */}
            {selected.status === "PENDING" && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 space-y-3 bg-[#0a1a31]">
                {!isRollover(selected) && (
                  <div>
                    <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
                      Amount Received (ZMW)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">K</span>
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={e => setAmountReceived(e.target.value)}
                        placeholder={selected.amount != null ? String(selected.amount) : "Enter amount"}
                        className="w-full pl-7 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 placeholder:text-white/20"
                      />
                    </div>
                    {selected.amount != null && amountReceived !== "" && parseFloat(amountReceived) !== selected.amount && (
                      <p className="text-[11px] mt-1 text-amber-400">
                        ⚠ Client submitted {K(selected.amount)} — recording {K(parseFloat(amountReceived) || 0)} as received.
                      </p>
                    )}
                  </div>
                )}

                {!showReject ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => approve(selected.id)}
                      disabled={actionLoading === selected.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-40 transition-all"
                    >
                      {actionLoading === selected.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      {actionLoading === selected.id
                        ? "Processing…"
                        : isRollover(selected)
                          ? "Approve Renewal"
                          : `Approve — ${K(parseFloat(amountReceived) || selected.amount || 0)} Received`}
                    </button>
                    <button
                      onClick={() => setShowReject(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-xl transition-all"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional but recommended)"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reject(selected.id)}
                        disabled={actionLoading === selected.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl disabled:opacity-40 transition-all"
                      >
                        {actionLoading === selected.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        {actionLoading === selected.id ? "Rejecting…" : "Confirm Rejection"}
                      </button>
                      <button
                        onClick={() => { setShowReject(false); setRejectReason(""); }}
                        className="flex-1 py-2.5 text-sm font-semibold border border-white/10 text-white/40 rounded-xl hover:border-white/20 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selected.status !== "PENDING" && (
              <div className={`flex-shrink-0 px-6 py-4 border-t border-white/5 ${selected.status === "APPROVED" ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {selected.status === "APPROVED" ? (
                    <><CheckCircle size={14} className="text-emerald-400" />
                    <span className="text-emerald-400">
                      Approved by {selected.reviewedBy ?? "staff"}
                      {selected.amount != null && <> — <strong>{K(selected.amount)}</strong> confirmed</>}
                    </span></>
                  ) : (
                    <><XCircle size={14} className="text-red-400" />
                    <span className="text-red-400">Rejected by {selected.reviewedBy ?? "staff"}</span></>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-screen zoom modal */}
      {zoomImg && selected?.screenshotData && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoomImg(false)}>
          <button className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-xl bg-white/10 transition-colors" onClick={() => setZoomImg(false)}>
            <X size={18} />
          </button>
          <img
            src={selected.screenshotData}
            alt="Payment proof full size"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
