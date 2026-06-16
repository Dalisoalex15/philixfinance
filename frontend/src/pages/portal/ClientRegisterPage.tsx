import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, Eye, EyeOff, ArrowLeft, User, Phone, Briefcase, Lock } from "lucide-react";
import PhilixLogo from "../../components/ui/PhilixLogo";
import { useClientAuthStore } from "../../store/clientAuth";

const STEPS = ["Personal", "Identity", "Employment", "Security"];

export default function ClientRegisterPage() {
  const navigate = useNavigate();
  const registerWithApi = useClientAuthStore(s => s.registerWithApi);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  const [form, setForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", gender: "",
    email: "", phone: "", address: "", city: "",
    nrcNumber: "", nrcFront: null as File | null, nrcBack: null as File | null, selfie: null as File | null,
    occupation: "", employer: "", monthlyIncome: "",
    password: "", confirmPassword: "", agreeTerms: false,
  });

  const set = (key: string, value: string | boolean | File | null) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.firstName) e.firstName = "Required";
      if (!form.lastName) e.lastName = "Required";
      if (!form.dateOfBirth) e.dateOfBirth = "Required";
      if (!form.gender) e.gender = "Required";
      if (!form.email.includes("@")) e.email = "Valid email required";
      if (form.phone.length < 10) e.phone = "Valid phone required";
      if (!form.address) e.address = "Required";
    }
    if (step === 1) {
      if (form.nrcNumber.length < 8) e.nrcNumber = "Enter a valid NRC number";
    }
    if (step === 2) {
      if (!form.occupation) e.occupation = "Required";
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

  const next = async () => {
    if (!validate()) return;
    if (step < 3) { setStep(step + 1); }
    else {
      setApiError("");
      try {
        await registerWithApi({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          nrcNumber: form.nrcNumber || undefined,
          occupation: form.occupation || undefined,
          employer: form.employer || undefined,
          monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
        });
        setDone(true);
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      }
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
          <p className="text-slate-400 mb-6">Welcome to Philix Finance, <span className="text-white font-semibold">{form.firstName}</span>! Your account is ready.</p>
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 mb-6 text-left">
            <div className="text-xs font-semibold text-amber-400 mb-2">Next Steps</div>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2"><span className="text-amber-400">1.</span> Complete KYC identity verification</div>
              <div className="flex items-center gap-2"><span className="text-amber-400">2.</span> Submit your collateral for assessment</div>
              <div className="flex items-center gap-2"><span className="text-amber-400">3.</span> Apply for your first loan</div>
            </div>
          </div>
          <button onClick={() => navigate("/portal/dashboard")} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
        <Link to="/portal">
          <PhilixLogo variant="full" size="sm" />
        </Link>
        <Link to="/portal/login" className="text-sm text-slate-500 hover:text-slate-300">Already registered? Sign in</Link>
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
                <div className={`h-1 w-full rounded-full transition-all ${i <= step ? "bg-indigo-500" : "bg-slate-800"}`} />
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

          {apiError && (
            <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-3 flex items-center gap-2 text-red-300 text-sm">
              {apiError}
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            {/* Step 0 — Personal */}
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
                        placeholder={f.p} value={(form as unknown as Record<string, string>)[f.k]} onChange={e => set(f.k, e.target.value)} />
                      {errors[f.k] && <p className="text-red-400 text-xs mt-1">{errors[f.k]}</p>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Date of Birth *</label>
                    <input type="date" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} />
                    {errors.dateOfBirth && <p className="text-red-400 text-xs mt-1">{errors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Gender *</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.gender} onChange={e => set("gender", e.target.value)}>
                      <option value="">Select</option>
                      <option>MALE</option><option>FEMALE</option>
                    </select>
                    {errors.gender && <p className="text-red-400 text-xs mt-1">{errors.gender}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Email Address *</label>
                  <input type="email" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="your@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Phone Number *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="+260 97 XXX XXXX" value={form.phone} onChange={e => set("phone", e.target.value)} />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Physical Address *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="House No, Street, Area" value={form.address} onChange={e => set("address", e.target.value)} />
                  {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">City / Town</label>
                  <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.city} onChange={e => set("city", e.target.value)}>
                    <option value="">Select city</option>
                    {["Lusaka","Kitwe","Ndola","Livingstone","Chipata","Solwezi","Kabwe","Kasama"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Step 1 — Identity */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Phone size={16} className="text-indigo-400" />
                  <h3 className="font-bold text-white">Identity Verification (KYC)</h3>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">NRC Number *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 font-mono tracking-wider"
                    placeholder="000000/00/0" value={form.nrcNumber} onChange={e => set("nrcNumber", e.target.value)} />
                  {errors.nrcNumber && <p className="text-red-400 text-xs mt-1">{errors.nrcNumber}</p>}
                </div>
                {[
                  { key: "nrcFront", label: "NRC — Front Side", hint: "Clear photo of the front of your NRC card" },
                  { key: "nrcBack", label: "NRC — Back Side", hint: "Clear photo of the back of your NRC card" },
                  { key: "selfie", label: "Selfie with NRC", hint: "Hold your NRC next to your face, both clearly visible" },
                ].map(upload => (
                  <div key={upload.key}>
                    <label className="text-xs text-slate-400 mb-1 block">{upload.label}</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${(form as unknown as Record<string, File | null>)[upload.key] ? "border-emerald-600 bg-emerald-900/10" : "border-slate-700 hover:border-indigo-600 hover:bg-indigo-900/10"}`}>
                      {(form as unknown as Record<string, File | null>)[upload.key] ? (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle size={16} />
                          <span className="text-sm font-medium">{((form as unknown as Record<string, File | null>)[upload.key] as File).name}</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl mb-2">📷</div>
                          <div className="text-sm text-slate-400 font-medium">Tap to upload photo</div>
                          <div className="text-xs text-slate-600 mt-1">{upload.hint}</div>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => set(upload.key, e.target.files?.[0] || null)} />
                    </label>
                  </div>
                ))}
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300">
                  Your documents are encrypted and only accessible to authorised Philix Finance staff for verification purposes.
                </div>
              </div>
            )}

            {/* Step 2 — Employment */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={16} className="text-indigo-400" />
                  <h3 className="font-bold text-white">Employment & Income</h3>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Occupation / Status *</label>
                  <select className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.occupation} onChange={e => set("occupation", e.target.value)}>
                    <option value="">Select occupation</option>
                    {["Student","Civil Servant","Private Sector Employee","Self-Employed / Business Owner","Market Trader","Teacher","Nurse / Healthcare","Other"].map(o => <option key={o}>{o}</option>)}
                  </select>
                  {errors.occupation && <p className="text-red-400 text-xs mt-1">{errors.occupation}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Employer / School / Business Name</label>
                  <input className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="e.g. UNZA, Ministry of Health, My Shop Ltd" value={form.employer} onChange={e => set("employer", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Monthly Income / Revenue (K) *</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="e.g. 5000" value={form.monthlyIncome} onChange={e => set("monthlyIncome", e.target.value)} />
                  {errors.monthlyIncome && <p className="text-red-400 text-xs mt-1">{errors.monthlyIncome}</p>}
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500">
                  This information helps us determine your loan eligibility and limit. You may be asked to provide a payslip or bank statement.
                </div>
              </div>
            )}

            {/* Step 3 — Security */}
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
                      placeholder="Min 8 characters" value={form.password} onChange={e => set("password", e.target.value)} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Confirm Password *</label>
                  <input type="password" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    placeholder="Re-enter password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} />
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="terms" checked={form.agreeTerms} onChange={e => set("agreeTerms", e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0" />
                  <label htmlFor="terms" className="text-sm text-slate-400">
                    I agree to Philix Finance's{" "}
                    <button type="button" className="text-indigo-400 hover:underline">Terms of Service</button>{" "}
                    and{" "}
                    <button type="button" className="text-indigo-400 hover:underline">Privacy Policy</button>
                  </label>
                </div>
                {errors.agreeTerms && <p className="text-red-400 text-xs">{errors.agreeTerms}</p>}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-4 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:text-slate-200">
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <button onClick={next} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                {step === 3 ? "Create Account ✓" : "Continue →"}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/portal/login" className="text-sm text-slate-500 hover:text-slate-400">Already have an account? Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
