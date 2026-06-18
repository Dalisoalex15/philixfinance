import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, Unlock, Check } from "lucide-react";
import { mockCollateral, formatKwacha, formatDate, getStatusColor } from "../lib/mock-data";
import { useState } from "react";

export default function CollateralDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(mockCollateral.find((c) => c.id === id));
  const [showRelease, setShowRelease] = useState(false);
  const [releasedTo, setReleasedTo] = useState("");
  const [released, setReleased] = useState(false);

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Collateral item not found</p>
        <button onClick={() => navigate("/collateral")} className="btn-secondary mt-4">Back to Vault</button>
      </div>
    );
  }

  const handleRelease = () => {
    if (!releasedTo) return;
    setItem((i: any) => i ? { ...i, status: "RELEASED" } : i);
    setReleased(true);
    setShowRelease(false);
  };

  const conditionColors: Record<string, string> = {
    EXCELLENT: "text-emerald-400", GOOD: "text-blue-400",
    FAIR: "text-amber-400", POOR: "text-red-400", DAMAGED: "text-red-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/collateral")} className="btn-secondary py-2 px-3">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{item.vaultId}</h1>
            <span className={getStatusColor(item.status)}>{item.status}</span>
          </div>
          <p className="page-subtitle">{item.brand} {item.model} · {item.type.replace("_", " ")}</p>
        </div>
      </div>

      {released && (
        <div className="flex items-center gap-2 p-3 bg-emerald-900/20 border border-emerald-800/50 rounded-lg text-emerald-400 text-sm animate-fade-in">
          <Check size={14} /> Collateral released to {releasedTo}. Receipt has been generated.
        </div>
      )}

      {item.status === "HELD" && (
        <div className="flex gap-3">
          <button onClick={() => setShowRelease(true)} className="btn-success">
            <Unlock size={14} /> Release Collateral
          </button>
        </div>
      )}

      {showRelease && (
        <div className="philix-card p-5 border-emerald-800/50 border animate-fade-in">
          <h3 className="section-title mb-3">Release Collateral</h3>
          <p className="text-xs text-slate-400 mb-3">Confirm that the linked loan is fully paid before releasing collateral.</p>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Released To (Client/Representative Name) *</label>
            <input className="input-base mb-3" value={releasedTo} onChange={(e) => setReleasedTo(e.target.value)} placeholder="Full name of recipient" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleRelease} disabled={!releasedTo} className="btn-success">Confirm Release</button>
            <button onClick={() => setShowRelease(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Details */}
        <div className="philix-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-indigo-400" />
            <h3 className="section-title">Asset Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Brand", value: item.brand },
              { label: "Model", value: item.model },
              { label: "Type", value: item.type.replace("_", " ") },
              { label: "Color", value: item.color || "—" },
              { label: "Serial #", value: item.serialNumber || "—" },
              { label: "IMEI", value: (item as any).imei || "—" },
              { label: "Age (Years)", value: item.ageYears?.toString() || "—" },
              { label: "Condition", value: <span className={conditionColors[item.condition]}>{item.condition}</span> },
              { label: "Battery", value: item.batteryHealth ? `${item.batteryHealth}%` : "N/A" },
              { label: "Has Charger", value: item.hasCharger ? "Yes" : "No" },
              { label: "Has Box", value: item.hasBox ? "Yes" : "No" },
            ].map((r) => (
              <div key={r.label} className="bg-slate-800/50 rounded p-2.5">
                <div className="text-xs text-slate-500">{r.label}</div>
                <div className="text-slate-200 font-medium mt-0.5">{r.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Valuation & Location */}
        <div className="space-y-4">
          <div className="philix-card p-5">
            <h3 className="section-title mb-4">Valuation</h3>
            <div className="space-y-3">
              {[
                { label: "Market Value", value: formatKwacha(item.marketValue), color: "text-slate-200" },
                { label: "Forced Sale Value", value: formatKwacha(item.forcedSaleValue), color: "text-amber-400" },
                { label: "Max Loan Amount (75%)", value: formatKwacha(item.maxLoanAmount), color: "text-emerald-400" },
                { label: "LTV Ratio", value: `${item.loanToValue}%`, color: "text-indigo-400" },
              ].map((v) => (
                <div key={v.label} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                  <span className="text-sm text-slate-400">{v.label}</span>
                  <span className={`text-sm font-bold ${v.color}`}>{v.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="philix-card p-5">
            <h3 className="section-title mb-4">Vault Location</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Shelf", value: item.shelfNumber || "—" },
                { label: "Position", value: item.vaultPosition || "—" },
                { label: "Locker", value: (item as any).lockerNumber || "—" },
              ].map((l) => (
                <div key={l.label} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-lg font-bold font-mono text-indigo-400">{l.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{l.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="philix-card p-5">
            <h3 className="section-title mb-3">Owner</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-indigo-400">
                {item.client.firstName[0]}{item.client.lastName[0]}
              </div>
              <div>
                <div className="font-medium text-slate-200">{item.client.firstName} {item.client.lastName}</div>
                <div className="text-xs text-slate-500">{item.client.clientNumber}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-3">Received: {formatDate(item.receivedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
