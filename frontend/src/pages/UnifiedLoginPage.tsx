import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, ArrowRight, Shield, Zap, TrendingUp, Users, ChevronDown, ChevronUp } from "lucide-react";
import PhilixLogo from "../components/ui/PhilixLogo";
import { useAuthStore } from "../store/auth";
import { useClientAuthStore, useRegisteredClientsStore, demoClients } from "../store/clientAuth";
import { useStaffStore } from "../store/staffStore";

const STAFF_PASSWORDS: Record<string, string> = {
  "staff-001": "philix@CEO2025",
  "staff-002": "philix@Mgr2025",
  "staff-003": "philix@LO2025",
  "staff-004": "philix@Col2025",
  "staff-005": "philix@Acc2025",
};

const ROLE_COLORS: Record<string, string> = {
  CEO: "text-amber-400 bg-amber-900/30 border-amber-800/40",
  MANAGER: "text-blue-400 bg-blue-900/30 border-blue-800/40",
  LOAN_OFFICER: "text-emerald-400 bg-emerald-900/30 border-emerald-800/40",
  COLLECTIONS_OFFICER: "text-orange-400 bg-orange-900/30 border-orange-800/40",
  ACCOUNTANT: "text-purple-400 bg-purple-900/30 border-purple-800/40",
};

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  MANAGER: "Manager",
  LOAN_OFFICER: "Loan Officer",
  COLLECTIONS_OFFICER: "Collections",
  ACCOUNTANT: "Accountant",
};

export default function UnifiedLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const clientLogin = useClientAuthStore(s => s.login);
  const { staff: allStaff, passwords: staffPasswords } = useStaffStore();
  const { clients: registeredClients, passwords: clientPasswords } = useRegisteredClientsStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStaffCreds, setShowStaffCreds] = useState(true);
  const [showClientCreds, setShowClientCreds] = useState(true);

  const allClients = [...demoClients, ...registeredClients];

  const detectedType = (() => {
    if (!email) return null;
    if (allStaff.some(s => s.email.toLowerCase() === email.toLowerCase())) return "staff";
    if (allClients.some(c => c.email.toLowerCase() === email.toLowerCase())) return "client";
    if (email.toLowerCase().endsWith("@philixfinance.com")) return "staff";
    return "client";
  })();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));

    const staffMatch = allStaff.find(s => s.email.toLowerCase() === email.toLowerCase());
    const clientMatch = allClients.find(c => c.email.toLowerCase() === email.toLowerCase());

    if (staffMatch) {
      const correctPass = staffPasswords[staffMatch.id];
      if (password !== correctPass) {
        setError("Incorrect password. Use the credentials shown below.");
        setLoading(false);
        return;
      }
      setAuth({
        id: staffMatch.id,
        employeeId: staffMatch.employeeNumber,
        firstName: staffMatch.firstName,
        lastName: staffMatch.lastName,
        email: staffMatch.email,
        phone: staffMatch.phone,
        role: staffMatch.role === "CEO" ? "SUPER_ADMIN"
          : staffMatch.role === "MANAGER" ? "MANAGER"
          : staffMatch.role === "LOAN_OFFICER" ? "LOAN_OFFICER"
          : staffMatch.role === "COLLECTIONS_OFFICER" ? "COLLECTIONS_OFFICER"
          : "ACCOUNTANT",
        mfaEnabled: false,
        avatarUrl: null,
      }, "demo-token");
      navigate("/");
      return;
    }

    if (clientMatch) {
      const isDemoClient = demoClients.some(c => c.id === clientMatch.id);
      const correctPass = isDemoClient ? "client123" : clientPasswords[clientMatch.id];
      if (password !== correctPass) {
        setError("Incorrect password.");
        setLoading(false);
        return;
      }
      clientLogin(clientMatch);
      navigate("/portal/dashboard");
      return;
    }

    setError("No account found with this email. Click a demo account below to fill in credentials.");
    setLoading(false);
  };

  const fill = (emailVal: string, passVal: string) => {
    setEmail(emailVal);
    setPassword(passVal);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800/60">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 85%, #6366f1 0%, transparent 45%), radial-gradient(circle at 85% 15%, #a855f7 0%, transparent 40%)" }} />

        <div className="relative">
          <PhilixLogo variant="full" size="lg" onDark />
          <div className="mt-12 space-y-1">
            <h1 className="text-3xl font-black text-white leading-tight">One Platform.</h1>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 leading-tight">Two Portals.</h1>
          </div>
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            Staff and clients both sign in here. We detect your account type automatically from your email.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: Shield, label: "Staff Portal", desc: "Loan management, clients, collections, accounting" },
            { icon: Users, label: "Client Portal", desc: "Apply for loans, track repayments, manage profile" },
            { icon: Zap, label: "Fast Approvals", desc: "24–48 hour loan decisions" },
            { icon: TrendingUp, label: "Trusted Lending", desc: "BoZ Licensed · Lusaka, Zambia" },
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
            <p className="text-slate-700 text-xs">© 2025 Philix Finance Ltd · Lusaka, Zambia</p>
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
                ? "Staff account detected — signing in to Operations Portal"
                : detectedType === "client"
                ? "Client account detected — signing in to Client Portal"
                : "Enter your email and we'll detect your account type"}
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

          {/* ── Staff Credentials ──────────────────────────────── */}
          <div className="mt-5 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowStaffCreds(!showStaffCreds)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/80 hover:bg-slate-800/60 transition-all text-left">
              <div className="flex items-center gap-2">
                <Shield size={13} className="text-amber-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff / Admin Accounts</span>
              </div>
              {showStaffCreds ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
            </button>
            {showStaffCreds && (
              <div className="divide-y divide-slate-800/60">
                {allStaff.map(s => (
                  <button key={s.id}
                    onClick={() => fill(s.email, staffPasswords[s.id] ?? "")}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-all text-left group">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                      {s.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-300">{s.firstName} {s.lastName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[s.role]}`}>
                          {ROLE_LABELS[s.role]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 truncate">{s.email}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-slate-600 group-hover:text-slate-500">password</div>
                      <div className="text-xs font-mono text-slate-400 group-hover:text-slate-200">{staffPasswords[s.id] ?? "—"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Client Credentials ─────────────────────────────── */}
          <div className="mt-3 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowClientCreds(!showClientCreds)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/80 hover:bg-slate-800/60 transition-all text-left">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Accounts</span>
              </div>
              {showClientCreds ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
            </button>
            {showClientCreds && (
              <div className="divide-y divide-slate-800/60">
                {demoClients.map(c => (
                  <button key={c.id}
                    onClick={() => fill(c.email, "client123")}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-all text-left group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                      {c.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-300">{c.firstName} {c.lastName}</div>
                      <div className="text-xs text-slate-600 truncate">{c.email}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-slate-600 group-hover:text-slate-500">password</div>
                      <div className="text-xs font-mono text-slate-400 group-hover:text-slate-200">client123</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
