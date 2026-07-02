import { useState, useEffect, useCallback } from "react";
import { Calendar, CheckCircle, XCircle, Clock, Plus, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/auth";

interface Leave {
  id: string;
  staffName: string;
  staffRole?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
  status: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

const LEAVE_TYPES = ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "STUDY", "EMERGENCY", "UNPAID"];

const STATUS_STYLE: Record<string, string> = {
  PENDING:  "text-amber-400 bg-amber-500/10 border border-amber-500/20",
  APPROVED: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  REJECTED: "text-red-400 bg-red-500/10 border border-red-500/20",
};

const TYPE_COLOR: Record<string, string> = {
  ANNUAL: "text-blue-400", SICK: "text-red-400", MATERNITY: "text-pink-400",
  PATERNITY: "text-indigo-400", UNPAID: "text-amber-400", STUDY: "text-purple-400", EMERGENCY: "text-orange-400",
};

const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

export default function LeaveManagementPage() {
  const user = useAuthStore(s => s.user);
  const [requests, setRequests] = useState<Leave[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({
    staffName: user ? `${user.firstName} ${user.lastName}` : "",
    leaveType: "ANNUAL", startDate: "", endDate: "", daysRequested: "5", reason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/leave", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) setRequests(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.staffName || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      const r = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, daysRequested: Number(form.daysRequested) }),
      });
      if (r.ok) { setRequests(p => [await r.json(), ...p]); setShowForm(false); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status }),
      });
      if (r.ok) setRequests(p => p.map(x => x.id === id ? { ...x, status } : x));
    } catch { /* ignore */ }
  };

  const del = async (id: string) => {
    try {
      await fetch(`/api/leave/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      setRequests(p => p.filter(x => x.id !== id));
    } catch { /* ignore */ }
  };

  const pending  = requests.filter(r => r.status === "PENDING").length;
  const approved = requests.filter(r => r.status === "APPROVED").length;
  const totalDays = requests.filter(r => r.status === "APPROVED").reduce((s, r) => s + r.daysRequested, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Calendar size={22} className="text-[#C9A227]" /> Staff Leave Management
          </h1>
          <p className="text-sm text-white/35 mt-1">Leave requests, approvals, and staff availability tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus size={15} /> New Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Approval", value: pending,   color: "text-amber-400",   icon: Clock,         bg: "bg-amber-400/10"   },
          { label: "Approved",         value: approved,  color: "text-emerald-400", icon: CheckCircle,   bg: "bg-emerald-400/10" },
          { label: "Total Days Off",   value: totalDays, color: "text-blue-400",    icon: Calendar,      bg: "bg-blue-400/10"    },
        ].map(s => (
          <div key={s.label} className="bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-white/35">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#0B1F3A] border border-[#C9A227]/25 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">New Leave Request</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Staff Member</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.staffName} onChange={e => setForm(p => ({ ...p, staffName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Leave Type</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.leaveType} onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Days Requested</label>
              <input type="number" min={1} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.daysRequested} onChange={e => setForm(p => ({ ...p, daysRequested: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Start Date</label>
              <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">End Date</label>
              <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Reason</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Optional reason" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={submit} disabled={saving}
              className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 disabled:opacity-50 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Submit Request
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#C9A227]" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-white/20"><Calendar size={36} className="mx-auto mb-3 opacity-30" /><p>No leave requests yet</p></div>
      ) : (
        <div className="bg-[#0B1F3A] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-white/30 uppercase tracking-wider">
                  {["Staff Member", "Type", "Days", "Start", "End", "Reason", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white text-sm">{req.staffName}</div>
                      {req.staffRole && <div className="text-[11px] text-white/30">{req.staffRole.replace(/_/g, " ")}</div>}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold ${TYPE_COLOR[req.leaveType] ?? "text-white/50"}`}>{req.leaveType}</span></td>
                    <td className="px-4 py-3 font-bold text-white">{req.daysRequested}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{new Date(req.startDate).toLocaleDateString("en-ZM")}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{new Date(req.endDate).toLocaleDateString("en-ZM")}</td>
                    <td className="px-4 py-3 text-white/40 text-xs max-w-[180px] truncate">{req.reason || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[req.status] ?? ""}`}>{req.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {req.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button onClick={() => updateStatus(req.id, "APPROVED")} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"><CheckCircle size={14} /></button>
                          <button onClick={() => updateStatus(req.id, "REJECTED")} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><XCircle size={14} /></button>
                        </div>
                      )}
                      <button onClick={() => del(req.id)} className="p-1.5 text-white/15 hover:text-red-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
