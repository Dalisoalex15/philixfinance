import { useState } from "react";
import { Plus, UserCog, X, Eye, EyeOff, CheckCircle, Shield, Copy } from "lucide-react";
import { formatDate, getStatusColor } from "../lib/mock-data";
import { useStaffStore } from "../store/staffStore";
import type { StaffUser } from "../store/clientAuth";

const ROLES: StaffUser["role"][] = ["CEO", "MANAGER", "LOAN_OFFICER", "COLLECTIONS_OFFICER", "ACCOUNTANT"];
const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO", MANAGER: "Manager", LOAN_OFFICER: "Loan Officer",
  COLLECTIONS_OFFICER: "Collections Officer", ACCOUNTANT: "Accountant",
};
const DEPARTMENTS = ["Executive", "Operations", "Credit", "Collections", "Finance", "Customer Service"];

function generatePassword(firstName: string, role: string): string {
  const base = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()}`;
  const suffix = role === "CEO" ? "CEO" : role === "MANAGER" ? "Mgr" : role === "LOAN_OFFICER" ? "LO" : role === "COLLECTIONS_OFFICER" ? "Col" : "Acc";
  return `philix@${base}${suffix}2025`;
}

export default function UsersPage() {
  const { staff, passwords, addStaff, removeStaff } = useStaffStore();
  const [showModal, setShowModal] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState("");
  const [saved, setSaved] = useState(false);

  const blank = () => ({
    firstName: "", lastName: "", email: "", phone: "",
    role: "LOAN_OFFICER" as StaffUser["role"],
    department: "Credit",
    password: "",
  });
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => {
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
    if (!form.firstName) e.firstName = "Required";
    if (!form.lastName) e.lastName = "Required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (!form.phone) e.phone = "Required";
    if (!form.password || form.password.length < 8) e.password = "Min 8 characters";
    if (staff.some(s => s.email.toLowerCase() === form.email.toLowerCase())) e.email = "Email already exists";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    addStaff({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      role: form.role,
      department: form.department,
      status: "ACTIVE",
    }, form.password);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowModal(false);
      setForm(blank());
    }, 1500);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Manage staff accounts, roles, and access permissions</p>
        </div>
        <button onClick={() => { setShowModal(true); setForm(blank()); setSaved(false); }} className="btn-primary">
          <Plus size={16} /> Add Staff Member
        </button>
      </div>

      <div className="philix-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Employee ID</th>
                <th>Role</th>
                <th>Department</th>
                <th>Password</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((user) => (
                <tr key={user.id} className="table-row-hover">
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                        {user.avatarInitials}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-slate-400">{user.employeeNumber}</td>
                  <td><span className={getStatusColor(user.role)}>{ROLE_LABELS[user.role] ?? user.role}</span></td>
                  <td className="text-slate-400 text-sm">{user.department}</td>
                  <td>
                    <button
                      onClick={() => copyToClipboard(passwords[user.id] ?? "", user.id)}
                      className="flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-slate-300 group">
                      <span>{passwords[user.id] ? "••••••••" : "—"}</span>
                      {passwords[user.id] && (
                        copied === user.id
                          ? <CheckCircle size={11} className="text-emerald-400" />
                          : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </td>
                  <td><span className={getStatusColor(user.status)}>{user.status}</span></td>
                  <td className="text-xs text-slate-500">{formatDate(user.joinedAt)}</td>
                  <td>
                    {/* Protect original demo staff from deletion */}
                    {!user.id.startsWith("staff-00") && (
                      <button onClick={() => removeStaff(user.id)}
                        className="text-xs text-red-500/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/20 transition-all">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                <div className="text-white font-bold text-lg">Staff member added!</div>
                <div className="text-slate-500 text-sm mt-1">They can now sign in at the login page.</div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">First Name *</label>
                    <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                      placeholder="Daliso" value={form.firstName} onChange={e => set("firstName", e.target.value)} />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Last Name *</label>
                    <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                      placeholder="Phiri" value={form.lastName} onChange={e => set("lastName", e.target.value)} />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Work Email *</label>
                  <input type="email" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="name@philixfinance.com" value={form.email} onChange={e => set("email", e.target.value)} />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Phone *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="+260 97 XXX XXXX" value={form.phone} onChange={e => set("phone", e.target.value)} />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Role *</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.role} onChange={e => set("role", e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Department</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.department} onChange={e => set("department", e.target.value)}>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Password *</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 pr-20 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.password} onChange={e => set("password", e.target.value)} />
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
                  <p className="text-xs text-slate-600 mt-1">Auto-generated from name · edit freely · copy before saving</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:text-slate-200 hover:border-slate-600 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                    <UserCog size={14} /> Add Staff Member
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
