import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, AlertCircle, ArrowLeft, Shield, Star, Loader2,
  TrendingUp, AlertTriangle, Info, Camera,
} from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import { mockLoanProducts, type LoanProduct, type LoanProductRate } from "../../lib/mock-data";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";
import { portalApi } from "../../lib/api";
import {
  assessCollateral, K, SCORE_LABEL, SCORE_COLOR, COVERAGE_COLOR, COVERAGE_LABEL, REPOSSESSION_COLOR,
} from "../../lib/collateralEngine";

const ACTIVE_PRODUCTS = mockLoanProducts.filter(p => p.isActive);

const PURPOSES = [
  "Business Working Capital", "Stock Purchase", "Equipment Purchase",
  "Medical Emergency", "School Fees / Tuition", "Salary Top-Up",
  "Home Improvement", "Agricultural Input", "Transport", "Other",
];

const EMPLOYMENT_TYPES = [
  { value: "PERMANENT", label: "Permanent Civil Servant" },
  { value: "CONTRACT", label: "Contract / Temporary Government" },
  { value: "PRIVATE", label: "Private Sector Employee" },
  { value: "SELF_EMPLOYED", label: "Self-Employed / Business Owner" },
  { value: "STUDENT", label: "Student" },
  { value: "CASUAL", label: "Casual / Piece Worker" },
  { value: "UNEMPLOYED", label: "Currently Unemployed" },
];

const COLLATERAL_TYPES = [
  "Smartphone", "Laptop / Computer", "Tablet", "Desktop Computer", "Gaming Console",
  "Television (Smart TV)", "Refrigerator / Freezer", "Furniture Set",
  "Motor Vehicle (Car/Truck/Minibus)", "Motorcycle",
  "Land Title", "Residential Property", "Farm / Agricultural Land",
  "Fixed Deposit / Savings Account", "Shares / Investment",
  "Salary Deduction Agreement", "Employer Undertaking",
  "Stock Inventory", "Business Machinery", "Generator",
  "Other Electronic Device", "Other Household Asset", "Other",
];

const STEPS = ["Product", "Loan Details", "Personal & Employment", "Collateral", "Guarantor & Refs", "Review"];

