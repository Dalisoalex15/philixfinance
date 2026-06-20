import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Shield, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, Eye, ChevronDown, ChevronRight,
} from "lucide-react";
import { useLoanApplicationStore, type LoanApplication } from "../store/loanApplicationStore";
import { formatKwacha, formatDate } from "../lib/mock-data";
import {
  K, SCORE_LABEL, SCORE_COLOR, COVERAGE_COLOR, COVERAGE_LABEL, REPOSSESSION_COLOR,
} from "../lib/collateralEngine";

type RiskFilter = "ALL" | "EXCELLENT" | "GOOD" | "MODERATE" | "REJECT" | "NO_ASSESSMENT";

const RISK_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  EXCELLENT:     { label: "Excellent",       color: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-800/40" },
  GOOD:          { label: "Good",            color: "text-blue-400",    bg: "bg-blue-900/20",    border: "border-blue-800/40" },
  MODERATE:      { label: "Moderate",        color: "text-amber-400",   bg: "bg-amber-900/20",   border: "border-amber-800/40" },
  REJECT:        { label: "Below Threshold", color: "text-red-400",     bg: "bg-red-900/20",     border: "border-red-800/40" },
  NO_ASSESSMENT: { label: "Not Assessed",    color: "text-slate-500",   bg: "bg-slate-900",      border: "border-slate-800" },
};

