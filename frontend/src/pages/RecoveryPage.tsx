import { useState, useEffect } from "react";
import { Wrench, AlertTriangle, DollarSign, CheckCircle, X, Filter } from "lucide-react";
import { useLoanApplicationStore, LoanApplication } from "../store/loanApplicationStore";
import { formatDate } from "../lib/mock-data";

const K = (n: number) => `K${Math.round(n).toLocaleString()}`;

function getEstimatedRecovery(app: LoanApplication): number {
  return app.forcedSaleValue ?? app.collateralValue * 0.55;
}

type RecoveryStatus = "PENDING" | "IN_PROGRESS" | "AUCTIONED" | "RECOVERED";
type RecoveryMethod = "AUCTION" | "NEGOTIATION" | "LEGAL" | "GARNISHEE";

interface RecoveryRecord {
  id: string;
  appId: string;
  actualAmount: number;
  date: string;
  method: RecoveryMethod;
}

interface StatusMap {
  [appId: string]: RecoveryStatus;
}

interface RecoveryModal {
  app: LoanApplication;
  amount: number;
  date: string;
  method: RecoveryMethod;
}

export default function RecoveryPage() {
  const { applications, syncFromApi } = useLoanApplicationStore();
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [recoveries, setRecoveries] = useState<RecoveryRecord[]>([]);
  const [modal, setModal] = useState<RecoveryModal | null>(null);
  const [filterStatus, setFilterStatus] = useState<RecoveryStatus | "ALL">("ALL");

  useEffect(() => { syncFromApi(); }, []);

  const defaulted = applications.filter(a => a.status === "REJECTED");

  const collateralHeld = defaulted.filter(a => a.collateralValue > 0).length;
  const estimatedRecoveryTotal = defaulted.reduce((s, a) => s + getEstimatedRecovery(a), 0);
  const totalDefaulted = defaulted.reduce((s, a) => s + a.amount, 0);
  const totalActualRecovered = recoveries.reduce((s, r) => s + r.actualAmount, 0);
  const recoveryRate = totalDefaulted > 0 ? (totalActualRecovered / totalDefaulted) * 100 : 0;

  function getStatus(appId: string): RecoveryStatus {
    return statusMap[appId] ?? "PENDING";
  }

  function updateStatus(appId: string, status: RecoveryStatus) {
    setStatusMap(m => ({ ...m, [appId]: status }));
  }

  function openRecoveryModal(app: LoanApplication) {
    setModal({ app, amount: Math.round(getEstimatedRecovery(app)), date: new Date().toISOString().slice(0, 10), method: "AUCTION" });
  }

  function recordRecovery() {
    if (!modal) return;
    const rec: RecoveryRecord = {
      id: `rec-${Date.now()}`,
      appId: modal.app.id,
      actualAmount: modal.amount,
      date: modal.date,
      method: modal.method,
    };
    setRecoveries(prev => [rec, ...prev]);
    setStatusMap(m => ({ ...m, [modal.app.id]: "RECOVERED" }));
    setModal(null);
  }

  const filtered = filterStatus === "ALL"
    ? defaulted
    : defaulted.filter(a => getStatus(a.id) === filterStatus);

  const statusBadge: Record<RecoveryStatus, string> = {
    PENDING: "badge-gray",
    IN_PROGRESS: "badge-blue",
    AUCTIONED: "badge-yellow",
    RECOVERED: "badge-green",
  };

  const kpis = [
    { label: "Total Defaulted Amount", value: K(totalDefaulted), icon: <AlertTriangle size={18} className="text-red-400" />, color: "text-red-400" },
    { label: "Collateral Held", value: collateralHeld, icon: <Wrench size={18} className="text-amber-400" />, color: "text-amber-400" },
    { label: "Estimated Recovery", value: K(estimatedRecoveryTotal), icon: <DollarSign size={18} className="text-blue-400" />, color: "text-blue-400" },
    { label: "Recovery Rate", value: `${recoveryRate.toFixed(1)}%`, icon: <CheckCircle size={18} className="text-emerald-400" />, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recovery Dashboard</h1>
          <p className="page-subtitle">Track defaulted loan recovery pipeline and record actual recoveries</p>
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

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-500" />
        <span className="text-xs text-slate-500 mr-1">Filter by status:</span>
        {(["ALL", "PENDING", "IN_PROGRESS", "AUCTIONED", "RECOVERED"] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${filterStatus === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Recovery Pipeline Table */}
      <div className="philix-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">Recovery Pipeline ({filtered.length} cases)</h3>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <CheckCircle size={40} className="mx-auto mb-3 text-emerald-600 opacity-50" />
            <p>No defaulted loans in this status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800">
                <tr className="text-left">
                  {["Client", "Loan Ref", "Amount", "Collateral Type", "Est. Recovery", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map(app => {
                  const status = getStatus(app.id);
                  const recovery = recoveries.find(r => r.appId === app.id);
                  return (
                    <tr key={app.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-200">{app.clientName}</td>
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{app.ref}</td>
                      <td className="px-4 py-3 text-red-400 font-semibold">{K(app.amount)}</td>
                      <td className="px-4 py-3 text-slate-400">{app.collateralType || "None"}</td>
                      <td className="px-4 py-3 text-amber-400">{K(getEstimatedRecovery(app))}</td>
                      <td className="px-4 py-3">
                        <span className={statusBadge[status]}>{status.replace("_", " ")}</span>
                        {recovery && (
                          <div className="text-xs text-emerald-400 mt-0.5">Actual: {K(recovery.actualAmount)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {status !== "RECOVERED" && (
                            <>
                              <select
                                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1"
                                value={status}
                                onChange={e => updateStatus(app.id, e.target.value as RecoveryStatus)}>
                                <option value="PENDING">PENDING</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="AUCTIONED">AUCTIONED</option>
                              </select>
                              <button onClick={() => openRecoveryModal(app)}
                                className="btn-success text-xs py-1.5 px-3">
                                Record Recovery
                              </button>
                            </>
                          )}
                          {recovery && (
                            <div className="text-xs text-slate-500">
                              via {recovery.method} · {formatDate(recovery.date)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recovery Records */}
      {recoveries.length > 0 && (
        <div className="philix-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200">Recorded Recoveries ({recoveries.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800">
                <tr className="text-left">
                  {["Loan Ref", "Actual Amount", "Date", "Method"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recoveries.map(r => {
                  const app = applications.find(a => a.id === r.appId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{app?.ref ?? r.appId}</td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold">{K(r.actualAmount)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(r.date)}</td>
                      <td className="px-4 py-3"><span className="badge-blue">{r.method}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Recovery Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Record Recovery — {modal.app.clientName}</h3>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Actual Amount Recovered (K)</label>
                <input type="number" className="input-base" value={modal.amount}
                  onChange={e => setModal(m => m ? { ...m, amount: Number(e.target.value) } : null)} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Recovery Date</label>
                <input type="date" className="input-base" value={modal.date}
                  onChange={e => setModal(m => m ? { ...m, date: e.target.value } : null)} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Method</label>
                <select className="input-base" value={modal.method}
                  onChange={e => setModal(m => m ? { ...m, method: e.target.value as RecoveryMethod } : null)}>
                  {(["AUCTION", "NEGOTIATION", "LEGAL", "GARNISHEE"] as const).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={recordRecovery} className="btn-success flex-1 text-xs">
                <CheckCircle size={13} /> Confirm Recovery
              </button>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