// ── Input helpers ─────────────────────────────────────────────────────────────
const inputCls = "w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600";
const labelCls = "text-xs text-slate-400 mb-1 block";

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function LoanApplicationPage() {
  const navigate = useNavigate();
  const client = useClientAuthStore(s => s.client)!;
  const submitApplication = useLoanApplicationStore(s => s.submit);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [ref] = useState(`PHX-${Math.floor(1000 + Math.random() * 9000)}`);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    // Step 0: Product
    productId: "", rateId: "", amount: "",
    // Step 1: Loan Details
    purpose: "", description: "",
    // Step 2: Personal & Employment
    nrcNumber: "", physicalAddress: "",
    employmentType: "", employer: "", employerAddress: "", employerPhone: "",
    department: "", payrollNumber: "", yearsInService: "",
    monthlyIncome: "", netSalaryAvailable: "", existingLoanDeductions: "", payDate: "",
    occupation: "",
    studentInstitution: "", studentSponsor: "", studentGradYear: "",
    // Step 3: Collateral
    collateralType: "", collateralDescription: "", collateralValue: "",
    collateralCondition: "", collateralYear: "", collateralSerial: "",
    collateralOwner: "SELF", collateralOwnerName: "",
    hasOwnershipDocs: false, hasInsurance: false,
    collateralPhotos: [] as File[],
    // Step 4: Guarantor & References
    guarantorName: "", guarantorPhone: "", guarantorEmployer: "", guarantorRelation: "",
    ref1Name: "", ref1Phone: "", ref1Relationship: "",
    ref2Name: "", ref2Phone: "", ref2Relationship: "",
    // Step 5: Agreements
    agreeLoan: false, agreeAccurate: false,
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

  // Real-time risk assessment (preview before submission)
  const assessment = useMemo(() => {
    if (!loanAmount || loanAmount <= 0) return null;
    return assessCollateral({
      collateralType: form.collateralType,
      collateralValue: Number(form.collateralValue) || 0,
      collateralCondition: form.collateralCondition,
      collateralYear: form.collateralYear || undefined,
      collateralSerial: form.collateralSerial || undefined,
      collateralOwner: form.collateralOwner === "SELF" ? "SELF" : form.collateralOwnerName,
      hasOwnershipDocs: form.hasOwnershipDocs,
      hasInsurance: form.hasInsurance,
      collateralPhotos: form.collateralPhotos,
      amountRequested: loanAmount,
      termMonths: selectedRate?.durationValue ?? 1,
      interestRate: selectedRate?.interestRate ?? 35,
      monthlyIncome: Number(form.monthlyIncome) || 0,
      netSalaryAvailable: Number(form.netSalaryAvailable) || 0,
      employmentType: form.employmentType,
      guarantorName: form.guarantorName || undefined,
      ref1Name: form.ref1Name || undefined,
    });
  }, [form.collateralType, form.collateralValue, form.collateralCondition, form.collateralYear,
      form.collateralSerial, form.collateralOwner, form.collateralOwnerName, form.hasOwnershipDocs,
      form.hasInsurance, form.collateralPhotos, loanAmount, selectedRate,
      form.monthlyIncome, form.netSalaryAvailable, form.employmentType,
      form.guarantorName, form.ref1Name]);

  const isCivilServant = form.employmentType === "PERMANENT" || form.employmentType === "CONTRACT";
  const isStudent = form.employmentType === "STUDENT";

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
      if (!form.nrcNumber) e.nrcNumber = "NRC number is required";
      if (!form.physicalAddress) e.physicalAddress = "Physical address is required";
      if (!form.employmentType) e.employmentType = "Select your employment type";
      if (!form.monthlyIncome) e.monthlyIncome = "Monthly income is required";
    }
    if (step === 3) {
      if (!form.collateralType) e.collateralType = "Select a collateral type";
      if (!form.collateralDescription) e.collateralDescription = "Describe the item";
      if (!form.collateralValue) e.collateralValue = "Enter the estimated market value";
      if (!form.collateralCondition) e.collateralCondition = "Select item condition";
    }
    if (step === 4) {
      if (!form.ref1Name) e.ref1Name = "At least one reference is required";
      if (!form.ref1Phone) e.ref1Phone = "Reference phone number is required";
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
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const next = async () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setSubmitting(true);
      setSubmitError("");
      try {
        const photoBase64 = form.collateralPhotos.length > 0
          ? await Promise.all(form.collateralPhotos.map(toBase64))
          : [];

        await portalApi.submitApplication({
          productType: selectedProduct?.id ?? selectedProduct?.name ?? "",
          amountRequested: loanAmount,
          termMonths: selectedRate?.durationValue ?? 1,
          interestRate: selectedRate?.interestRate ?? 35,
          purpose: form.purpose,
          description: form.description || undefined,
          occupation: form.occupation || form.employmentType || undefined,
          employer: form.employer || undefined,
          employerPhone: form.employerPhone || undefined,
          monthlyIncome: Number(form.monthlyIncome) || undefined,
          payDate: form.payDate || undefined,
          collateralType: form.collateralType || undefined,
          collateralDesc: form.collateralDescription || undefined,
          collateralValue: Number(form.collateralValue) || undefined,
          collateralCondition: form.collateralCondition || undefined,
          collateralPhotos: photoBase64.length > 0 ? photoBase64 : undefined,
          ref1Name: form.ref1Name || undefined,
          ref1Phone: form.ref1Phone || undefined,
          ref1Relation: form.ref1Relationship || undefined,
          ref2Name: form.ref2Name || undefined,
          ref2Phone: form.ref2Phone || undefined,
          ref2Relation: form.ref2Relationship || undefined,
          // New fields
          nrcNumber: form.nrcNumber || undefined,
          physicalAddress: form.physicalAddress || undefined,
          employmentType: form.employmentType || undefined,
          payrollNumber: form.payrollNumber || undefined,
          department: form.department || undefined,
          yearsInService: form.yearsInService || undefined,
          netSalaryAvailable: Number(form.netSalaryAvailable) || undefined,
          existingLoanDeductions: Number(form.existingLoanDeductions) || undefined,
          collateralYear: form.collateralYear || undefined,
          collateralSerial: form.collateralSerial || undefined,
          collateralOwner: form.collateralOwner === "SELF" ? "SELF" : form.collateralOwnerName || undefined,
          hasOwnershipDocs: form.hasOwnershipDocs,
          hasInsurance: form.hasInsurance,
          guarantorName: form.guarantorName || undefined,
          guarantorPhone: form.guarantorPhone || undefined,
          guarantorEmployer: form.guarantorEmployer || undefined,
          guarantorRelation: form.guarantorRelation || undefined,
          studentInstitution: form.studentInstitution || undefined,
          studentSponsor: form.studentSponsor || undefined,
          studentGradYear: form.studentGradYear || undefined,
        } as Parameters<typeof portalApi.submitApplication>[0]);

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
          occupation: form.employmentType || form.occupation,
          employer: form.employer,
          monthlyIncome: Number(form.monthlyIncome) || 0,
          collateralType: form.collateralType,
          collateralDescription: form.collateralDescription,
          collateralValue: Number(form.collateralValue) || 0,
          collateralCondition: form.collateralCondition,
          collateralPhotos: photoBase64,
          status: "PENDING",
        });
        setTimeout(() => setDone(true), 800);
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
        setSubmitting(false);
      }
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
        <p className="text-slate-400 mb-2">Your loan application has been received and auto-assessed.</p>
        {assessment && (
          <div className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${
            assessment.riskCategory === "EXCELLENT" ? "bg-emerald-900/30 border-emerald-800/40 text-emerald-400" :
            assessment.riskCategory === "GOOD" ? "bg-blue-900/30 border-blue-800/40 text-blue-400" :
            assessment.riskCategory === "MODERATE" ? "bg-amber-900/30 border-amber-800/40 text-amber-400" :
            "bg-red-900/30 border-red-800/40 text-red-400"
          }`}>
            <TrendingUp size={14} />
            Risk Score: {assessment.overallScore}/100 — {SCORE_LABEL[assessment.riskCategory]}
          </div>
        )}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left mb-6 space-y-2.5">
          {[
            ["Reference", ref],
            ["Product", selectedProduct?.name ?? "—"],
            ["Amount", K(loanAmount)],
            ["Duration", selectedRate?.displayLabel ?? "—"],
            ["Total Repayable", K(totalRepayable)],
            ["Status", "Under Review"],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-slate-500 text-sm">{l}</span>
              <span className={`text-sm font-medium ${l === "Status" ? "text-amber-400" : l === "Total Repayable" ? "text-emerald-400" : "text-slate-200"}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-300 mb-6">
          A Philix Finance Loan Officer will contact you within 24–48 hours. Check Notifications for updates.
        </div>
        <button onClick={() => navigate("/portal/dashboard")} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="max-w-lg mx-auto text-center py-24">
        <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <div className="text-slate-300 font-medium">Submitting and assessing your application…</div>
        <div className="text-xs text-slate-500 mt-1">Running risk assessment</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Apply for a Loan</h1>
        <p className="text-slate-500 text-sm mt-1">Complete all steps — your application is auto-assessed on submission</p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              i < step ? "bg-emerald-900/40 text-emerald-400" :
              i === step ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30" :
              "text-slate-600"
            }`}>
              {i < step ? <CheckCircle size={10} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && <div className={`w-3 h-px ${i < step ? "bg-emerald-600" : "bg-slate-800"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

        {/* ── Step 0: Product ── */}
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-white mb-4">Choose Your Loan Product</h3>
            {ACTIVE_PRODUCTS.map(p => {
              const activeRates = p.rates.filter(r => r.isActive);
              const isSelected = form.productId === p.id;
              return (
                <button key={p.id} onClick={() => handleProductSelect(p.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? "border-indigo-500 bg-indigo-600/10" : "border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1 ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-600"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-semibold text-slate-200 text-sm">{p.name}</span>
                        {p.productType === "PREMIUM" && <span className="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/50">Premium</span>}
                        {p.productType === "LOYALTY" && <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/50">Loyalty</span>}
                      </div>
                      <p className="text-xs text-slate-500 mb-1.5">{p.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-slate-500">{K(p.minAmount)} – {K(p.maxAmount)}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-indigo-400 font-semibold">{activeRates[0]?.interestRate}–{activeRates.at(-1)?.interestRate}% flat</span>
                      </div>
                      {p.eligibilityRules && (
                        <div className="mt-1.5 text-[10px] text-amber-400 bg-amber-900/20 border border-amber-800/30 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                          <Star size={9} /> {p.eligibilityRules.minRepaidLoans}+ repaid loans required
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {errors.productId && <p className="text-red-400 text-xs">{errors.productId}</p>}
          </div>
        )}

        {/* ── Step 1: Loan Details ── */}
        {step === 1 && selectedProduct && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-2">Loan Details</h3>
            <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-xl p-3 text-xs text-slate-400">
              <span className="text-indigo-400 font-semibold">{selectedProduct.name}</span> · {K(selectedProduct.minAmount)} – {K(selectedProduct.maxAmount)}
            </div>
            <Field label="Loan Amount (K) *" error={errors.amount}>
              <input type="number" className={inputCls} placeholder={`Min ${K(selectedProduct.minAmount)}`}
                value={form.amount} onChange={e => set("amount", e.target.value)} />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>Min {K(selectedProduct.minAmount)}</span><span>Max {K(selectedProduct.maxAmount)}</span>
              </div>
            </Field>
            <div>
              <label className={labelCls}>Repayment Period *</label>
              <div className="grid grid-cols-4 gap-2">
                {selectedProduct.rates.filter(r => r.isActive).map(r => (
                  <button key={r.id} type="button" onClick={() => set("rateId", r.id)}
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
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-3 space-y-1.5">
                <div className="text-xs text-emerald-400 font-semibold mb-1.5">Repayment Summary</div>
                {[
                  ["Principal", K(loanAmount)],
                  [`Interest (${selectedRate.interestRate}% flat)`, K(loanAmount * selectedRate.interestRate / 100)],
                  ["Total Repayable", K(totalRepayable)],
                  [`Per Week (÷${selectedRate.durationValue})`, K(weeklyPayment)],
                ].map(([l, v]) => (
                  <div key={l} className={`flex justify-between text-xs ${l === "Total Repayable" ? "border-t border-emerald-900/40 pt-1 text-sm" : ""}`}>
                    <span className={l === "Total Repayable" ? "text-emerald-400 font-semibold" : "text-slate-500"}>{l}</span>
                    <span className={`font-mono ${l === "Total Repayable" ? "text-emerald-300 font-bold" : "text-slate-300"}`}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <Field label="Purpose *" error={errors.purpose}>
              <select className={inputCls} value={form.purpose} onChange={e => set("purpose", e.target.value)}>
                <option value="">Select purpose</option>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Brief Description (optional)">
              <textarea rows={2} className={inputCls + " resize-none"} placeholder="How will you use this loan?"
                value={form.description} onChange={e => set("description", e.target.value)} />
            </Field>
          </div>
        )}

        {/* ── Step 2: Personal & Employment ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-1">Personal & Employment Information</h3>
            <p className="text-xs text-slate-500 mb-3">This information is used for identity verification and repayment capacity assessment.</p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="NRC Number *" error={errors.nrcNumber}>
                <input className={inputCls} placeholder="e.g. 123456/78/1" value={form.nrcNumber}
                  onChange={e => set("nrcNumber", e.target.value)} />
              </Field>
              <Field label="Employment Type *" error={errors.employmentType}>
                <select className={inputCls} value={form.employmentType} onChange={e => set("employmentType", e.target.value)}>
                  <option value="">Select</option>
                  {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Physical Address (where you live) *" error={errors.physicalAddress}>
              <input className={inputCls} placeholder="e.g. Plot 15, Kabulonga, Lusaka"
                value={form.physicalAddress} onChange={e => set("physicalAddress", e.target.value)} />
            </Field>

            {isStudent ? (
              <>
                <div className="h-px bg-slate-800" />
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Institution / University">
                    <input className={inputCls} placeholder="e.g. UNZA, CBU" value={form.studentInstitution}
                      onChange={e => set("studentInstitution", e.target.value)} />
                  </Field>
                  <Field label="Expected Graduation Year">
                    <input className={inputCls} type="number" placeholder="2026" value={form.studentGradYear}
                      onChange={e => set("studentGradYear", e.target.value)} />
                  </Field>
                </div>
                <Field label="Sponsor / Parent Name">
                  <input className={inputCls} placeholder="Who sponsors your education?" value={form.studentSponsor}
                    onChange={e => set("studentSponsor", e.target.value)} />
                </Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Employer / Business Name">
                    <input className={inputCls} placeholder="e.g. Ministry of Health"
                      value={form.employer} onChange={e => set("employer", e.target.value)} />
                  </Field>
                  <Field label="Employer Phone">
                    <input className={inputCls} placeholder="+260 97..."
                      value={form.employerPhone} onChange={e => set("employerPhone", e.target.value)} />
                  </Field>
                </div>
                {isCivilServant && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ministry / Department">
                      <input className={inputCls} placeholder="e.g. Ministry of Finance"
                        value={form.department} onChange={e => set("department", e.target.value)} />
                    </Field>
                    <Field label="Payroll Number">
                      <input className={inputCls} placeholder="Your payroll number"
                        value={form.payrollNumber} onChange={e => set("payrollNumber", e.target.value)} />
                    </Field>
                    <Field label="Years in Service">
                      <select className={inputCls} value={form.yearsInService} onChange={e => set("yearsInService", e.target.value)}>
                        <option value="">Select</option>
                        {["Less than 1 year","1–2 years","3–5 years","6–10 years","11–15 years","More than 15 years"].map(y => <option key={y}>{y}</option>)}
                      </select>
                    </Field>
                  </div>
                )}
              </>
            )}

            <div className="h-px bg-slate-800" />
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Income Details</div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly Gross Income (K) *" error={errors.monthlyIncome}>
                <input type="number" className={inputCls} placeholder="5000"
                  value={form.monthlyIncome} onChange={e => set("monthlyIncome", e.target.value)} />
              </Field>
              <Field label="Net Salary Available (K)">
                <input type="number" className={inputCls} placeholder="After all deductions"
                  value={form.netSalaryAvailable} onChange={e => set("netSalaryAvailable", e.target.value)} />
              </Field>
              <Field label="Existing Loan Deductions (K)">
                <input type="number" className={inputCls} placeholder="0"
                  value={form.existingLoanDeductions} onChange={e => set("existingLoanDeductions", e.target.value)} />
              </Field>
              <Field label="Pay Date">
                <select className={inputCls} value={form.payDate} onChange={e => set("payDate", e.target.value)}>
                  <option value="">Select day</option>
                  {["25th","26th","27th","28th","Last day of month","1st","5th","Other"].map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
            </div>

            {Number(form.monthlyIncome) > 0 && weeklyPayment > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3">
                <Info size={14} className="text-slate-400 flex-shrink-0" />
                <div className="text-xs text-slate-400">
                  Repayment of <span className="text-slate-200 font-semibold">{K(weeklyPayment)}/week</span> = <span className="text-slate-200 font-semibold">{K(weeklyPayment * 4.33)}/month</span>
                  {Number(form.monthlyIncome) > 0 && (
                    <span className={` — ${((weeklyPayment * 4.33 / Number(form.monthlyIncome)) * 100).toFixed(0)}% of gross income`} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Collateral ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-1">Collateral Information</h3>
            <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
              <Shield size={12} className="flex-shrink-0 mt-0.5" />
              <span>We lend against the <strong>forced sale value</strong> (not retail value) of your collateral. Provide accurate details — our officer will verify in person before disbursement.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Collateral Type *" error={errors.collateralType}>
                <select className={inputCls} value={form.collateralType} onChange={e => set("collateralType", e.target.value)}>
                  <option value="">Select type</option>
                  {COLLATERAL_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Condition *" error={errors.collateralCondition}>
                <select className={inputCls} value={form.collateralCondition} onChange={e => set("collateralCondition", e.target.value)}>
                  <option value="">Select</option>
                  <option value="excellent">Excellent — Like new, fully functional</option>
                  <option value="good">Good — Minor cosmetic wear, works perfectly</option>
                  <option value="fair">Fair — Visible wear, some minor issues</option>
                  <option value="poor">Poor — Heavy wear, significant issues</option>
                </select>
              </Field>
            </div>

            <Field label="Description (Make, Model, Specifications) *" error={errors.collateralDescription}>
              <input className={inputCls} placeholder="e.g. Samsung Galaxy S21, 256GB, Black"
                value={form.collateralDescription} onChange={e => set("collateralDescription", e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Year Purchased">
                <input type="number" className={inputCls} placeholder="e.g. 2021"
                  value={form.collateralYear} onChange={e => set("collateralYear", e.target.value)} />
              </Field>
              <Field label="Serial / Registration Number">
                <input className={inputCls} placeholder="IMEI, chassis, title no..."
                  value={form.collateralSerial} onChange={e => set("collateralSerial", e.target.value)} />
              </Field>
              <Field label="Your Declared Market Value (K) *" error={errors.collateralValue}>
                <input type="number" className={inputCls} placeholder="Current market price"
                  value={form.collateralValue} onChange={e => set("collateralValue", e.target.value)} />
              </Field>
            </div>

            {/* Real-time valuation preview */}
            {assessment && Number(form.collateralValue) > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Preliminary Valuation</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Market Value", value: K(assessment.marketValue), color: "text-slate-200" },
                    { label: "Forced Sale Value", value: K(assessment.forcedSaleValue), color: "text-amber-400" },
                    { label: "Lending Value", value: K(assessment.lendingValue), color: "text-indigo-400" },
                  ].map(v => (
                    <div key={v.label} className="bg-slate-900/60 rounded-lg p-2.5">
                      <div className={`font-bold text-sm ${v.color}`}>{v.value}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{v.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Coverage Ratio</span>
                  <span className={`font-bold ${COVERAGE_COLOR(assessment.coverageRatio)}`}>
                    {(assessment.coverageRatio * 100).toFixed(0)}% — {COVERAGE_LABEL(assessment.coverageRatio)}
                  </span>
                </div>
              </div>
            )}

            <div className="h-px bg-slate-800" />
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ownership & Documentation</div>

            <div>
              <label className={labelCls}>Who owns this item?</label>
              <div className="flex gap-2">
                {[{ value: "SELF", label: "I own it" }, { value: "OTHER", label: "Third Party" }].map(o => (
                  <button key={o.value} type="button" onClick={() => set("collateralOwner", o.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${form.collateralOwner === o.value ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {form.collateralOwner === "OTHER" && (
              <Field label="Owner Name">
                <input className={inputCls} placeholder="Full name of owner"
                  value={form.collateralOwnerName} onChange={e => set("collateralOwnerName", e.target.value)} />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "hasOwnershipDocs", label: "I have ownership documents", desc: "Receipt, title deed, or registration card" },
                { key: "hasInsurance", label: "This asset is insured", desc: "Valid insurance policy exists" },
              ].map(cb => (
                <div key={cb.key} onClick={() => set(cb.key, !(form as unknown as Record<string, boolean>)[cb.key])}
                  className={`cursor-pointer p-3 rounded-xl border transition-all ${(form as unknown as Record<string, boolean>)[cb.key] ? "bg-emerald-900/20 border-emerald-800/40" : "bg-slate-800/40 border-slate-700"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${(form as unknown as Record<string, boolean>)[cb.key] ? "bg-emerald-500 border-emerald-500" : "border-slate-600"}`}>
                      {(form as unknown as Record<string, boolean>)[cb.key] && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <span className="text-xs font-medium text-slate-200">{cb.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 ml-6">{cb.desc}</div>
                </div>
              ))}
            </div>

            <div>
              <label className={labelCls}>Collateral Photos (upload up to 6 — front, back, serial number)</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-5 cursor-pointer hover:border-indigo-600 transition-all">
                <Camera size={24} className="text-slate-600 mb-2" />
                <div className="text-sm text-slate-400">Tap to upload photos</div>
                <div className="text-xs text-slate-600 mt-1">Front · Back · Sides · Serial Number</div>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => set("collateralPhotos", Array.from(e.target.files ?? []).slice(0, 6))} />
              </label>
              {form.collateralPhotos.length > 0 && (
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={12} /> {form.collateralPhotos.length} photo{form.collateralPhotos.length > 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Guarantor & References ── */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white mb-1">Guarantor & References</h3>
            <p className="text-xs text-slate-500">A guarantor is someone who agrees to repay if you cannot. References vouch for your character.</p>

            <div className="h-px bg-slate-800" />
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guarantor (recommended)</div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Guarantor Full Name">
                <input className={inputCls} placeholder="Full name" value={form.guarantorName}
                  onChange={e => set("guarantorName", e.target.value)} />
              </Field>
              <Field label="Guarantor Phone">
                <input className={inputCls} placeholder="+260 97..." value={form.guarantorPhone}
                  onChange={e => set("guarantorPhone", e.target.value)} />
              </Field>
              <Field label="Guarantor Employer">
                <input className={inputCls} placeholder="Where they work" value={form.guarantorEmployer}
                  onChange={e => set("guarantorEmployer", e.target.value)} />
              </Field>
              <Field label="Relationship to You">
                <select className={inputCls} value={form.guarantorRelation} onChange={e => set("guarantorRelation", e.target.value)}>
                  <option value="">Select</option>
                  {["Spouse","Parent","Sibling","Employer","Colleague","Friend","Church Leader","Other"].map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            <div className="h-px bg-slate-800" />
            {[
              { prefix: "ref1", label: "Reference 1 *" },
              { prefix: "ref2", label: "Reference 2 (optional)" },
            ].map(r => (
              <div key={r.prefix} className="bg-slate-800/40 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-400">{r.label}</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name" error={errors[`${r.prefix}Name`]}>
                    <input className={inputCls} placeholder="Reference name"
                      value={(form as unknown as Record<string, string>)[`${r.prefix}Name`]}
                      onChange={e => set(`${r.prefix}Name`, e.target.value)} />
                  </Field>
                  <Field label="Phone" error={errors[`${r.prefix}Phone`]}>
                    <input className={inputCls} placeholder="+260 97..."
                      value={(form as unknown as Record<string, string>)[`${r.prefix}Phone`]}
                      onChange={e => set(`${r.prefix}Phone`, e.target.value)} />
                  </Field>
                </div>
                <Field label="Relationship">
                  <select className={inputCls}
                    value={(form as unknown as Record<string, string>)[`${r.prefix}Relationship`]}
                    onChange={e => set(`${r.prefix}Relationship`, e.target.value)}>
                    <option value="">Select</option>
                    {["Employer","Colleague","Neighbour","Friend","Church Member","Community Leader"].map(rel => <option key={rel}>{rel}</option>)}
                  </select>
                </Field>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 5: Review + Risk Assessment ── */}
        {step === 5 && (
          <div className="space-y-5">
            <h3 className="font-bold text-white mb-1">Review & Risk Assessment</h3>

            {/* Preliminary Risk Assessment Card */}
            {assessment && (
              <div className={`rounded-2xl border p-5 space-y-4 ${
                assessment.riskCategory === "EXCELLENT" ? "bg-emerald-900/20 border-emerald-800/40" :
                assessment.riskCategory === "GOOD" ? "bg-blue-900/20 border-blue-800/40" :
                assessment.riskCategory === "MODERATE" ? "bg-amber-900/20 border-amber-800/40" :
                "bg-red-900/20 border-red-800/40"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={12} /> Preliminary Risk Assessment
                  </div>
                  <span className={`text-sm font-black ${SCORE_COLOR[assessment.riskCategory]}`}>
                    {assessment.overallScore}/100 — {SCORE_LABEL[assessment.riskCategory]}
                  </span>
                </div>

                {/* Score bars */}
                <div className="space-y-2">
                  {[
                    { label: "Ownership", score: assessment.ownershipScore, max: 20 },
                    { label: "Marketability", score: assessment.marketabilityScore, max: 20 },
                    { label: "Condition", score: assessment.conditionScore, max: 15 },
                    { label: "Liquidity", score: assessment.liquidityScore, max: 20 },
                    { label: "Asset Age", score: assessment.assetAgeScore, max: 10 },
                    { label: "Documentation", score: assessment.documentationScore, max: 15 },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-400">{f.label}</span>
                        <span className="text-slate-300">{f.score}/{f.max}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          f.score / f.max >= 0.8 ? "bg-emerald-500" :
                          f.score / f.max >= 0.6 ? "bg-blue-500" :
                          f.score / f.max >= 0.4 ? "bg-amber-500" : "bg-red-500"
                        }`} style={{ width: `${(f.score / f.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Valuation */}
                {Number(form.collateralValue) > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/50">
                    {[
                      { label: "Market Value", v: K(assessment.marketValue) },
                      { label: "Forced Sale Value", v: K(assessment.forcedSaleValue) },
                      { label: "Lending Value", v: K(assessment.lendingValue) },
                    ].map(x => (
                      <div key={x.label} className="text-center">
                        <div className="font-bold text-sm text-slate-100">{x.v}</div>
                        <div className="text-[10px] text-slate-500">{x.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coverage + Repossession */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">Coverage Ratio</div>
                    <div className={`font-bold text-sm ${COVERAGE_COLOR(assessment.coverageRatio)}`}>
                      {(assessment.coverageRatio * 100).toFixed(0)}% — {COVERAGE_LABEL(assessment.coverageRatio)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">Repossession Ease</div>
                    <div className={`font-bold text-sm ${REPOSSESSION_COLOR[assessment.repossessionScore]}`}>
                      {assessment.repossessionScore}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">Max Recommended</div>
                    <div className="font-bold text-sm text-slate-100">{K(assessment.maxRecommendedLoan)}</div>
                  </div>
                </div>

                {/* Warnings */}
                {assessment.warnings.length > 0 && (
                  <div className="space-y-1">
                    {assessment.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-amber-300">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" /> {w}
                      </div>
                    ))}
                  </div>
                )}
                {assessment.strengths.length > 0 && (
                  <div className="space-y-1">
                    {assessment.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-400">
                        <CheckCircle size={11} className="flex-shrink-0 mt-0.5" /> {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Application Summary */}
            <div className="space-y-0">
              {[
                ["Applicant", `${client.firstName} ${client.lastName} (${client.clientNumber})`],
                ["NRC", form.nrcNumber || "—"],
                ["Product", selectedProduct?.name ?? "—"],
                ["Amount", K(loanAmount)],
                ["Duration", selectedRate?.displayLabel ?? "—"],
                ["Total Repayable", K(totalRepayable)],
                ["Per Week", selectedRate ? K(weeklyPayment) : "—"],
                ["Purpose", form.purpose || "—"],
                ["Employment", (EMPLOYMENT_TYPES.find(t => t.value === form.employmentType)?.label ?? form.employmentType) || "—"],
                ["Monthly Income", form.monthlyIncome ? K(Number(form.monthlyIncome)) : "—"],
                ["Collateral", form.collateralType ? `${form.collateralType} (${form.collateralCondition}) — ${form.collateralValue ? K(Number(form.collateralValue)) : "no value"}` : "None declared"],
                ["Photos", form.collateralPhotos.length > 0 ? `${form.collateralPhotos.length} uploaded` : "None"],
                ["Guarantor", form.guarantorName || "None provided"],
              ].map(([l, v]) => (
                <div key={l} className="flex items-start justify-between gap-3 py-2 border-b border-slate-800 last:border-0">
                  <span className="text-sm text-slate-500 flex-shrink-0">{l}</span>
                  <span className="text-sm text-slate-200 text-right">{v}</span>
                </div>
              ))}
            </div>

            {/* Agreements */}
            <div className="space-y-3 pt-2">
              {[
                { k: "agreeLoan", label: "I have read and agree to the Loan Terms & Conditions" },
                { k: "agreeAccurate", label: "I confirm that all information provided is accurate and complete. False information may result in legal action." },
              ].map(cb => (
                <div key={cb.k}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" id={cb.k}
                      checked={(form as unknown as Record<string, boolean>)[cb.k]}
                      onChange={e => set(cb.k, e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0" />
                    <label htmlFor={cb.k} className="text-sm text-slate-400">{cb.label}</label>
                  </div>
                  {errors[cb.k] && <p className="text-red-400 text-xs mt-1 ml-7">{errors[cb.k]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:text-slate-200">
              <ArrowLeft size={14} /> Back
            </button>
          )}
          {submitError && (
            <div className="w-full flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-xs text-red-300">
              <AlertCircle size={14} className="flex-shrink-0" /> {submitError}
            </div>
          )}
          <button onClick={next} disabled={submitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> :
              step === STEPS.length - 1 ? "Submit Application →" :
              step === 3 ? "Continue (skip if no collateral yet)" : "Continue →"}
          </button>
        </div>
        {step === 3 && (
          <button onClick={() => setStep(4)} className="w-full mt-2 text-sm text-slate-500 hover:text-slate-400 py-1">
            Skip collateral step →
          </button>
        )}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-500">
        <AlertCircle size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
        False information on this application may result in legal action under the Banking and Financial Services Act of Zambia.
      </div>
    </div>
  );
}
