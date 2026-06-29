import { useState, useEffect, useCallback } from "react";
import {
  Plus, UserCog, X, Eye, EyeOff, CheckCircle, Shield, Copy,
  RefreshCw, AlertCircle, Trash2, KeyRound, Users, Edit3, Zap, UserPlus,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

const ROLES = ["SUPER_ADMIN", "MANAGER", "LOAN_OFFICER", "COLLECTIONS_OFFICER", "ACCOUNTANT"] as const;
type Role = typeof ROLES[number];
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:         "CEO / Admin",
  MANAGER:             "Manager",
  LOAN_OFFICER:        "Loan Officer",
  COLLECTIONS_OFFICER: "Collections Officer",
  ACCOUNTANT:          "Accountant",
};
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:         "bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/25",
  CEO:                 "bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/25",
  MANAGER:             "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25",
  LOAN_OFFICER:        "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  COLLECTIONS_OFFICER: "bg-orange-500/15 text-orange-300 border border-orange-500/25",
  ACCOUNTANT:          "bg-purple-500/15 text-purple-300 border border-purple-500/25",
};
const DEPARTMENTS = ["Executive", "Operations", "Credit", "Collections", "Finance", "Customer Service"];

function genPass(firstName: string, role: string) {
  const base = firstName ? `${firstName[0].toUpperCase()}${firstName.slice(1).toLowerCase()}` : "Staff";
  const suf = { SUPER_ADMIN:"CEO", CEO:"CEO", MANAGER:"Mgr", LOAN_OFFICER:"LO", COLLECTIONS_OFFICER:"Col", ACCOUNTANT:"Acc" }[role] ?? "Staff";
  return `philix@${base}${suf}2025`;
}

