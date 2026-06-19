import { useState, useEffect } from "react";
import { Phone, MessageCircle, Mail, FileText, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useLoanApplicationStore, type LoanApplication } from "../store/loanApplicationStore";
import { formatKwacha } from "../lib/mock-data";

function getDaysOverdue(app: LoanApplication): number {
  const termWeeks = app.termMonths ?? 1;
  const subMs = new Date(app.submittedAt).getTime();
  const dueMs = subMs + termWeeks * 7 * 86400000;
  return Math.max(0, Math.ceil((Date.now() - dueMs) / 86400000));
}

function getCategory(daysOverdue: number): string {
  if (daysOverdue === 0) return "CURRENT";
  if (daysOverdue <= 7) return "AT_RISK";
  if (daysOverdue <= 30) return "DAYS_30";
  if (daysOverdue <= 60) return "DAYS_60";
  return "DEFAULT";
}

const categoryConfig: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  CURRENT: { label: "Current",   color: "text-emerald-400", bg: "bg-emerald-900/30", ring: "border-emerald-800/50" },
  AT_RISK: { label: "At Risk",   color: "text-yellow-400",  bg: "bg-yellow-900/20",  ring: "border-yellow-800/50" },
  DAYS_30: { label: "30+ Days",  color: "text-orange-400",  bg: "bg-orange-900/20",  ring: "border-orange-800/50" },
  DAYS_60: { label: "60+ Days",  color: "text-red-400",     bg: "bg-red-900/20",     ring: "border-red-800/50" },
  DEFAULT: { label: "Default",   color: "text-red-600",     bg: "bg-red-900/30",     ring: "border-red-900/50" },
};

type LogEntry = { type: string; notes: string; promiseAmount?: number; promiseDate?: string };

interface OverdueLoan {
  app: LoanApplication;
  daysOverdue: number;
  category: string;
  outstanding: number;
}

