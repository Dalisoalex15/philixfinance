import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Eye, EyeOff, ArrowLeft, User, Phone, Briefcase, Lock, ShieldCheck, RefreshCw, Mail } from "lucide-react";
import PhilixLogo from "../../components/ui/PhilixLogo";
import { useClientAuthStore } from "../../store/clientAuth";
import { savePortalTokens } from "../../lib/api";

const API = import.meta.env.VITE_API_URL || "/api";
const STEPS = ["Personal", "Identity", "Employment", "Security", "Verify"];

export default function ClientRegisterPage() {
  const navigate = useNavigate();
  const registerWithApi = useClientAuthStore(s => s.registerWithApi);

  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [apiError, setApiError]   = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  // OTP state
  const [digits, setDigits]       = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError]   = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [form, setForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "",
    email: "", phone: "", address: "", city: "",
    nrcNumber: "", nrcFront: null as File | null, nrcBack: null as File | null, selfie: null as File | null,
    occupation: "", employer: "", monthlyIncome: "",
    password: "", confirmPassword: "", agreeTerms: false, referralCode: "",
  });

  const setField = (key: string, value: string | boolean | File | null) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  // Auto-focus first OTP digit when entering OTP step
  useEffect(() => {
    if (step === 4) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.firstName) e.firstName = "Required";
      if (!form.lastName)  e.lastName  = "Required";
      if (!form.dateOfBirth) e.dateOfBirth = "Required";
      if (!form.gender)    e.gender    = "Required";
      if (!form.email.includes("@")) e.email = "Valid email required";
      if (form.phone.length < 10) e.phone = "Valid phone required";
      if (!form.address)   e.address   = "Required";
    }
    if (step === 1) {
      if (form.nrcNumber.length < 8) e.nrcNumber = "Enter a valid NRC number";
    }
    if (step === 2) {
      if (!form.occupation)    e.occupation    = "Required";
      if (!form.monthlyIncome) e.monthlyIncome = "Required";
    }
    if (step === 3) {
      if (form.password.length < 8) e.password = "Min 8 characters";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
      if (!form.agreeTerms) e.agreeTerms = "You must accept the terms";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Next / Submit ──────────────────────────────────────────────────────────
  const next = async () => {
    if (!validate()) return;
    if (step < 3) { setStep(step + 1); return; }

    if (submitting) return;
    setSubmitting(true);
    setApiError("");
    setEmailExists(false);
    try {
      const result = await registerWithApi({
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, phone: form.phone, password: form.password,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        nrcNumber: form.nrcNumber || undefined,
        occupation: form.occupation || undefined,
        employer: form.employer || undefined,
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
        referralCode: form.referralCode.trim().toUpperCase() || undefined,
      });
      if (result?.requiresVerification) {
        setVerifiedEmail(result.email || form.email);
        setStep(4); // Show inline OTP step
        setCountdown(60);
        return;
      }
      // Fallback: shouldn't happen, but navigate anyway
      navigate("/portal/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("already registered")) {
        setEmailExists(true);
      } else {
        setApiError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── OTP digit handlers ────────────────────────────────────────────────────
  function handleDigit(idx: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    setOtpError("");
    if (cleaned && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleDigitKey(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter" && digits.every(d => d)) handleVerify();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < 6; i++) next[i] = text[i] || "";
    setDigits(next);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  }

  // ── OTP Verify ────────────────────────────────────────────────────────────
  async function handleVerify() {
    const otp = digits.join("");
    if (otp.length < 6) { setOtpError("Please enter all 6 digits."); return; }

    setVerifying(true); setOtpError(""); setOtpSuccess("");
    try {
      const r = await fetch(`${API}/portal/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifiedEmail, otp, type: "EMAIL_VERIFY" }),
      });
      const data = await r.json();

      if (!r.ok) {
        setOtpError(data.message || data.error || "Invalid code.");
        setDigits(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
        return;
      }

      // Success — save tokens and redirect
      savePortalTokens(data.accessToken, data.refreshToken);
      setOtpSuccess("Email verified! Taking you to your dashboard…");
      setTimeout(() => navigate("/portal/dashboard", { replace: true }), 1000);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async function handleResend() {
    if (countdown > 0) return;
    setResending(true); setOtpError(""); setOtpSuccess("");
    try {
      const r = await fetch(`${API}/portal/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifiedEmail, type: "EMAIL_VERIFY" }),
      });
      const data = await r.json();
      if (!r.ok) { setOtpError(data.message || "Failed to resend."); return; }
      setOtpSuccess("New code sent! Check your inbox.");
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  const otpComplete = digits.every(d => d !== "");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
        <Link to="/portal"><PhilixLogo variant="full" size="sm" onDark /></Link>
        <Link to="/portal/login" className="text-sm text-slate-500 hover:text-slate-300">
          Already registered? Sign in
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">Create Your Account</h1>
            <p className="text-slate-400 text-sm">Apply for loans in minutes — 100% online</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full transition-all duration-300 ${i <= step ? "bg-indigo-500" : "bg-slate-800"}`} />
                <div className="flex items-center gap-1">
                  {i < step ? (
                    <CheckCircle size={10} className="text-indigo-400" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${i === step ? "bg-indigo-500" : "bg-slate-700"}`} />
                  )}
                  <span className={`text-[10px] ${i === step ? "text-indigo-400" : "text-slate-600"}`}>{label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Errors */}
          {emailExists && (
            <div className="mb-4 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
              <div className="font-semibold text-amber-300 text-sm mb-1">This email is already registered</div>
              <div className="text-slate-400 text-xs mb-3">
                An account with <span className="text-white font-mono">{form.email}</span> already exists.
              </div>
              <div className="flex gap-2">
                <Link to="/portal/login" className="flex-1 text-center text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg">Sign in instead →</Link>
                <button onClick={() => { setEmailExists(false); setStep(0); }} className="flex-1 text-xs font-semibold border border-slate-700 text-slate-400 hover:text-slate-200 py-2 rounded-lg">Use a different email</button>
              </div>
            </div>
          )}
          {apiError && (
            <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-3 text-red-300 text-sm">{apiError}</div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            {/* ── STEP 0 — Personal ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User size={16} className="text-indigo-400" />
                  <h3 className="font-bold text-white">Personal Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[{k:"firstName",l:"First Name *",p:"Mwansa"},{k:"lastName",l:"Last Name *",p:"Tembo"}].map(f => (
                    <div key={f.k}>
                      <label className="text-xs text-slate-400 mb-1 block">{f.l}</label>
                      <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                        placeholder={f.p} value={(form as unknown as Record<string,string>)[f.k]} onChange={e => setField(f.k, e.target.value)} />
                      {errors[f.k] && <p className="text-red-400 text-xs mt-1">{errors[f.k]}</p>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Date of Birth *</label>
                    <input type="date" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.dateOfBirth} onChange={e => setField("dateOfBirth", e.target.value)} />
                    {errors.dateOfBirth && <p className="text-red-400 text-xs mt-1">{errors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Gender *</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.gender} onChange={e => setField("gender", e.target.value)}>
                      <option value="">Select</option>
                      <option>MALE</option><option>FEMALE</option>
                    </select>
                    {errors.gender && <p className="text-red-400 text-xs mt-1">{errors.gender}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Email Address *</label>
                  <input type="email" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="your@email.com" value={form.email} onChange={e => setField("email", e.target.value)} />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Phone Number *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="+260 97 XXX XXXX" value={form.phone} onChange={e => setField("phone", e.target.value)} />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Physical Address *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="House No, Street, Area" value={form.address} onChange={e => setField("address", e.target.value)} />
                  {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">City / Town</label>
                  <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.city} onChange={e => setField("city", e.target.value)}>
                    <option value="">Select city</option>
                    {["Lusaka","Kitwe","Ndola","Livingstone","Chipata","Solwezi","Kabwe","Kasama"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── STEP 1 — Identity ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Phone size={16} className="text-indigo-400" />
                  <h3 className="font-bold text-white">Identity Verification (KYC)</h3>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">NRC Number *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 font-mono tracking-wider"
                    placeholder="000000/00/0" value={form.nrcNumber} onChange={e => setField("nrcNumber", e.target.value)} />
                  {errors.nrcNumber && <p className="text-red-400 text-xs mt-1">{errors.nrcNumber}</p>}
                </div>
                {[
                  { key: "nrcFront", label: "NRC — Front Side", hint: "Clear photo of the front of your NRC card" },
                  { key: "nrcBack",  label: "NRC — Back Side",  hint: "Clear photo of the back of your NRC card" },
                  { key: "selfie",   label: "Selfie with NRC",  hint: "Hold your NRC next to your face, both clearly visible" },
                ].map(u => (
                  <div key={u.key}>
                    <label className="text-xs text-slate-400 mb-1 block">{u.label}</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${(form as unknown as Record<string,File|null>)[u.key] ? "border-emerald-600 bg-emerald-900/10" : "border-slate-700 hover:border-indigo-600 hover:bg-indigo-900/10"}`}>
                      {(form as unknown as Record<string,File|null>)[u.key] ? (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle size={16} />
                          <span className="text-sm font-medium">{((form as unknown as Record<string,File|null>)[u.key] as File).name}</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl mb-2">📷</div>
                          <div className="text-sm text-slate-400 font-medium">Tap to upload photo</div>
                          <div className="text-xs text-slate-600 mt-1">{u.hint}</div>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={e => setField(u.key, e.target.files?.[0] || null)} />
                    </label>
                  </div>
                ))}
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300">
                  Your documents are encrypted and only accessible to authorised Philix Finance staff for verification purposes.
                </div>
              </div>
            )}

            {/* ── STEP 2 — Employment ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={16} className="text-indigo-400" />
                  <h3 className="font-bold text-white">Employment & Income</h3>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Occupation / Status *</label>
                  <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.occupation} onChange={e => setField("occupation", e.target.value)}>
                    <option value="">Select occupation</option>
                    {["Student","Civil Servant","Private Sector Employee","Self-Employed / Business Owner","Market Trader","Teacher","Nurse / Healthcare","Other"].map(o => <option key={o}>{o}</option>)}
                  </select>
                  {errors.occupation && <p className="text-red-400 text-xs mt-1">{errors.occupation}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Employer / School / Business Name</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="e.g. UNZA, Ministry of Health, My Shop Ltd" value={form.employer} onChange={e => setField("employer", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Monthly Income / Revenue (K) *</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="e.g. 5000" value={form.monthlyIncome} onChange={e => setField("monthlyIncome", e.target.value)} />
                  {errors.monthlyIncome && <p className="text-red-400 text-xs mt-1">{errors.monthlyIncome}</p>}
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500">
                  This helps determine your loan eligibility and limit.
                </div>
              </div>
            )}

            {/* ── STEP 3 — Security ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={16} className="text-indigo-400" />
                  <h3 className="font-bold text-white">Set Your Password</h3>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Password *</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                      placeholder="Min 8 characters" value={form.password} onChange={e => setField("password", e.target.value)} />
                    <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Confirm Password *</label>
                  <input type="password" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setField("confirmPassword", e.target.value)} />
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="terms" checked={form.agreeTerms} onChange={e => setField("agreeTerms", e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0" />
                  <label htmlFor="terms" className="text-sm text-slate-400">
                    I agree to Philix Finance's{" "}
                    <button type="button" className="text-indigo-400 hover:underline">Terms of Service</button>{" "}
                    and{" "}
                    <button type="button" className="text-indigo-400 hover:underline">Privacy Policy</button>
                  </label>
                </div>
                {errors.agreeTerms && <p className="text-red-400 text-xs">{errors.agreeTerms}</p>}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Referral Code <span className="text-slate-600">(optional)</span></label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 font-mono uppercase tracking-widest"
                    placeholder="PHX-XXXXX" value={form.referralCode} onChange={e => setField("referralCode", e.target.value.toUpperCase())} maxLength={12} />
                </div>
              </div>
            )}

            {/* ── STEP 4 — OTP Verify (inline) ── */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                    <Mail size={28} className="text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">Check your email</h3>
                  <p className="text-slate-400 text-sm">
                    We sent a 6-digit verification code to
                  </p>
                  <p className="text-indigo-300 font-semibold text-sm mt-1 break-all">{verifiedEmail}</p>
                </div>

                {/* Code inputs */}
                <div className="flex gap-2 justify-center">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleDigitKey(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all"
                      style={{
                        background: d ? "rgba(99,102,241,0.1)" : "#1e293b",
                        borderColor: d ? "#6366f1" : "#334155",
                        color: d ? "#a5b4fc" : "#94a3b8",
                        caretColor: "#6366f1",
                      }}
                    />
                  ))}
                </div>

                {/* Errors / success */}
                {otpError && (
                  <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3 text-red-300 text-sm text-center">
                    {otpError}
                  </div>
                )}
                {otpSuccess && (
                  <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3 text-emerald-300 text-sm text-center flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> {otpSuccess}
                  </div>
                )}

                {/* Verify button */}
                <button
                  onClick={handleVerify}
                  disabled={!otpComplete || verifying}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  style={{
                    background: otpComplete ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1e293b",
                    color: otpComplete ? "#fff" : "#475569",
                  }}
                >
                  {verifying ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  {verifying ? "Verifying…" : "Verify & Create Account"}
                </button>

                {/* Resend */}
                <div className="text-center">
                  <p className="text-slate-500 text-xs mb-2">Didn't receive a code?</p>
                  <button
                    onClick={handleResend}
                    disabled={resending || countdown > 0}
                    className="text-indigo-400 text-sm font-medium disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto"
                  >
                    {resending && <RefreshCw size={12} className="animate-spin" />}
                    {countdown > 0 ? `Resend in ${countdown}s` : resending ? "Sending…" : "Resend code"}
                  </button>
                </div>

                {/* Security note */}
                <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500 flex items-start gap-2">
                  <ShieldCheck size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>This code expires in 10 minutes. Philix Finance will never ask you for this code over the phone.</span>
                </div>
              </div>
            )}

            {/* ── Navigation buttons (steps 0–3) ── */}
            {step < 4 && (
              <div className="flex gap-3 mt-6">
                {step > 0 && (
                  <button onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1 px-4 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:text-slate-200">
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
                <button onClick={next} disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                  {submitting ? (
                    <><RefreshCw size={14} className="animate-spin" /> Creating account…</>
                  ) : step === 3 ? "Create Account →" : "Continue →"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link to="/portal/login" className="text-sm text-slate-500 hover:text-slate-400">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
