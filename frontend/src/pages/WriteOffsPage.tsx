import { useState, useEffect } from "react";
import { XCircle, AlertTriangle, CheckCircle, Slash, X } from "lucide-react";
import { useLoanApplicationStore, LoanApplication } from "../store/loanApplicationStore";
import { formatDate } from "../lib/mock-data";

const K = (n: number) => `K${Math.round(n).toLocaleString()}`;

function getDaysOverdue(app: LoanApplication): number {
  const due = new Date(app.submittedAt).getTime() + (app.termMonths ?? 1) * 7 * 86400000;
  const diff = Date.now() - due;
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

interface WriteOffRecord {
  id: string;
  appId: string;
  clientName: string;
  loanRef: string;
  amount: number;
  reason: string;
  approvalRef: string;
  recordedAt: string;
}

interface WaivedSet {
  [appId: string]: boolean;
}

export default function WriteOffsPage() {
  const { applications, syncFromApi } = useLoanApplicationStore();
  const [tab, setTab] = useState<"writeoffs" | "penalties">("writeoffs");
  const [writeoffs, setWriteoffs] = useState<WriteOffRecord[]>([]);
  const [waived, setWaived] = useState<WaivedSet>({});
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [form, setForm] = useState({ reason: "BAD_DEBT", approvalRef: "", amount: 0 });

  useEffect(() => { syncFromApi(); }, []);

  const rejected = applications.filter(a => a.status === "REJECTED");
  const disbursed = applications.filter(a => a.status === "DISBURSED");

  const totalWrittenOff = writeoffs.reduce((s, w) => s + w.amount, 0);

  function openWriteoffForm(app: LoanApplication) {
    setForm({ reason: "BAD_DEBT", approvalRef: "", amount: app.amount });
    setOpenForm(app.id);
  }

  function recordWriteoff(app: LoanApplication) {
    const rec: WriteOffRecord = {
      id: `wo-${Date.now()}`,
      appId: app.id,
      clientName: app.clientName,
      loanRef: app.ref,
      amount: form.amount,
      reason: form.reason,
      approvalRef: form.approvalRef,
      recordedAt: new Date().toISOString(),
    };
    setWriteoffs(prev => [rec, ...prev]);
    setOpenForm(null);
  }

  // Penalties
  const penaltyRows = disbursed.map(app => {
    const daysOverdue = getDaysOverdue(app);
    const penalty = daysOverdue * app.weeklyPayment * 0.05;
    return { app, daysOverdue, penalty };
  }).filter(r => r.daysOverdue > 0);

  const kpiWriteoffs = [
    { label: "Total Rejected (Candidates)", value: rejected.length, color: "text-red-400", icon: <XCircle size={18} className="text-red-400" /> },
    { label: "Write-offs Recorded", value: writeoffs.length, color: "text-amber-400", icon: <AlertTriangle size={18} className="text-amber-400" /> },
    { label: "Total Written Off", value: K(totalWrittenOff), color: "text-orange-400", icon: <Slash size={18} className="text-orange-400" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Write-offs & Penalties</h1>
          <p className="page-subtitle">Record loan write-offs and manage penalty waivers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["writeoffs", "penalties"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${tab === t ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {t === "writeoffs" ? "Write-offs" : "Penalties"}
          </button>
        ))}
      </div>

      {/* Write-offs Tab */}
      {tab === "writeoffs" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {kpiWriteoffs.map(k => (
              <div key={k.label} className="philix-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">{k.icon}</div>
                <div>
                  <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-slate-500">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Rejected Applications Table */}
          <div className="philix-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Rejected Applications — Write-off Candidates</h3>
            </div>
            {rejected.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle size={36} className="mx-auto mb-2 text-emerald-600 opacity-50" />
                <p>No rejected applications.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800">
                    <tr className="text-left">
                      {["Client", "Ref", "Amount", "Reason", "Rejected At", "Action"].map(h => (
                        <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {rejected.map(app => (
                      <>
                        <tr key={app.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-medium text-slate-200">{app.clientName}</td>
                          <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{app.ref}</td>
                          <td className="px-4 py-3 text-slate-200">{K(app.amount)}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{app.rejectedReason || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{app.reviewedAt ? formatDate(app.reviewedAt) : "—"}</td>
                          <td className="px-4 py-3">
                            {writeoffs.find(w => w.appId === app.id) ? (
                              <span className="badge-red">Written Off</span>
                            ) : (
                              <button onClick={() => openWriteoffForm(app)} className="btn-danger text-xs py-1.5 px-3">
                                Record Write-off
                              </button>
                            )}
                          </td>
                        </tr>
                        {openForm === app.id && (
                          <tr key={`wo-form-${app.id}`}>
                            <td colSpan={6} className="bg-slate-800/60 px-6 py-5">
                              <div className="flex items-start justify-between mb-4">
                                <h4 className="text-sm font-semibold text-slate-200">Record Write-off — {app.clientName}</h4>
                                <button onClick={() => setOpenForm(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Reason</label>
                                  <select className="input-base" value={form.reason}
                                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                                    {["BAD_DEBT", "FRAUD", "DECEASED", "OTHER"].map(r => (
                                      <option key={r} value={r}>{r.replace("_", " ")}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Approval Reference</label>
                                  <input className="input-base" placeholder="e.g. MGR-2025-001" value={form.approvalRef}
                                    onChange={e => setForm(f => ({ ...f, approvalRef: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Amount (K)</label>
                                  <input type="number" className="input-base" value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                                </div>
                              </div>
                              <div className="flex gap-3 mt-4">
                                <button onClick={() => recordWriteoff(app)} className="btn-danger text-xs">
                                  <XCircle size={13} /> Confirm Write-off
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

          {/* Recorded Write-offs */}
          {writeoffs.length > 0 && (
            <div className="philix-card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200">Recorded Write-offs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-800">
                    <tr className="text-left">
                      {["Client", "Loan Ref", "Amount", "Reason", "Approval Ref", "Date"].map(h => (
                        <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {writeoffs.map(w => (
                      <tr key={w.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-200">{w.clientName}</td>
                        <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{w.loanRef}</td>
                        <td className="px-4 py-3 text-red-400 font-semibold">{K(w.amount)}</td>
                        <td className="px-4 py-3"><span className="badge-red">{w.reason}</span></td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{w.approvalRef || "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(w.recordedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Penalties Tab */}
      {tab === "penalties" && (
        <div className="philix-card overflow-hidden">
          {penaltyRows.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-600 opacity-50" />
              <p>No overdue disbursed loans — no penalties outstanding.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800">
                  <tr className="text-left">
                    {["Client", "Loan Ref", "Days Overdue", "Base Amount", "Penalty (5%/wk)", "Status", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {penaltyRows.map(({ app, daysOverdue, penalty }) => (
                    <tr key={app.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-200">{app.clientName}</td>
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{app.ref}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${daysOverdue > 30 ? "text-red-400" : "text-amber-400"}`}>{daysOverdue}d</span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{K(app.amount)}</td>
                      <td className="px-4 py-3 text-orange-400 font-semibold">{K(penalty)}</td>
                      <td className="px-4 py-3">
                        {waived[app.id] ? <span className="badge-gray">Waived</span> : <span className="badge-red">Active</span>}
                      </td>
                      <td className="px-4 py-3">
                        {!waived[app.id] && (
                          <button onClick={() => setWaived(w => ({ ...w, [app.id]: true }))}
                            className="btn-secondary text-xs py-1.5 px-3">
                            <Slash size={12} /> Waive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
