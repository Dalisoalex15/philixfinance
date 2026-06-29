import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, Shield } from "lucide-react";
import { useAuthStore } from "../store/auth";
import PhilixLogo from "../components/ui/PhilixLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required"); return; }
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "Invalid email or password. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fill = (e: string, p: string) => { setEmail(e); setPassword(p); setError(""); };

  return (
    <div className="min-h-screen bg-[#060F1E] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-[#C9A227]/5 pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <PhilixLogo variant="full" size="md" onDark className="mx-auto" />
          <p className="text-white/30 text-sm mt-3">Staff &amp; Admin Portal</p>
        </div>

        <div className="bg-[#0B1F3A] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Sign In</h2>
            <p className="text-sm text-white/35 mt-1">Access the Loan Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder:text-white/20 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@philixfinance.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder:text-white/20 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Signing in…</>
              ) : (
                <><Shield size={14} /> Sign In</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/20 mb-3">Quick Access — CEO</div>
            <button
              type="button"
              onClick={() => fill("daliso@philixfinance.com", "philix@CEO2025")}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/5 hover:bg-[#C9A227]/10 transition-all"
            >
              <span className="text-xs font-semibold text-[#C9A227]">CEO / Admin</span>
              <span className="text-[11px] font-mono text-white/30">daliso@philixfinance.com</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-white/15">
          © 2025 Philix Finance · Lusaka, Zambia · All rights reserved
        </div>
      </div>
    </div>
  );
}
