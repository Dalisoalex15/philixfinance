import { useState, useEffect, useCallback } from "react";
import {
  Plus, UserCog, X, Eye, EyeOff, CheckCircle, Shield, Copy,
  RefreshCw, AlertCircle, Trash2, KeyRound, Users,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

const ROLES = ["CEO", "MANAGER", "LOAN_OFFICER", "COLLECTIONS_OFFICER", "ACCOUNTANT"] as const;
const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO", MANAGER: "Manager", LOAN_OFFICER: "Loan Officer",
  COLLECTIONS_OFFICER: "Collections Officer", ACCOUNTANT: "Accountant",
};
const ROLE_COLORS: Record<string, string> = {
  CEO:                  "bg-amber-900/40 text-amber-300 border border-amber-700/50",
  MANAGER:              "bg-indigo-900/40 text-indigo-300 border border-indigo-700/50",
  LOAN_OFFICER:         "bg-emerald-900/40 text-emerald-300 border border-emerald-700/50",
  COLLECTIONS_OFFICER:  "bg-orange-900/40 text-orange-300 border border-orange-700/50",
  ACCOUNTANT:           "bg-purple-900/40 text-purple-300 border border-purple-700/50",
};
const DEPARTMENTS = ["Executive", "Operations", "Credit", "Collections", "Finance", "Customer Service"];

