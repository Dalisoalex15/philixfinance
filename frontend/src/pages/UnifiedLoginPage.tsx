import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield, Zap, TrendingUp, Users } from "lucide-react";
import PhilixLogo from "../components/ui/PhilixLogo";
import { useAuthStore } from "../store/auth";
import { useClientAuthStore } from "../store/clientAuth";

export default function UnifiedLoginPage() {
  const navigate = useNavigate();
  const staffLogin = useAuthStore(s => s.login);
  const clientLoginWithApi = useClientAuthStore(s => s.loginWithApi);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const detectedType = (() => {
    if (!email) return null;
    if (email.toLowerCase().endsWith("@philixfinance.com")) return "staff";
    return "client";
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (detectedType === "staff") {
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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800/60">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 85%, #6366f1 0%, transparent 45%), radial-gradient(circle at 85% 15%, #a855f7 0%, transparent 40%)" }} />

        <div className="relative">
          <PhilixLogo variant="full" size="lg" onDark />
          <div className="mt-10 space-y-2">
            <h1 className="text-3xl font-black text-white leading-tight">Building Futures,</h1>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 leading-tight">Together.</h1>
          </div>
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            At Philix Finance, we believe every Zambian deserves access to fair, fast, and transparent credit — whether you're a student, a business owner, or a working professional.
          </p>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed">
            We're not just a lender. We're a partner in your growth — helping you bridge gaps, seize opportunities, and build the life you deserve.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: Zap, label: "Fast, Simple Loans", desc: "Apply in minutes. Decision in 24–48 hours." },
            { icon: Shield, label: "Trusted & Licensed", desc: "Regulated by the Bank of Zambia (BoZ)." },
            { icon: TrendingUp, label: "Grow With Us", desc: "Better rates as you build your repayment history." },
            { icon: Users, label: "Community First", desc: "Serving students, workers & entrepreneurs in Lusaka." },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <f.icon size={15} className="text-indigo-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">{f.label}</div>
                <div className="text-xs text-slate-500">{f.desc}</div>
              </div>
            </div>
          ))}
          <div className="pt-4 border-t border-slate-800/60">
            <p className="text-slate-600 text-xs italic">"Your future is worth investing in."</p>
            <p className="text-slate-700 text-xs mt-1">© 2025 Philix Finance Ltd · Lusaka, Zambia · BoZ Licensed</p>
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <PhilixLogo variant="full" size="md" onDark />
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">
              {detectedType === "staff"
                ? "Staff account recognised — you'll be taken to the Operations Portal"
                : detectedType === "client"
                ? "Welcome back — you'll be taken to your Client Portal"
                : "Sign in to access your Philix Finance account"}
            </p>
          </div>

          {detectedType && (
            <div className={`mb-4 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border ${
              detectedType === "staff"
                ? "bg-amber-900/20 border-amber-800/40 text-amber-400"
                : "bg-indigo-900/20 border-indigo-800/40 text-indigo-400"
            }`}>
              {detectedType === "staff" ? <Shield size={12} /> : <Users size={12} />}
              {detectedType === "staff" ? "Staff / Admin account" : "Client account"}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-3 flex items-center gap-2 text-red-300 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 transition-all"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                : <>Sign In <ArrowRight size={14} /></>}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <p className="text-sm text-slate-500">
              New to Philix Finance?{" "}
              <a href="/portal/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">Create an account →</a>
            </p>
            <p className="text-xs text-slate-700">
              Staff accounts are managed by your administrator.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