export default function CollectionsPage() {
  const { applications, syncFromApi } = useLoanApplicationStore();
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logType, setLogType] = useState("CALL");
  const [notes, setNotes] = useState("");
  const [promiseAmount, setPromiseAmount] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});

  useEffect(() => { syncFromApi(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncFromApi();
    setSyncing(false);
  };

  // Build overdue list from disbursed portal loans
  const overdueLoans: OverdueLoan[] = applications
    .filter(a => a.status === "DISBURSED" || a.status === "APPROVED")
    .map(app => {
      const daysOverdue = getDaysOverdue(app);
      return { app, daysOverdue, category: getCategory(daysOverdue), outstanding: app.totalRepayable || app.amount };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const selected = overdueLoans.find(o => o.app.id === selectedId) ?? null;

  const counts = {
    CURRENT: overdueLoans.filter(o => o.category === "CURRENT").length,
    AT_RISK: overdueLoans.filter(o => o.category === "AT_RISK").length,
    DAYS_30: overdueLoans.filter(o => o.category === "DAYS_30").length,
    DAYS_60: overdueLoans.filter(o => o.category === "DAYS_60").length,
    DEFAULT: overdueLoans.filter(o => o.category === "DEFAULT").length,
  };
  const totalOverdue = overdueLoans
    .filter(o => o.daysOverdue > 0)
    .reduce((s, o) => s + o.outstanding, 0);
  const atRiskCount = overdueLoans.filter(o => o.daysOverdue > 0).length;

  const handleLog = () => {
    if (!selected || !notes) return;
    const entry: LogEntry = { type: logType, notes, promiseAmount: promiseAmount ? parseFloat(promiseAmount) : undefined, promiseDate: promiseDate || undefined };
    setLogs(prev => ({ ...prev, [selected.app.id]: [...(prev[selected.app.id] || []), entry] }));
    setNotes("");
    setPromiseAmount("");
    setPromiseDate("");
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collections Center</h1>
          <p className="page-subtitle">Monitor active loans, overdue accounts, and contact logs</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn-secondary text-xs py-1.5">
          <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {(["CURRENT","AT_RISK","DAYS_30","DAYS_60","DEFAULT"] as const).map(key => {
          const cfg = categoryConfig[key];
          return (
            <div key={key} className={`philix-card p-4 border ${cfg.ring}`}>
              <div className={`text-2xl font-bold ${cfg.color}`}>{counts[key] ?? 0}</div>
              <div className={`text-xs font-medium mt-1 ${cfg.color}`}>{cfg.label}</div>
            </div>
          );
        })}
        <div className="philix-card p-4 border border-slate-800 col-span-2 lg:col-span-1">
          <div className="text-2xl font-bold text-slate-200">{overdueLoans.length}</div>
          <div className="text-xs font-medium mt-1 text-slate-400">Total Active</div>
        </div>
      </div>

      {/* Overdue Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="philix-card p-4 flex items-center gap-4">
          <AlertTriangle size={24} className="text-red-400 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-red-400">{formatKwacha(totalOverdue)}</div>
            <div className="text-sm text-slate-400">Total Overdue Outstanding</div>
          </div>
        </div>
        <div className="philix-card p-4 flex items-center gap-4">
          <FileText size={24} className="text-amber-400 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-amber-400">{atRiskCount}</div>
            <div className="text-sm text-slate-400">Loans Requiring Attention</div>
          </div>
        </div>
      </div>

      {/* Main Collections View */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 philix-card overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="section-title">Active Loans — Collections Queue</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {overdueLoans.map(({ app, daysOverdue, category, outstanding }) => {
              const cfg = categoryConfig[category];
              return (
                <div key={app.id}
                  className={`p-4 cursor-pointer transition-colors ${selectedId === app.id ? "bg-slate-800" : "hover:bg-slate-800/50"}`}
                  onClick={() => setSelectedId(app.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-indigo-400">{app.ref}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cfg.bg} ${cfg.color}`}>
                          {daysOverdue === 0 ? "CURRENT" : `${daysOverdue}D LATE`}
                        </span>
                      </div>
                      <div className="font-medium text-slate-200 mt-1">{app.clientName}</div>
                      <div className="text-xs text-slate-500">{app.clientPhone}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${daysOverdue > 0 ? "text-red-400" : "text-slate-300"}`}>{formatKwacha(outstanding)}</div>
                      <div className="text-xs text-slate-500">Outstanding</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Product:</span>
                    <span className="text-slate-400">{app.productName}</span>
                    <span className="ml-auto text-slate-500">{app.termMonths}W term</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {([["CALL", Phone], ["WHATSAPP", MessageCircle], ["EMAIL", Mail]] as [string, typeof Phone][]).map(([t, Icon]) => (
                      <button key={t}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-xs text-slate-300 hover:bg-slate-600 transition-colors"
                        onClick={e => { e.stopPropagation(); setSelectedId(app.id); setLogType(t); }}>
                        <Icon size={11} /> {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {overdueLoans.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500 opacity-50" />
                <p className="font-medium">No active loans yet</p>
                <p className="text-xs mt-1">Disbursed loans will appear here for monitoring</p>
              </div>
            )}
          </div>
        </div>

        {/* Collection Log Panel */}
        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="philix-card p-4">
                <h3 className="section-title mb-3">Log Contact</h3>
                <div className="font-medium text-slate-200 mb-1">{selected.app.clientName}</div>
                <div className="text-xs text-slate-500 mb-4">{selected.app.ref} · {formatKwacha(selected.outstanding)} outstanding</div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Contact Type</label>
                    <select className="input-base text-sm" value={logType} onChange={e => setLogType(e.target.value)}>
                      {["CALL","SMS","EMAIL","WHATSAPP","VISIT","PROMISE"].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {logType === "PROMISE" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Promise Amount (K)</label>
                        <input className="input-base text-sm" type="number" value={promiseAmount}
                          onChange={e => setPromiseAmount(e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Promise Date</label>
                        <input className="input-base text-sm" type="date" value={promiseDate}
                          onChange={e => setPromiseDate(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Notes *</label>
                    <textarea className="input-base text-sm resize-none" rows={4} value={notes}
                      onChange={e => setNotes(e.target.value)} placeholder="What was discussed? What was the client's response?" />
                  </div>
                  <button onClick={handleLog} className="btn-primary w-full" disabled={!notes}>
                    <FileText size={14} /> Log Contact
                  </button>
                </div>
              </div>

              {(logs[selected.app.id] || []).length > 0 && (
                <div className="philix-card p-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Contact History</h4>
                  <div className="space-y-3">
                    {(logs[selected.app.id] || []).map((log, i) => (
                      <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="badge-blue text-[10px]">{log.type}</span>
                          <span className="text-xs text-slate-600">Just now</span>
                        </div>
                        <p className="text-xs text-slate-300">{log.notes}</p>
                        {log.promiseAmount && (
                          <p className="text-xs text-emerald-400 mt-1">
                            Promise: {formatKwacha(log.promiseAmount)} by {log.promiseDate || "TBD"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="philix-card p-8 text-center text-slate-500">
              <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a loan to log contact</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
