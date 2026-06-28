import { useState, useEffect, useCallback } from "react";
import { Trophy, RefreshCw, AlertCircle, TrendingUp, Target } from "lucide-react";

const API = "/api";
function getToken() { return localStorage.getItem("philix-auth-v3") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${Math.round(n)}%`;

interface OfficerPerf {
  userId: string;
  name: string;
  role: string;
  loansAssigned: number;
  totalDisbursed: number;
  amountCollected: number;
  collectionRate: number;
  target: number;
  vsTarget: number;
  disbursementActual?: number;
  collectionActual?: number;
  loansActual?: number;
  disbursementTarget?: number;
  collectionTarget?: number;
  loansTarget?: number;
  disbursementPct?: number;
  collectionPct?: number;
  loansPct?: number;
}

function rateColor(rate: number) {
  if (rate >= 80) return "text-emerald-600";
  if (rate >= 60) return "text-amber-600";
  return "text-red-600";
}

function rateBg(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function vsTargetColor(vs: number) {
  if (vs >= 100) return "text-emerald-600 bg-emerald-50";
  if (vs >= 80) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export default function CollectionPerformancePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [officers, setOfficers] = useState<OfficerPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/dashboard/leaderboard?month=${month}`, { headers: authH() });
      if (!r.ok) {
        // Try the targets endpoint as fallback
        const r2 = await fetch(`${API}/admin/targets?month=${month}`, { headers: authH() });
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
        const d2 = await r2.json();
        const raw = d2.officers ?? [];
        setOfficers(raw.map((o: OfficerPerf, i: number) => ({
          ...o,
          loansAssigned: o.loansActual ?? 0,
          totalDisbursed: o.disbursementActual ?? 0,
          amountCollected: o.collectionActual ?? 0,
          collectionRate: o.collectionPct ?? 0,
          target: o.collectionTarget ?? 0,
          vsTarget: o.collectionPct ?? 0,
          rank: i + 1,
        })));
        return;
      }
      const d = await r.json();
      const raw = d.officers ?? d.leaderboard ?? d ?? [];
      setOfficers(raw.map((o: OfficerPerf, i: number) => ({
        ...o,
        loansAssigned: o.loansActual ?? o.loansAssigned ?? 0,
        totalDisbursed: o.disbursementActual ?? o.totalDisbursed ?? 0,
        amountCollected: o.collectionActual ?? o.amountCollected ?? 0,
        collectionRate: o.collectionPct ?? o.collectionRate ?? 0,
        target: o.collectionTarget ?? o.target ?? 0,
        vsTarget: o.collectionPct ?? o.vsTarget ?? 0,
        rank: i + 1,
      })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load performance data");
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = [...officers].sort((a, b) => (b.collectionRate ?? 0) - (a.collectionRate ?? 0));
  const avgRate = sorted.length > 0 ? sorted.reduce((s, o) => s + (o.collectionRate ?? 0), 0) / sorted.length : 0;

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#C9A227]" />
              Collection Performance
            </h1>
            <p className="text-sm text-slate-500 mt-1">Per-officer collection metrics and leaderboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">Month</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-white hover:bg-[#b8911f] text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Team Officers</p>
            <p className="text-2xl font-bold text-[#0B1F3A] font-mono">{sorted.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Avg Collection Rate</p>
            <p className={`text-2xl font-bold font-mono ${rateColor(avgRate)}`}>{pct(avgRate)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Top Performer</p>
            <p className="text-lg font-bold text-[#0B1F3A] truncate">{sorted[0]?.name ?? "—"}</p>
            {sorted[0] && <p className={`text-sm font-mono ${rateColor(sorted[0].collectionRate)}`}>{pct(sorted[0].collectionRate)}</p>}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading performance data...
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
              <TrendingUp className="w-8 h-8" />
              <p>No performance data for {month}</p>
              <p className="text-xs">Set targets for officers to see metrics here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B1F3A] text-white">
                    {["Rank", "Officer Name", "Loans Assigned", "Total Disbursed", "Amount Collected", "Collection Rate", "Target", "vs Target"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((officer, i) => {
                    const rate = officer.collectionRate ?? 0;
                    const vs = officer.vsTarget ?? 0;
                    return (
                      <tr key={officer.userId} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                        <td className="px-4 py-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-[#C9A227] text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#0B1F3A]">{officer.name}</p>
                          <p className="text-xs text-slate-400">{officer.role}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-center text-[#0B1F3A] font-medium">{officer.loansAssigned}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#0B1F3A]">{K(officer.totalDisbursed)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#0B1F3A] font-semibold">{K(officer.amountCollected)}</td>
                        <td className="px-4 py-3">
                          <div className="min-w-24">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold font-mono ${rateColor(rate)}`}>{pct(rate)}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${rateBg(rate)}`} style={{ width: `${Math.min(100, rate)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {K(officer.target)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-28">
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${vsTargetColor(vs)}`}>
                              {vs >= 100 ? "+" : ""}{pct(vs - 100)} vs target
                            </span>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                              <div
                                className={`h-full rounded-full transition-all ${vs >= 100 ? "bg-emerald-500" : vs >= 80 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${Math.min(100, vs)}%` }}
                              />
                            </div>
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

        <p className="text-xs text-slate-400 mt-3 text-right">
          Period: {month} · Data refreshed {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
