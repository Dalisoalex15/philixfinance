import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Search, User } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

const clients = [
  {
    id: "c1", name: "Chanda Mwale", clientNo: "PHX-C-00042", score: 82, tier: "Low Risk",
    factors: [
      { label: "On-time payments", value: 95, weight: 30, positive: true },
      { label: "Loan repayment history", value: 90, weight: 25, positive: true },
      { label: "Loan-to-value ratio", value: 60, weight: 20, positive: true },
      { label: "Outstanding balance ratio", value: 70, weight: 15, positive: true },
      { label: "Loan application frequency", value: 65, weight: 10, positive: false },
    ],
    loansCompleted: 3, loansActive: 1, defaults: 0, recommendation: "PROCEED",
    history: [{ month: "Jan", score: 68 }, { month: "Feb", score: 72 }, { month: "Mar", score: 75 }, { month: "Apr", score: 78 }, { month: "May", score: 80 }, { month: "Jun", score: 82 }],
  },
  {
    id: "c2", name: "Peter Banda", clientNo: "PHX-C-00038", score: 54, tier: "Medium Risk",
    factors: [
      { label: "On-time payments", value: 60, weight: 30, positive: true },
      { label: "Loan repayment history", value: 55, weight: 25, positive: false },
      { label: "Loan-to-value ratio", value: 50, weight: 20, positive: false },
      { label: "Outstanding balance ratio", value: 45, weight: 15, positive: false },
      { label: "Loan application frequency", value: 70, weight: 10, positive: true },
    ],
    loansCompleted: 1, loansActive: 2, defaults: 1, recommendation: "PROCEED_WITH_ATTENTION",
    history: [{ month: "Jan", score: 70 }, { month: "Feb", score: 65 }, { month: "Mar", score: 58 }, { month: "Apr", score: 55 }, { month: "May", score: 52 }, { month: "Jun", score: 54 }],
  },
  {
    id: "c3", name: "James Mutale", clientNo: "PHX-C-00029", score: 31, tier: "High Risk",
    factors: [
      { label: "On-time payments", value: 30, weight: 30, positive: false },
      { label: "Loan repayment history", value: 25, weight: 25, positive: false },
      { label: "Loan-to-value ratio", value: 45, weight: 20, positive: false },
      { label: "Outstanding balance ratio", value: 20, weight: 15, positive: false },
      { label: "Loan application frequency", value: 55, weight: 10, positive: false },
    ],
    loansCompleted: 0, loansActive: 1, defaults: 2, recommendation: "ESCALATE_TO_CEO",
    history: [{ month: "Jan", score: 55 }, { month: "Feb", score: 50 }, { month: "Mar", score: 42 }, { month: "Apr", score: 38 }, { month: "May", score: 33 }, { month: "Jun", score: 31 }],
  },
];

const TIER_STYLES: Record<string, string> = {
  "Low Risk": "text-emerald-400 bg-emerald-900/30 border-emerald-800/40",
  "Medium Risk": "text-amber-400 bg-amber-900/30 border-amber-800/40",
  "High Risk": "text-red-400 bg-red-900/30 border-red-800/40",
};

const SCORE_COLOR = (s: number) => s >= 70 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

const REC_STYLES: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  PROCEED: { color: "text-emerald-400", label: "Proceed", icon: CheckCircle },
  PROCEED_WITH_ATTENTION: { color: "text-amber-400", label: "Proceed with Attention", icon: AlertTriangle },
  ESCALATE_TO_CEO: { color: "text-red-400", label: "Escalate to CEO", icon: AlertTriangle },
};

export default function CreditScoringPage() {
  const [selected, setSelected] = useState(clients[0]);
  const [search, setSearch] = useState("");

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.clientNo.includes(search));

  const radialData = [{ name: "Score", value: selected.score, fill: SCORE_COLOR(selected.score) }];
  const rec = REC_STYLES[selected.recommendation];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Credit Scoring</h1>
          <p className="page-subtitle">Real-time client risk scores computed from repayment history and loan behaviour</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-base pl-9 text-sm py-1.5 w-52" placeholder="Search clients..." />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Low Risk (70–100)", count: clients.filter(c => c.score >= 70).length, color: "emerald" },
          { label: "Medium Risk (50–69)", count: clients.filter(c => c.score >= 50 && c.score < 70).length, color: "amber" },
          { label: "High Risk (0–49)", count: clients.filter(c => c.score < 50).length, color: "red" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`text-3xl font-bold text-${s.color}-400 mb-1`}>{s.count}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="space-y-2">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected.id === c.id ? "border border-indigo-600" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 flex-shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 text-sm">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.clientNo}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: SCORE_COLOR(c.score) }}>{c.score}</div>
                  <div className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${TIER_STYLES[c.tier]}`}>{c.tier}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Score Detail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="philix-card p-5">
            <div className="flex items-start gap-6">
              <div className="w-36 h-36 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" background={{ fill: "#1e293b" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                    <User size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-100 text-lg">{selected.name}</div>
                    <div className="text-xs text-slate-500">{selected.clientNo}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl font-bold" style={{ color: SCORE_COLOR(selected.score) }}>{selected.score}</div>
                  <div>
                    <div className={`text-sm font-bold px-2 py-0.5 rounded-full border ${TIER_STYLES[selected.tier]}`}>{selected.tier}</div>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${rec.color}`}>
                      <rec.icon size={12} /> {rec.label}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Completed", value: selected.loansCompleted, color: "emerald" },
                    { label: "Active", value: selected.loansActive, color: "indigo" },
                    { label: "Defaults", value: selected.defaults, color: "red" },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/50 rounded-lg p-2">
                      <div className={`text-xl font-bold text-${s.color}-400`}>{s.value}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Score Factors */}
          <div className="philix-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2"><Brain size={16} className="text-indigo-400" /> Score Factors</h3>
            <div className="space-y-3">
              {selected.factors.map(f => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      {f.positive ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-red-400" />}
                      {f.label}
                    </span>
                    <span className="font-semibold" style={{ color: SCORE_COLOR(f.value) }}>{f.value}/100 <span className="text-slate-600">({f.weight}% weight)</span></span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${f.value}%`, backgroundColor: SCORE_COLOR(f.value) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
