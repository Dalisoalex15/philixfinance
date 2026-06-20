import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Lock, ArrowRight, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";

interface LoanApp {
  id: string;
  reference: string;
  status: string;
  amountRequested: number;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  termOptions: number[];
  color: string;
  requiresKyc: boolean;
  requiresIncome: boolean;
}

const PRODUCTS: Product[] = [
  {
    id: "prod-001",
    name: "Personal Salary Loan",
    description: "For employed individuals with a regular salary. Fastest approval with payslip.",
    minAmount: 500,
    maxAmount: 50000,
    termOptions: [1, 2, 3, 4],
    color: "indigo",
    requiresKyc: true,
    requiresIncome: true,
  },
  {
    id: "prod-002",
    name: "Emergency Cash Loan",
    description: "Quick cash for urgent needs. Minimal documentation required.",
    minAmount: 200,
    maxAmount: 10000,
    termOptions: [1, 2],
    color: "amber",
    requiresKyc: false,
    requiresIncome: false,
  },
  {
    id: "prod-003",
    name: "Business Booster Loan",
    description: "Grow your small business with flexible repayment terms.",
    minAmount: 1000,
    maxAmount: 75000,
    termOptions: [2, 3, 4],
    color: "emerald",
    requiresKyc: true,
    requiresIncome: true,
  },
  {
    id: "prod-004",
    name: "Agricultural Loan",
    description: "Funding for farming inputs, equipment, and seasonal needs.",
    minAmount: 500,
    maxAmount: 30000,
    termOptions: [1, 2, 3, 4],
    color: "green",
    requiresKyc: true,
    requiresIncome: false,
  },
  {
    id: "prod-005",
    name: "School Fees Loan",
    description: "Cover education costs for yourself or your children.",
    minAmount: 300,
    maxAmount: 20000,
    termOptions: [1, 2, 3, 4],
    color: "blue",
    requiresKyc: false,
    requiresIncome: false,
  },
  {
    id: "prod-006",
    name: "Group Lending",
    description: "Apply as a group of 5–20 people for better rates and mutual guarantee.",
    minAmount: 2000,
    maxAmount: 200000,
    termOptions: [2, 3, 4],
    color: "purple",
    requiresKyc: true,
    requiresIncome: false,
  },
];

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function EligibilityPage() {
  const client = useClientAuthStore(s => s.client);
  const token = useClientAuthStore(s => s.accessToken);
  const [apps, setApps] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/portal/applications", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setApps(await r.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!client) return null;

  const kycVerified = client.kycStatus === "VERIFIED";
  const hasIncome = !!(client as unknown as Record<string, unknown>).monthlyIncome || !!(client as unknown as Record<string, unknown>).employer;
  const activeApps = apps.filter(a => ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"].includes(a.status));
  const hasActiveApp = activeApps.length > 0;
  const rejectCount = apps.filter(a => a.status === "REJECTED").length;
  const recentRejection = apps.find(a => a.status === "REJECTED" && new Date(a.createdAt) > new Date(Date.now() - 30 * 86400000));

  function getEligibility(p: Product): { eligible: boolean; reason?: string; adjustedMax?: number } {
    if (hasActiveApp) return { eligible: false, reason: "You already have an active application or disbursed loan" };
    if (recentRejection) return { eligible: false, reason: "Please wait 30 days from your last rejection before reapplying" };
    if (p.requiresKyc && !kycVerified) return { eligible: false, reason: "This product requires KYC verification" };
    if (p.requiresIncome && !hasIncome) {
      return { eligible: true, adjustedMax: Math.min(p.maxAmount, 5000), reason: "Income unverified — limit applied" };
    }
    return { eligible: true, adjustedMax: p.maxAmount };
  }

  const eligibleCount = PRODUCTS.filter(p => getEligibility(p).eligible).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-slate-900/50 border border-indigo-800/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <TrendingUp size={22} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-100">Loan Eligibility</h1>
            <p className="text-slate-400 text-sm mt-1">
              See which loan products you currently qualify for
            </p>
            {!loading && (
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-sm font-bold ${eligibleCount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {eligibleCount} of {PRODUCTS.length}
                </span>
                <span className="text-slate-500 text-sm">products available to you</span>
              </div>
            )}
          </div>
          <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-700 text-slate-500 hover:text-slate-300 transition-all flex-shrink-0">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Status Factors */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your Profile Factors</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "KYC Verified", ok: kycVerified, tip: kycVerified ? "Identity confirmed" : "Complete KYC to unlock more products", href: kycVerified ? undefined : "/portal/kyc" },
            { label: "Income Verified", ok: hasIncome, tip: hasIncome ? "Income on file" : "Add employment details in Profile", href: hasIncome ? undefined : "/portal/profile" },
            { label: "No Active Loan", ok: !hasActiveApp, tip: hasActiveApp ? "Repay current loan to reapply" : "No active applications" },
            { label: "No Recent Rejection", ok: !recentRejection, tip: recentRejection ? "Wait 30 days before reapplying" : "All clear" },
          ].map(f => (
            <div key={f.label} className={`flex items-start gap-2 p-3 rounded-xl border ${f.ok ? "bg-emerald-900/10 border-emerald-900/30" : "bg-red-900/10 border-red-900/30"}`}>
              {f.ok ? <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <div className={`text-xs font-semibold ${f.ok ? "text-emerald-300" : "text-red-300"}`}>{f.label}</div>
                <div className={`text-xs mt-0.5 ${f.ok ? "text-emerald-600" : "text-red-600"}`}>{f.tip}</div>
                {f.href && !f.ok && (
                  <Link to={f.href} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 block">Fix now →</Link>
                )}
              </div>
            </div>
          ))}
        </div>
        {rejectCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 bg-amber-900/10 border border-amber-900/30 rounded-lg p-2">
            <AlertTriangle size={12} />
            {rejectCount} previous rejection{rejectCount > 1 ? "s" : ""} on record — ensure all information is accurate before reapplying
          </div>
        )}
      </div>

      {/* Products */}
      {loading ? (
        <div className="py-12 text-center text-slate-600">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-50" />
          Checking eligibility…
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Loan Products</h2>
          {PRODUCTS.map(p => {
            const elig = getEligibility(p);
            return (
              <div key={p.id}
                className={`bg-slate-900 rounded-2xl border p-5 transition-all ${
                  elig.eligible ? `border-${p.color}-800/40 hover:border-${p.color}-700/60` : "border-slate-800 opacity-70"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-100 text-sm">{p.name}</h3>
                      {elig.eligible ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-900/20 border border-emerald-900/40 px-1.5 py-0.5 rounded-full">
                          <CheckCircle size={9} /> Eligible
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-full">
                          <Lock size={9} /> Locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                    {!elig.eligible && elig.reason && (
                      <p className="text-xs text-red-400/70 mt-1.5">⚠ {elig.reason}</p>
                    )}
                    {elig.eligible && elig.reason && (
                      <p className="text-xs text-amber-400/70 mt-1.5">ℹ {elig.reason}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-bold ${elig.eligible ? `text-${p.color}-400` : "text-slate-600"}`}>
                      {K(elig.adjustedMax ?? p.maxAmount)}
                    </div>
                    <div className="text-xs text-slate-500">max amount</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2">
                    {p.termOptions.map(w => (
                      <span key={w} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${elig.eligible ? "border-slate-700 text-slate-400" : "border-slate-800 text-slate-700"}`}>
                        {w}W
                      </span>
                    ))}
                  </div>
                  {elig.eligible ? (
                    <Link to="/portal/apply"
                      className={`flex items-center gap-1 text-xs font-semibold text-${p.color}-400 hover:text-${p.color}-300 transition-colors`}>
                      Apply Now <ArrowRight size={12} />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-700 flex items-center gap-1">
                      <Lock size={10} /> Not available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-700 pb-4">
        Eligibility is indicative. Final approval depends on assessment by our loan officers.
      </p>
    </div>
  );
}
