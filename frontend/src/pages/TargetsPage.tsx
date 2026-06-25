import { useState, useEffect, useCallback } from "react";
import { Target, TrendingUp, ChevronLeft, ChevronRight, Save, Check } from "lucide-react";
import { useAuthStore } from "../store/auth";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const token = () => localStorage.getItem("philix_staff_token") ?? "";
const authH = () => ({ Authorization: `Bearer ${token()}` });

interface OfficerTarget {
  id: string;
  name: string;
  role: string;
  branchId: string | null;
  month: string;
  disbursementTarget: number;
  collectionTarget: number;
  loansTarget: number;
  disbursementActual: number;
  collectionActual: number;
  loansActual: number;
  disbursementPct: number;
  collectionPct: number;
  loansPct: number;
  targetId: string | null;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const capped = Math.min(100, pct);
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${capped}%` }} />
    </div>
  );
}

function pctColor(pct: number) {
  return pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
}

function pctTextColor(pct: number) {
  return pct >= 90 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-500";
}

export default function TargetsPage() {
  const user = useAuthStore(s => s.user);
  const isManager = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER";

  const now = new Date();
  const [month, setMonth] = useState(now.toISOString().slice(0, 7));
  const [data, setData] = useState<OfficerTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState({ disbursement: 0, collection: 0, loans: 0 });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/targets?month=${month}`, { headers: authH() });
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  function shiftMonth(dir: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setMonth(d.toISOString().slice(0, 7));
  }

  function startEdit(officer: OfficerTarget) {
    setEditingId(officer.id);
    setEditVals({ disbursement: officer.disbursementTarget, collection: officer.collectionTarget, loans: officer.loansTarget });
  }

  async function saveTarget(officer: OfficerTarget) {
    setSaving(true);
    try {
      await fetch("/api/admin/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH() },
        body: JSON.stringify({
          userId: officer.id, month,
          disbursementTarget: editVals.disbursement,
          collectionTarget: editVals.collection,
          loansTarget: editVals.loans,
        }),
      });
      setSavedId(officer.id);
      setTimeout(() => setSavedId(null), 2000);
      setEditingId(null);
      load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  const totalDisbActual  = data.reduce((s, o) => s + o.disbursementActual, 0);
  const totalDisbTarget  = data.reduce((s, o) => s + o.disbursementTarget, 0);
  const totalCollActual  = data.reduce((s, o) => s + o.collectionActual, 0);
  const totalCollTarget  = data.reduce((s, o) => s + o.collectionTarget, 0);
  const totalLoansActual = data.reduce((s, o) => s + o.loansActual, 0);
  const totalLoansTarget = data.reduce((s, o) => s + o.loansTarget, 0);

  const teamDisbPct = totalDisbTarget > 0 ? Math.round((totalDisbActual / totalDisbTarget) * 100) : 0;
  const teamCollPct = totalCollTarget > 0 ? Math.round((totalCollActual / totalCollTarget) * 100) : 0;
  const teamLoansPct = totalLoansTarget > 0 ? Math.round((totalLoansActual / totalLoansTarget) * 100) : 0;

  const monthLabel = new Date(month + "-01").toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Target size={22} className="text-indigo-500" /> Loan Officer Targets
          </h1>
          <p className="text-navy-600 text-sm mt-0.5">Track actual vs. target performance by officer</p>
        </div>
        <div className="flex items-center gap-2 bg-navy-50 rounded-xl p-1 border border-navy-100">
          <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-white text-navy-500 hover:text-navy-700"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-navy-800 px-2 min-w-32 text-center">{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} disabled={month >= now.toISOString().slice(0, 7)}
            className="p-1.5 rounded-lg hover:bg-white text-navy-500 hover:text-navy-700 disabled:opacity-30"><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Team summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Team Disbursements", actual: K(totalDisbActual), target: K(totalDisbTarget), pct: teamDisbPct },
          { label: "Team Collections", actual: K(totalCollActual), target: K(totalCollTarget), pct: teamCollPct },
          { label: "Loans Issued", actual: `${totalLoansActual}`, target: `${totalLoansTarget}`, pct: teamLoansPct },
        ].map(kpi => (
          <div key={kpi.label} className="philix-card p-4">
            <div className="text-xs text-navy-500 mb-1">{kpi.label}</div>
            <div className="text-lg font-bold text-navy-900">{kpi.actual}</div>
            <div className="text-xs text-navy-400">of {kpi.target} target</div>
            <div className="mt-2">
              <ProgressBar pct={kpi.pct} color={pctColor(kpi.pct)} />
              <div className={`text-xs font-bold mt-1 ${pctTextColor(kpi.pct)}`}>{kpi.pct}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* Officer table */}
      <div className="philix-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-navy-900">Officer Performance vs. Target</h2>
          {isManager && <span className="text-xs text-navy-400">Click edit to set targets for {monthLabel}</span>}
        </div>
        {loading ? (
          <div className="py-10 text-center text-navy-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-navy-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase">Officer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase">Disbursements</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase">Collections</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase">Loans Issued</th>
                  {isManager && <th className="px-4 py-3 text-left text-xs font-semibold text-navy-500 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(officer => (
                  <tr key={officer.id} className="hover:bg-navy-50/30">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-navy-900">{officer.name}</div>
                      <div className="text-xs text-navy-400">{officer.role.replace(/_/g, " ")}</div>
                    </td>

                    {/* Disbursements */}
                    <td className="px-4 py-4 min-w-40">
                      {editingId === officer.id ? (
                        <input type="number" value={editVals.disbursement} onChange={e => setEditVals(v => ({ ...v, disbursement: Number(e.target.value) }))}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm" placeholder="Target amount" />
                      ) : (
                        <>
                          <div className="text-xs mb-1">
                            <span className="font-semibold text-navy-800">{K(officer.disbursementActual)}</span>
                            <span className="text-navy-400"> / {officer.disbursementTarget > 0 ? K(officer.disbursementTarget) : "—"}</span>
                          </div>
                          {officer.disbursementTarget > 0 && (
                            <>
                              <ProgressBar pct={officer.disbursementPct} color={pctColor(officer.disbursementPct)} />
                              <div className={`text-xs font-bold mt-0.5 ${pctTextColor(officer.disbursementPct)}`}>{officer.disbursementPct}%</div>
                            </>
                          )}
                        </>
                      )}
                    </td>

                    {/* Collections */}
                    <td className="px-4 py-4 min-w-40">
                      {editingId === officer.id ? (
                        <input type="number" value={editVals.collection} onChange={e => setEditVals(v => ({ ...v, collection: Number(e.target.value) }))}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm" placeholder="Target amount" />
                      ) : (
                        <>
                          <div className="text-xs mb-1">
                            <span className="font-semibold text-navy-800">{K(officer.collectionActual)}</span>
                            <span className="text-navy-400"> / {officer.collectionTarget > 0 ? K(officer.collectionTarget) : "—"}</span>
                          </div>
                          {officer.collectionTarget > 0 && (
                            <>
                              <ProgressBar pct={officer.collectionPct} color={pctColor(officer.collectionPct)} />
                              <div className={`text-xs font-bold mt-0.5 ${pctTextColor(officer.collectionPct)}`}>{officer.collectionPct}%</div>
                            </>
                          )}
                        </>
                      )}
                    </td>

                    {/* Loans */}
                    <td className="px-4 py-4 min-w-32">
                      {editingId === officer.id ? (
                        <input type="number" value={editVals.loans} onChange={e => setEditVals(v => ({ ...v, loans: Number(e.target.value) }))}
                          className="w-32 border border-slate-300 rounded-lg px-2 py-1 text-sm" placeholder="# of loans" />
                      ) : (
                        <>
                          <div className="text-xs mb-1">
                            <span className="font-semibold text-navy-800">{officer.loansActual}</span>
                            <span className="text-navy-400"> / {officer.loansTarget > 0 ? officer.loansTarget : "—"}</span>
                          </div>
                          {officer.loansTarget > 0 && (
                            <>
                              <ProgressBar pct={officer.loansPct} color={pctColor(officer.loansPct)} />
                              <div className={`text-xs font-bold mt-0.5 ${pctTextColor(officer.loansPct)}`}>{officer.loansPct}%</div>
                            </>
                          )}
                        </>
                      )}
                    </td>

                    {isManager && (
                      <td className="px-4 py-4">
                        {editingId === officer.id ? (
                          <div className="flex gap-2">
                            <button onClick={() => saveTarget(officer)} disabled={saving}
                              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg">
                              <Save size={11} /> Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-navy-400 hover:text-navy-600 px-2 py-1.5">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(officer)}
                            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-all">
                            {savedId === officer.id ? <><Check size={11} className="text-emerald-500" /> Saved</> : <><TrendingUp size={11} /> Set Target</>}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {data.length === 0 && !loading && (
                  <tr><td colSpan={5} className="py-10 text-center text-navy-400">No loan officers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
