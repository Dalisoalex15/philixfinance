// Feature 4 — Client Credit Score Engine
import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Loader2, ChevronRight } from "lucide-react";

const api = (path: string) => {
  const token = localStorage.getItem("philix-auth-v3");
  return fetch(`/api/financials${path}`, { headers: { Authorization: `Bearer ${token}` } });
};

interface Client {
  id: string; firstName: string; lastName: string; clientNumber: string;
  creditScore?: number; creditScoreUpdatedAt?: string;
  portalLoans: { status: string; paymentSubmissions: { amount: number }[] }[];
}

function scoreBadge(score?: number) {
  if (score === undefined || score === null) return { label: "N/A", color: "bg-gray-100 text-gray-500" };
  if (score >= 70) return { label: `${score} — Good`,  color: "bg-emerald-100 text-emerald-700" };
  if (score >= 40) return { label: `${score} — Fair`,  color: "bg-amber-100 text-amber-700" };
  return            { label: `${score} — Poor`,        color: "bg-red-100 text-red-700" };
}

function ScoreBar({ score }: { score?: number }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold font-mono w-8">{pct}</span>
    </div>
  );
}

export default function ClientCreditScoresPage() {
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [recalc, setRecalc]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const r = await api("/credit-scores");
    if (r.ok) setClients(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const recalculate = async (id: string) => {
    setRecalc(id);
    const token = localStorage.getItem("philix-auth-v3");
    await window.fetch(`/api/financials/recalculate-credit/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setRecalc(null);
    fetch();
  };

  const filtered = clients.filter(c =>
    !search || `${c.firstName} ${c.lastName} ${c.clientNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const dist = { good: 0, fair: 0, poor: 0, na: 0 };
  clients.forEach(c => {
    if (!c.creditScore) dist.na++;
    else if (c.creditScore >= 70) dist.good++;
    else if (c.creditScore >= 40) dist.fair++;
    else dist.poor++;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1F3A]">Client Credit Scores</h1>
        <p className="text-sm text-gray-500 mt-1">0–100 score auto-calculated from KYC, repayment history, account age, and loan completion rate.</p>
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Good (70+)",  value: dist.good, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Fair (40–69)", value: dist.fair, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Poor (<40)",  value: dist.poor, color: "text-red-600",    bg: "bg-red-50 border-red-200" },
          { label: "Not Scored",  value: dist.na,   color: "text-gray-500",   bg: "bg-gray-50 border-gray-200" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`border rounded-xl p-4 text-center ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search client…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]" />
          </div>
          <button onClick={fetch} className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0B1F3A] text-white">
              {["Client", "Client #", "Score", "Distribution", "Active Loans", "Last Calculated", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center"><Loader2 size={18} className="animate-spin inline text-gray-400" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-400">No clients found</td></tr>
            ) : filtered.map((c, i) => {
              const badge = scoreBadge(c.creditScore);
              const activeLoans = c.portalLoans.filter(l => l.status === "DISBURSED").length;
              return (
                <tr key={c.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                  <td className="px-4 py-3 font-medium text-[#0B1F3A]">{c.firstName} {c.lastName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.clientNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>{badge.label}</span>
                  </td>
                  <td className="px-4 py-3 w-40"><ScoreBar score={c.creditScore} /></td>
                  <td className="px-4 py-3 text-center">{activeLoans}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {c.creditScoreUpdatedAt ? new Date(c.creditScoreUpdatedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => recalculate(c.id)} disabled={recalc === c.id}
                      className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded text-xs text-gray-600 hover:border-[#C9A227] disabled:opacity-50">
                      {recalc === c.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                      Recalc
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
