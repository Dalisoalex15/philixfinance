import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, CheckCircle, XCircle, Clock, Plus, RefreshCw, Loader2, Trash2, Package } from "lucide-react";
import { useAuthStore } from "../store/auth";

interface ProcurementOrder {
  id: string;
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplier?: string;
  status: string;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "ORDERED", "RECEIVED"];

const STATUS_STYLE: Record<string, string> = {
  PENDING:  "text-amber-400 bg-amber-500/10 border border-amber-500/20",
  APPROVED: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  REJECTED: "text-red-400 bg-red-500/10 border border-red-500/20",
  ORDERED:  "text-blue-400 bg-blue-500/10 border border-blue-500/20",
  RECEIVED: "text-purple-400 bg-purple-500/10 border border-purple-500/20",
};

const fmtZMW = (n: number) => `ZMW ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

export default function ProcurementPage() {
  const user = useAuthStore(s => s.user);
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    itemName: "", description: "", quantity: "1",
    unitPrice: "", supplier: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/procurement", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (r.ok) setOrders(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.itemName || !form.unitPrice) return;
    setSaving(true);
    try {
      const r = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }),
      });
      if (r.ok) { const item = await r.json(); setOrders(p => [item, ...p]); setShowForm(false); resetForm(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const r = await fetch(`/api/procurement/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status }),
      });
      if (r.ok) { const updated = await r.json(); setOrders(p => p.map(x => x.id === id ? updated : x)); }
    } catch { /* ignore */ }
  };

  const del = async (id: string) => {
    try {
      await fetch(`/api/procurement/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      setOrders(p => p.filter(x => x.id !== id));
    } catch { /* ignore */ }
  };

  const resetForm = () => setForm({ itemName: "", description: "", quantity: "1", unitPrice: "", supplier: "", notes: "" });

  const pending    = orders.filter(o => o.status === "PENDING").length;
  const approved   = orders.filter(o => ["APPROVED", "ORDERED", "RECEIVED"].includes(o.status)).length;
  const totalValue = orders.filter(o => o.status !== "REJECTED").reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag size={22} className="text-[#C9A227]" /> Internal Procurement
          </h1>
          <p className="text-sm text-white/35 mt-1">Purchase requests, vendor approvals, and spending controls</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <Plus size={15} /> New Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Approval",        value: pending,           color: "text-amber-400",   bg: "bg-amber-400/10",   Icon: Clock        },
          { label: "Approved / In Progress",  value: approved,          color: "text-emerald-400", bg: "bg-emerald-400/10", Icon: CheckCircle  },
          { label: "Total Committed Value",   value: fmtZMW(totalValue), color: "text-blue-400",  bg: "bg-blue-400/10",    Icon: ShoppingBag  },
        ].map(s => (
          <div key={s.label} className="bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.Icon size={18} className={s.color} />
            </div>
            <div>
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-white/35">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#0B1F3A] border border-[#C9A227]/25 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">New Purchase Request</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Item Name *</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="e.g. Printer Paper A4" value={form.itemName} onChange={e => setForm(p => ({ ...p, itemName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Supplier</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                placeholder="Vendor name" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Quantity *</label>
              <input type="number" min={1} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Unit Price (ZMW) *</label>
              <input type="number" min={0} step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40"
                value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Total</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-[#C9A227] font-bold">
                {fmtZMW((Number(form.quantity) || 0) * (Number(form.unitPrice) || 0))}
              </div>
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-white/40 mb-1 block">Description / Justification</label>
              <textarea rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A227]/40 resize-none"
                placeholder="Why is this purchase needed?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving}
              className="flex items-center gap-2 bg-[#C9A227] hover:bg-amber-400 disabled:opacity-50 text-[#0B1F3A] font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Submit Request
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2.5 text-sm text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-[#C9A227]" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-white/20"><Package size={36} className="mx-auto mb-3 opacity-30" /><p>No purchase requests yet</p></div>
      ) : (
        <div className="bg-[#0B1F3A] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-white/30 uppercase tracking-wider">
                  {["Item", "Supplier", "Qty", "Unit Price", "Total", "Requested By", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white text-sm">{o.itemName}</div>
                      {o.description && <div className="text-[11px] text-white/30 max-w-[160px] truncate">{o.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">{o.supplier || "—"}</td>
                    <td className="px-4 py-3 text-white font-bold">{o.quantity}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{fmtZMW(o.unitPrice)}</td>
                    <td className="px-4 py-3 text-[#C9A227] font-bold text-xs">{fmtZMW(o.totalAmount)}</td>
                    <td className="px-4 py-3 text-white/50 text-xs">{o.requestedBy}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] ?? ""}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        {o.status === "PENDING" && (
                          <>
                            <button onClick={() => updateStatus(o.id, "APPROVED")} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="Approve"><CheckCircle size={14} /></button>
                            <button onClick={() => updateStatus(o.id, "REJECTED")} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Reject"><XCircle size={14} /></button>
                          </>
                        )}
                        {o.status === "APPROVED" && (
                          <button onClick={() => updateStatus(o.id, "ORDERED")} className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all">Mark Ordered</button>
                        )}
                        {o.status === "ORDERED" && (
                          <button onClick={() => updateStatus(o.id, "RECEIVED")} className="text-[10px] px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all">Mark Received</button>
                        )}
                        <button onClick={() => del(o.id)} className="p-1.5 text-white/15 hover:text-red-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* suppress unused import */ void user}
    </div>
  );
}
