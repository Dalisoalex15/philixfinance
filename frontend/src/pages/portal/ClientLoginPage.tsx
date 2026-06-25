import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import PhilixLogo from "../../components/ui/PhilixLogo";

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const loginWithApi = useClientAuthStore(s => s.loginWithApi);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem("philix_portal_token");
    localStorage.removeItem("philix_portal_refresh");
    localStorage.removeItem("philix-client-auth-v2");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithApi(email, password);
      navigate("/portal/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex lg:flex-row flex-col">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #4f46e580 0%, transparent 40%), radial-gradient(circle at 80% 20%, #7c3aed40 0%, transparent 40%)" }} />

        <div className="relative">
          <PhilixLogo variant="full" size="lg" onDark className="mb-12" />
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Your Financial<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Freedom</span><br />
            Starts Here
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Apply for loans, track repayments, and manage your financial life — all in one place.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: Zap, label: "Fast Approvals", desc: "24-48 hour loan decisions" },
            { icon: Shield, label: "Secure & Private", desc: "Bank-grade encryption" },
            { icon: TrendingUp, label: "Build Credit", desc: "Repay on time to unlock better rates" },
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
          <div className="pt-4 border-t border-slate-800">
            <p className="text-slate-600 text-xs">© 2025 Philix Finance Ltd · Lusaka, Zambia · BoZ Licensed</p>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <PhilixLogo variant="full" size="md" onDark className="mx-auto" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your client account</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-900/20 border border-red-700/40 rounded-xl p-3.5 flex items-center gap-2.5 text-red-300 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-1.5 block">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-600 transition-all"
                placeholder="your@email.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-300">Password</label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300">Forgot password?</button>
              </div>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 transition-all"
                  placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                : <>Sign In <ArrowRight size={14} /></>}
            </button>
          </form>

          <div className="mt-5 bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 text-xs text-slate-500 text-center">
            Don&apos;t have an account yet? Register to access your portal.
          </div>

          <div className="mt-5 space-y-2 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link to="/portal/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">Register here →</Link>
            </p>
            <Link to="/staff/login" className="text-xs text-slate-700 hover:text-slate-500 block">Staff? Use the Staff Portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
