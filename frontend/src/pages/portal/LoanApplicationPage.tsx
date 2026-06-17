import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, ArrowLeft, Shield, Star, Loader2 } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import { mockLoanProducts, type LoanProduct, type LoanProductRate } from "../../lib/mock-data";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";
import { portalApi } from "../../lib/api";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ACTIVE_PRODUCTS = mockLoanProducts.filter(p => p.isActive);

const PURPOSES = [
  "Business Working Capital", "Stock Purchase", "Equipment Purchase",
  "Medical Emergency", "School Fees / Tuition", "Salary Top-Up",
  "Home Improvement", "Agricultural Input", "Transport", "Other",
];

const STEPS = ["Product", "Details", "Employment", "Collateral", "References", "Review", "Submit"];

export default function LoanApplicationPage() {
  const navigate = useNavigate();
  const client = useClientAuthStore(s => s.client)!;
  const submitApplication = useLoanApplicationStore(s => s.submit);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [ref] = useState(`APP-${Date.now().toString().slice(-6)}`);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    productId: "",
    rateId: "",
    amount: "",
    purpose: "",
    description: "",
    occupation: "",
    employer: "",
    employerAddress: "",
    employerPhone: "",
    monthlyIncome: "",
    payDate: "",
    collateralType: "",
    collateralDescription: "",
    collateralValue: "",
    collateralCondition: "",
    collateralPhotos: [] as File[],
    ref1Name: "",
    ref1Phone: "",
    ref1Relationship: "",
    ref2Name: "",
    ref2Phone: "",
    ref2Relationship: "",
    agreeLoan: false,
    agreeAccurate: false,
  });

  const set = (k: string, v: string | boolean | File[]) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const selectedProduct: LoanProduct | undefined = ACTIVE_PRODUCTS.find(p => p.id === form.productId);
  const selectedRate: LoanProductRate | undefined = selectedProduct?.rates.find(r => r.id === form.rateId);
  const loanAmount = Number(form.amount) || 0;
  const totalRepayable = selectedRate ? loanAmount * (1 + selectedRate.interestRate / 100) : 0;
  const weeklyPayment = selectedRate ? totalRepayable / selectedRate.durationValue : 0;

  const handleProductSelect = (productId: string) => {
    const p = ACTIVE_PRODUCTS.find(x => x.id === productId);
    const firstRate = p?.rates.filter(r => r.isActive)[0];
    set("productId", productId);
    set("rateId", firstRate?.id ?? "");
    if (p) {
      const clamped = Math.min(Math.max(loanAmount || p.minAmount, p.minAmount), p.maxAmount);
      set("amount", clamped.toString());
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0 && !form.productId) e.productId = "Select a loan product to continue";
    if (step === 1) {
      if (!form.amount || loanAmount < (selectedProduct?.minAmount ?? 0)) e.amount = `Minimum is ${K(selectedProduct?.minAmount ?? 0)}`;
      if (loanAmount > (selectedProduct?.maxAmount ?? 0)) e.amount = `Maximum is ${K(selectedProduct?.maxAmount ?? 0)}`;
      if (!form.rateId) e.rateId = "Select a repayment period";
      if (!form.purpose) e.purpose = "Select a purpose";
    }
    if (step === 2) {
      if (!form.occupation) e.occupation = "Required";
      if (!form.monthlyIncome) e.monthlyIncome = "Required";
    }
    if (step === 4) {
      if (!form.ref1Name) e.ref1Name = "Reference name required";
      if (!form.ref1Phone) e.ref1Phone = "Phone required";
    }
    if (step === 5) {
      if (!form.agreeLoan) e.agreeLoan = "You must agree to the loan terms";
      if (!form.agreeAccurate) e.agreeAccurate = "You must confirm the information is accurate";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const next = async () => {
    if (!validate()) return;
    if (step < 5) {
      setStep(step + 1);
    } else if (step === 5) {
      setSubmitting(true);
      setSubmitError("");
      try {
        // Convert photos to base64 data URLs
        const photoBase64 = form.collateralPhotos.length > 0
          ? await Promise.all(form.collateralPhotos.map(toBase64))
          : [];

        await portalApi.submitApplication({
          productType: selectedProduct?.id ?? selectedProduct?.name ?? "",
          amountRequested: loanAmount,
          termMonths: selectedRate ? parseInt(selectedRate.displayLabel) || 1 : 1,
          purpose: form.purpose,
          occupation: form.occupation,
          employer: form.employer,
          employerPhone: form.employerPhone || undefined,
          monthlyIncome: Number(form.monthlyIncome) || undefined,
          payDate: form.payDate || undefined,
          collateralType: form.collateralType || undefined,
          collateralDesc: form.collateralDescription || undefined,
          collateralValue: Number(form.collateralValue) || undefined,
          collateralPhotos: photoBase64.length > 0 ? photoBase64 : undefined,
          ref1Name: form.ref1Name || undefined,
          ref1Phone: form.ref1Phone || undefined,
          ref1Relation: form.ref1Relationship || undefined,
          ref2Name: form.ref2Name || undefined,
          ref2Phone: form.ref2Phone || undefined,
          ref2Relation: form.ref2Relationship || undefined,
        });
        // Also save to local store for immediate UI
        submitApplication({
          ref,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          clientEmail: client.email,
          clientPhone: client.phone,
          productId: selectedProduct?.id ?? "",
          productName: selectedProduct?.name ?? "",
          rateDuration: selectedRate?.displayLabel ?? "",
          interestRate: selectedRate?.interestRate ?? 0,
          amount: loanAmount,
          totalRepayable,
          weeklyPayment,
          purpose: form.purpose,
          occupation: form.occupation,
          employer: form.employer,
          monthlyIncome: Number(form.monthlyIncome) || 0,
          collateralType: form.collateralType,
          collateralDescription: form.collateralDescription,
          collateralValue: Number(form.collateralValue) || 0,
          collateralCondition: form.collateralCondition,
          collateralPhotos: photoBase64,
          status: "PENDING",
        });
        setStep(6);
        setTimeout(() => setDone(true), 1600);
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : "Failed to submit application. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
        <p className="text-slate-400 mb-6">Your loan application has been received and is being reviewed.</p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left mb-6 space-y-3">
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Reference</span><span className="text-white font-mono text-sm">{ref}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Product</span><span className="text-slate-200 text-sm">{selectedProduct?.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Amount</span><span className="text-slate-200 text-sm">{K(loanAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Duration</span><span className="text-slate-200 text-sm">{selectedRate?.displayLabel}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Total Repayable</span><span className="text-emerald-400 font-semibold text-sm">{K(totalRepayable)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500 text-sm">Status</span><span className="text-amber-400 text-sm font-semibold">Under Review</span></div>
        </div>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300 mb-6">
          A Philix Finance Loan Officer will contact you within 24–48 hours to discuss your application.
        </div>
        <button onClick={() => navigate("/portal/dashboard")} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Apply for a Loan</h1>
        <p className="text-slate-500 text-sm mt-1">Complete all steps to submit your application</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
              i < step ? "bg-emerald-900/40 text-emerald-400" :
              i === step ? "bg-indigo-600 text-white" :
              "text-slate-600"
            }`}>
              {i < step ? <CheckCircle size={10} /> : <span className="text-[10px]">{i + 1}</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && <div className={`w-3 h-px ${i < step ? "bg-emerald-600" : "bg-slate-800"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

        {/* Step 0: Product Selection */}
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-white mb-4">Choose Your Loan Product</h3>
            {ACTIVE_PRODUCTS.map(p => {
              const activeRates = p.rates.filter(r => r.isActive);
              const isSelected = form.productId === p.id;
              const isLoyalty = p.productType === "LOYALTY";
              const isPremium = p.productType === "PREMIUM";
              return (
                <button key={p.id} onClick={() => handleProductSelect(p.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? "border-indigo-500 bg-indigo-600/10" : "border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-600"}`} />
                        <span className="font-semibold text-slate-200 text-sm">{p.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 ml-5 mb-2">{p.description}</p>
                      <div className="flex flex-wrap gap-2 ml-5 text-xs">
                        <span className="text-slate-500">{K(p.minAmount)} – {K(p.maxAmount)}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-500">{activeRates.length} term{activeRates.length !== 1 ? "s" : ""}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-indigo-400 font-semibold">
                          {activeRates[0]?.interestRate}%–{activeRates[activeRates.length - 1]?.interestRate}% flat
                        </span>
                      </div>
                      {p.eligibilityRules && (
                        <div className="ml-5 mt-2 text-[10px] text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                          <Star size={9} />
                          {p.eligibilityRules.minRepaidLoans}+ repaid loans required · 0 defaults
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {isPremium && <span className="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/50">Premium</span>}
                      {isLoyalty && <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/50">Loyalty</span>}
                      {p.productType === "ELECTRONICS_EQUITY" && <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800/50">60% LTV</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {errors.productId && <p className="text-red-400 text-xs">{errors.productId}</p>}
          </div>
        )}

        {/* Step 1: Loan Details */}
        {step === 1 && selectedProduct && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-2">Loan Details</h3>
            <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-xl p-3 text-xs text-slate-400">
              <span className="text-indigo-400 font-semibold">{selectedProduct.name}</span> · {K(selectedProduct.minAmount)} – {K(selectedProduct.maxAmount)}
              {selectedProduct.processingFee === 0 && <span className="ml-2 text-emerald-400">· No processing fee</span>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Loan Amount (K) *</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                placeholder={`Min ${K(selectedProduct.minAmount)}`}
                value={form.amount}
                onChange={e => set("amount", e.target.value)}
              />
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>Min {K(selectedProduct.minAmount)}</span>
                <span>Max {K(selectedProduct.maxAmount)}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Repayment Period *</label>
              <div className="grid grid-cols-4 gap-2">
                {selectedProduct.rates.filter(r => r.isActive).map(r => (
                  <button key={r.id} type="button"
                    onClick={() => set("rateId", r.id)}
                    className={`py-3 rounded-xl text-center border transition-all ${form.rateId === r.id ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-600"}`}>
                    <div className={`text-base font-black ${form.rateId === r.id ? "text-white" : "text-slate-300"}`}>{r.durationValue}</div>
                    <div className="text-[9px]">Week{r.durationValue > 1 ? "s" : ""}</div>
                    <div className={`text-xs font-bold mt-0.5 ${form.rateId === r.id ? "text-indigo-200" : "text-indigo-400"}`}>{r.interestRate}%</div>
                  </button>
                ))}
              </div>
              {errors.rateId && <p className="text-red-400 text-xs mt-1">{errors.rateId}</p>}
            </div>
            {selectedRate && loanAmount >= selectedProduct.minAmount && (
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-3 space-y-1">
                <div className="text-xs text-emerald-400 font-semibold mb-2">Repayment Summary</div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Principal</span>
                  <span className="text-slate-300 font-mono">{K(loanAmount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Interest ({selectedRate.interestRate}% flat)</span>
                  <span className="text-slate-300 font-mono">{K(loanAmount * selectedRate.interestRate / 100)}</span>
                </div>
                <div className="h-px bg-slate-800 my-1" />
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400 font-semibold">Total Repayable</span>
                  <span className="text-emerald-300 font-bold font-mono">{K(totalRepayable)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Per Week (÷{selectedRate.durationValue})</span>
                  <span className="text-slate-300 font-mono">{K(weeklyPayment)}</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Purpose *</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.purpose}
                onChange={e => set("purpose", e.target.value)}
              >
                <option value="">Select purpose</option>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
              {errors.purpose && <p className="text-red-400 text-xs mt-1">{errors.purpose}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Brief Description</label>
              <textarea
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 resize-none"
                placeholder="Describe how you will use this loan..."
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Employment */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-2">Employment & Income</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Occupation *</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.occupation}
                onChange={e => set("occupation", e.target.value)}
              >
                <option value="">Select</option>
                {["Civil Servant","Private Sector Employee","Self-Employed","Market Trader","Teacher","Healthcare Worker","Student","Other"].map(o => <option key={o}>{o}</option>)}
              </select>
              {errors.occupation && <p className="text-red-400 text-xs mt-1">{errors.occupation}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Employer / Business Name</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                placeholder="e.g. Ministry of Health"
                value={form.employer}
                onChange={e => set("employer", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Employer / Business Address</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                placeholder="Office or business address"
                value={form.employerAddress}
                onChange={e => set("employerAddress", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monthly Income (K) *</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                  placeholder="5000"
                  value={form.monthlyIncome}
                  onChange={e => set("monthlyIncome", e.target.value)}
                />
                {errors.monthlyIncome && <p className="text-red-400 text-xs mt-1">{errors.monthlyIncome}</p>}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Pay Date</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.payDate}
                  onChange={e => set("payDate", e.target.value)}
                >
                  <option value="">Select day</option>
                  {["25th","26th","27th","28th","Last day","1st","5th","Other"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Collateral */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-2">Collateral Information</h3>
            <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2">
              <Shield size={12} className="flex-shrink-0 mt-0.5" />
              <span>All Philix Finance loans require collateral. A loan officer will assess your item in person. LTV is based on collateral condition (Excellent 70% · Good 60% · Fair 50% · Poor 40%).</span>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Collateral Type</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.collateralType}
                onChange={e => set("collateralType", e.target.value)}
              >
                <option value="">Select type</option>
                {["Smartphone","Laptop / Computer","TV / Screen","Fridge / Freezer","Motor Vehicle","Land Title","Business Equipment","Furniture","Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Item Condition</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.collateralCondition}
                onChange={e => set("collateralCondition", e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent — Like new, fully functional</option>
                <option value="good">Good — Lightly used, minor cosmetic wear</option>
                <option value="fair">Fair — Visible wear, functioning with minor issues</option>
                <option value="poor">Poor — Heavy wear, significant issues</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                placeholder="e.g. Samsung 50-inch Smart TV, Model QA50"
                value={form.collateralDescription}
                onChange={e => set("collateralDescription", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Estimated Market Value (K)</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                placeholder="3000"
                value={form.collateralValue}
                onChange={e => set("collateralValue", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Photos (optional — upload later via Submit Collateral)</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-6 cursor-pointer hover:border-indigo-600 transition-all">
                <div className="text-3xl mb-2">📸</div>
                <div className="text-sm text-slate-400">Tap to upload photos</div>
                <div className="text-xs text-slate-600 mt-1">JPEG, PNG — max 5MB each</div>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => set("collateralPhotos", Array.from(e.target.files ?? []))} />
              </label>
              {form.collateralPhotos.length > 0 && (
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={12} /> {form.collateralPhotos.length} photo{form.collateralPhotos.length > 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: References */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-2">Personal References</h3>
            <div className="text-xs text-slate-500">Provide two personal references who can vouch for your character (not family members).</div>
            {[
              { prefix: "ref1", label: "Reference 1 *" },
              { prefix: "ref2", label: "Reference 2 (optional)" },
            ].map(r => (
              <div key={r.prefix} className="bg-slate-800/40 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-400">{r.label}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Full Name</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                      placeholder="Reference name"
                      value={(form as unknown as Record<string, string>)[`${r.prefix}Name`]}
                      onChange={e => set(`${r.prefix}Name`, e.target.value)}
                    />
                    {errors[`${r.prefix}Name`] && <p className="text-red-400 text-xs mt-1">{errors[`${r.prefix}Name`]}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                      placeholder="+260 97..."
                      value={(form as unknown as Record<string, string>)[`${r.prefix}Phone`]}
                      onChange={e => set(`${r.prefix}Phone`, e.target.value)}
                    />
                    {errors[`${r.prefix}Phone`] && <p className="text-red-400 text-xs mt-1">{errors[`${r.prefix}Phone`]}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Relationship</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={(form as unknown as Record<string, string>)[`${r.prefix}Relationship`]}
                    onChange={e => set(`${r.prefix}Relationship`, e.target.value)}
                  >
                    <option value="">Select</option>
                    {["Employer","Colleague","Neighbour","Friend","Church Member","Community Leader"].map(rel => <option key={rel}>{rel}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-2">Review Your Application</h3>
            <div className="space-y-0">
              {[
                { label: "Applicant",        value: `${client.firstName} ${client.lastName} (${client.clientNumber})` },
                { label: "Product",          value: selectedProduct?.name ?? "—" },
                { label: "Amount",           value: K(loanAmount) },
                { label: "Duration",         value: selectedRate?.displayLabel ?? "—" },
                { label: "Interest Rate",    value: selectedRate ? `${selectedRate.interestRate}% flat` : "—" },
                { label: "Total Repayable",  value: K(totalRepayable) },
                { label: "Per Week",         value: selectedRate ? K(weeklyPayment) : "—" },
                { label: "Purpose",          value: form.purpose || "—" },
                { label: "Employment",       value: form.occupation || "—" },
                { label: "Monthly Income",   value: form.monthlyIncome ? `K${Number(form.monthlyIncome).toLocaleString()}` : "—" },
                { label: "Collateral",       value: form.collateralType ? `${form.collateralType}${form.collateralCondition ? ` (${form.collateralCondition})` : ""} — ${form.collateralValue ? K(Number(form.collateralValue)) : "not valued"}` : "None declared" },
              ].map(r => (
                <div key={r.label} className="flex items-start justify-between gap-3 py-2 border-b border-slate-800 last:border-0">
                  <span className="text-sm text-slate-500 flex-shrink-0">{r.label}</span>
                  <span className="text-sm text-slate-200 text-right">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 pt-2">
              {[
                { k: "agreeLoan", label: "I have read and agree to the Loan Terms & Conditions" },
                { k: "agreeAccurate", label: "I confirm that all information provided is accurate and complete" },
              ].map(cb => (
                <div key={cb.k}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" id={cb.k}
                      checked={(form as unknown as Record<string, boolean>)[cb.k]}
                      onChange={e => set(cb.k, e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
                    />
                    <label htmlFor={cb.k} className="text-sm text-slate-400">{cb.label}</label>
                  </div>
                  {errors[cb.k] && <p className="text-red-400 text-xs mt-1 ml-7">{errors[cb.k]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Submitting */}
        {step === 6 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <div className="text-slate-300 font-medium">Submitting your application...</div>
            <div className="text-xs text-slate-500 mt-1">Please wait a moment</div>
          </div>
        )}

        {/* Nav buttons */}
        {step < 6 && (
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:text-slate-200">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {submitError && (
              <div className="w-full flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-xs text-red-300">
                <AlertCircle size={14} className="flex-shrink-0" />
                {submitError}
              </div>
            )}
            <button onClick={next} disabled={submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : step === 5 ? "Submit Application →" : step === 3 ? "Continue (Skip if no collateral yet)" : "Continue →"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-2">
            <button onClick={() => setStep(4)} className="w-full text-sm text-slate-500 hover:text-slate-400 py-1">
              Skip collateral step →
            </button>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-500">
        <AlertCircle size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
        False information on this application may result in legal action under the Banking and Financial Services Act of Zambia.
      </div>
    </div>
  );
}
