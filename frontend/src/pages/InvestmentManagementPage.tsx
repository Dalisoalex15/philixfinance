import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Plus, RefreshCw, X, Edit2, Trash2, CheckCircle,
  XCircle, Banknote, Smartphone, Building2, Users, PieChart,
  ChevronRight, AlertCircle, DollarSign, ToggleLeft, ToggleRight,
} from "lucide-react";

const API = "/api";
const K = (n: number) =>
  `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function token() { return localStorage.getItem("philix_staff_token") ?? ""; }
function auth() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }

const TYPES = [
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
  { value: "SAVINGS",       label: "Smart Savings" },
  { value: "MONEY_MARKET",  label: "Money Market" },
  { value: "NOTICE",        label: "Notice Account" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  ACTIVE:    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  MATURED:   "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  WITHDRAWN: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border border-red-500/20",
};

interface Product {
  id: string; name: string; description?: string; type: string;
  interestRate: number; minAmount: number; maxAmount?: number;
  termMonths: number; isActive: boolean; createdBy: string; createdAt: string;
  _count?: { investments: number };
}

interface Investment {
  id: string; reference: string; amountInvested: number; interestRate: number;
  termMonths: number; startDate: string; maturityDate: string; status: string;
  expectedReturn: number; actualReturn?: number; paymentMethod?: string;
  notes?: string; approvedBy?: string; approvedAt?: string;
  account: { firstName: string; lastName: string; clientNumber: string; email: string };
  product: { name: string; type: string; interestRate: number };
  createdAt: string;
}

interface Summary {
  totalInvested: number; pending: number; active: number; matured: number; total: number;
}

export default function InvestmentManagementPage() {
  const [tab, setTab] = useState<"investments" | "products">("investments");
  const [products, setProducts]         = useState<Product[]>([]);
  const [investments, setInvestments]   = useState<Investment[]>([]);
  const [summary, setSummary]           = useState<Summary>({ totalInvested: 0, pending: 0, active: 0, matured: 0, total: 0 });
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selected, setSelected]         = useState<Investment | null>(null);

  // Product form
  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct]   = useState<Product | null>(null);
  const [pName, setPName]               = useState(""); const [pDesc, setPDesc] = useState("");
  const [pType, setPType]               = useState("FIXED_DEPOSIT");
  const [pRate, setPRate]               = useState(""); const [pMin, setPMin] = useState("500");
  const [pMax, setPMax]                 = useState(""); const [pTerm, setPTerm] = useState("3");
  const [pActive, setPActive]           = useState(true);
  const [pError, setPError]             = useState(""); const [pSaving, setPSaving] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([
        fetch(`${API}/admin/investments`, { headers: auth() }),
        fetch(`${API}/admin/investment-products`, { headers: auth() }),
      ]);
      if (iRes.ok) { const d = await iRes.json(); setInvestments(d.investments || []); setSummary(d.summary || {}); }
      if (pRes.ok) setProducts(await pRes.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Product modal ──────────────────────────────────────────────────────────
  function openProductForm(p?: Product) {
    setEditProduct(p || null);
    setPName(p?.name || ""); setPDesc(p?.description || "");
    setPType(p?.type || "FIXED_DEPOSIT");
    setPRate(p ? String(p.interestRate) : "");
    setPMin(p ? String(p.minAmount) : "500");
    setPMax(p?.maxAmount ? String(p.maxAmount) : "");
    setPTerm(p ? String(p.termMonths) : "3");
    setPActive(p?.isActive ?? true);
    setPError(""); setProductModal(true);
  }

  async function saveProduct() {
    if (!pName || !pRate || !pTerm) { setPError("Name, interest rate and term are required."); return; }
    setPSaving(true); setPError("");
    try {
      const body = {
        name: pName, description: pDesc || undefined, type: pType,
        interestRate: parseFloat(pRate), minAmount: parseFloat(pMin) || 500,
        maxAmount: pMax ? parseFloat(pMax) : undefined,
        termMonths: parseInt(pTerm), isActive: pActive,
      };
      const res = await fetch(
        editProduct ? `${API}/admin/investment-products/${editProduct.id}` : `${API}/admin/investment-products`,
        { method: editProduct ? "PATCH" : "POST", headers: auth(), body: JSON.stringify(body) }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || d.message || "Failed");
      setProductModal(false); await load();
    } catch (e: unknown) {
      setPError(e instanceof Error ? e.message : "Failed to save");
    } finally { setPSaving(false); }
  }

  async function toggleProduct(p: Product) {
    await fetch(`${API}/admin/investment-products/${p.id}`, {
      method: "PATCH", headers: auth(),
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    await load();
  }

  // ── Investment status update ───────────────────────────────────────────────
  async function updateStatus(inv: Investment, status: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API}/admin/investments/${inv.id}`, {
        method: "PATCH", headers: auth(),
        body: JSON.stringify({ status, notes: statusNote || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setSelected(d);
      setStatusNote("");
      await load();
    } finally { setUpdatingStatus(false); }
  }

  const filtered = filterStatus === "ALL"
    ? investments
    : investments.filter(i => i.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp size={22} className="text-indigo-400" /> Investment Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage client investments and product catalogue</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Invested", value: K(summary.totalInvested), color: "text-white", bg: "bg-slate-800" },
          { label: "Pending", value: summary.pending, color: "text-amber-400", bg: "bg-amber-500/10 border border-amber-500/20" },
          { label: "Active", value: summary.active, color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20" },
          { label: "Matured", value: summary.matured, color: "text-indigo-400", bg: "bg-indigo-500/10 border border-indigo-500/20" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 ${c.bg}`}>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-slate-500 text-sm mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(["investments", "products"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all capitalize
              ${tab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>
            {t === "products" ? "Product Catalogue" : `Client Investments (${summary.total})`}
          </button>
        ))}
      </div>

      {/* ── INVESTMENTS LIST ────────────────────────────────────────────────── */}
      {tab === "investments" && (
        <div className="flex gap-6">
          {/* List */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              {["ALL", "PENDING", "ACTIVE", "MATURED", "WITHDRAWN", "CANCELLED"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${filterStatus === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                  {s} {s === "ALL" ? `(${investments.length})` : `(${investments.filter(i => i.status === s).length})`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={24} className="animate-spin text-indigo-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <PieChart size={40} className="mx-auto mb-3 opacity-40" />
                <p>No investments found</p>
              </div>
            ) : (
              filtered.map(inv => (
                <button key={inv.id} onClick={() => { setSelected(inv); setStatusNote(""); }}
                  className={`w-full text-left bg-slate-900 border rounded-xl p-4 transition-all hover:border-indigo-500/40
                    ${selected?.id === inv.id ? "border-indigo-500" : "border-slate-800"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{inv.reference}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="font-semibold text-white truncate">
                        {inv.account.firstName} {inv.account.lastName}
                      </p>
                      <p className="text-slate-500 text-sm">{inv.account.clientNumber} · {inv.product.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-bold">{K(inv.amountInvested)}</p>
                      <p className="text-emerald-400 text-sm">{inv.interestRate}% p.a.</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 self-center" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 shrink-0 bg-slate-900 border border-slate-800 rounded-xl h-fit sticky top-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <h3 className="font-semibold text-white text-sm">Investment Detail</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-1">{selected.reference}</p>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_STYLES[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>

                {/* Client */}
                <div className="bg-slate-800/60 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Client</p>
                  <p className="text-white font-medium">{selected.account.firstName} {selected.account.lastName}</p>
                  <p className="text-slate-400 text-sm">{selected.account.clientNumber}</p>
                  <p className="text-slate-500 text-xs">{selected.account.email}</p>
                </div>

                {/* Investment details */}
                <div className="space-y-2 text-sm">
                  {[
                    ["Product", selected.product.name],
                    ["Amount", K(selected.amountInvested)],
                    ["Interest Rate", `${selected.interestRate}% p.a.`],
                    ["Term", `${selected.termMonths} months`],
                    ["Expected Return", K(selected.expectedReturn)],
                    ["Payment Method", selected.paymentMethod?.replace("_", " ") || "—"],
                    ["Start Date", selected.status !== "PENDING" ? new Date(selected.startDate).toLocaleDateString() : "Pending activation"],
                    ["Maturity", new Date(selected.maturityDate).toLocaleDateString()],
                    ...(selected.approvedBy ? [["Approved By", selected.approvedBy]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-white text-right max-w-[55%] truncate">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div className="bg-slate-800/60 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-slate-300 text-sm">{selected.notes}</p>
                  </div>
                )}

                {/* Status actions */}
                {selected.status === "PENDING" && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Actions</p>
                    <input value={statusNote} onChange={e => setStatusNote(e.target.value)}
                      placeholder="Optional note / reason…"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    <div className="flex gap-2">
                      <button disabled={updatingStatus}
                        onClick={() => updateStatus(selected, "ACTIVE")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                        {updatingStatus ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                        Approve
                      </button>
                      <button disabled={updatingStatus}
                        onClick={() => updateStatus(selected, "CANCELLED")}
                        className="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                        <XCircle size={13} /> Decline
                      </button>
                    </div>
                  </div>
                )}

                {selected.status === "ACTIVE" && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Actions</p>
                    <button disabled={updatingStatus}
                      onClick={() => updateStatus(selected, "MATURED")}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      {updatingStatus ? <RefreshCw size={13} className="animate-spin" /> : <TrendingUp size={13} />}
                      Mark as Matured
                    </button>
                    <button disabled={updatingStatus}
                      onClick={() => updateStatus(selected, "CANCELLED")}
                      className="w-full bg-red-900/30 border border-red-800/40 text-red-400 text-sm py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors hover:bg-red-900/50">
                      <XCircle size={13} /> Cancel Investment
                    </button>
                  </div>
                )}

                {selected.status === "MATURED" && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <button disabled={updatingStatus}
                      onClick={() => updateStatus(selected, "WITHDRAWN")}
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                      {updatingStatus ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      Mark as Withdrawn
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCT CATALOGUE ────────────────────────────────────────────────── */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{products.length} product{products.length !== 1 ? "s" : ""} in catalogue</p>
            <button onClick={() => openProductForm()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
              <Plus size={16} /> New Product
            </button>
          </div>

          {products.length === 0 && !loading ? (
            <div className="text-center py-16 text-slate-500">
              <PieChart size={40} className="mx-auto mb-3 opacity-40" />
              <p>No products yet. Create your first investment product.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {products.map(p => (
                <div key={p.id} className={`bg-slate-900 border rounded-xl p-5 space-y-3
                  ${p.isActive ? "border-slate-800" : "border-slate-800/50 opacity-60"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{TYPES.find(t => t.value === p.type)?.label}</p>
                      <h3 className="font-bold text-white">{p.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-amber-400">{p.interestRate}%</p>
                      <p className="text-slate-500 text-xs">per annum</p>
                    </div>
                  </div>

                  {p.description && <p className="text-slate-400 text-sm">{p.description}</p>}

                  <div className="flex gap-4 text-sm text-slate-400">
                    <span>Min: <span className="text-white">{K(p.minAmount)}</span></span>
                    <span>Term: <span className="text-white">{p.termMonths}m</span></span>
                    <span>Clients: <span className="text-white">{p._count?.investments ?? 0}</span></span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openProductForm(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
                      <Edit2 size={13} /> Edit
                    </button>
                    <button onClick={() => toggleProduct(p)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg transition-colors
                        ${p.isActive
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                      {p.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {p.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCT MODAL ────────────────────────────────────────────────────── */}
      {productModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white">{editProduct ? "Edit Product" : "New Investment Product"}</h3>
              <button onClick={() => setProductModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Product name *</label>
                  <input value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. 90-Day Fixed Deposit"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                  <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} rows={2}
                    placeholder="Brief description for clients…"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Type *</label>
                  <select value={pType} onChange={e => setPType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Interest rate (% p.a.) *</label>
                  <input type="number" value={pRate} onChange={e => setPRate(e.target.value)} placeholder="e.g. 12.5" step="0.1" min="0.1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Min amount (K) *</label>
                  <input type="number" value={pMin} onChange={e => setPMin(e.target.value)} placeholder="500"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Max amount (K) <span className="text-slate-500">optional</span></label>
                  <input type="number" value={pMax} onChange={e => setPMax(e.target.value)} placeholder="No cap"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Min term (months) *</label>
                  <input type="number" value={pTerm} onChange={e => setPTerm(e.target.value)} placeholder="3" min="1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button type="button" onClick={() => setPActive(v => !v)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${pActive ? "bg-emerald-500" : "bg-slate-700"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pActive ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-sm text-slate-300">Active (visible to clients)</span>
                </div>
              </div>

              {pError && <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{pError}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setProductModal(false)} className="flex-1 py-2.5 bg-slate-800 rounded-xl text-slate-300 hover:text-white text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={saveProduct} disabled={pSaving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                  {pSaving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {editProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
