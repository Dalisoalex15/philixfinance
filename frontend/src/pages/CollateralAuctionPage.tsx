import { useState, useEffect } from "react";
import { Gavel, Package, CheckCircle, Clock, AlertTriangle, X, DollarSign } from "lucide-react";
import { useLoanApplicationStore, LoanApplication } from "../store/loanApplicationStore";
import { formatDate } from "../lib/mock-data";

const K = (n: number) => `K${Math.round(n).toLocaleString()}`;

function getForcedSaleValue(app: LoanApplication): number {
  return app.forcedSaleValue ?? app.collateralValue * 0.55;
}

interface ListedItem {
  id: string;
  appId: string;
  clientName: string;
  collateralType: string;
  collateralDescription: string;
  condition: string;
  declaredValue: number;
  forcedSaleValue: number;
  reservePrice: number;
  auctionDate: string;
  notes: string;
  status: "LISTED" | "SOLD";
  salePrice?: number;
  soldAt?: string;
}

interface SaleMeta {
  appId: string;
  salePrice: number;
}

export default function CollateralAuctionPage() {
  const { applications, syncFromApi } = useLoanApplicationStore();
  const [tab, setTab] = useState<"available" | "listed">("available");
  const [listed, setListed] = useState<ListedItem[]>([]);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [form, setForm] = useState({ reservePrice: 0, auctionDate: "", notes: "" });
  const [salePrompt, setSalePrompt] = useState<SaleMeta | null>(null);

  useEffect(() => { syncFromApi(); }, []);

  // REJECTED applications with collateral value > 0
  const available = applications.filter(a => a.status === "REJECTED" && a.collateralValue > 0);
  const listedItems = listed.filter(l => l.status === "LISTED");
  const soldItems = listed.filter(l => l.status === "SOLD");
  const totalRecovered = soldItems.reduce((s, l) => s + (l.salePrice ?? 0), 0);

  function openListForm(app: LoanApplication) {
    setForm({ reservePrice: Math.round(getForcedSaleValue(app)), auctionDate: "", notes: "" });
    setOpenForm(app.id);
  }

  function listItem(app: LoanApplication) {
    const item: ListedItem = {
      id: `auct-${Date.now()}`,
      appId: app.id,
      clientName: app.clientName,
      collateralType: app.collateralType,
      collateralDescription: app.collateralDescription,
      condition: app.collateralCondition,
      declaredValue: app.collateralValue,
      forcedSaleValue: getForcedSaleValue(app),
      reservePrice: form.reservePrice,
      auctionDate: form.auctionDate,
      notes: form.notes,
      status: "LISTED",
    };
    setListed(prev => [item, ...prev]);
    setOpenForm(null);
  }

  function markSold(itemId: string, salePrice: number) {
    setListed(prev => prev.map(l =>
      l.id === itemId ? { ...l, status: "SOLD" as const, salePrice, soldAt: new Date().toISOString() } : l
    ));
    setSalePrompt(null);
  }

  const kpis = [
    { label: "Available for Auction", value: available.length, icon: <Package size={18} className="text-amber-400" />, color: "text-amber-400" },
    { label: "Listed", value: listedItems.length, icon: <Gavel size={18} className="text-indigo-400" />, color: "text-indigo-400" },
    { label: "Sold", value: soldItems.length, icon: <CheckCircle size={18} className="text-emerald-400" />, color: "text-emerald-400" },
    { label: "Total Recovered", value: K(totalRecovered), icon: <DollarSign size={18} className="text-blue-400" />, color: "text-blue-400" },
  ];

  const isListed = (appId: string) => listed.some(l => l.appId === appId);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collateral Auction</h1>
          <p className="page-subtitle">List repossessed collateral for auction and track recovery</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="philix-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">{k.icon}</div>
            <div>
              <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-500">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["available", "listed"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${tab === t ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {t === "available" ? `Available (${available.length})` : `Listed & Sold (${listed.length})`}
          </button>
        ))}
      </div>

      {/* Available Tab */}
      {tab === "available" && (
        <div className="philix-card overflow-hidden">
          {available.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p>No rejected applications with collateral available for auction.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800">
                  <tr className="text-left">
                    {["Client", "Collateral Type", "Description", "Declared Value", "Forced Sale Value", "Condition", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {available.map(app => (
                    <>
                      <tr key={app.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-200">{app.clientName}</td>
                        <td className="px-4 py-3 text-slate-300">{app.collateralType || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{app.collateralDescription || "—"}</td>
                        <td className="px-4 py-3 text-slate-200">{K(app.collateralValue)}</td>
                        <td className="px-4 py-3 text-amber-400 font-semibold">{K(getForcedSaleValue(app))}</td>
                        <td className="px-4 py-3">
                          <span className="badge-gray">{app.collateralCondition || "Unknown"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isListed(app.id) ? (
                            <span className="badge-blue">Listed</span>
                          ) : (
                            <button onClick={() => openListForm(app)} className="btn-primary text-xs py-1.5 px-3">
                              <Gavel size={12} /> List for Auction
                            </button>
                          )}
                        </td>
                      </tr>
                      {openForm === app.id && (
                        <tr key={`form-${app.id}`}>
                          <td colSpan={7} className="bg-slate-800/60 px-6 py-5">
                            <div className="flex items-start justify-between mb-4">
                              <h4 className="text-sm font-semibold text-slate-200">List for Auction — {app.clientName}</h4>
                              <button onClick={() => setOpenForm(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">Reserve Price (K)</label>
                                <input type="number" className="input-base" value={form.reservePrice}
                                  onChange={e => setForm(f => ({ ...f, reservePrice: Number(e.target.value) }))} />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">Scheduled Auction Date</label>
                                <input type="date" className="input-base" value={form.auctionDate}
                                  onChange={e => setForm(f => ({ ...f, auctionDate: e.target.value }))} />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">Auctioneer Notes</label>
                                <input className="input-base" placeholder="Optional notes..." value={form.notes}
                                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                              </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                              <button onClick={() => listItem(app)} className="btn-primary text-xs">
                                <Gavel size={13} /> Confirm Listing
                              </button>
                              <button onClick={() => setOpenForm(null)} className="btn-secondary text-xs">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Listed & Sold Tab */}
      {tab === "listed" && (
        <div className="space-y-4">
          {listed.length === 0 ? (
            <div className="philix-card text-center py-16 text-slate-500">
              <Clock size={40} className="mx-auto mb-3 opacity-40" />
              <p>No items listed for auction yet.</p>
            </div>
          ) : (
            <div className="philix-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800">
                    <tr className="text-left">
                      {["Client", "Collateral", "Declared Value", "Reserve Price", "Auction Date", "Status", "Sale Price", "Action"].map(h => (
                        <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {listed.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-200">{item.clientName}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{item.collateralType} — {item.collateralDescription.slice(0, 30)}</td>
                        <td className="px-4 py-3 text-slate-300">{K(item.declaredValue)}</td>
                        <td className="px-4 py-3 text-amber-400">{K(item.reservePrice)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{item.auctionDate ? formatDate(item.auctionDate) : "TBD"}</td>
                        <td className="px-4 py-3">
                          {item.status === "SOLD"
                            ? <span className="badge-green">Sold</span>
                            : <span className="badge-blue">Listed</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold">
                          {item.salePrice ? K(item.salePrice) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "LISTED" && (
                            <button onClick={() => setSalePrompt({ appId: item.id, salePrice: item.reservePrice })}
                              className="btn-success text-xs py-1.5 px-3">
                              Mark Sold
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sale Price Modal */}
      {salePrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Record Sale Price</h3>
              <button onClick={() => setSalePrompt(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <label className="text-xs text-slate-400 mb-1 block">Actual Sale Price (K)</label>
            <input type="number" className="input-base mb-4" value={salePrompt.salePrice}
              onChange={e => setSalePrompt(p => p ? { ...p, salePrice: Number(e.target.value) } : null)} />
            <div className="flex gap-3">
              <button onClick={() => markSold(salePrompt.appId, salePrompt.salePrice)} className="btn-success flex-1 text-xs">
                <CheckCircle size={13} /> Confirm Sale
              </button>
              <button onClick={() => setSalePrompt(null)} className="btn-secondary flex-1 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