function generatePassword(firstName: string, role: string): string {
  const base = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()}`;
  const suffix = role === "CEO" ? "CEO" : role === "MANAGER" ? "Mgr" : role === "LOAN_OFFICER" ? "LO" : role === "COLLECTIONS_OFFICER" ? "Col" : "Acc";
  return `philix@${base}${suffix}2025`;
}

function getToken() { return localStorage.getItem("philix_staff_token") ?? ""; }
function authH(): Record<string, string> { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

interface StaffMember {
  id: string; employeeId: string; firstName: string; lastName: string;
  email: string; phone: string | null; role: string; department?: string | null;
  status: string; createdAt: string;
}

const blank = () => ({
  firstName: "", lastName: "", email: "", phone: "",
  role: "LOAN_OFFICER" as typeof ROLES[number],
  department: "Credit", password: "",
});

export default function UsersPage() {
  const user = useAuthStore(s => s.user);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password reveal per row
  const [revealedRow, setRevealedRow] = useState<string | null>(null);
  // Store plain-text passwords locally (only visible the moment they're created)
  const [sessionPasswords, setSessionPasswords] = useState<Record<string, string>>({});

  // Reset password modal
  const [resetModal, setResetModal] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true); setApiError("");
    try {
      const r = await fetch("/api/users", { headers: authH() });
      if (!r.ok) { setApiError("Failed to load staff"); return; }
      const data = await r.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch { setApiError("Network error loading staff"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const setField = (k: string, v: string) => {
    setForm(p => {
      const updated = { ...p, [k]: v };
      if ((k === "firstName" || k === "role") && updated.firstName) {
        updated.password = generatePassword(updated.firstName, updated.role);
      }
      return updated;
    });
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.password || form.password.length < 8) e.password = "Min 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true); setSaveError("");
    try {
      const r = await fetch("/api/users", {
        method: "POST", headers: authH(),
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim(),
          email:     form.email.trim().toLowerCase(),
          phone:     form.phone.trim(),
          role:      form.role,
          department: form.department,
          password:  form.password,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setSaveError(data.error || "Failed to create staff member"); return; }
      // Store password locally for this session only
      setSessionPasswords(p => ({ ...p, [data.id]: form.password }));
      setSaved(true);
      await loadStaff();
      setTimeout(() => { setSaved(false); setShowModal(false); setForm(blank()); setSaveError(""); }, 2500);
    } catch { setSaveError("Network error — please try again"); }
    finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword || newPassword.length < 8) return;
    setResetLoading(true); setResetMsg(null);
    try {
      const r = await fetch(`/api/users/${resetModal.id}/reset-password`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await r.json();
      if (!r.ok) { setResetMsg({ ok: false, text: data.error || "Failed to reset password" }); return; }
      setSessionPasswords(p => ({ ...p, [resetModal.id]: newPassword }));
      setResetMsg({ ok: true, text: "Password updated. Staff member can now log in with the new password." });
      setTimeout(() => { setResetModal(null); setNewPassword(""); setResetMsg(null); }, 2500);
    } catch { setResetMsg({ ok: false, text: "Network error" }); }
    finally { setResetLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the system? They will no longer be able to log in.`)) return;
    setDeleteLoading(id);
    try {
      await fetch(`/api/users/${id}`, { method: "DELETE", headers: authH() });
      await loadStaff();
    } catch { /* ignore */ }
    finally { setDeleteLoading(null); }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(""), 2000);
    });
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "CEO" || user?.role === "MANAGER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">
            Staff accounts are stored in the database — they can log in immediately after creation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadStaff} className="btn-secondary" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {isSuperAdmin && (
            <button onClick={() => { setShowModal(true); setForm(blank()); setSaved(false); setSaveError(""); }}
              className="btn-primary">
              <Plus size={16} /> Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl px-4 py-3">
        <Shield size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-300 leading-relaxed">
          <span className="font-bold">Staff accounts are saved directly to the database.</span> Once created, staff can immediately log in at{" "}
          <span className="font-mono text-indigo-200">/login</span> using their email and the password you set.
          For any email domain, select <span className="font-bold">"Staff / Admin"</span> on the login page.
        </p>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-300">
          <AlertCircle size={14} /> {apiError}
        </div>
      )}

      {/* Staff table */}
      <div className="philix-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-600">
            <RefreshCw size={16} className="animate-spin" /> Loading staff from database…
          </div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-500 font-semibold">No staff accounts yet</p>
            <p className="text-slate-600 text-sm mt-1">Click "Add Staff Member" to create the first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Password (session)</th>
                  <th>Status</th>
                  <th>Created</th>
                  {isSuperAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="table-row-hover">
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{s.firstName} {s.lastName}</div>
                          <div className="text-xs text-slate-500">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-400">{s.employeeId}</td>
                    <td>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[s.role] ?? "bg-slate-700 text-slate-400 border border-slate-600"}`}>
                        {ROLE_LABELS[s.role] ?? s.role}
                      </span>
                    </td>
                    <td className="text-slate-400 text-sm">{s.department ?? "—"}</td>
                    <td>
                      {sessionPasswords[s.id] ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-300">
                            {revealedRow === s.id ? sessionPasswords[s.id] : "••••••••"}
                          </span>
                          <button onClick={() => setRevealedRow(revealedRow === s.id ? null : s.id)}
                            className="text-slate-500 hover:text-slate-300 p-0.5">
                            {revealedRow === s.id ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                          <button onClick={() => copyToClipboard(sessionPasswords[s.id], s.id)}
                            className="text-slate-500 hover:text-slate-300 p-0.5">
                            {copied === s.id ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Not available</span>
                      )}
                    </td>
                    <td>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        s.status === "ACTIVE" ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/50"
                        : "bg-red-900/40 text-red-300 border-red-700/50"
                      }`}>{s.status}</span>
                    </td>
                    <td className="text-xs text-slate-500">{fmt(s.createdAt)}</td>
                    {isSuperAdmin && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setResetModal(s); setNewPassword(generatePassword(s.firstName, s.role)); setResetMsg(null); setShowNewPass(false); }}
                            className="p-1.5 rounded-lg text-amber-500/70 hover:text-amber-400 hover:bg-amber-900/20 transition-all"
                            title="Reset Password">
                            <KeyRound size={13} />
                          </button>
                          {s.email !== user?.email && (
                            <button
                              onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)}
                              disabled={deleteLoading === s.id}
                              className="p-1.5 rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-900/20 transition-all"
                              title="Remove Staff">
                              {deleteLoading === s.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Staff Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-indigo-400" />
                <h3 className="font-bold text-slate-100">Add Staff Member</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            {saved ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <div className="text-white font-bold text-lg">Staff member created!</div>
                <div className="text-slate-400 text-sm mt-1">Account saved to database.</div>
                <div className="text-emerald-400 text-xs mt-2 font-semibold">They can log in immediately at /login</div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">First Name *</label>
                    <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                      placeholder="Alex" value={form.firstName} onChange={e => setField("firstName", e.target.value)} />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Last Name *</label>
                    <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                      placeholder="Phiri" value={form.lastName} onChange={e => setField("lastName", e.target.value)} />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Work Email * (any domain)</label>
                  <input type="email"
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="alex@philixfinance.com"
                    value={form.email} onChange={e => setField("email", e.target.value)} />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                  <p className="text-[11px] text-slate-600 mt-1">
                    Any email domain works. On the login page, staff must select <strong className="text-slate-500">"Staff / Admin"</strong> to log in.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Phone *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="+260 97 XXX XXXX" value={form.phone} onChange={e => setField("phone", e.target.value)} />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Role *</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.role} onChange={e => setField("role", e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Department</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.department} onChange={e => setField("department", e.target.value)}>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Password *</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 pr-20 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.password} onChange={e => setField("password", e.target.value)} />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-500 hover:text-slate-300 p-1">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button type="button" onClick={() => copyToClipboard(form.password, "modal-pass")} className="text-slate-500 hover:text-slate-300 p-1">
                        {copied === "modal-pass" ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  <p className="text-xs text-slate-600 mt-1">Auto-generated · edit freely · copy before saving</p>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2.5 text-sm text-red-300">
                    <AlertCircle size={13} /> {saveError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:text-slate-200 hover:border-slate-600 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    {saving ? <><RefreshCw size={14} className="animate-spin" /> Creating…</> : <><UserCog size={14} /> Create &amp; Save to Database</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ─────────────────────────────────────────── */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-700/40 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-amber-400" />
                <h3 className="font-bold text-slate-100">Reset Password — {resetModal.firstName} {resetModal.lastName}</h3>
              </div>
              <button onClick={() => setResetModal(null)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Set a new password for <span className="text-slate-300 font-semibold">{resetModal.email}</span>.
                They can log in immediately using the new password.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">New Password *</label>
                <div className="relative">
                  <input type={showNewPass ? "text" : "password"}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 pr-20 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="text-slate-500 hover:text-slate-300 p-1">
                      {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button type="button" onClick={() => copyToClipboard(newPassword, "reset-pass")} className="text-slate-500 hover:text-slate-300 p-1">
                      {copied === "reset-pass" ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {resetMsg && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${resetMsg.ok ? "bg-emerald-950/40 border border-emerald-800/40 text-emerald-300" : "bg-red-950/40 border border-red-800/40 text-red-300"}`}>
                  {resetMsg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {resetMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setResetModal(null)} className="flex-1 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:border-slate-600 transition-all">
                  Cancel
                </button>
                <button onClick={handleResetPassword} disabled={resetLoading || newPassword.length < 8}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  {resetLoading ? <><RefreshCw size={14} className="animate-spin" /> Resetting…</> : <><KeyRound size={14} /> Reset Password</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
