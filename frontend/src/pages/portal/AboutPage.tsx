import { Shield, TrendingUp, Users, Zap, Heart, Globe } from "lucide-react";
import PhilixLogo from "../../components/ui/PhilixLogo";

const BRAND_COLORS = [
  {
    swatch: "#F5A623",
    name: "Zambian Gold",
    hex: "#F5A623",
    role: "Primary Brand Color",
    meaning: "Derived from the orange on the Zambian flag — symbolising wealth, prosperity, and the bright future we help our clients build.",
  },
  {
    swatch: "#0B1F3A",
    name: "Deep Navy",
    hex: "#0B1F3A",
    role: "Background & Authority",
    meaning: "Conveys trust, stability, and financial authority. The depth of navy reflects the seriousness with which we treat our clients' financial journeys.",
  },
  {
    swatch: "#FFFFFF",
    name: "Pure White",
    hex: "#FFFFFF",
    role: "Neutral & Universal",
    meaning: "Derived from its neutral context of universalism — white ensures clarity and accessibility across all backgrounds and cultures.",
    border: true,
  },
  {
    swatch: "#C9A227",
    name: "Antique Gold",
    hex: "#C9A227",
    role: "Accent & Highlight",
    meaning: "A refined, muted gold used for headlines and accents — evoking timeless value and the enduring nature of financial trust.",
  },
];

const FONT_WEIGHTS = [
  { weight: "900", name: "Bold",       sample: "Philix Finance",    style: { fontWeight: 900 } },
  { weight: "600", name: "SemiBold",   sample: "Creating A Future", style: { fontWeight: 600 } },
  { weight: "500", name: "Medium",     sample: "Together We Grow",  style: { fontWeight: 500 } },
  { weight: "400", name: "Regular",    sample: "Fast & Fair Loans", style: { fontWeight: 400 } },
  { weight: "300", name: "Light",      sample: "Lusaka, Zambia",    style: { fontWeight: 300 } },
  { weight: "200", name: "ExtraLight", sample: "BoZ Licensed",      style: { fontWeight: 200 } },
];

