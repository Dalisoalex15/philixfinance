import { useState, useEffect, useCallback } from "react";
import { Monitor, Package, Plus, TrendingDown, RefreshCw, Loader2, Trash2, Edit3, Check, X } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  location?: string;
  condition: string;
  status: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
}

const CATEGORIES = ["ELECTRONICS", "FURNITURE", "VEHICLE", "EQUIPMENT", "PROPERTY", "OTHER"];
const CONDITIONS  = ["NEW", "GOOD", "FAIR", "POOR"];
const STATUSES    = ["ACTIVE", "MAINTENANCE", "DISPOSED", "LOST"];

const CATEGORY_EMOJI: Record<string, string> = {
  ELECTRONICS: "💻", FURNITURE: "🪑", VEHICLE: "🚗", EQUIPMENT: "⚙️", PROPERTY: "🏠", OTHER: "📦",
};

const CONDITION_STYLE: Record<string, string> = {
  NEW:  "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  GOOD: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
  FAIR: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
  POOR: "text-red-400 bg-red-500/10 border border-red-500/20",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:      "text-emerald-400 bg-emerald-500/10",
  MAINTENANCE: "text-amber-400 bg-amber-500/10",
  DISPOSED:    "text-red-400 bg-red-500/10",
  LOST:        "text-slate-400 bg-slate-500/10",
};

