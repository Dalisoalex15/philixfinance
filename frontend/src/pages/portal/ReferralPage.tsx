import { useState } from "react";
import { Copy, Check, Share2, Gift, Users, TrendingDown, MessageCircle, ArrowRight } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";

function CodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-950 border-2 border-dashed border-indigo-700/60 rounded-xl px-5 py-4 text-center">
        <div className="font-mono text-2xl font-bold text-indigo-400 tracking-widest select-all">{code}</div>
        <div className="text-xs text-slate-600 mt-1">Your personal referral code</div>
      </div>
      <button onClick={copy}
        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-semibold flex-shrink-0 ${
          copied ? "border-emerald-600/50 bg-emerald-900/20 text-emerald-400" : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600"
        }`}>
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function ReferralPage() {
  const client = useClientAuthStore(s => s.client);
  if (!client) return null;

  // Derive a short, memorable referral code from client number
  const suffix = client.clientNumber.replace(/\D/g, "").slice(-5);
  const referralCode = `PHX-${suffix || client.clientNumber.slice(-5).toUpperCase()}`;
  const shareText = `Hi! I'm using Philix Finance for quick personal loans in Zambia. Apply online and get a decision fast. Use my referral code ${referralCode} when you register to get a preferential rate! 🎉 philixfinance.com`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const steps = [
    { icon: Share2, title: "Share Your Code", desc: "Send your referral code to a friend or family member" },
    { icon: Users, title: "They Register", desc: "Your contact registers at philixfinance.com using your code" },
    { icon: Gift, title: "Both Benefit", desc: "You both receive a preferential interest rate on your next loan" },
  ];

  const benefits = [
    { who: "You", perk: "Rate reduction on your next loan application" },
    { who: "Your Friend", perk: "Faster KYC verification and preferential rate on first loan" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-slate-900 border border-indigo-800/30 rounded-2xl p-6 text-center">
        <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Gift size={28} className="text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Refer & Earn Together</h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Share Philix Finance with people you trust. When they get funded, you both benefit.
        </p>
      </div>

      {/* Referral Code */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Share2 size={14} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Your Referral Code</h2>
        </div>
        <CodeBox code={referralCode} />
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all">
          <MessageCircle size={16} />
          Share via WhatsApp
        </a>
        <p className="text-xs text-slate-600 text-center">
          Or copy the code and send it however you like
        </p>
      </div>

      {/* How It Works */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">How It Works</h2>
        <div className="space-y-0">
          {steps.map((s, i) => (
            <div key={s.title} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-700/40 flex items-center justify-center flex-shrink-0">
                  <s.icon size={16} className="text-indigo-400" />
                </div>
                {i < steps.length - 1 && <div className="w-px h-8 bg-slate-800 mt-1" />}
              </div>
              <div className="pt-1.5 pb-6">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-indigo-400">STEP {i + 1}</span>
                </div>
                <div className="font-semibold text-slate-200 text-sm">{s.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={14} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Benefits for Both</h2>
        </div>
        <div className="space-y-3">
          {benefits.map(b => (
            <div key={b.who} className="flex items-center gap-3 p-3 bg-emerald-900/10 border border-emerald-900/30 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-400">
                {b.who[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-emerald-400">{b.who}</div>
                <div className="text-xs text-slate-400 mt-0.5">{b.perk}</div>
              </div>
              <ArrowRight size={12} className="text-emerald-600 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* T&Cs */}
      <div className="text-xs text-slate-700 text-center space-y-1 pb-4">
        <p>Referral benefits apply after the referred friend's first loan is approved and disbursed.</p>
        <p>Referral code must be entered during registration — it cannot be added afterwards.</p>
        <p>Philix Finance reserves the right to modify referral terms at any time.</p>
      </div>
    </div>
  );
}
