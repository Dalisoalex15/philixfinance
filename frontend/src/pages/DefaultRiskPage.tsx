import { useState } from "react";
import { AlertTriangle, TrendingDown, CheckCircle, Search, ChevronRight } from "lucide-react";
import { useLoanApplicationStore } from "../store/loanApplicationStore";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0 })}`;

interface RiskEntry {
  clientNo: string;
  clientName: string;
  loanRef: string;
  product: string;
  outstanding: number;
  daysOverdue: number;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: string[];
}

const mockRisk: RiskEntry[] = [
  {
    clientNo: "PHX-C-00055", clientName: "Grace Tembo", loanRef: "PHX-L-2026-0055",
    product: "Business Working Capital", outstanding: 9000, daysOverdue: 0, riskScore: 88,
    riskLevel: "CRITICAL",
    factors: ["3 loan applications same day", "No prior repayment history", "Low income-to-loan ratio"],
  },
  {
    clientNo: "PHX-C-00029", clientName: "James Mutale", loanRef: "PHX-L-2026-0029",
    product: "Micro Loan", outstanding: 2400, daysOverdue: 14, riskScore: 74,
    riskLevel: "HIGH",
    factors: ["14 days overdue", "2 prior defaults", "Missed last 2 payments"],
  },
  {
    clientNo: "PHX-C-00038", clientName: "Peter Banda", loanRef: "PHX-L-2026-0038",
    product: "Salary Advance", outstanding: 4800, daysOverdue: 5, riskScore: 52,
    riskLevel: "MEDIUM",
    factors: ["5 days overdue", "1 prior restructure", "Income verification pending"],
  },
  {
    clientNo: "PHX-C-00031", clientName: "Grace Lungu", loanRef: "PHX-L-2026-0031",
    product: "Student Emergency Loan", outstanding: 1800, daysOverdue: 0, riskScore: 31,
    riskLevel: "MEDIUM",
    factors: ["No repayment history", "Student status change risk"],
  },
  {
    clientNo: "PHX-C-00042", clientName: "Chanda Mwale", loanRef: "PHX-L-2026-0042",
    product: "Salary Advance", outstanding: 3200, daysOverdue: 0, riskScore: 12,
    riskLevel: "LOW",
    factors: ["3 clean repayments", "Stable employer", "Income confirmed"],
  },
  {
    clientNo: "PHX-C-00019", clientName: "Mary Phiri", loanRef: "PHX-L-2026-0019",
    product: "Business Working Capital", outstanding: 5500, daysOverdue: 0, riskScore: 18,
    riskLevel: "LOW",
    factors: ["2 prior loans fully repaid", "Business verified"],
  },
];

const RISK_META: Record<RiskEntry["riskLevel"], { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: "text-red-700",     bg: "bg-red-100",     border: "border-red-200",     label: "Critical" },
  HIGH:     { color: "text-orange-700",  bg: "bg-orange-100",  border: "border-orange-200",  label: "High" },
  MEDIUM:   { color: "text-amber-700",   bg: "bg-amber-100",   border: "border-amber-200",   label: "Medium" },
  LOW:      { color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200", label: "Low" },
};

const SCORE_COLOR = (s: number) => s >= 70 ? "text-red-700" : s >= 50 ? "text-amber-700" : s >= 30 ? "text-orange-700" : "text-emerald-700";
const SCORE_BAR = (s: number) => s >= 70 ? "bg-red-500" : s >= 50 ? "bg-amber-500" : s >= 30 ? "bg-orange-400" : "bg-emerald-500";

export default function DefaultRiskPage() {
  const { applications } = useLoanApplicationStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RiskEntry["riskLevel"] | "ALL">("ALL");
  const [selected, setSelected] = useState<RiskEntry | null>(mockRisk[0]);

  const liveHighRisk = applications.filter(a => a.status === "DISBURSED" || a.status === "APPROVED");

  const filtered = mockRisk
    .filter(r => filter === "ALL" || r.riskLevel === filter)
    .filter(r => !search || r.clientName.toLowerCase().includes(search.toLowerCase()) || r.loanRef.includes(search));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Predictive Default Risk</h1>
          <p className="page-subtitle">AI-powered early warning system — loans ranked by probability of default</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-base pl-9 py-1.5 w-52 text-sm" placeholder="Search clients..." />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Critical Risk", count: mockRisk.filter(r => r.riskLevel === "CRITICAL").length, color: "text-red-700", bg: "bg-red-50 border-red-200" },
          { label: "High Risk", count: mockRisk.filter(r => r.riskLevel === "HIGH").length, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
          { label: "Medium Risk", count: mockRisk.filter(r => r.riskLevel === "MEDIUM").length, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Low Risk", count: mockRisk.filter(r => r.riskLevel === "LOW").length, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
        ].map(k => (
          <div key={k.label} className={`philix-card p-4 border cursor-pointer ${k.bg}`}
            onClick={() => setFilter(k.label.replace(" Risk", "").toUpperCase() as RiskEntry["riskLevel"])}>
            <div className={`text-3xl font-bold ${k.color} mb-1`}>{k.count}</div>
            <div className="text-xs text-navy-600 font-medium">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${filter === f ? "bg-navy-900 border-navy-900 text-white" : "border-warm-300 text-navy-600 hover:text-navy-900 bg-white"}`}>
            {f === "ALL" ? "All Loans" : RISK_META[f as RiskEntry["riskLevel"]].label}
          </button>
        ))}
        <span className="text-xs text-navy-500 ml-2">{filtered.length} loan{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          {filtered.map(r => {
            const m = RISK_META[r.riskLevel];
            return (
              <button key={r.loanRef} onClick={() => setSelected(r)}
                className={`w-full text-left philix-card p-4 transition-all hover:border-navy-300 ${selected?.loanRef === r.loanRef ? "border-2 border-navy-600" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.bg} ${m.border} border ${m.color}`}>
                    {r.riskScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy-900 text-sm">{r.clientName}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${m.bg} ${m.border} ${m.color}`}>{m.label}</span>
                    </div>
                    <div className="text-xs text-navy-600 mt-0.5">{r.loanRef} · {r.product}</div>
                    <div className="h-1.5 bg-warm-200 rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${SCORE_BAR(r.riskScore)}`} style={{ width: `${r.riskScore}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-navy-900">{K(r.outstanding)}</div>
                    {r.daysOverdue > 0 && <div className="text-xs text-red-700">{r.daysOverdue}d overdue</div>}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="philix-card p-10 text-center">
              <CheckCircle size={32} className="text-emerald-700 mx-auto mb-3" />
              <p className="text-navy-600 font-semibold">No loans in this risk band</p>
            </div>
          )}
        </div>

        {selected && (() => {
          const m = RISK_META[selected.riskLevel];
          return (
            <div className="philix-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-navy-900 text-lg">{selected.clientName}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${m.bg} ${m.border} ${m.color}`}>{m.label} Risk</span>
                  </div>
                  <div className="text-xs text-navy-600 font-mono">{selected.loanRef} · {selected.clientNo}</div>
                </div>
                <div className={`text-4xl font-bold ${SCORE_COLOR(selected.riskScore)}`}>{selected.riskScore}</div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-navy-600 mb-1">
                  <span>Default Risk Score</span>
                  <span className="font-semibold">{selected.riskScore}/100 — {m.label}</span>
                </div>
                <div className="h-3 bg-warm-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${SCORE_BAR(selected.riskScore)} transition-all`} style={{ width: `${selected.riskScore}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-navy-500 mt-1">
                  <span>Low Risk (0)</span><span>Critical (100)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Outstanding", value: K(selected.outstanding) },
                  { label: "Days Overdue", value: selected.daysOverdue === 0 ? "Current" : `${selected.daysOverdue} days` },
                  { label: "Product", value: selected.product },
                  { label: "Client No.", value: selected.clientNo },
                ].map(f => (
                  <div key={f.label} className="bg-warm-50 border border-warm-200 rounded-lg p-3">
                    <div className="text-xs text-navy-500 mb-0.5">{f.label}</div>
                    <div className="font-semibold text-navy-800 text-sm">{f.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-navy-700 mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-amber-700" /> Risk Factors
                </div>
                <div className="space-y-1.5">
                  {selected.factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <TrendingDown size={13} className={`flex-shrink-0 mt-0.5 ${selected.riskLevel === "LOW" ? "text-emerald-700" : "text-red-700"}`} />
                      <span className="text-navy-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-warm-200 flex gap-2">
                {selected.riskLevel === "CRITICAL" || selected.riskLevel === "HIGH" ? (
                  <>
                    <button className="btn-danger text-xs flex-1">Flag for Review</button>
                    <button className="btn-secondary text-xs flex-1">Contact Client</button>
                  </>
                ) : (
                  <button className="btn-secondary text-xs">Mark as Monitored</button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {liveHighRisk.length > 0 && (
        <div className="philix-card p-5">
          <h3 className="section-title mb-3">Live Disbursed Loans — Monitor Closely</h3>
          <div className="space-y-2">
            {liveHighRisk.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between bg-warm-50 border border-warm-200 rounded-xl px-4 py-3">
                <div>
                  <span className="font-semibold text-navy-900 text-sm">{a.clientName}</span>
                  <span className="text-xs text-navy-600 ml-2 font-mono">{a.ref}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-navy-900">{K(a.amount)}</span>
                  <ChevronRight size={14} className="text-navy-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
