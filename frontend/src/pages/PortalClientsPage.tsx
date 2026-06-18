import { useState, useEffect } from "react";
import {
  Users, Search, Eye, RefreshCw, ShieldCheck, ShieldOff, Lock,
  Mail, Phone, MapPin, Briefcase, BadgeCheck, AlertTriangle, X,
  Calendar, CreditCard, KeyRound, CheckCircle, ChevronDown, ChevronUp,
  Unlock, Bell, FileCheck, Trash2, ShieldAlert,
} from "lucide-react";

const API = "/api";

function getToken() {
  return localStorage.getItem("philix_staff_token") ?? "";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE:      "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
    PENDING_KYC: "bg-amber-900/40 text-amber-400 border-amber-800/50",
    SUSPENDED:   "bg-red-900/40 text-red-400 border-red-800/50",
    BLACKLISTED: "bg-rose-900/60 text-rose-300 border-rose-800/60",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function kycBadge(kyc: string) {
  const map: Record<string, string> = {
    VERIFIED:    "text-emerald-400",
    IN_REVIEW:   "text-blue-400",
    SUBMITTED:   "text-indigo-400",
    REJECTED:    "text-red-400",
    NOT_STARTED: "text-slate-500",
  };
  return <span className={`text-xs font-semibold ${map[kyc] ?? "text-slate-400"}`}>{kyc.replace("_", " ")}</span>;
}

interface Account {
  id: string;
  clientNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  occupation: string | null;
  employer: string | null;
  monthlyIncome: number | null;
  nrcNumber: string | null;
  kycStatus: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  _count: { loanApplications: number };
}

interface AccountDetail extends Account {
  loanApplications: {
    id: string; reference: string; productType: string;
    amountRequested: number; status: string; createdAt: string;
  }[];
  kycDocuments: { id: string; docType: string; uploadedAt: string }[];
  hasPassword: boolean;
}

export default function PortalClientsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("creds");

  // Password reset
  const [resetModal, setResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Status change
  const [statusLoading, setStatusLoading] = useState(false);

  // Unlock
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Notify
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // KYC update
  const [kycModal, setKycModal] = useState(false);
  const [kycValue, setKycValue] = useState("");
  const [kycLoading, setKycLoading] = useState(false);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState(false);

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
  }

  async function loadAccounts() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/portal-accounts`, { headers: authHeaders() });
      if (r.ok) setAccounts(await r.json());
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setSelected(null);
    try {
      const r = await fetch(`${API}/admin/portal-accounts/${id}`, { headers: authHeaders() });
      if (r.ok) setSelected(await r.json());
    } finally {
      setDetailLoading(false);
    }
  }

  async function resetPassword() {
    if (!selected || newPassword.length < 6) return;
    const r = await fetch(`${API}/admin/portal-accounts/${selected.id}/reset-password`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    const data = await r.json();
    if (r.ok) {
      setResetMsg({ ok: true, text: "Password reset successfully." });
      setNewPassword("");
    } else {
      setResetMsg({ ok: false, text: data.error || "Failed to reset password" });
    }
  }

  async function changeStatus(status: string) {
    if (!selected) return;
    setStatusLoading(true);
    try {
      const r = await fetch(`${API}/admin/portal-accounts/${selected.id}/status`, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (r.ok) { await loadDetail(selected.id); await loadAccounts(); }
    } finally { setStatusLoading(false); }
  }

  async function unlockAccount() {
    if (!selected) return;
    setUnlockLoading(true);
    try {
      const r = await fetch(`${API}/admin/portal-accounts/${selected.id}/unlock`, {
        method: "POST", headers: authHeaders(),
      });
      if (r.ok) { await loadDetail(selected.id); await loadAccounts(); }
    } finally { setUnlockLoading(false); }
  }

  async function sendNotification() {
    if (!selected || !notifySubject || !notifyBody) return;
    setNotifyLoading(true);
    try {
      const r = await fetch(`${API}/admin/portal-accounts/${selected.id}/notify`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ subject: notifySubject, body: notifyBody }),
      });
      if (r.ok) {
        setNotifyMsg({ ok: true, text: "Notification sent to client." });
        setNotifySubject(""); setNotifyBody("");
      } else {
        const d = await r.json();
        setNotifyMsg({ ok: false, text: d.error || "Failed to send notification" });
      }
    } finally { setNotifyLoading(false); }
  }

  async function updateKyc() {
    if (!selected || !kycValue) return;
    setKycLoading(true);
    try {
      const r = await fetch(`${API}/admin/portal-accounts/${selected.id}/kyc`, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ kycStatus: kycValue }),
      });
      if (r.ok) { await loadDetail(selected.id); await loadAccounts(); setKycModal(false); }
    } finally { setKycLoading(false); }
  }

  async function deleteAccount() {
    if (!selected) return;
    if (!window.confirm(`Permanently delete ${selected.firstName} ${selected.lastName}'s account and all their data? This cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API}/admin/portal-accounts/${selected.id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (r.ok) {
        setSelected(null);
        await loadAccounts();
      }
    } finally { setDeleteLoading(false); }
  }

  function closePanel() {
    setSelected(null);
    setResetModal(false);
    setResetMsg(null);
    setNotifyModal(false);
    setNotifyMsg(null);
    setKycModal(false);
  }

  useEffect(() => { loadAccounts(); }, []);

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = (
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.clientNumber.toLowerCase().includes(q) ||
      (a.phone || "").includes(q)
    );
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSection = (s: string) => setExpandedSection(prev => prev === s ? null : s);

  const isLocked = (acc: AccountDetail) =>
    acc.lockedUntil ? new Date(acc.lockedUntil) > new Date() : acc.failedLoginCount >= 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Portal Client Accounts</h1>
          <p className="page-subtitle">Manage all client portal accounts — status, credentials, KYC, notifications & more</p>
        </div>
        <button onClick={loadAccounts} className="btn-secondary py-2 px-3 flex items-center gap-1.5">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Accounts",  value: accounts.length,                                      color: "text-indigo-400" },
          { label: "Active",          value: accounts.filter(a => a.status === "ACTIVE").length,    color: "text-emerald-400" },
          { label: "Suspended",       value: accounts.filter(a => a.status === "SUSPENDED").length, color: "text-amber-400" },
          { label: "Pending KYC",     value: accounts.filter(a => a.kycStatus !== "VERIFIED").length, color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="philix-card p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, client #…"
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_KYC">Pending KYC</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BLACKLISTED">Blacklisted</option>
        </select>
        <span className="text-xs text-slate-500">{filtered.length} accounts</span>
      </div>

      {/* Table */}
      <div className="philix-card overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading portal accounts…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No accounts found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>KYC</th>
                <th>Loans</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="table-row-hover cursor-pointer" onClick={() => loadDetail(a.id)}>
                  <td>
                    <div className="font-semibold text-slate-200">{a.firstName} {a.lastName}</div>
                    <div className="text-xs font-mono text-indigo-400">{a.clientNumber}</div>
                  </td>
                  <td className="text-sm text-slate-400">{a.email}</td>
                  <td className="text-sm text-slate-400">{a.phone || "—"}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>{kycBadge(a.kycStatus)}</td>
                  <td className="text-center text-sm text-slate-300">{a._count.loanApplications}</td>
                  <td className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="text-indigo-400 hover:text-indigo-300 p-1" onClick={e => { e.stopPropagation(); loadDetail(a.id); }}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail side panel */}
      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={closePanel} />
          <div className="relative ml-auto w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0 bg-slate-900/95">
              <div>
                {selected ? (
                  <>
                    <h2 className="font-bold text-slate-100 text-lg">{selected.firstName} {selected.lastName}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-indigo-400">{selected.clientNumber}</span>
                      {statusBadge(selected.status)}
                      {kycBadge(selected.kycStatus)}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 text-sm">Loading…</div>
                )}
              </div>
              <button onClick={closePanel} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            {detailLoading && !selected ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">Loading account details…</div>
            ) : selected ? (
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">

                {/* ── Quick Actions bar ── */}
                <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider self-center mr-1">Quick Actions:</span>

                  {selected.status !== "ACTIVE" && (
                    <button onClick={() => changeStatus("ACTIVE")} disabled={statusLoading}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2.5 py-1.5 rounded-lg hover:bg-emerald-900/50 transition-all disabled:opacity-50">
                      <ShieldCheck size={12} /> Activate
                    </button>
                  )}
                  {selected.status !== "SUSPENDED" && (
                    <button onClick={() => changeStatus("SUSPENDED")} disabled={statusLoading}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-900/20 border border-amber-800/40 px-2.5 py-1.5 rounded-lg hover:bg-amber-900/40 transition-all disabled:opacity-50">
                      <ShieldOff size={12} /> Deactivate
                    </button>
                  )}
                  {selected.status !== "BLACKLISTED" && (
                    <button onClick={() => changeStatus("BLACKLISTED")} disabled={statusLoading}
                      className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-900/20 border border-red-800/40 px-2.5 py-1.5 rounded-lg hover:bg-red-900/40 transition-all disabled:opacity-50">
                      <ShieldAlert size={12} /> Blacklist
                    </button>
                  )}
                  {isLocked(selected) && (
                    <button onClick={unlockAccount} disabled={unlockLoading}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-400 bg-blue-900/20 border border-blue-800/40 px-2.5 py-1.5 rounded-lg hover:bg-blue-900/40 transition-all disabled:opacity-50">
                      <Unlock size={12} /> Unlock
                    </button>
                  )}
                  <button onClick={() => { setNotifyModal(true); setNotifyMsg(null); }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 bg-indigo-900/20 border border-indigo-800/40 px-2.5 py-1.5 rounded-lg hover:bg-indigo-900/40 transition-all">
                    <Bell size={12} /> Notify
                  </button>
                  <button onClick={() => { setKycModal(true); setKycValue(selected.kycStatus); }}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-400 bg-teal-900/20 border border-teal-800/40 px-2.5 py-1.5 rounded-lg hover:bg-teal-900/40 transition-all">
                    <FileCheck size={12} /> KYC
                  </button>
                  <button onClick={deleteAccount} disabled={deleteLoading}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-900/20 border border-rose-800/40 px-2.5 py-1.5 rounded-lg hover:bg-rose-900/40 transition-all ml-auto disabled:opacity-50">
                    <Trash2 size={12} /> Delete Account
                  </button>
                </div>

                {/* ── Notify modal ── */}
                {notifyModal && (
                  <div className="bg-slate-800/60 border border-indigo-800/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-indigo-300 flex items-center gap-1.5"><Bell size={14} /> Send Notification to {selected.firstName}</div>
                      <button onClick={() => setNotifyModal(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
                    </div>
                    <input
                      value={notifySubject}
                      onChange={e => setNotifySubject(e.target.value)}
                      placeholder="Subject"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <textarea
                      value={notifyBody}
                      onChange={e => setNotifyBody(e.target.value)}
                      placeholder="Message body…"
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={sendNotification} disabled={notifyLoading || !notifySubject || !notifyBody}
                        className="btn-primary text-xs py-2 px-4 disabled:opacity-50">
                        {notifyLoading ? "Sending…" : "Send"}
                      </button>
                      <button onClick={() => setNotifyModal(false)} className="btn-secondary text-xs py-2 px-3">Cancel</button>
                    </div>
                    {notifyMsg && (
                      <div className={`text-xs px-3 py-2 rounded-lg ${notifyMsg.ok ? "text-emerald-400 bg-emerald-900/20 border border-emerald-800/40" : "text-red-400 bg-red-900/20"}`}>
                        {notifyMsg.text}
                      </div>
                    )}
                  </div>
                )}

                {/* ── KYC modal ── */}
                {kycModal && (
                  <div className="bg-slate-800/60 border border-teal-800/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-teal-300 flex items-center gap-1.5"><FileCheck size={14} /> Update KYC Status</div>
                      <button onClick={() => setKycModal(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
                    </div>
                    <select
                      value={kycValue}
                      onChange={e => setKycValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button onClick={updateKyc} disabled={kycLoading}
                        className="btn-primary text-xs py-2 px-4 disabled:opacity-50">
                        {kycLoading ? "Saving…" : "Save"}
                      </button>
                      <button onClick={() => setKycModal(false)} className="btn-secondary text-xs py-2 px-3">Cancel</button>
                    </div>
                  </div>
                )}

                {/* ── Credentials ── */}
                <div className="philix-card overflow-hidden border border-indigo-800/30">
                  <button className="w-full flex items-center justify-between px-4 py-3 bg-indigo-900/20" onClick={() => toggleSection("creds")}>
                    <div className="flex items-center gap-2 font-semibold text-indigo-300 text-sm"><KeyRound size={15} /> Portal Credentials</div>
                    {expandedSection === "creds" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </button>
                  {expandedSection === "creds" && (
                    <div className="px-4 py-4 space-y-3 border-t border-indigo-800/20">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Login Email</div>
                          <div className="font-mono text-sm text-slate-200 bg-slate-800 rounded-lg px-3 py-2 break-all">{selected.email}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Password</div>
                          <div className="font-mono text-sm text-slate-400 bg-slate-800 rounded-lg px-3 py-2">
                            {selected.hasPassword ? "••••••••••••" : <span className="text-red-400">Not set</span>}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {selected.emailVerified
                            ? <><CheckCircle size={11} className="text-emerald-400" /> Email verified</>
                            : <><AlertTriangle size={11} className="text-amber-400" /> Email not verified</>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isLocked(selected)
                            ? <><Lock size={11} className="text-red-400" /> Account locked ({selected.failedLoginCount} failed attempts)</>
                            : <><CheckCircle size={11} className="text-emerald-400" /> Not locked</>}
                        </div>
                      </div>

                      {!resetModal ? (
                        <button onClick={() => { setResetModal(true); setResetMsg(null); }}
                          className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-900/20 border border-amber-800/40 px-3 py-2 rounded-xl transition-all">
                          <KeyRound size={12} /> Reset Client Password
                        </button>
                      ) : (
                        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
                          <div className="text-xs text-slate-400 font-semibold">Set new password for {selected.firstName}:</div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showNewPass ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="New password (min 6 chars)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                              <button type="button" onClick={() => setShowNewPass(p => !p)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">
                                {showNewPass ? "Hide" : "Show"}
                              </button>
                            </div>
                            <button onClick={resetPassword} disabled={newPassword.length < 6}
                              className="btn-primary text-xs py-2 px-3 disabled:opacity-50">Set</button>
                            <button onClick={() => { setResetModal(false); setNewPassword(""); setResetMsg(null); }}
                              className="btn-secondary text-xs py-2 px-3">Cancel</button>
                          </div>
                          {resetMsg && (
                            <div className={`text-xs px-3 py-2 rounded-lg ${resetMsg.ok ? "text-emerald-400 bg-emerald-900/20 border border-emerald-800/40" : "text-red-400"}`}>
                              {resetMsg.text}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Personal Details ── */}
                <div className="philix-card overflow-hidden">
                  <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => toggleSection("personal")}>
                    <div className="flex items-center gap-2 font-semibold text-slate-300 text-sm"><Users size={14} /> Personal Details</div>
                    {expandedSection === "personal" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </button>
                  {expandedSection === "personal" && (
                    <div className="px-4 pb-4 border-t border-slate-800 pt-3 grid grid-cols-2 gap-3 text-sm">
                      {[
                        { icon: Mail,       label: "Email",        value: selected.email },
                        { icon: Phone,      label: "Phone",        value: selected.phone },
                        { icon: MapPin,     label: "City",         value: selected.city },
                        { icon: MapPin,     label: "Address",      value: selected.address },
                        { icon: Calendar,   label: "Date of Birth",value: selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString() : "—" },
                        { icon: Users,      label: "Gender",       value: selected.gender ?? "—" },
                        { icon: BadgeCheck, label: "NRC Number",   value: selected.nrcNumber ?? "—" },
                      ].map(r => (
                        <div key={r.label} className="flex items-start gap-2">
                          <r.icon size={13} className="text-slate-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-500">{r.label}</div>
                            <div className="text-slate-300">{r.value || "—"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Employment & Income ── */}
                <div className="philix-card overflow-hidden">
                  <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => toggleSection("employ")}>
                    <div className="flex items-center gap-2 font-semibold text-slate-300 text-sm"><Briefcase size={14} /> Employment & Income</div>
                    {expandedSection === "employ" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </button>
                  {expandedSection === "employ" && (
                    <div className="px-4 pb-4 border-t border-slate-800 pt-3 grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: "Occupation",     value: selected.occupation },
                        { label: "Employer",       value: selected.employer },
                        { label: "Monthly Income", value: selected.monthlyIncome ? `K${selected.monthlyIncome.toLocaleString()}` : "—" },
                      ].map(r => (
                        <div key={r.label}>
                          <div className="text-[10px] text-slate-500">{r.label}</div>
                          <div className="text-slate-300">{r.value || "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Account Status & Security ── */}
                <div className="philix-card overflow-hidden">
                  <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => toggleSection("status")}>
                    <div className="flex items-center gap-2 font-semibold text-slate-300 text-sm"><ShieldCheck size={14} /> Account Status & Security</div>
                    {expandedSection === "status" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </button>
                  {expandedSection === "status" && (
                    <div className="px-4 pb-4 border-t border-slate-800 pt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[10px] text-slate-500 mb-1">Account Status</div>
                        {statusBadge(selected.status)}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 mb-1">KYC Status</div>
                        {kycBadge(selected.kycStatus)}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Last Login</div>
                        <div className="text-slate-300 text-xs">{selected.lastLoginAt ? new Date(selected.lastLoginAt).toLocaleString() : "Never"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Failed Logins</div>
                        <div className={`text-sm font-bold ${selected.failedLoginCount > 2 ? "text-red-400" : "text-slate-300"}`}>{selected.failedLoginCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Registered</div>
                        <div className="text-slate-300 text-xs">{new Date(selected.createdAt).toLocaleString()}</div>
                      </div>
                      {selected.lockedUntil && (
                        <div>
                          <div className="text-[10px] text-slate-500">Locked Until</div>
                          <div className="text-red-400 text-xs">{new Date(selected.lockedUntil).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── KYC Documents ── */}
                <div className="philix-card overflow-hidden">
                  <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => toggleSection("kycdocs")}>
                    <div className="flex items-center gap-2 font-semibold text-slate-300 text-sm"><FileCheck size={14} /> KYC Documents ({selected.kycDocuments.length})</div>
                    {expandedSection === "kycdocs" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </button>
                  {expandedSection === "kycdocs" && (
                    <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                      {selected.kycDocuments.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-4">No KYC documents uploaded yet</div>
                      ) : (
                        <div className="space-y-2">
                          {selected.kycDocuments.map(d => (
                            <div key={d.id} className="flex items-center justify-between text-sm bg-slate-800 rounded-lg px-3 py-2">
                              <span className="text-slate-300">{d.docType.replace(/_/g, " ")}</span>
                              <span className="text-xs text-slate-500">{new Date(d.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Loan Applications ── */}
                <div className="philix-card overflow-hidden">
                  <button className="w-full flex items-center justify-between px-4 py-3" onClick={() => toggleSection("loans")}>
                    <div className="flex items-center gap-2 font-semibold text-slate-300 text-sm"><CreditCard size={14} /> Loan Applications ({selected.loanApplications.length})</div>
                    {expandedSection === "loans" ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </button>
                  {expandedSection === "loans" && (
                    <div className="border-t border-slate-800">
                      {selected.loanApplications.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">No applications yet</div>
                      ) : (
                        <table className="data-table text-xs">
                          <thead>
                            <tr><th>Reference</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                          </thead>
                          <tbody>
                            {selected.loanApplications.map(app => (
                              <tr key={app.id}>
                                <td className="font-mono text-indigo-400">{app.reference}</td>
                                <td>{app.productType.replace(/_/g, " ")}</td>
                                <td>K{app.amountRequested.toLocaleString()}</td>
                                <td>
                                  <span className={`font-semibold ${
                                    app.status === "APPROVED" || app.status === "DISBURSED" ? "text-emerald-400"
                                    : app.status === "REJECTED" ? "text-red-400"
                                    : app.status === "UNDER_REVIEW" ? "text-blue-400"
                                    : "text-amber-400"
                                  }`}>{app.status}</span>
                                </td>
                                <td className="text-slate-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
