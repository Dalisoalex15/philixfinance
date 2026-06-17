import { useState } from "react";
import { Gift, Users, Trophy, Copy, CheckCircle, TrendingUp, Star } from "lucide-react";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}`;

const topReferrers = [
  { rank: 1, name: "Chanda Mwale", clientNo: "PHX-C-00042", referrals: 8, earned: 800, tier: "Gold" },
  { rank: 2, name: "Grace Lungu", clientNo: "PHX-C-00031", referrals: 5, earned: 500, tier: "Silver" },
  { rank: 3, name: "Mary Phiri", clientNo: "PHX-C-00019", referrals: 4, earned: 400, tier: "Silver" },
  { rank: 4, name: "Peter Banda", clientNo: "PHX-C-00038", referrals: 2, earned: 200, tier: "Bronze" },
  { rank: 5, name: "James Mutale", clientNo: "PHX-C-00029", referrals: 1, earned: 100, tier: "Bronze" },
];

const recentReferrals = [
  { id: "r1", referrer: "Chanda Mwale", referred: "Alice Banda", date: "2026-06-17", status: "ACTIVE", reward: 100 },
  { id: "r2", referrer: "Grace Lungu", referred: "Bob Tembo", date: "2026-06-16", status: "PENDING", reward: 100 },
  { id: "r3", referrer: "Chanda Mwale", referred: "Carol Phiri", date: "2026-06-15", status: "ACTIVE", reward: 100 },
  { id: "r4", referrer: "Mary Phiri", referred: "David Mwale", date: "2026-06-14", status: "ACTIVE", reward: 100 },
];

const TIER_COLORS: Record<string, string> = {
  Gold: "text-yellow-700 bg-yellow-100 border-yellow-200",
  Silver: "text-navy-700 bg-warm-200 border-warm-300",
  Bronze: "text-amber-700 bg-amber-50 border-amber-200",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function ReferralProgrammePage() {
  const [tab, setTab] = useState<"leaderboard" | "referrals" | "settings">("leaderboard");
  const [copied, setCopied] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState("100");
  const [rateDiscount, setRateDiscount] = useState("1");

  const totalReferrals = topReferrers.reduce((s, r) => s + r.referrals, 0);
  const totalRewards = topReferrers.reduce((s, r) => s + r.earned, 0);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Referral Programme</h1>
          <p className="page-subtitle">Reward loyal clients for referring new borrowers — unique referral codes and leaderboard</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Referrals", value: totalReferrals, icon: Users, color: "indigo" },
          { label: "Rewards Paid", value: K(totalRewards), icon: Gift, color: "emerald" },
          { label: "Active Referrers", value: topReferrers.length.toString(), icon: Star, color: "amber" },
          { label: "New Clients via Referral", value: totalReferrals.toString(), icon: TrendingUp, color: "blue" },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <k.icon size={16} className={`text-${k.color}-400 mb-2`} />
            <div className="text-2xl font-bold text-navy-900">{k.value}</div>
            <div className="text-xs text-navy-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-warm-200 gap-1">
        {(["leaderboard", "referrals", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all ${tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-navy-500 hover:text-navy-700"}`}>
            {t === "leaderboard" ? "Top Referrers" : t === "referrals" ? "Recent Referrals" : "Programme Settings"}
          </button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div className="space-y-3">
          {topReferrers.map(r => (
            <div key={r.rank} className="philix-card p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                  r.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                  r.rank === 2 ? "bg-warm-200 text-navy-700" :
                  r.rank === 3 ? "bg-amber-50 text-amber-700" : "bg-warm-100 text-navy-500"
                }`}>
                  {r.rank === 1 ? <Trophy size={18} /> : `#${r.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy-900">{r.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_COLORS[r.tier]}`}>{r.tier}</span>
                  </div>
                  <div className="text-xs text-navy-500">{r.clientNo}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-700">{r.referrals}</div>
                  <div className="text-xs text-navy-500">Referrals</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-700">{K(r.earned)}</div>
                  <div className="text-xs text-navy-500">Earned</div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-warm-200 text-indigo-700 px-2 py-1 rounded-lg">
                    PHX-REF-{r.clientNo.split("-")[2]}
                  </code>
                  <button onClick={() => copyCode(`PHX-REF-${r.clientNo.split("-")[2]}`)}
                    className="text-navy-500 hover:text-navy-700 transition-colors">
                    {copied === `PHX-REF-${r.clientNo.split("-")[2]}` ? <CheckCircle size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "referrals" && (
        <div className="philix-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-100">
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Referrer</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Referred Client</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-navy-500 px-4 py-3">Reward</th>
              </tr>
            </thead>
            <tbody>
              {recentReferrals.map(r => (
                <tr key={r.id} className="border-b border-warm-200 hover:bg-warm-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy-800">{r.referrer}</td>
                  <td className="px-4 py-3 text-navy-700">{r.referred}</td>
                  <td className="px-4 py-3 text-navy-500 text-xs">{r.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{K(r.reward)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="philix-card p-5 space-y-4">
            <h3 className="font-semibold text-navy-800 mb-3 flex items-center gap-2"><Gift size={16} className="text-indigo-700" /> Programme Configuration</h3>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">Referrer Reward (ZMW per successful referral)</label>
              <input type="number" value={rewardAmount} onChange={e => setRewardAmount(e.target.value)}
                className="input-base" placeholder="100" />
              <p className="text-xs text-navy-500 mt-1">Credited as a rate discount on the referrer's next loan</p>
            </div>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">New Client Benefit — Rate Discount (%)</label>
              <input type="number" value={rateDiscount} onChange={e => setRateDiscount(e.target.value)}
                className="input-base" placeholder="1" />
              <p className="text-xs text-navy-500 mt-1">Applied to the referred client's first loan interest rate</p>
            </div>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">Referral Code Format</label>
              <input type="text" defaultValue="PHX-REF-{CLIENT_NUMBER}" readOnly className="input-base text-navy-500" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-500" id="auto-reward" />
              <label htmlFor="auto-reward" className="text-sm text-navy-700">Auto-apply rewards when referred client takes first loan</label>
            </div>
            <button className="btn-primary w-full">Save Settings</button>
          </div>

          <div className="philix-card p-4">
            <h4 className="font-semibold text-navy-700 text-sm mb-3">Tier Thresholds</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-yellow-700">Gold</span><span className="text-navy-600">6+ referrals</span></div>
              <div className="flex justify-between"><span className="text-navy-700">Silver</span><span className="text-navy-600">3–5 referrals</span></div>
              <div className="flex justify-between"><span className="text-amber-700">Bronze</span><span className="text-navy-600">1–2 referrals</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
