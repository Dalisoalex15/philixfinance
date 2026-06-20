import { useState, useEffect } from "react";
import { RefreshCw, TrendingDown, Clock, CheckCircle, AlertTriangle, X } from "lucide-react";
import { useLoanApplicationStore, LoanApplication } from "../store/loanApplicationStore";
import { formatKwacha, formatDate } from "../lib/mock-data";

const K = (n: number) => `K${Math.round(n).toLocaleString()}`;

function getDueDate(app: LoanApplication) {
  return new Date(new Date(app.submittedAt).getTime() + (app.termMonths ?? 1) * 7 * 86400000);
}

function getDaysOverdue(app: LoanApplication) {
  const due = getDueDate(app);
  const now = Date.now();
  const diff = now - due.getTime();
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

interface RestructureRecord {
  id: string;
  appId: string;
  clientName: string;
  loanRef: string;
  amount: number;
  newTermWeeks: number;
  reason: string;
  notes: string;
  recordedAt: string;
}

interface InlineFormState {
  appId: string;
  newTermWeeks: number;
  reason: string;
  notes: string;
}

export default function LoanRestructurePage() {
  const { applications, syncFromApi } = useLoanApplicationStore();
  const [tab, setTab] = useState<"candidates" | "recorded">("candidates");
  const [restructures, setRestructures] = useState<RestructureRecord[]>([]);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [form, setForm] = useState<InlineFormState>({ appId: "", newTermWeeks: 2, reason: "HARDSHIP", notes: "" });

  useEffect(() => { syncFromApi(); }, []);

  const disbursed = applications.filter(a => a.status === "DISBURSED");

  // Candidates: DISBURSED loans with due date > 14 days ago
  const candidates = disbursed.filter(a => getDaysOverdue(a) > 14);

  const totalActive = disbursed.length;
  const overdue30Plus = disbursed.filter(a => getDaysOverdue(a) > 30).length;
  const totalAmountRestructured = restructures.reduce((s, r) => s + r.amount, 0);

  function openRestructureForm(app: LoanApplication) {
    setForm({ appId: app.id, newTermWeeks: 2, reason: "HARDSHIP", notes: "" });
    setOpenForm(app.id);
  }

  function recordRestructure(app: LoanApplication) {
    const rec: RestructureRecord = {
      id: `rst-${Date.now()}`,
      appId: app.id,
      clientName: app.clientName,
      loanRef: app.ref,
      amount: app.amount,
      newTermWeeks: form.newTermWeeks,
      reason: form.reason,
      notes: form.notes,
      recordedAt: new Date().toISOString(),
    };
    setRestructures(prev => [rec, ...prev]);
    setOpenForm(null);
  }

  const kpis = [
    { label: "Total Active", value: totalActive, icon: <RefreshCw size={18} className="text-indigo-400" />, color: "text-indigo-400" },
    { label: "Overdue 30+ Days", value: overdue30Plus, icon: <AlertTriangle size={18} className="text-amber-400" />, color: "text-amber-400" },
    { label: "Restructured", value: restructures.length, icon: <CheckCircle size={18} className="text-emerald-400" />, color: "text-emerald-400" },
    { label: "Total Amount Restructured", value: K(totalAmountRestructured), icon: <TrendingDown size={18} className="text-blue-400" />, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loan Restructuring</h1>
          <p className="page-subtitle">Record restructures for overdue disbursed loans</p>
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
        {(["candidates", "recorded"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${tab === t ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {t === "candidates" ? `Candidates (${candidates.length})` : `Recorded (${restructures.length})`}
          </button>
        ))}
      </div>

      {/* Candidates Tab */}
      {tab === "candidates" && (
        <div className="philix-card overflow-hidden">
          {candidates.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-600" />
              <p>No overdue loans requiring restructuring (overdue &gt; 14 days).</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800">
                  <tr className="text-left">
                    {["Client", "Loan Ref", "Product", "Amount", "Due Date", "Days Overdue", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {candidates.map(app => {
                    const daysOverdue = getDaysOverdue(app);
                    const dueDate = getDueDate(app);
                    return (
                      <>
                        <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-200">{app.clientName}</td>
                          <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{app.ref}</td>
                          <td className="px-4 py-3 text-slate-400">{app.productName}</td>
                          <td className="px-4 py-3 text-slate-200">{K(app.amount)}</td>
                          <td className="px-4 py-3 text-slate-400">{formatDate(dueDate.toISOString())}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${daysOverdue > 30 ? "text-red-400" : "text-amber-400"}`}>{daysOverdue}d</span>
                          </td>
                          <td className="px-4 py-3">
                            {restructures.find(r => r.appId === app.id) ? (
                              <span className="badge-green">Restructured</span>
                            ) : (
                              <button onClick={() => openRestructureForm(app)} className="btn-primary text-xs py-1.5 px-3">
                                Record Restructure
                              </button>
                            )}
                          </td>
                        </tr>
                        {openForm === app.id && (
                          <tr key={`form-${app.id}`}>
                            <td colSpan={7} className="bg-slate-800/60 px-6 py-5">
                              <div className="flex items-start justify-between mb-4">
                                <h4 className="text-sm font-semibold text-slate-200">Record Restructure — {app.clientName}</h4>
                                <button onClick={() => setOpenForm(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">New Term (weeks)</label>
                                  <select className="input-base" value={form.newTermWeeks}
                                    onChange={e => setForm(f => ({ ...f, newTermWeeks: Number(e.target.value) }))}>
                                    {[1, 2, 3, 4].map(w => <option key={w} value={w}>{w} week{w > 1 ? "s" : ""}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Reason</label>
                                  <select className="input-base" value={form.reason}
                                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                                    {["HARDSHIP", "BUSINESS_LOSS", "MEDICAL", "OTHER"].map(r => (
                                      <option key={r} value={r}>{r.replace("_", " ")}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                                  <input className="input-base" placeholder="Optional notes..." value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                                </div>
                              </div>
                              <div className="flex gap-3 mt-4">
                                <button onClick={() => recordRestructure(app)} className="btn-success text-xs">
                                  <CheckCircle size={13} /> Save Restructure
                                </button>
                                <button onClick={() => setOpenForm(null)} className="btn-secondary text-xs">Cancel</button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recorded Tab */}
      {tab === "recorded" && (
        <div className="philix-card overflow-hidden">
          {restructures.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Clock size={40} className="mx-auto mb-3 opacity-40" />
              <p>No restructures recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800">
                  <tr className="text-left">
                    {["Client", "Loan Ref", "Amount", "New Term", "Reason", "Notes", "Recorded At"].map(h => (
                      <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {restructures.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-200">{r.clientName}</td>
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{r.loanRef}</td>
                      <td className="px-4 py-3 text-slate-200">{K(r.amount)}</td>
                      <td className="px-4 py-3 text-emerald-400">{r.newTermWeeks} week{r.newTermWeeks > 1 ? "s" : ""}</td>
                      <td className="px-4 py-3"><span className="badge-yellow">{r.reason}</span></td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{r.notes || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(r.recordedAt)}</td>
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
