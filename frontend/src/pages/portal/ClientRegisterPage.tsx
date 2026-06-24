import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle, Eye, EyeOff, ArrowLeft, User, Phone,
  Briefcase, Lock, ShieldCheck, RefreshCw, Mail, Send,
} from "lucide-react";
import PhilixLogo from "../../components/ui/PhilixLogo";
import { useClientAuthStore } from "../../store/clientAuth";
import { savePortalTokens, portalApi } from "../../lib/api";

// Steps: 0=Email verify, 1=Personal, 2=Identity, 3=Employment, 4=Security
const STEPS = ["Verify Email", "Personal", "Identity", "Employment", "Security"];
const STEP_ICONS = [Mail, User, ShieldCheck, Briefcase, Lock];

export default function ClientRegisterPage() {
  const navigate   = useNavigate();
  const setClient  = useClientAuthStore(s => s.setClient);

  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]   = useState("");

  // ── Step 0: email verification ──────────────────────────────────────────────
  const [email, setEmail]               = useState("");
  const [emailSent, setEmailSent]       = useState(false);
  const [emailProofToken, setEmailProofToken] = useState("");
  const [sendingCode, setSendingCode]   = useState(false);
  const [digits, setDigits]             = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError]         = useState("");
  const [verifying, setVerifying]       = useState(false);
  const [resending, setResending]       = useState(false);
  const [countdown, setCountdown]       = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Step 1: personal ────────────────────────────────────────────────────────
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [phone, setPhone]           = useState("");
  const [dob, setDob]               = useState("");
  const [gender, setGender]         = useState<"MALE" | "FEMALE" | "">("");
  const [address, setAddress]       = useState("");
  const [city, setCity]             = useState("");

  // ── Step 2: identity ────────────────────────────────────────────────────────
  const [nrcNumber, setNrcNumber]   = useState("");
  const [referralCode, setReferralCode] = useState("");

  // ── Step 3: employment ──────────────────────────────────────────────────────
  const [occupation, setOccupation] = useState("");
  const [employer, setEmployer]     = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");

  // ── Step 4: security ────────────────────────────────────────────────────────
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [agreed, setAgreed]         = useState(false);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Step 0a: send code ──────────────────────────────────────────────────────
  async function handleSendCode() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setApiError("Please enter a valid email address.");
      return;
    }
    setSendingCode(true);
    setApiError("");
    setOtpError("");
    try {
      await portalApi.sendEmailCode(email);
      setEmailSent(true);
      setDigits(["", "", "", "", "", ""]);
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Failed to send code. Try again.");
    } finally {
      setSendingCode(false);
    }
  }

  // ── Step 0b: resend ─────────────────────────────────────────────────────────
  async function handleResend() {
    if (countdown > 0 || resending) return;
    setResending(true);
    setOtpError("");
    try {
      await portalApi.sendEmailCode(email);
      setDigits(["", "", "", "", "", ""]);
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e: unknown) {
      setOtpError(e instanceof Error ? e.message : "Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  // ── Step 0c: OTP digit input helpers ────────────────────────────────────────
  function handleDigit(idx: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    setOtpError("");
    if (value && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleDigitKey(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const chars = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    setDigits(chars.concat(Array(6 - chars.length).fill("")));
    if (chars.length > 0) otpRefs.current[Math.min(chars.length, 5)]?.focus();
  }

  // ── Step 0d: verify the code ─────────────────────────────────────────────────
  async function handleVerifyCode() {
    const code = digits.join("");
    if (code.length !== 6) { setOtpError("Enter all 6 digits."); return; }
    setVerifying(true);
    setOtpError("");
    try {
      const result = await portalApi.confirmEmailCode(email, code);
      setEmailProofToken(result.emailProofToken);
      // Advance to personal info step
      setStep(1);
    } catch (e: unknown) {
      setOtpError(e instanceof Error ? e.message : "Incorrect code. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  // ── Step 1 validation ────────────────────────────────────────────────────────
  function validatePersonal(): string | null {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim())  return "Last name is required.";
    if (!phone.trim() || phone.length < 9) return "A valid phone number is required.";
    return null;
  }

  // ── Step 4: final submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!password || password.length < 8) {
      setApiError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setApiError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setApiError("Please accept the terms to continue.");
      return;
    }
    setSubmitting(true);
    setApiError("");
    try {
      const result = await portalApi.register({
        email,
        firstName, lastName, phone,
        dateOfBirth: dob || undefined,
        gender: gender || undefined,
        address: address || undefined,
        city: city || undefined,
        nrcNumber: nrcNumber || undefined,
        referralCode: referralCode || undefined,
        occupation: occupation || undefined,
        employer: employer || undefined,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
        password,
        emailProofToken,
      });
      savePortalTokens(result.accessToken, result.refreshToken);
      setClient(result.account);
      navigate("/portal/dashboard", { replace: true });
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step navigation ──────────────────────────────────────────────────────────
  function goNext() {
    setApiError("");
    if (step === 1) {
      const err = validatePersonal();
      if (err) { setApiError(err); return; }
    }
    setStep(s => s + 1);
  }

  function goBack() {
    setApiError("");
    if (step === 1) {
      // Going back to email step resets verification state
      setEmailSent(false);
      setDigits(["", "", "", "", "", ""]);
      setEmailProofToken("");
      setCountdown(0);
    }
    setStep(s => s - 1);
  }

  // ── Progress bar ─────────────────────────────────────────────────────────────
  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 px-4">
      {/* Logo */}
      <div className="mb-8">
        <PhilixLogo size="lg" />
      </div>

      <div className="w-full max-w-lg">
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((label, i) => {
            const Icon = STEP_ICONS[i];
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                  ${done   ? "bg-amber-500 border-amber-500 text-slate-950"
                  : active ? "bg-slate-900 border-amber-500 text-amber-400"
                  :          "bg-slate-900 border-slate-700 text-slate-600"}`}>
                  {done ? <CheckCircle size={16} /> : <Icon size={14} />}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block
                  ${done ? "text-amber-400" : active ? "text-amber-400" : "text-slate-600"}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`hidden sm:block absolute`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full mb-8">
          <div
            className="h-1 bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">

          {/* ── STEP 0: Email verification ───────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Verify your email</h2>
                <p className="text-slate-400 text-sm mt-1">
                  We'll send a 6-digit code to confirm your email before you continue.
                </p>
              </div>

              {!emailSent ? (
                /* Email input form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setApiError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleSendCode()}
                        placeholder="you@example.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {apiError && (
                    <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                      {apiError}
                    </p>
                  )}

                  <button
                    onClick={handleSendCode}
                    disabled={sendingCode || !email}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {sendingCode ? (
                      <><RefreshCw size={16} className="animate-spin" /> Sending…</>
                    ) : (
                      <><Send size={16} /> Send verification code</>
                    )}
                  </button>
                </div>
              ) : (
                /* OTP input form */
                <div className="space-y-5">
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Mail size={14} className="text-amber-400 shrink-0" />
                      <span>Code sent to <span className="text-white font-medium">{email}</span></span>
                    </div>
                    <button
                      onClick={() => { setEmailSent(false); setOtpError(""); setApiError(""); setDigits(["","","","","",""]); }}
                      className="mt-2 text-xs text-amber-500 hover:text-amber-400"
                    >
                      Use a different email
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                      Enter 6-digit code
                    </label>
                    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
                          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-slate-800 text-white focus:outline-none transition-all
                            ${d ? "border-amber-500" : "border-slate-700"}
                            focus:border-amber-400`}
                        />
                      ))}
                    </div>
                  </div>

                  {otpError && (
                    <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 text-center">
                      {otpError}
                    </p>
                  )}

                  <button
                    onClick={handleVerifyCode}
                    disabled={verifying || digits.join("").length !== 6}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {verifying ? (
                      <><RefreshCw size={16} className="animate-spin" /> Verifying…</>
                    ) : (
                      <><CheckCircle size={16} /> Verify &amp; continue</>
                    )}
                  </button>

                  {/* Resend */}
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-sm text-slate-500">
                        Resend in <span className="text-amber-400 font-medium tabular-nums">{countdown}s</span>
                      </p>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={resending}
                        className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1.5 mx-auto"
                      >
                        <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
                        {resending ? "Resending…" : "Resend code"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Personal info ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Personal information</h2>
                <p className="text-slate-400 text-sm mt-1">Tell us a bit about yourself.</p>
              </div>

              {/* Email — locked, already verified */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full bg-slate-800/40 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-400 cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Verified
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">First name *</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Daliso"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Last name *</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Phiri"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <Phone size={13} className="inline mr-1.5" />Phone number *
                </label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+260 97 1234567"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Date of birth</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value as "MALE" | "FEMALE" | "")}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors">
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Plot 12, Cairo Road"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Lusaka"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>

              {apiError && (
                <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{apiError}</p>
              )}
            </div>
          )}

          {/* ── STEP 2: Identity ──────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Identity details</h2>
                <p className="text-slate-400 text-sm mt-1">Provide your NRC and referral info (optional).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">NRC / National ID number</label>
                <input type="text" value={nrcNumber} onChange={e => setNrcNumber(e.target.value)}
                  placeholder="123456/78/1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
                <p className="text-slate-500 text-xs mt-1.5">You can also submit this later during KYC verification.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Referral code <span className="text-slate-500">(optional)</span></label>
                <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="PHX-XXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
            </div>
          )}

          {/* ── STEP 3: Employment ───────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Employment &amp; income</h2>
                <p className="text-slate-400 text-sm mt-1">Helps us assess your loan eligibility.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Occupation</label>
                <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)}
                  placeholder="Civil Servant, Trader, Teacher…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Employer / Business name</label>
                <input type="text" value={employer} onChange={e => setEmployer(e.target.value)}
                  placeholder="Ministry of Education"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Monthly income (ZMW)</label>
                <input type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)}
                  placeholder="5000"
                  min="0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
            </div>
          )}

          {/* ── STEP 4: Security ─────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Create your password</h2>
                <p className="text-slate-400 text-sm mt-1">At least 8 characters. Choose something strong.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    autoComplete="new-password"
                  />
                </div>
                {confirm && password !== confirm && (
                  <p className="text-red-400 text-xs mt-1.5">Passwords do not match.</p>
                )}
              </div>

              {/* Password strength bar */}
              {password && (
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? "w-full bg-emerald-500" :
                        password.length >= 8 ? "w-2/3 bg-amber-500" : "w-1/3 bg-red-500"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                      ? "Strong password" : password.length >= 8 ? "Moderate — add numbers & capitals" : "Too short"}
                  </p>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 accent-amber-500 cursor-pointer"
                />
                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                  I agree to the{" "}
                  <Link to="/portal/terms" className="text-amber-500 hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link to="/portal/privacy" className="text-amber-500 hover:underline">Privacy Policy</Link>
                </span>
              </label>

              {apiError && (
                <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{apiError}</p>
              )}
            </div>
          )}

          {/* ── Navigation buttons ───────────────────────────────────────────── */}
          <div className={`mt-8 flex gap-3 ${step === 0 ? "justify-end" : "justify-between"}`}>
            {step > 0 && step < STEPS.length && (
              <button
                onClick={goBack}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}

            {/* Steps 1–3: Next button */}
            {step >= 1 && step < 4 && (
              <button
                onClick={goNext}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-colors"
              >
                Continue
              </button>
            )}

            {/* Step 4: Submit */}
            {step === 4 && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !agreed || !password || password !== confirm}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? (
                  <><RefreshCw size={16} className="animate-spin" /> Creating account…</>
                ) : (
                  <><CheckCircle size={16} /> Create account</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Login link */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/portal/login" className="text-amber-500 hover:text-amber-400 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
