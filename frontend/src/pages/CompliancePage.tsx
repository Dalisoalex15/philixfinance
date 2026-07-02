import { useState, useEffect, useCallback } from "react";
import { Shield, CheckCircle, AlertTriangle, XCircle, Clock, Plus, RefreshCw, Loader2, Trash2 } from "lucide-react";

interface ComplianceItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
}

const CATEGORIES = ["REGULATORY", "INTERNAL_POLICY", "AML", "CREDIT_RISK", "DATA_PROTECTION", "LICENSING"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"];

const STATUS_STYLE: Record<string, string> = {
  PENDING:     "text-slate-400 bg-slate-500/10 border border-slate-500/20",
  IN_PROGRESS: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
  COMPLETED:   "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  OVERDUE:     "text-red-400 bg-red-500/10 border border-red-500/20",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING: Clock, IN_PROGRESS: AlertTriangle, COMPLETED: CheckCircle, OVERDUE: XCircle,
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-slate-400", MEDIUM: "text-blue-400", HIGH: "text-amber-400", CRITICAL: "text-red-400",
};

const CAT_COLOR: Record<string, string> = {
  REGULATORY: "text-red-400 bg-red-500/10",
  INTERNAL_POLICY: "text-blue-400 bg-blue-500/10",
  AML: "text-purple-400 bg-purple-500/10",
  CREDIT_RISK: "text-amber-400 bg-amber-500/10",
  DATA_PROTECTION: "text-slate-400 bg-slate-500/10",
  LICENSING: "text-emerald-400 bg-emerald-500/10",
};

const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

export default function CompliancePage() {
  const [records, setRecords] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState("ALL");
  const [form, setForm] = useState({
    category: "REGULATORY", title: "", description: "",
    dueDate: "", priority: "MEDIUM", assignedTo: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/compliance", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) setRecords(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.category || !form.title) return;
    setSaving(true);
    try {
      const r = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      if (r.ok) { const item = await r.json(); setRecords(p => [item, ...p]); setShowForm(false); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`/api/compliance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status }),
      });
      if (r.ok) { const updated = await r.json(); setRecords(p => p.map(x => x.id === id ? updated : x)); }
    } catch { /* ignore */ }
  };

  const del = async (id: string) => {
    try {
      await fetch(`/api/compliance/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      setRecords(p => p.filter(x => x.id !== id));
    } catch { /* ignore */ }
  };

  const compliant  = records.filter(r => r.status === "COMPLETED").length;
  const overdue    = records.filter(r => r.status === "OVERDUE").length;
  const inProgress = records.filter(r => r.status === "IN_PROGRESS").length;
  const rate       = records.length > 0 ? Math.round((compliant / records.length) * 100) : 0;

  const filtered = filterCat === "ALL" ? records : records.filter(r => r.category === filterCat);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield size={22} className="text-[#C9A227]" /> Compliance Center
          </h1>
          <p className="text-sm text-white/35 mt-1">Regulatory compliance, internal policies, AML/KYC and licensing tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Completed",       value: compliant,  color: "text-emerald-400", bg: "bg-emerald-400/10", Icon: CheckCircle   },
          { label: "In Progress",     value: inProgress, color: "text-amber-400",   bg: "bg-amber-400/10",   Icon: AlertTriangle },
          { label: "Overdue",         value: overdue,    color: "text-red-400",     bg: "bg-red-400/10",     Icon: XCircle       },
          { label: "Compliance Rate", value: `${rate}%`, color: rate >= 90 ? "text-emerald-400" : rate >= 70 ? "text-amber-400" : "text-red-400", bg: "bg-blue-400/10", Icon: Shield },
        ].map(s => (
          <div key={s.label} className="bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.Icon size={18} className={s.color} />
            </div>
            <div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-white/35">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#0B1F3A] border border-[#C9A227]/25 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Add Compliance Item</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Category *</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Title *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="Compliance item title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Priority</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Due Date</label>
              <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Assigned To</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="Staff member name" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} />
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-white/40 mb-1 block">Description</label>
              <textarea rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40 resize-none"
                placeholder="Describe the compliance requirement..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving}
              className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 disabled:opacity-50 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Item
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {["ALL", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${filterCat === c ? "bg-[#C9A227] text-[#0B1F3A] border-[#C9A227] font-bold" : "bg-white/5 text-white/40 border-white/10 hover:text-white"}`}>
            {c.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#C9A227]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/20"><Shield size={36} className="mx-auto mb-3 opacity-30" /><p>No compliance items found</p></div>
      ) : (
        <div className="bg-[#0B1F3A] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-white/30 uppercase tracking-wider">
                  {["Category", "Title", "Priority", "Assigned To", "Due Date", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const StatusIcon = STATUS_ICON[item.status] ?? Clock;
                  return (
                    <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLOR[item.category] ?? "text-white/50 bg-white/5"}`}>
                          {item.category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white text-sm">{item.title}</div>
                        {item.description && <div className="text-[11px] text-white/30 mt-0.5 max-w-[220px] truncate">{item.description}</div>}
                      </td>
                      <td className="px-4 py-3"><span className={`text-xs font-bold ${PRIORITY_COLOR[item.priority] ?? "text-white/50"}`}>{item.priority}</span></td>
                      <td className="px-4 py-3 text-white/50 text-xs">{item.assignedTo || "—"}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-ZM") : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${STATUS_STYLE[item.status] ?? ""}`}>
                          <StatusIcon size={10} /> {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {STATUSES.filter(s => s !== item.status).slice(0, 2).map(s => (
                            <button key={s} onClick={() => updateStatus(item.id, s)}
                              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/10 transition-all">
                              → {s.replace("_", " ")}
                            </button>
                          ))}
                          <button onClick={() => del(item.id)} className="p-1.5 text-white/15 hover:text-red-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
