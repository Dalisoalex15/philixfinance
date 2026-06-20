import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, TrendingUp, Award, Info } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import { Link } from "react-router-dom";

interface LoanApp {
  id: string;
  status: string;
  createdAt: string;
  amountRequested: number;
}

interface Factor {
  name: string;
  score: number;
  max: number;
  color: string;
  status: "good" | "warn" | "bad";
  tip: string;
  actionHref?: string;
  actionLabel?: string;
}

function ScoreGauge({ score }: { score: number }) {
  const pct = score / 100;
  const r = 64;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct * 0.75); // 75% of circle used for gauge
  const startAngle = 135; // degrees
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs Work";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 120 }}>
        <svg width="160" height="120" style={{ overflow: "visible" }}>
          {/* Background arc */}
          <circle cx="80" cy="90" r={r} fill="none" stroke="#1e293b" strokeWidth="12"
            strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${startAngle}, 80, 90)`}
          />
          {/* Score arc */}
          <circle cx="80" cy="90" r={r} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${circ * 0.75 * pct} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${startAngle}, 80, 90)`}
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <div className="text-4xl font-black" style={{ color }}>{score}</div>
          <div className="text-xs font-semibold" style={{ color }}>{label}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
        <span>0</span>
        <div className="h-px w-16 bg-slate-800" />
        <span>100</span>
      </div>
    </div>
  );
}