const VALUES = [
  { icon: Shield,    color: "text-blue-400",    bg: "bg-blue-900/20 border-blue-800/30",    title: "Trust",         desc: "Every transaction is secured, every promise is kept. We are licensed by the Bank of Zambia and held to the highest standards of financial integrity." },
  { icon: Zap,       color: "text-amber-400",   bg: "bg-amber-900/20 border-amber-800/30",  title: "Speed",         desc: "We know time matters. Our 15-minute online application and 24–48 hour decision turnaround means you get funds when you need them most." },
  { icon: Heart,     color: "text-rose-400",    bg: "bg-rose-900/20 border-rose-800/30",    title: "Empathy",       desc: "We listen first. Our loan officers are trained to understand your unique situation before recommending a product — not the other way around." },
  { icon: TrendingUp,color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/30", title: "Growth",     desc: "Better repayment history earns you better rates. We reward loyalty with loyalty — your financial health is our measure of success." },
  { icon: Users,     color: "text-violet-400",  bg: "bg-violet-900/20 border-violet-800/30",title: "Community",     desc: "Serving students, workers, entrepreneurs, and families across Lusaka. We exist because of our community — and we invest back into it." },
  { icon: Globe,     color: "text-cyan-400",    bg: "bg-cyan-900/20 border-cyan-800/30",    title: "Inclusion",     desc: "Universal access to credit is not a privilege — it is a right. Our white brand identity reflects universalism: financial services for every Zambian." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B1F3A] text-white pb-16">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, #F5A623 0%, transparent 50%), radial-gradient(circle at 80% 20%, #C9A227 0%, transparent 40%)"
        }} />
        <div className="relative max-w-2xl mx-auto px-5 pt-12 pb-10 text-center">
          <PhilixLogo variant="full" size="lg" onDark className="mx-auto mb-6" />
          <h1 className="text-3xl font-black tracking-tight mb-3">About Philix Finance</h1>
          <p className="text-[#C9A227] font-semibold text-sm tracking-[0.2em] uppercase mb-4">Creating A Future Together</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Philix Finance is a Bank of Zambia licensed microfinance institution built to give every Zambian —
            student, worker, or entrepreneur — fair, fast access to credit and the financial tools to grow.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 space-y-10">

        {/* Mission */}
        <section className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#C9A227] mb-3">Our Mission</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            To be the most trusted and accessible financial partner for Zambians — bridging the gap between
            ambition and opportunity through transparent, technology-driven lending that puts people first.
          </p>
        </section>

        {/* Brand Logo Story */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">The Logo — What It Means</h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#C9A227] flex-shrink-0 flex items-center justify-center shadow-lg shadow-amber-900/30">
                <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none">
                  <rect x="8" y="40" width="9" height="13" rx="2.5" fill="white" opacity="0.8"/>
                  <rect x="22" y="30" width="9" height="23" rx="2.5" fill="white" opacity="0.9"/>
                  <rect x="36" y="18" width="9" height="35" rx="2.5" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-white text-sm mb-1">The Hand — Transactional Representation</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  The flowing form in the Philix logo is an illustration of a hand — representing the act of giving,
                  receiving, and transacting. It symbolises the relationship between lender and borrower: one
                  open hand extending credit; another receiving opportunity. Together, they form a complete financial partnership.
                </p>
              </div>
            </div>
            <div className="border-t border-slate-700/50 pt-4">
              <p className="text-xs text-slate-400 leading-relaxed italic">
                "The logo was designed to feel human — not corporate. Finance should feel like a handshake,
                not a wall. The hand at the centre of our mark is that handshake."
              </p>
              <p className="text-xs text-[#C9A227] mt-1 font-semibold">— Philix Finance Design Brief</p>
            </div>
          </div>
        </section>

        {/* Brand Colors */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Brand Colour Palette</h2>
          <div className="space-y-3">
            {BRAND_COLORS.map(c => (
              <div key={c.hex} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex gap-4 items-start">
                <div
                  className={`w-12 h-12 rounded-xl flex-shrink-0 shadow-lg ${c.border ? "border border-slate-600" : ""}`}
                  style={{ backgroundColor: c.swatch }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-bold text-white text-sm">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">{c.hex}</span>
                    <span className="text-[10px] text-[#C9A227] font-semibold">{c.role}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{c.meaning}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-lg font-bold text-white mb-1">Typography</h2>
          <p className="text-xs text-slate-500 mb-4">Font Family: <span className="text-[#C9A227] font-semibold">Clash Grotesk</span></p>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
            {FONT_WEIGHTS.map((fw, i) => (
              <div
                key={fw.weight}
                className={`px-5 py-4 flex items-center justify-between gap-4 ${i < FONT_WEIGHTS.length - 1 ? "border-b border-slate-700/40" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-600 w-8">{fw.weight}</span>
                  <span className="text-[11px] text-slate-500 w-20">{fw.name}</span>
                </div>
                <span
                  className="text-white text-lg flex-1 text-right"
                  style={fw.style}
                >
                  {fw.sample}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">Clash Grotesk is a geometric typeface chosen for its modern, confident character — approachable yet authoritative.</p>
        </section>

        {/* Our Values */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Our Values</h2>
          <div className="grid grid-cols-1 gap-3">
            {VALUES.map(v => (
              <div key={v.title} className={`border rounded-xl p-4 flex gap-3 items-start ${v.bg}`}>
                <v.icon size={18} className={`${v.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className="font-bold text-white text-sm mb-0.5">{v.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Regulatory */}
        <section className="bg-emerald-900/20 border border-emerald-800/40 rounded-2xl p-5 flex gap-4 items-start">
          <Shield size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-300 text-sm mb-1">Bank of Zambia Licensed</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Philix Finance Ltd is a fully licensed and regulated financial service provider operating under
              the Banking and Financial Services Act of Zambia. Your deposits, applications, and personal data
              are protected under Zambian financial law.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center space-y-1 pt-2 pb-4">
          <p className="text-xs text-slate-600">© 2025 Philix Finance Ltd · Lusaka, Zambia</p>
          <p className="text-xs text-slate-700 italic">"Your future is worth investing in."</p>
        </div>
      </div>
    </div>
  );
}