function KPICard({ label, value, sub, color = "text-slate-100" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="philix-card p-4">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function CollateralCommandPage() {
  const { applications, syncFromApi } = useLoanApplicationStore();
  const [syncing, setSyncing] = useState(false);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [selected, setSelected] = useState<LoanApplication | null>(null);
  const [showRejectOnly, setShowRejectOnly] = useState(false);

  useEffect(() => { syncFromApi(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncFromApi();
    setSyncing(false);
  };

  // All applications with collateral
  const withCollateral = useMemo(
    () => applications.filter(a => a.collateralValue > 0 || a.collateralType),
    [applications]
  );

  // Portfolio KPIs
  const totalCollateralValue = withCollateral.reduce((s, a) => s + (a.marketValue ?? a.collateralValue ?? 0), 0);
  const totalForcedSaleValue = withCollateral.reduce((s, a) => s + (a.forcedSaleValue ?? 0), 0);
  const totalLendingValue = withCollateral.reduce((s, a) => s + (a.lendingValue ?? 0), 0);
  const totalLoanedAgainstCollateral = withCollateral.reduce((s, a) => s + a.amount, 0);
  const avgRiskScore = withCollateral.filter(a => a.riskScore !== undefined).length > 0
    ? withCollateral.filter(a => a.riskScore !== undefined).reduce((s, a) => s + (a.riskScore ?? 0), 0)
      / withCollateral.filter(a => a.riskScore !== undefined).length
    : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, LoanApplication[]> = {
      EXCELLENT: [], GOOD: [], MODERATE: [], REJECT: [], NO_ASSESSMENT: [],
    };
    for (const a of withCollateral) {
      const cat = a.riskCategory ?? "NO_ASSESSMENT";
      (map[cat] ?? map.NO_ASSESSMENT).push(a);
    }
    return map;
  }, [withCollateral]);

  const byRepossession = useMemo(() => {
    const map: Record<string, number> = { GREEN: 0, AMBER: 0, RED: 0, UNKNOWN: 0 };
    for (const a of withCollateral) {
      const r = a.repossessionScore ?? "UNKNOWN";
      map[r as keyof typeof map] = (map[r as keyof typeof map] ?? 0) + 1;
    }
    return map;
  }, [withCollateral]);

  const filtered = useMemo(() => {
    let list = riskFilter === "ALL"
      ? withCollateral
      : riskFilter === "NO_ASSESSMENT"
      ? withCollateral.filter(a => !a.riskCategory)
      : withCollateral.filter(a => a.riskCategory === riskFilter);
    if (showRejectOnly) list = list.filter(a => a.riskCategory === "REJECT");
    return [...list].sort((a, b) => (a.riskScore ?? -1) - (b.riskScore ?? -1));
  }, [withCollateral, riskFilter, showRejectOnly]);

  const assessment = selected?.assessmentJson
    ? (() => { try { return JSON.parse(selected.assessmentJson); } catch { return null; } })()
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Collateral Command Center</h1>
          <p className="page-subtitle">Portfolio-wide collateral risk overview — forced-sale recovery analysis</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn-secondary text-xs py-1.5">
          <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Collateral (Market)" value={K(totalCollateralValue)} color="text-slate-100" />
        <KPICard label="Total Forced Sale Value" value={K(totalForcedSaleValue)} color="text-amber-400" sub="What we can recover in 30 days" />
        <KPICard label="Total Lending Value" value={K(totalLendingValue)} color="text-indigo-400" sub="Max we can lend against portfolio" />
        <KPICard label="Avg Risk Score" value={avgRiskScore > 0 ? `${avgRiskScore.toFixed(0)}/100` : "—"} color={avgRiskScore >= 80 ? "text-emerald-400" : avgRiskScore >= 70 ? "text-amber-400" : "text-red-400"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Collateral-backed Loans" value={withCollateral.length} color="text-slate-200" />
        <KPICard label="Total Loaned vs Collateral" value={K(totalLoanedAgainstCollateral)} color="text-slate-200" />
        <KPICard label="Coverage (Portfolio)" value={totalLoanedAgainstCollateral > 0 ? `${((totalForcedSaleValue / totalLoanedAgainstCollateral) * 100).toFixed(0)}%` : "—"} color={totalForcedSaleValue >= totalLoanedAgainstCollateral ? "text-emerald-400" : "text-red-400"} sub="Forced sale ÷ total loaned" />
        <KPICard label="Pending Assessment" value={byCategory.NO_ASSESSMENT?.length ?? 0} color="text-slate-400" sub="Applications without auto-assessment" />
      </div>

      {/* Repossession Readiness Bar */}
      <div className="philix-card p-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Repossession Readiness — Portfolio</div>
        <div className="flex gap-3 flex-wrap">
          {(["GREEN", "AMBER", "RED"] as const).map(r => (
            <div key={r} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
              r === "GREEN" ? "bg-emerald-900/20 border-emerald-800/40 text-emerald-400" :
              r === "AMBER" ? "bg-amber-900/20 border-amber-800/40 text-amber-400" :
              "bg-red-900/20 border-red-800/40 text-red-400"
            }`}>
              <div className={`w-2 h-2 rounded-full ${r === "GREEN" ? "bg-emerald-400" : r === "AMBER" ? "bg-amber-400" : "bg-red-400"}`} />
              {r}: {byRepossession[r] ?? 0} asset{(byRepossession[r] ?? 0) !== 1 ? "s" : ""}
            </div>
          ))}
        </div>
        {withCollateral.length > 0 && (
          <div className="mt-3 h-3 rounded-full overflow-hidden bg-slate-800 flex">
            {(["GREEN", "AMBER", "RED"] as const).map(r => {
              const pct = ((byRepossession[r] ?? 0) / withCollateral.length) * 100;
              return pct > 0 ? (
                <div key={r} className={`h-full transition-all ${r === "GREEN" ? "bg-emerald-500" : r === "AMBER" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${pct}%` }} title={`${r}: ${pct.toFixed(0)}%`} />
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Risk Category Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {(["ALL", "EXCELLENT", "GOOD", "MODERATE", "REJECT"] as const).map(cat => {
          const count = cat === "ALL" ? withCollateral.length : (byCategory[cat]?.length ?? 0);
          const meta = cat === "ALL" ? { label: "All", color: "text-slate-300", bg: "", border: "" } : RISK_META[cat];
          return (
            <button key={cat} onClick={() => setRiskFilter(cat as RiskFilter)}
              className={`p-3 rounded-xl border text-center transition-all ${
                riskFilter === cat
                  ? "border-indigo-500 bg-indigo-900/20"
                  : `${meta.bg} ${meta.border} hover:border-slate-600`
              }`}>
              <div className={`text-xl font-black ${meta.color}`}>{count}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{meta.label}</div>
            </button>
          );
        })}
      </div>

      {/* Application Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-slate-500">{filtered.length} application{filtered.length !== 1 ? "s" : ""}</span>
            <button onClick={() => setShowRejectOnly(v => !v)}
              className={`ml-auto text-xs px-2 py-1 rounded-lg border transition-all ${showRejectOnly ? "bg-red-900/30 border-red-800/40 text-red-400" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}>
              {showRejectOnly ? <><XCircle size={10} className="inline mr-1" /> Showing High-Risk</> : "Show High-Risk Only"}
            </button>
          </div>
          {filtered.length === 0 && (
            <div className="philix-card p-8 text-center text-slate-500 text-sm">
              No collateral-backed applications in this category.
            </div>
          )}
          {filtered.map(app => {
            const cat = app.riskCategory ?? "NO_ASSESSMENT";
            const meta = RISK_META[cat] ?? RISK_META.NO_ASSESSMENT;
            const initials = app.clientName.split(" ").map(p => p[0]).slice(0, 2).join("");
            return (
              <div key={app.id}
                className={`philix-card p-4 cursor-pointer transition-all ${selected?.id === app.id ? "border-indigo-600 border" : "hover:border-slate-700"}`}
                onClick={() => setSelected(app)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200 truncate">{app.clientName}</span>
                      {app.riskScore !== undefined && (
                        <span className={`text-xs font-bold ${meta.color}`}>{app.riskScore.toFixed(0)}/100</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{app.collateralType || "—"} · {K(app.collateralValue)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm text-slate-100">{K(app.amount)}</div>
                    <div className={`text-[10px] font-semibold ${meta.color}`}>{SCORE_LABEL[cat] ?? cat}</div>
                  </div>
                </div>
                {app.riskScore !== undefined && (
                  <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      (app.riskScore ?? 0) >= 90 ? "bg-emerald-500" :
                      (app.riskScore ?? 0) >= 80 ? "bg-blue-500" :
                      (app.riskScore ?? 0) >= 70 ? "bg-amber-500" : "bg-red-500"
                    }`} style={{ width: `${app.riskScore}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="lg:col-span-3 philix-card p-5 space-y-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {/* Client Header */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center font-bold text-indigo-400 text-lg flex-shrink-0">
                {selected.clientName.split(" ").map(p => p[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-100 text-lg">{selected.clientName}</div>
                <div className="text-xs text-slate-500">{selected.clientNumber} · {selected.clientPhone}</div>
                <div className="text-xs text-slate-500">{selected.ref} · {selected.productName}</div>
              </div>
              <div>
                {selected.riskCategory ? (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${RISK_META[selected.riskCategory]?.bg} ${RISK_META[selected.riskCategory]?.border} ${RISK_META[selected.riskCategory]?.color}`}>
                    {RISK_META[selected.riskCategory]?.label}
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">Not assessed</span>
                )}
              </div>
            </div>

            {/* Risk Score + Details */}
            {selected.riskScore !== undefined ? (
              <div className={`rounded-2xl border p-5 space-y-4 ${
                selected.riskCategory === "EXCELLENT" ? "bg-emerald-900/10 border-emerald-800/30" :
                selected.riskCategory === "GOOD" ? "bg-blue-900/10 border-blue-800/30" :
                selected.riskCategory === "MODERATE" ? "bg-amber-900/10 border-amber-800/30" :
                "bg-red-900/10 border-red-800/30"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-4xl font-black ${SCORE_COLOR[selected.riskCategory ?? "REJECT"] ?? "text-slate-400"}`}>
                      {selected.riskScore.toFixed(0)}
                    </span>
                    <span className="text-slate-500 text-sm">/100</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Recommendation</div>
                    <div className={`text-sm font-bold ${
                      assessment?.recommendation === "APPROVE" ? "text-emerald-400" :
                      assessment?.recommendation === "APPROVE_WITH_CONDITIONS" ? "text-amber-400" :
                      "text-red-400"
                    }`}>
                      {assessment?.recommendation === "APPROVE" ? "Recommend Approve" :
                       assessment?.recommendation === "APPROVE_WITH_CONDITIONS" ? "Approve with Conditions" :
                       assessment?.recommendation === "REJECT" ? "Recommend Reject" : "—"}
                    </div>
                  </div>
                </div>

                {/* Score breakdown */}
                {assessment && (
                  <div className="space-y-1.5">
                    {[
                      { label: "Ownership", score: assessment.ownershipScore, max: 20 },
                      { label: "Marketability", score: assessment.marketabilityScore, max: 20 },
                      { label: "Condition", score: assessment.conditionScore, max: 15 },
                      { label: "Liquidity (Coverage)", score: assessment.liquidityScore, max: 20 },
                      { label: "Asset Age", score: assessment.assetAgeScore, max: 10 },
                      { label: "Documentation", score: assessment.documentationScore, max: 15 },
                    ].map(f => (
                      <div key={f.label}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-400">{f.label}</span>
                          <span className="text-slate-300">{f.score}/{f.max}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            f.score / f.max >= 0.8 ? "bg-emerald-500" :
                            f.score / f.max >= 0.6 ? "bg-blue-500" :
                            f.score / f.max >= 0.4 ? "bg-amber-500" : "bg-red-500"
                          }`} style={{ width: `${(f.score / f.max) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Valuation grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Declared Value", v: K(selected.collateralValue ?? 0) },
                    { label: "Market Value", v: selected.marketValue ? K(selected.marketValue) : "—" },
                    { label: "Forced Sale Value", v: selected.forcedSaleValue ? K(selected.forcedSaleValue) : "—" },
                    { label: "Lending Value", v: selected.lendingValue ? K(selected.lendingValue) : "—" },
                    { label: "Max Recommended", v: selected.maxRecommendedLoan ? K(selected.maxRecommendedLoan) : "—" },
                    { label: "Coverage Ratio", v: selected.coverageRatio ? `${(selected.coverageRatio * 100).toFixed(0)}%` : "—" },
                  ].map(m => (
                    <div key={m.label} className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                      <div className="font-bold text-xs text-slate-100">{m.v}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Coverage label + Repossession */}
                <div className="flex gap-4 text-xs">
                  <div>
                    <div className="text-slate-500 mb-0.5">Coverage</div>
                    <div className={`font-bold ${COVERAGE_COLOR(selected.coverageRatio ?? 0)}`}>
                      {COVERAGE_LABEL(selected.coverageRatio ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Repossession Ease</div>
                    <div className={`font-bold ${REPOSSESSION_COLOR[selected.repossessionScore ?? "RED"] ?? "text-red-400"}`}>
                      {selected.repossessionScore ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">App Status</div>
                    <div className="font-bold text-slate-200">{selected.status}</div>
                  </div>
                </div>

                {/* Warnings */}
                {assessment?.warnings?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">⚠ Risk Flags</div>
                    {(assessment.warnings as string[]).map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-amber-300">
                        <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" /> {w}
                      </div>
                    ))}
                  </div>
                )}
                {assessment?.strengths?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">✓ Strengths</div>
                    {(assessment.strengths as string[]).map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-400">
                        <CheckCircle size={10} className="flex-shrink-0 mt-0.5" /> {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-4 text-center text-xs text-slate-500">
                No auto-assessment available. This application was submitted before the assessment system was active.
              </div>
            )}

            {/* Collateral Details */}
            <section>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Collateral Details</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Type", selected.collateralType || "—"],
                  ["Description", selected.collateralDescription || "—"],
                  ["Year Purchased", selected.collateralYear || "—"],
                  ["Serial / Reg", selected.collateralSerial || "—"],
                  ["Condition", selected.collateralCondition || "—"],
                  ["Owner", selected.collateralOwner || "Applicant"],
                  ["Ownership Docs", selected.hasOwnershipDocs ? "✓ Yes" : "✗ No"],
                  ["Insurance", selected.hasInsurance ? "✓ Yes" : "No"],
                  ["Submitted", selected.submittedAt ? formatDate(selected.submittedAt) : "—"],
                  ["Loan Amount", formatKwacha(selected.amount)],
                ].map(([l, v]) => (
                  <div key={l} className="bg-slate-800/40 rounded-lg p-2.5">
                    <div className="text-[10px] text-slate-500">{l}</div>
                    <div className="text-xs font-medium text-slate-200 mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Photos */}
            {selected.collateralPhotos && selected.collateralPhotos.length > 0 && (
              <section>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Collateral Photos ({selected.collateralPhotos.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selected.collateralPhotos.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                      <img src={src} alt={`Collateral ${i + 1}`}
                        className="w-full h-36 object-cover rounded-xl border border-slate-700 hover:border-amber-500 transition-colors cursor-zoom-in" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="lg:col-span-3 philix-card flex flex-col items-center justify-center text-center py-16 text-slate-500">
            <TrendingUp size={32} className="mb-3 opacity-30" />
            <div className="text-sm font-medium">Select an application</div>
            <div className="text-xs mt-1">to view detailed risk assessment</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="philix-card p-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Scoring Methodology</div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-500">
          <div><span className="text-slate-300 font-medium">90–100:</span> Excellent — fast-track approve</div>
          <div><span className="text-slate-300 font-medium">80–89:</span> Good — standard approve</div>
          <div><span className="text-slate-300 font-medium">70–79:</span> Moderate — approve with conditions</div>
          <div><span className="text-red-400 font-medium">&lt;70:</span> Below threshold — reject or reduce amount</div>
          <div><span className="text-slate-300 font-medium">Coverage &gt;150%:</span> Excellent</div>
          <div><span className="text-slate-300 font-medium">Coverage &lt;100%:</span> Reject</div>
        </div>
      </div>
    </div>
  );
}