const fmtZMW = (n?: number) => n != null ? `ZMW ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

export default function AssetRegisterPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [filter, setFilter]   = useState("ALL");
  const [form, setForm] = useState({
    name: "", category: "ELECTRONICS", serialNumber: "",
    purchaseDate: "", purchasePrice: "", currentValue: "",
    location: "", condition: "GOOD", assignedTo: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/assets", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) setAssets(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name || !form.category) return;
    setSaving(true);
    try {
      const r = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      if (r.ok) { const item = await r.json(); setAssets(p => [item, ...p]); setShowForm(false); resetForm(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const saveEdit = async (id: string, patch: Partial<Asset>) => {
    try {
      const r = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(patch),
      });
      if (r.ok) { const updated = await r.json(); setAssets(p => p.map(x => x.id === id ? updated : x)); setEditId(null); }
    } catch { /* ignore */ }
  };

  const del = async (id: string) => {
    try {
      await fetch(`/api/assets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      setAssets(p => p.filter(x => x.id !== id));
    } catch { /* ignore */ }
  };

  const resetForm = () => setForm({ name: "", category: "ELECTRONICS", serialNumber: "", purchaseDate: "", purchasePrice: "", currentValue: "", location: "", condition: "GOOD", assignedTo: "", notes: "" });

  const categories   = ["ALL", ...CATEGORIES];
  const filtered     = filter === "ALL" ? assets : assets.filter(a => a.category === filter);
  const totalCost    = assets.reduce((s, a) => s + (a.purchasePrice ?? 0), 0);
  const totalCurrent = assets.reduce((s, a) => s + (a.currentValue ?? 0), 0);
  const totalDepr    = totalCost - totalCurrent;
  const deprPct      = totalCost > 0 ? Math.round((totalDepr / totalCost) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Package size={22} className="text-[#C9A227]" /> Asset Register
          </h1>
          <p className="text-sm text-white/35 mt-1">Company assets, depreciation tracking and maintenance records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus size={15} /> Add Asset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Assets",        value: assets.length,          color: "text-blue-400",    bg: "bg-blue-400/10",    Icon: Package     },
          { label: "Total Cost",          value: fmtZMW(totalCost),      color: "text-slate-300",   bg: "bg-white/5",        Icon: Monitor     },
          { label: "Current Value",       value: fmtZMW(totalCurrent),   color: "text-emerald-400", bg: "bg-emerald-400/10", Icon: Monitor     },
          { label: `Depreciation ${deprPct}%`, value: fmtZMW(totalDepr), color: "text-amber-400",  bg: "bg-amber-400/10",   Icon: TrendingDown },
        ].map(s => (
          <div key={s.label} className="bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.Icon size={18} className={s.color} />
            </div>
            <div>
              <div className={`text-sm font-black ${s.color} leading-tight`}>{s.value}</div>
              <div className="text-[11px] text-white/35 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#0B1F3A] border border-[#C9A227]/25 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Register New Asset</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Asset Name *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="e.g. Dell Latitude Laptop" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Category *</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Serial Number</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="SN/TAG number" value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Purchase Date</label>
              <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.purchaseDate} onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Purchase Price (ZMW)</label>
              <input type="number" min={0} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Current Value (ZMW)</label>
              <input type="number" min={0} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.currentValue} onChange={e => setForm(p => ({ ...p, currentValue: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Location</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="Office / Branch" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Condition</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Assigned To</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="Staff member" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving}
              className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 disabled:opacity-50 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Register Asset
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2.5 text-sm text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${filter === c ? "bg-[#C9A227] text-[#0B1F3A] border-[#C9A227] font-bold" : "bg-white/5 text-white/40 border-white/10 hover:text-white"}`}>
            {c !== "ALL" && CATEGORY_EMOJI[c]} {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#C9A227]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/20"><Package size={36} className="mx-auto mb-3 opacity-30" /><p>No assets registered yet</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const isEditing = editId === a.id;
            const depr = a.purchasePrice && a.currentValue ? Math.round(((a.purchasePrice - a.currentValue) / a.purchasePrice) * 100) : null;
            return (
              <div key={a.id} className="bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{CATEGORY_EMOJI[a.category] ?? "📦"}</span>
                    <div>
                      <div className="font-semibold text-white text-sm leading-tight">{a.name}</div>
                      {a.serialNumber && <div className="text-[10px] text-white/30 mt-0.5">S/N: {a.serialNumber}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditId(isEditing ? null : a.id)} className="p-1.5 text-white/20 hover:text-[#C9A227] rounded-lg transition-all"><Edit3 size={12} /></button>
                    <button onClick={() => del(a.id)} className="p-1.5 text-white/15 hover:text-red-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-white/30 mb-0.5">Condition</div>
                    {isEditing ? (
                      <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-full"
                        defaultValue={a.condition} id={`cond-${a.id}`}>
                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CONDITION_STYLE[a.condition] ?? ""}`}>{a.condition}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-white/30 mb-0.5">Status</div>
                    {isEditing ? (
                      <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-full"
                        defaultValue={a.status} id={`status-${a.id}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status] ?? ""}`}>{a.status}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-white/30 mb-0.5">Purchase Price</div>
                    <div className="text-white font-semibold">{fmtZMW(a.purchasePrice)}</div>
                  </div>
                  <div>
                    <div className="text-white/30 mb-0.5">Current Value</div>
                    {isEditing ? (
                      <input type="number" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white w-full"
                        defaultValue={a.currentValue ?? ""} id={`val-${a.id}`} />
                    ) : (
                      <div className="text-emerald-400 font-semibold">{fmtZMW(a.currentValue)}</div>
                    )}
                  </div>
                  {a.location && (
                    <div>
                      <div className="text-white/30 mb-0.5">Location</div>
                      <div className="text-white/60">{a.location}</div>
                    </div>
                  )}
                  {a.assignedTo && (
                    <div>
                      <div className="text-white/30 mb-0.5">Assigned To</div>
                      <div className="text-white/60">{a.assignedTo}</div>
                    </div>
                  )}
                </div>

                {depr !== null && !isEditing && (
                  <div className="mt-1">
                    <div className="flex justify-between text-[10px] text-white/30 mb-1">
                      <span>Depreciation</span><span>{depr}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400/60 rounded-full" style={{ width: `${Math.min(depr, 100)}%` }} />
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => {
                      const cond = (document.getElementById(`cond-${a.id}`) as HTMLSelectElement)?.value;
                      const stat = (document.getElementById(`status-${a.id}`) as HTMLSelectElement)?.value;
                      const val  = (document.getElementById(`val-${a.id}`) as HTMLInputElement)?.value;
                      saveEdit(a.id, { condition: cond, status: stat, currentValue: val ? Number(val) : undefined });
                    }} className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all">
                      <Check size={11} /> Save
                    </button>
                    <button onClick={() => setEditId(null)} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/40 text-xs px-3 py-1.5 rounded-lg border border-white/10 transition-all">
                      <X size={11} /> Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
