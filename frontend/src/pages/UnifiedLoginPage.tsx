import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, AlertCircle, ArrowRight, Shield, Zap, TrendingUp,
  Users, Clock, CheckCircle, Star, ChevronRight, BadgeCheck,
} from "lucide-react";
import PhilixLogo from "../components/ui/PhilixLogo";
import { useAuthStore } from "../store/auth";
import { useClientAuthStore } from "../store/clientAuth";

const STEPS = [
  { n: "1", label: "Create Account", sub: "30 seconds" },
  { n: "2", label: "Fill Application", sub: "5 minutes" },
  { n: "3", label: "Get Approved",   sub: "Under review" },
  { n: "4", label: "Receive Funds",  sub: "Same day" },
];

const STATS = [
  { value: "2,400+", label: "Clients Served" },
  { value: "K8.2M",  label: "Disbursed" },
  { value: "4.9★",   label: "Client Rating" },
  { value: "<15min", label: "Avg Approval" },
];

const TESTIMONIALS = [
  { name: "Grace M.", role: "Teacher, Lusaka", text: "Applied on a Friday, had my K5,000 by Monday. Incredible service!" },
  { name: "Mwansa K.", role: "Small Business Owner", text: "Philix helped me stock my shop before the holiday season. Game changer." },
];

export default function UnifiedLoginPage() {
  const navigate = useNavigate();
  const staffLogin = useAuthStore(s => s.login);
  const clientLoginWithApi = useClientAuthStore(s => s.loginWithApi);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<"auto" | "staff" | "client">("auto");
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    localStorage.removeItem("philix_staff_token");
    localStorage.removeItem("philix_staff_refresh");
    localStorage.removeItem("philix_portal_token");
    localStorage.removeItem("philix_portal_refresh");
    localStorage.removeItem("philix-auth-v2");
    localStorage.removeItem("philix-client-auth-v2");
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const resolvedType = (() => {
    if (accountType !== "auto") return accountType;
    if (!email) return null;
    if (email.toLowerCase().endsWith("@philixfinance.com")) return "staff";
    return "client";
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const loginAs = resolvedType ?? "client";
    try {
      if (loginAs === "staff") {
        await staffLogin(email, password);
        navigate("/");
      } else {
        await clientLoginWithApi(email, password);
        navigate("/portal/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070F1C] flex">

      {/* ── Left branding panel ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(201,162,39,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 50%), linear-gradient(135deg, #0B1F3A 0%, #070F1C 100%)" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A227]/30 to-transparent" />

        {/* Top section */}
        <div className="relative z-10">
          <PhilixLogo variant="full" size="lg" onDark />

          {/* Loan CTA Hero */}
          <div className="mt-10 mb-8">
            <div className="inline-flex items-center gap-2 bg-[#C9A227]/15 border border-[#C9A227]/30 text-[#C9A227] text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
              <Clock size={11} /> Fast Approval
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-3">
              Get a loan in
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A227] to-amber-400">
                under 15 minutes.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed mb-6">
              Apply online, get approved fast, and receive funds the same day.
              No lengthy queues. No complicated paperwork.
            </p>

            <a href="/portal/register"
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#C9A227] to-amber-500 hover:from-amber-400 hover:to-[#C9A227] text-[#070F1C] font-black text-sm px-6 py-3.5 rounded-2xl transition-all duration-200 shadow-xl shadow-[#C9A227]/25 hover:shadow-[#C9A227]/40 hover:scale-[1.02]">
              Start Your Application
              <ArrowRight size={16} />
            </a>
          </div>

          {/* How it works */}
          <div className="mb-8">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">How it works</p>
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1 text-center">
                    <div className="w-8 h-8 rounded-full bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227] text-xs font-black mb-1">
                      {s.n}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-300">{s.label}</div>
                    <div className="text-[9px] text-slate-600">{s.sub}</div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-px w-4 bg-gradient-to-r from-[#C9A227]/30 to-[#C9A227]/10 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 mb-8">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                <div className="text-[16px] font-black text-[#C9A227]">{s.value}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section */}
        <div className="relative z-10 space-y-5">
          {/* Trust features */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Shield,      label: "BoZ Licensed",        desc: "Regulated by Bank of Zambia" },
              { icon: Zap,         label: "Instant Decision",     desc: "AI-powered credit scoring" },
              { icon: TrendingUp,  label: "Build Credit",         desc: "Better rates over time" },
              { icon: Users,       label: "Community Focus",      desc: "Students, workers, businesses" },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <f.icon size={13} className="text-[#C9A227]" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-300">{f.label}</div>
                  <div className="text-[9px] text-slate-600">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Rotating testimonial */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all duration-500">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={10} className="fill-[#C9A227] text-[#C9A227]" />)}
            </div>
            <p className="text-slate-400 text-[12px] leading-relaxed italic">"{TESTIMONIALS[testimonialIdx].text}"</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-[#C9A227] text-[9px] font-bold">
                {TESTIMONIALS[testimonialIdx].name[0]}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-300">{TESTIMONIALS[testimonialIdx].name}</div>
                <div className="text-[9px] text-slate-600">{TESTIMONIALS[testimonialIdx].role}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 flex items-center justify-between">
            <p className="text-slate-700 text-[10px] italic">"Your future is worth investing in."</p>
            <p className="text-slate-700 text-[10px]">© 2025 Philix Finance · Lusaka, Zambia</p>
          </div>
        </div>
      </div>

      {/* ── Right login panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12 xl:px-16 overflow-y-auto relative">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 70% 30%, #C9A227 0%, transparent 60%)" }} />

        <div className="max-w-[420px] w-full mx-auto relative">

          {/* Mobile logo + loan CTA */}
          <div className="lg:hidden mb-8 space-y-4">
            <PhilixLogo variant="full" size="md" onDark />
            <div className="bg-gradient-to-r from-[#C9A227]/15 to-amber-500/10 border border-[#C9A227]/25 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-[#C9A227]" />
                <span className="text-[#C9A227] font-black text-sm">Get a loan in under 15 minutes</span>
              </div>
              <p className="text-slate-400 text-xs mb-3">Apply online, get instant approval, receive funds same day.</p>
              <a href="/portal/register"
                className="flex items-center justify-center gap-2 bg-[#C9A227] text-[#070F1C] font-black text-sm py-2.5 rounded-xl transition-all hover:bg-amber-400">
                Start Now — It's Free <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Sign in header */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck size={16} className="text-[#C9A227]" />
              <span className="text-[10px] font-bold text-[#C9A227] uppercase tracking-widest">Secure Sign In</span>
            </div>
            <h2 className="text-3xl font-black text-white">Welcome back.</h2>
            <p className="text-slate-500 text-sm mt-1">Sign in to your Philix Finance account</p>
          </div>

          {/* Account type selector */}
          <div className="mb-5">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Signing in as</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "client", label: "Client",      icon: Users,  desc: "Client portal",     colors: "border-[#C9A227]/60 bg-[#C9A227]/10 text-[#C9A227]" },
                { value: "staff",  label: "Staff / CEO", icon: Shield, desc: "Operations portal", colors: "border-indigo-500/60 bg-indigo-500/10 text-indigo-300" },
              ] as const).map(opt => (
                <button key={opt.value} type="button" onClick={() => setAccountType(opt.value)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    (accountType === opt.value || (accountType === "auto" && resolvedType === opt.value))
                      ? opt.colors
                      : "border-white/8 bg-white/[0.03] text-slate-600 hover:border-white/15 hover:text-slate-400"
                  }`}>
                  <opt.icon size={15} className="flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold leading-tight">{opt.label}</div>
                    <div className="text-[10px] opacity-60">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-3 flex items-center gap-2 text-red-300 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40 focus:border-[#C9A227]/40 placeholder:text-slate-700 transition-all hover:border-white/15"
                placeholder="your@email.com" required autoComplete="email" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-300">Password</label>
                <a href="/portal/forgot-password" className="text-[11px] text-slate-600 hover:text-[#C9A227] transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 text-slate-100 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40 focus:border-[#C9A227]/40 placeholder:text-slate-700 transition-all hover:border-white/15"
                  placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-[#C9A227] to-amber-500 hover:from-amber-400 hover:to-[#C9A227] disabled:opacity-50 text-[#070F1C] font-black py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#C9A227]/20 hover:shadow-[#C9A227]/30 hover:scale-[1.01]">
              {loading
                ? <><span className="w-4 h-4 border-2 border-[#070F1C]/30 border-t-[#070F1C] rounded-full animate-spin" /> Signing in…</>
                : <>Sign In <ArrowRight size={14} /></>}
            </button>
          </form>

          {/* New client CTA */}
          <div className="mt-6 bg-gradient-to-r from-[#C9A227]/8 to-transparent border border-[#C9A227]/15 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={12} className="text-[#C9A227]" />
                  <span className="text-[11px] font-bold text-[#C9A227]">New to Philix Finance?</span>
                </div>
                <p className="text-slate-500 text-[12px]">Get a loan in under 15 minutes.</p>
              </div>
              <a href="/portal/register"
                className="flex items-center gap-1.5 bg-[#C9A227] hover:bg-amber-400 text-[#070F1C] font-black text-[12px] px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex-shrink-0">
                Start Now <ChevronRight size={12} />
              </a>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
              {[
                { icon: CheckCircle, text: "Free to apply" },
                { icon: CheckCircle, text: "No hidden fees" },
                { icon: CheckCircle, text: "Instant decision" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1">
                  <Icon size={10} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-[10px] text-slate-600">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-700 mt-5">
            Staff accounts are managed by your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
