// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Search, Package, RefreshCw, ChevronDown, ChevronUp, ImageIcon, Shield, Loader2 } from "lucide-react";

function token() { return localStorage.getItem("philix_staff_token") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }
const K = (n: number) => `K${Number(n).toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface CollateralItem {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  collateralType: string | null;
  collateralDesc: string | null;
  collateralValue: number | null;
  collateralPhotos: string | null;
  collateralCondition: string | null;
  collateralYear: string | null;
  collateralSerial: string | null;
  collateralOwner: string | null;
  hasOwnershipDocs: boolean;
  hasInsurance: boolean;
  status: string;
  createdAt: string;
  account: {
    id: string;
    firstName: string;
    lastName: string;
    clientNumber: string;
    email: string;
    phone: string;
  };
}

const STATUS_CHIP: Record<string, string> = {
  SUBMITTED:    "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  UNDER_REVIEW: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  APPROVED:     "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
  DISBURSED:    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  REJECTED:     "bg-red-500/15 text-red-400 border border-red-500/25",
  REPAID:       "bg-white/10 text-white/40 border border-white/10",
};

function PhotoGallery({ photosJson }: { photosJson: string | null }) {
  const [zoom, setZoom] = useState<string | null>(null);
  if (!photosJson) return <span className="text-white/25 text-xs italic">No photos</span>;
  let photos: Record<string, string> = {};
  try { photos = JSON.parse(photosJson); } catch { return null; }
  const entries = Object.entries(photos).filter(([, v]) => v && v.startsWith("data:"));
  if (!entries.length) return <span className="text-white/25 text-xs italic">No photos</span>;
  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {entries.map(([key, src]) => (
          <button key={key} onClick={() => setZoom(src)}
            className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/10 hover:border-indigo-500/50 transition-all group">
            <img src={src} alt={key} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ImageIcon size={12} className="text-white" />
            </div>
          </button>
        ))}
      </div>
      {zoom && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Collateral photo" className="max-w-full max-h-full object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 rounded-xl p-2" onClick={() => setZoom(null)}>✕</button>
        </div>
      )}
    </>
  );
}

export default function CollateralPage() {
  const [items, setItems] = useState<CollateralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/collateral?limit=200", { headers: authH() });
      if (r.ok) {
        const d = await r.json();
        setItems(Array.isArray(d) ? d : (d.items ?? []));
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(c => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.reference.toLowerCase().includes(q) ||
      (c.collateralType ?? "").toLowerCase().includes(q) ||
      (c.collateralDesc ?? "").toLowerCase().includes(q) ||
      (c.collateralSerial ?? "").toLowerCase().includes(q) ||
      c.account.firstName.toLowerCase().includes(q) ||
      c.account.lastName.toLowerCase().includes(q) ||
      c.account.clientNumber.toLowerCase().includes(q)
    );
  });

  const totalValue = items.reduce((s, c) => s + (c.collateralValue ?? 0), 0);
  const byStatus = (s: string) => items.filter(c => c.status === s).length;

  const STATUSES = ["ALL", "DISBURSED", "APPROVED", "SUBMITTED", "UNDER_REVIEW", "REPAID", "REJECTED"];

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Collateral Vault</h1>
          <p className="text-sm text-white/35 mt-0.5">All client collateral submitted with loan applications</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl text-white/25 hover:text-white/60 border border-white/5 hover:border-white/10 transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Items",       value: items.length,         color: "text-white/80"    },
          { label: "Active Collateral", value: byStatus("DISBURSED"), color: "text-emerald-400" },
          { label: "Pending Review",    value: byStatus("SUBMITTED") + byStatus("UNDER_REVIEW"), color: "text-amber-400" },
          { label: "Total Est. Value",  value: K(totalValue),        color: "text-[#C9A227]"   },
        ].map(c => (
          <div key={c.label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</div>
            <div className="text-[11px] text-white/30 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            className="w-full bg-white/[0.04] border border-white/8 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-white/20"
            placeholder="Search by client, loan ref, collateral type, serial…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/[0.04] border border-white/8 text-white/70 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 min-w-[140px]"
        >
          {STATUSES.map(s => <option key={s} value={s} className="bg-[#0B1F3A]">{s === "ALL" ? "All Statuses" : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-white/25 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading collateral records…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={30} className="mx-auto mb-3 text-white/10" />
            <div className="text-white/30 text-sm">
              {items.length === 0 ? "No collateral submitted yet" : "No results matching your filters"}
            </div>
            {items.length === 0 && (
              <div className="text-white/20 text-xs mt-1 max-w-xs mx-auto">
                Collateral is submitted by clients as part of their loan application. It will appear here once a loan application includes collateral details.
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_140px_180px_120px_120px_100px_40px] gap-4 px-5 py-3 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/25">
              <div>Collateral</div>
              <div>Loan Ref</div>
              <div>Client</div>
              <div>Est. Value</div>
              <div>Loan Amount</div>
              <div>Status</div>
              <div></div>
            </div>

            {filtered.map(item => {
              const isOpen = expanded === item.id;
              let photosCount = 0;
              if (item.collateralPhotos) {
                try {
                  photosCount = Object.keys(JSON.parse(item.collateralPhotos)).length;
                } catch { /**/ }
              }

              return (
                <div key={item.id} className="border-b border-white/[0.03] last:border-none">
                  {/* Row */}
                  <div
                    className="grid grid-cols-[1fr_140px_180px_120px_120px_100px_40px] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    <div>
                      <div className="font-medium text-white/80 text-sm">{item.collateralType ?? "—"}</div>
                      <div className="text-[11px] text-white/35 mt-0.5 line-clamp-1">{item.collateralDesc ?? "—"}</div>
                    </div>
                    <div className="font-mono text-[11px] text-white/40">{item.reference}</div>
                    <div>
                      <div className="text-sm text-white/70">{item.account.firstName} {item.account.lastName}</div>
                      <div className="text-[10px] font-mono text-white/30">{item.account.clientNumber}</div>
                    </div>
                    <div className="font-bold text-[#C9A227] text-sm">
                      {item.collateralValue ? K(item.collateralValue) : "—"}
                    </div>
                    <div className="text-sm text-white/60">{K(item.amountRequested)}</div>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CHIP[item.status] ?? "bg-white/5 text-white/30 border border-white/10"}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {isOpen ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/20" />}
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isOpen && (
                    <div className="px-5 pb-5 bg-white/[0.01] border-t border-white/[0.04]">
                      <div className="pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { label: "Client",         value: `${item.account.firstName} ${item.account.lastName}` },
                          { label: "Client Number",  value: item.account.clientNumber },
                          { label: "Phone",          value: item.account.phone || "—" },
                          { label: "Email",          value: item.account.email },
                          { label: "Loan Reference", value: item.reference },
                          { label: "Product Type",   value: item.productType?.replace(/_/g, " ") ?? "—" },
                          { label: "Loan Amount",    value: K(item.amountRequested) },
                          { label: "Collateral Type",value: item.collateralType ?? "—" },
                          { label: "Description",    value: item.collateralDesc ?? "—" },
                          { label: "Est. Value",     value: item.collateralValue ? K(item.collateralValue) : "—" },
                          { label: "Serial / ID",    value: item.collateralSerial ?? "—" },
                          { label: "Year / Model",   value: item.collateralYear ?? "—" },
                          { label: "Owner",          value: item.collateralOwner ?? "—" },
                          { label: "Condition",      value: item.collateralCondition ?? "—" },
                          { label: "Ownership Docs", value: item.hasOwnershipDocs ? "Yes" : "No" },
                          { label: "Insured",        value: item.hasInsurance ? "Yes" : "No" },
                          { label: "Submitted",      value: new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
                          { label: "Photos",         value: `${photosCount} photo${photosCount !== 1 ? "s" : ""} attached` },
                        ].map(f => f.value && f.value !== "—" ? (
                          <div key={f.label} className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                            <div className="text-[9px] font-bold text-white/25 uppercase tracking-wider">{f.label}</div>
                            <div className="text-sm text-white/65 font-medium mt-0.5">{f.value}</div>
                          </div>
                        ) : null)}
                      </div>

                      {/* Collateral photos */}
                      {item.collateralPhotos && (
                        <div className="mt-4">
                          <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ImageIcon size={11} /> Collateral Photos
                          </div>
                          <PhotoGallery photosJson={item.collateralPhotos} />
                        </div>
                      )}

                      {/* Coverage indicator */}
                      {item.collateralValue && item.amountRequested && (
                        <div className="mt-4 flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                          <Shield size={14} className="text-indigo-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-xs text-white/40">
                              Coverage Ratio: <span className={`font-bold ${item.collateralValue / item.amountRequested >= 1.5 ? "text-emerald-400" : item.collateralValue / item.amountRequested >= 1 ? "text-amber-400" : "text-red-400"}`}>
                                {((item.collateralValue / item.amountRequested) * 100).toFixed(0)}%
                              </span>
                              {" "}— Collateral {item.collateralValue >= item.amountRequested ? "covers" : "does not fully cover"} the loan amount
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${item.collateralValue / item.amountRequested >= 1.5 ? "bg-emerald-500" : item.collateralValue / item.amountRequested >= 1 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${Math.min(100, (item.collateralValue / item.amountRequested) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="px-5 py-3 border-t border-white/[0.04] text-[11px] text-white/25">
              Showing {filtered.length} of {items.length} collateral records
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