export default function CreditScorePage() {
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

  // Score computation
  const kycVerified = client.kycStatus === "VERIFIED";
  const clientData = client as unknown as Record<string, unknown>;
  const profileFields = [clientData.firstName, clientData.lastName, clientData.phone, clientData.address, clientData.city, clientData.occupation, clientData.employer, clientData.monthlyIncome];
  const profileFilled = profileFields.filter(Boolean).length;
  const profileScore = Math.round((profileFilled / profileFields.length) * 20);

  const disbursedApps = apps.filter(a => a.status === "DISBURSED");
  const rejectedApps = apps.filter(a => a.status === "REJECTED");
  const totalApps = apps.length;
  let historyScore = 30;
  if (totalApps === 0) historyScore = 10;
  else {
    const rejectionPenalty = Math.min(30, rejectedApps.length * 10);
    historyScore = Math.max(0, 30 - rejectionPenalty);
    if (disbursedApps.length > 0) historyScore = Math.min(30, historyScore + disbursedApps.length * 5);
  }

  const createdAt = clientData.createdAt as string | undefined;
  const accountAgeDays = createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) : 0;
  const ageScore = Math.min(15, Math.floor(accountAgeDays / 10));

  const hasEmployment = !!(clientData.employer || clientData.occupation);
  const hasIncome = !!(clientData.monthlyIncome);
  const employScore = (hasEmployment ? 5 : 0) + (hasIncome ? 5 : 0);

  const score = (kycVerified ? 25 : 0) + profileScore + historyScore + ageScore + employScore;

  const factors: Factor[] = [
    {
      name: "KYC Verification",
      score: kycVerified ? 25 : 0,
      max: 25,
      color: kycVerified ? "emerald" : "red",
      status: kycVerified ? "good" : "bad",
      tip: kycVerified ? "Your identity is verified" : "Complete KYC to add 25 points",
      actionHref: kycVerified ? undefined : "/portal/kyc",
      actionLabel: "Verify Identity",
    },
    {
      name: "Repayment History",
      score: historyScore,
      max: 30,
      color: historyScore >= 20 ? "emerald" : historyScore >= 10 ? "amber" : "red",
      status: historyScore >= 20 ? "good" : historyScore >= 10 ? "warn" : "bad",
      tip: totalApps === 0
        ? "No history yet. Apply for your first loan to start building."
        : disbursedApps.length > 0 && rejectedApps.length === 0
          ? `${disbursedApps.length} successful loan${disbursedApps.length > 1 ? "s" : ""} — great track record`
          : `${rejectedApps.length} rejection${rejectedApps.length > 1 ? "s" : ""} affecting score`,
    },
    {
      name: "Profile Completeness",
      score: profileScore,
      max: 20,
      color: profileScore >= 15 ? "emerald" : profileScore >= 10 ? "amber" : "red",
      status: profileScore >= 15 ? "good" : profileScore >= 10 ? "warn" : "bad",
      tip: profileScore < 20 ? `${profileFilled}/${profileFields.length} fields complete — fill in your profile to add more points` : "Profile fully complete",
      actionHref: profileScore < 20 ? "/portal/profile" : undefined,
      actionLabel: "Complete Profile",
    },
    {
      name: "Employment & Income",
      score: employScore,
      max: 10,
      color: employScore >= 8 ? "emerald" : employScore >= 5 ? "amber" : "red",
      status: employScore >= 8 ? "good" : employScore >= 5 ? "warn" : "bad",
      tip: employScore === 10 ? "Employment and income verified" : "Add your employer and monthly income in your profile",
      actionHref: employScore < 10 ? "/portal/profile" : undefined,
      actionLabel: "Add Employment",
    },
    {
      name: "Account Age",
      score: ageScore,
      max: 15,
      color: ageScore >= 12 ? "emerald" : ageScore >= 6 ? "amber" : "red",
      status: ageScore >= 12 ? "good" : ageScore >= 6 ? "warn" : "bad",
      tip: ageScore === 15 ? "Established account" : `Account is ${accountAgeDays} days old — score improves over time`,
    },
  ];

  const scoreColor = score >= 75 ? "emerald" : score >= 50 ? "amber" : "red";
  const scoreLabel = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs Work";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Credit Score</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your Philix Finance creditworthiness score</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-700 text-slate-500 hover:text-slate-300 transition-all">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Score card */}
      <div className={`bg-gradient-to-br from-${scoreColor}-900/30 to-slate-900/50 border border-${scoreColor}-800/30 rounded-2xl p-6`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreGauge score={loading ? 0 : score} />
          <div className="flex-1 space-y-3">
            <div>
              <div className={`text-sm font-bold text-${scoreColor}-400 uppercase tracking-wider`}>{scoreLabel}</div>
              <div className="text-slate-300 text-sm mt-1">
                {score >= 75
                  ? "You have a strong credit profile. You qualify for our best rates and highest loan limits."
                  : score >= 50
                  ? "Your profile is developing. Complete the steps below to unlock better rates."
                  : "Your credit profile needs improvement. Follow the tips below to boost your score."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award size={14} className={`text-${scoreColor}-400`} />
              <span className="text-xs text-slate-400">{score}/100 points earned</span>
            </div>
            {score < 100 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info size={11} />
                <span>+{100 - score} points possible with profile improvements</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Factors */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Score Breakdown</h2>
        <div className="space-y-4">
          {factors.map(f => (
            <div key={f.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {f.status === "good"
                    ? <CheckCircle size={12} className="text-emerald-400" />
                    : f.status === "warn"
                    ? <AlertTriangle size={12} className="text-amber-400" />
                    : <AlertTriangle size={12} className="text-red-400" />
                  }
                  <span className="text-sm text-slate-300 font-medium">{f.name}</span>
                </div>
                <span className={`text-sm font-bold text-${f.color}-400`}>{f.score}/{f.max}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-${f.color}-500 transition-all duration-700`}
                  style={{ width: `${(f.score / f.max) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-600">{f.tip}</p>
                {f.actionHref && (
                  <Link to={f.actionHref} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 flex-shrink-0 ml-2">
                    {f.actionLabel} <TrendingUp size={10} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      {score < 75 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">How to Improve Your Score</h2>
          <div className="space-y-2">
            {!kycVerified && (
              <div className="flex items-start gap-3 p-3 bg-purple-900/10 border border-purple-900/30 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">1</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200">Verify your identity (KYC)</div>
                  <div className="text-xs text-slate-500 mt-0.5">+25 points — biggest single improvement</div>
                </div>
                <Link to="/portal/kyc" className="text-xs text-purple-400 hover:text-purple-300 flex-shrink-0">Start →</Link>
              </div>
            )}
            {profileScore < 20 && (
              <div className="flex items-start gap-3 p-3 bg-indigo-900/10 border border-indigo-900/30 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">2</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200">Complete your profile</div>
                  <div className="text-xs text-slate-500 mt-0.5">+{20 - profileScore} points — add employment and address details</div>
                </div>
                <Link to="/portal/profile" className="text-xs text-indigo-400 hover:text-indigo-300 flex-shrink-0">Update →</Link>
              </div>
            )}
            {totalApps === 0 && (
              <div className="flex items-start gap-3 p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-emerald-600/20 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">3</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200">Apply for your first loan</div>
                  <div className="text-xs text-slate-500 mt-0.5">Building a repayment history improves your score significantly</div>
                </div>
                <Link to="/portal/apply" className="text-xs text-emerald-400 hover:text-emerald-300 flex-shrink-0">Apply →</Link>
              </div>
            )}
            <div className="text-xs text-slate-700 mt-2">Score updates automatically as your profile and history change.</div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-700 pb-4">
        This score is for informational purposes within Philix Finance.
        Final lending decisions may consider additional factors.
      </p>
    </div>
  );
}