const authH = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("philix_staff_token") ?? ""}` });
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

interface Staff {
  id: string; employeeId: string; firstName: string; lastName: string;
  email: string; phone: string | null; role: string; department?: string | null;
  status: string; createdAt: string;
}

const blankForm = () => ({
  firstName: "", lastName: "", email: "", phone: "",
  role: "LOAN_OFFICER" as Role, department: "Credit", password: "",
});

export default function UsersPage() {
  const user = useAuthStore(s => s.user);
  const isCEO = user?.role === "SUPER_ADMIN";

  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [sessionPasswords, setSessionPasswords] = useState<Record<string, string>>({});
  const [revealedRow, setRevealedRow] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  // Edit modal
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [editForm, setEditForm] = useState<Partial<Staff>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editOk, setEditOk] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<Staff | null>(null);
  const [newPass, setNewPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Seed staff
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<{ email: string; role: string; plainPassword: string; alreadyExists: boolean }[] | null>(null);

  // Create client account
  const [showNewClient, setShowNewClient] = useState(false);
  const [clientForm, setClientForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [clientSaving, setClientSaving] = useState(false);
  const [clientSaved, setClientSaved] = useState(false);
  const [clientErr, setClientErr] = useState("");
  const [clientPassword, setClientPassword] = useState<{ id: string; pass: string } | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true); setApiError("");
    try {
      const r = await fetch("/api/users", { headers: authH() });
      if (!r.ok) { setApiError("Failed to load staff"); return; }
      const data = await r.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch { setApiError("Network error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const setField = (k: string, v: string) => {
    setForm(p => {
      const u = { ...p, [k]: v };
      if ((k === "firstName" || k === "role") && u.firstName) {
        u.password = genPass(u.firstName, u.role);
      }
      return u;
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
    return !Object.keys(e).length;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true); setSaveErr("");
    try {
      const r = await fetch("/api/users", {
        method: "POST", headers: authH(),
        body: JSON.stringify({
          firstName: form.firstName.trim(), lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(), phone: form.phone.trim(),
          role: form.role, department: form.department, password: form.password,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setSaveErr(data.error || "Failed to create"); return; }
      setSessionPasswords(p => ({ ...p, [data.id]: form.password }));
      setSaved(true);
      await loadStaff();
      setTimeout(() => { setSaved(false); setShowCreate(false); setForm(blankForm()); setSaveErr(""); }, 2500);
    } catch { setSaveErr("Network error"); }
    finally { setSaving(false); }
  };

  const openEdit = (s: Staff) => {
    setEditTarget(s);
    setEditForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, phone: s.phone ?? "", role: s.role, department: s.department ?? "", status: s.status });
    setEditErr(""); setEditOk(false);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true); setEditErr(""); setEditOk(false);
    try {
      const r = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify(editForm),
      });
      const data = await r.json();
      if (!r.ok) { setEditErr(data.error || "Failed to update"); return; }
      setEditOk(true);
      await loadStaff();
      setTimeout(() => { setEditTarget(null); setEditOk(false); }, 1500);
    } catch { setEditErr("Network error"); }
    finally { setEditSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !newPass || newPass.length < 8) return;
    setResetLoading(true); setResetMsg(null);
    try {
      const r = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: "PATCH", headers: authH(), body: JSON.stringify({ password: newPass }),
      });
      const data = await r.json();
      if (!r.ok) { setResetMsg({ ok: false, text: data.error || "Failed" }); return; }
      setSessionPasswords(p => ({ ...p, [resetTarget.id]: newPass }));
      setResetMsg({ ok: true, text: "Password updated. Staff can log in with the new password now." });
      setTimeout(() => { setResetTarget(null); setNewPass(""); setResetMsg(null); }, 2500);
    } catch { setResetMsg({ ok: false, text: "Network error" }); }
    finally { setResetLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the system? This cannot be undone.`)) return;
    setDeleteLoading(id);
    try { await fetch(`/api/users/${id}`, { method: "DELETE", headers: authH() }); await loadStaff(); }
    catch { /* ignore */ } finally { setDeleteLoading(null); }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(""), 2000); });
  };

  const handleSeedStaff = async () => {
    setSeedLoading(true); setSeedResult(null);
    try {
      const r = await fetch("/api/users/seed-demo-staff", { method: "POST", headers: authH() });
      const data = await r.json();
      if (r.ok) { setSeedResult(data.staff); await loadStaff(); }
    } catch { /* ignore */ } finally { setSeedLoading(false); }
  };

  const handleCreateClient = async () => {
    if (!clientForm.firstName || !clientForm.email || clientForm.password.length < 8) {
      setClientErr("First name, email, and password (min 8 chars) are required"); return;
    }
    setClientSaving(true); setClientErr("");
    try {
      const r = await fetch("/api/admin/clients", {
        method: "POST", headers: authH(),
        body: JSON.stringify(clientForm),
      });
      const data = await r.json();
      if (!r.ok) { setClientErr(data.error || "Failed to create client"); return; }
      setClientPassword({ id: data.id, pass: clientForm.password });
      setClientSaved(true);
      setClientForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
      setTimeout(() => { setClientSaved(false); setShowNewClient(false); setClientPassword(null); }, 4000);
    } catch { setClientErr("Network error"); }
    finally { setClientSaving(false); }
  };

  const inputCls = "w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-white/20";
  const labelCls = "text-xs font-semibold text-white/40 mb-1 block";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Staff Management</h1>
          <p className="text-sm text-white/35 mt-0.5">
            {isCEO ? "Create, edit, and manage all staff accounts" : "View staff directory"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={loadStaff} className="p-2 rounded-lg text-white/25 hover:text-white/60 border border-white/5 hover:border-white/10 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {isCEO && (
            <>
              <button onClick={handleSeedStaff} disabled={seedLoading}
                title="Create sample accounts for all staff roles"
                className="flex items-center gap-2 bg-[#C9A227]/15 hover:bg-[#C9A227]/25 text-[#C9A227] border border-[#C9A227]/25 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50">
                {seedLoading ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                Quick Setup
              </button>
              <button onClick={() => { setShowNewClient(true); setClientSaved(false); setClientErr(""); setClientForm({ firstName: "", lastName: "", email: "", phone: "", password: "" }); }}
                className="flex items-center gap-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/25 text-xs font-semibold px-3 py-2 rounded-xl transition-all">
                <UserPlus size={13} /> New Client
              </button>
              <button onClick={() => { setShowCreate(true); setForm(blankForm()); setSaved(false); setSaveErr(""); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                <Plus size={15} /> Add Staff
              </button>
            </>
          )}
        </div>
      </div>

      {/* CEO info banner */}
      {isCEO && (
        <div className="flex items-start gap-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-3">
          <Shield size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-300/70 leading-relaxed">
            <strong className="text-indigo-300">CEO only:</strong> All staff accounts are saved directly to the database.
            Once created, staff log in at <span className="font-mono text-indigo-200">/login</span> using any email + the password you set — select <strong>"Staff / Admin"</strong> on the login page.
            You can edit any profile, reset passwords, or remove accounts at any time.
          </p>
        </div>
      )}

      {apiError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle size={14} /> {apiError}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-white/25 text-sm">
            <RefreshCw size={15} className="animate-spin" /> Loading staff…
          </div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={28} className="mx-auto mb-3 text-white/10" />
            <p className="text-white/30 text-sm">No staff accounts yet</p>
            {isCEO && <p className="text-white/20 text-xs mt-1">Click "Add Staff Member" to create the first one.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {["Staff Member", "Employee ID", "Role", "Department", "Password", "Status", "Created", isCEO ? "Actions" : ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/25">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s, i) => (
                  <tr key={s.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${i === staff.length-1 ? "border-none" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400 flex-shrink-0">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-white/80">{s.firstName} {s.lastName}</div>
                          <div className="text-[10px] text-white/30">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/30">{s.employeeId}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[s.role] ?? "bg-white/5 text-white/40 border border-white/10"}`}>
                        {ROLE_LABELS[s.role] ?? s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-white/40">{s.department ?? "—"}</td>
                    <td className="px-4 py-3">
                      {sessionPasswords[s.id] ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-white/50">
                            {revealedRow === s.id ? sessionPasswords[s.id] : "••••••••"}
                          </span>
                          <button onClick={() => setRevealedRow(revealedRow === s.id ? null : s.id)} className="text-white/20 hover:text-white/50 p-0.5">
                            {revealedRow === s.id ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                          <button onClick={() => copy(sessionPasswords[s.id], s.id)} className="text-white/20 hover:text-white/50 p-0.5">
                            {copied === s.id ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/20 italic">Not in session</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-white/25">{fmt(s.createdAt)}</td>
                    {isCEO && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)} title="Edit profile"
                            className="p-1.5 rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-500/20">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => { setResetTarget(s); setNewPass(genPass(s.firstName, s.role)); setResetMsg(null); setShowNewPass(false); }}
                            title="Reset password"
                            className="p-1.5 rounded-lg text-white/25 hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-transparent hover:border-amber-500/20">
                            <KeyRound size={13} />
                          </button>
                          {s.email !== user?.email && (
                            <button onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)} disabled={deleteLoading === s.id}
                              title="Remove staff"
                              className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
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

      {/* ── SEED RESULT ──────────────────────────────────────────────────────── */}
      {seedResult && (
        <div className="rounded-2xl bg-[#C9A227]/5 border border-[#C9A227]/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[#C9A227]" />
              <span className="text-sm font-bold text-[#C9A227]">Quick Setup Complete — All Staff Accounts Created</span>
            </div>
            <button onClick={() => setSeedResult(null)} className="text-white/25 hover:text-white/60"><X size={14} /></button>
          </div>
          <div className="grid gap-2">
            {seedResult.map(s => (
              <div key={s.email} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${s.alreadyExists ? "bg-white/[0.02] border border-white/5" : "bg-emerald-500/5 border border-emerald-500/15"}`}>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${ROLE_COLORS[s.role] ?? "bg-white/5 text-white/40 border border-white/10"}`}>
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                  <span className="font-mono text-white/60">{s.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white/40">{s.plainPassword}</span>
                  <button onClick={() => copy(s.plainPassword, `seed-${s.email}`)} className="text-white/20 hover:text-white/50 p-0.5">
                    {copied === `seed-${s.email}` ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                  {s.alreadyExists && <span className="text-[10px] text-white/25 italic">already existed</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-2">Share these credentials with each staff member — they can log in immediately.</p>
        </div>
      )}

      {/* ── CREATE CLIENT MODAL ───────────────────────────────────────────────── */}
      {showNewClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B1F3A] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20"><UserPlus size={14} className="text-emerald-400" /></div>
                <h3 className="font-bold text-white">Create Client Account</h3>
              </div>
              <button onClick={() => setShowNewClient(false)} className="text-white/25 hover:text-white/60"><X size={18} /></button>
            </div>
            {clientSaved ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <div className="text-white font-bold text-lg">Client account created!</div>
                {clientPassword && (
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-left">
                    <div className="text-white/40 text-xs mb-2">Client login credentials</div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-white/70 text-xs">{clientForm.email || "—"}</span>
                      <span className="font-mono text-white/70 text-xs">{clientPassword.pass}</span>
                      <button onClick={() => copy(`${clientPassword.pass}`, "cp")} className="text-white/25 hover:text-white/60 p-0.5">
                        {copied === "cp" ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="text-white/40 text-sm">Client can log in at the portal immediately.</div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input className={inputCls} placeholder="Jane" value={clientForm.firstName} onChange={e => setClientForm(p => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input className={inputCls} placeholder="Mwale" value={clientForm.lastName} onChange={e => setClientForm(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input type="email" className={inputCls} placeholder="jane@example.com" value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} placeholder="+260 97 XXX XXXX" value={clientForm.phone} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Password *</label>
                  <div className="relative">
                    <input type="text" className={`${inputCls} font-mono pr-10`}
                      value={clientForm.password}
                      placeholder="Min 8 characters"
                      onChange={e => setClientForm(p => ({ ...p, password: e.target.value }))} />
                    <button type="button" onClick={() => copy(clientForm.password, "cp-field")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 p-0.5">
                      {copied === "cp-field" ? <CheckCircle size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-white/25 mt-1">Client will use this to log in to the client portal</p>
                </div>
                {clientErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-red-400">
                    <AlertCircle size={13} /> {clientErr}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowNewClient(false)} className="flex-1 py-2.5 text-sm text-white/40 border border-white/10 rounded-xl hover:border-white/20 transition-all">Cancel</button>
                  <button onClick={handleCreateClient} disabled={clientSaving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    {clientSaving ? <><RefreshCw size={14} className="animate-spin" /> Creating…</> : <><UserPlus size={14} /> Create Client</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B1F3A] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20"><Shield size={14} className="text-indigo-400" /></div>
                <h3 className="font-bold text-white">Add Staff Member</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-white/25 hover:text-white/60"><X size={18} /></button>
            </div>
            {saved ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <div className="text-white font-bold text-lg">Staff member created!</div>
                <div className="text-white/40 text-sm mt-1">Saved to database — can log in now.</div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input className={inputCls} placeholder="Alex" value={form.firstName} onChange={e => setField("firstName", e.target.value)} />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Last Name *</label>
                    <input className={inputCls} placeholder="Phiri" value={form.lastName} onChange={e => setField("lastName", e.target.value)} />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Work Email * (any domain)</label>
                  <input type="email" className={inputCls} placeholder="alex@philixfinance.com" value={form.email} onChange={e => setField("email", e.target.value)} />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input className={inputCls} placeholder="+260 97 XXX XXXX" value={form.phone} onChange={e => setField("phone", e.target.value)} />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Role *</label>
                    <select className={inputCls} value={form.role} onChange={e => setField("role", e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Department</label>
                    <select className={inputCls} value={form.department} onChange={e => setField("department", e.target.value)}>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Password *</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} className={`${inputCls} pr-20 font-mono`}
                      value={form.password} onChange={e => setField("password", e.target.value)} />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button type="button" onClick={() => setShowPass(!showPass)} className="text-white/25 hover:text-white/60 p-1">
                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button type="button" onClick={() => copy(form.password, "modal-pass")} className="text-white/25 hover:text-white/60 p-1">
                        {copied === "modal-pass" ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  <p className="text-[11px] text-white/25 mt-1">Auto-generated · edit freely · copy before saving</p>
                </div>
                {saveErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-red-400">
                    <AlertCircle size={13} /> {saveErr}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm text-white/40 border border-white/10 rounded-xl hover:border-white/20 transition-all">Cancel</button>
                  <button onClick={handleCreate} disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    {saving ? <><RefreshCw size={14} className="animate-spin" /> Creating…</> : <><UserCog size={14} /> Create Account</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ────────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B1F3A] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20"><Edit3 size={14} className="text-indigo-400" /></div>
                <h3 className="font-bold text-white">Edit — {editTarget.firstName} {editTarget.lastName}</h3>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-white/25 hover:text-white/60"><X size={18} /></button>
            </div>
            {editOk ? (
              <div className="p-10 text-center">
                <CheckCircle size={28} className="mx-auto mb-3 text-emerald-400" />
                <div className="text-white font-semibold">Profile updated</div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First Name</label>
                    <input className={inputCls} value={editForm.firstName ?? ""} onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input className={inputCls} value={editForm.lastName ?? ""} onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" className={inputCls} value={editForm.email ?? ""} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={editForm.phone ?? ""} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Role</label>
                    <select className={inputCls} value={editForm.role ?? ""} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Department</label>
                    <select className={inputCls} value={editForm.department ?? ""} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={editForm.status ?? "ACTIVE"} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                {editErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-sm text-red-400">
                    <AlertCircle size={13} /> {editErr}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 text-sm text-white/40 border border-white/10 rounded-xl hover:border-white/20 transition-all">Cancel</button>
                  <button onClick={handleEdit} disabled={editSaving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    {editSaving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><CheckCircle size={14} /> Save Changes</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ──────────────────────────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B1F3A] border border-amber-500/20 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20"><KeyRound size={14} className="text-amber-400" /></div>
                <h3 className="font-bold text-white">Reset Password</h3>
              </div>
              <button onClick={() => setResetTarget(null)} className="text-white/25 hover:text-white/60"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-white/40">
                Set a new password for <span className="text-white/70 font-semibold">{resetTarget.email}</span>
              </p>
              <div>
                <label className={labelCls}>New Password *</label>
                <div className="relative">
                  <input type={showNewPass ? "text" : "password"} className={`${inputCls} pr-20 font-mono`}
                    value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="text-white/25 hover:text-white/60 p-1">
                      {showNewPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button type="button" onClick={() => copy(newPass, "reset-pass")} className="text-white/25 hover:text-white/60 p-1">
                      {copied === "reset-pass" ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>
              {resetMsg && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${resetMsg.ok ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                  {resetMsg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {resetMsg.text}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setResetTarget(null)} className="flex-1 py-2.5 text-sm text-white/40 border border-white/10 rounded-xl hover:border-white/20 transition-all">Cancel</button>
                <button onClick={handleResetPassword} disabled={resetLoading || newPass.length < 8}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
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
