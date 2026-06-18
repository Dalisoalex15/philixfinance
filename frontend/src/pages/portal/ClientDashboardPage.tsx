import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import {
  CreditCard, FileText, Shield, AlertCircle, ChevronRight,
  TrendingUp, Clock, CheckCircle, Package, Bell, Wallet,
  Star, Zap, Phone, Calculator,
  BadgeCheck, ListChecks, Gift, Sparkles, Info, ShieldCheck,
} from "lucide-react";
import { mockLoanProducts } from "../../lib/mock-data";

// Fields match what GET /api/portal/applications actually returns
interface PortalApplication {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number;
  purpose?: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
}

const PRODUCT_COLORS = [
  "from-indigo-700 to-indigo-900",
  "from-emerald-700 to-emerald-900",
  "from-amber-700 to-amber-900",
  "from-purple-700 to-purple-900",
];
const PRODUCT_ICONS = [Wallet, TrendingUp, CreditCard, Package];

// Mini eligibility calculator
function EligibilityCalc() {
  const [income, setIncome] = useState(5000);
  const maxLoan = Math.round(income * 2.5);
  const monthlyPayment = Math.round(maxLoan / 6 * 1.03);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={15} className="text-indigo-400" />
        <h3 className="font-semibold text-slate-300 text-sm">Quick Eligibility Check</h3>
        <span className="ml-auto text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">Estimate only</span>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Monthly Income</span>
          <span className="text-slate-300 font-semibold">K{income.toLocaleString()}</span>
        </div>
        <input
          type="range" min={1000} max={30000} step={500} value={income}
          onChange={e => setIncome(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-700 mt-1">
          <span>K1,000</span><span>K30,000</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-900/30 border border-indigo-800/30 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 mb-1">Est. Max Loan</div>
          <div className="text-lg font-bold text-indigo-300">K{maxLoan.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 mb-1">Monthly Repayment</div>
          <div className="text-lg font-bold text-slate-300">K{monthlyPayment.toLocaleString()}</div>
        </div>
      </div>
      <Link to="/portal/apply" className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
        <FileText size={13} /> Apply Now
      </Link>
    </div>
  );
}

// Onboarding checklist for new clients
function OnboardingChecklist({ kycVerified }: { kycVerified: boolean }) {
  const steps = [
    { label: "Create your account", done: true },
    { label: "Verify your identity (KYC)", done: kycVerified, href: "/portal/kyc" },
    { label: "Apply for your first loan", done: false, href: "/portal/apply" },
    { label: "Receive disbursement", done: false },
  ];
  const completedCount = steps.filter(s => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks size={15} className="text-indigo-400" />
        <h3 className="font-semibold text-slate-300 text-sm">Getting Started</h3>
        <span className="ml-auto text-xs font-bold text-indigo-400">{completedCount}/{steps.length}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${!step.done && step.href ? "hover:bg-slate-800/60" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border ${step.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-700 text-slate-600"}`}>
              {step.done ? <CheckCircle size={12} /> : i + 1}
            </div>
            <span className={`text-sm flex-1 ${step.done ? "text-slate-500 line-through" : "text-slate-300"}`}>{step.label}</span>
            {!step.done && step.href && (
              <Link to={step.href} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5">
                Start <ChevronRight size={11} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  const client = useClientAuthStore(s => s.client);
  const accessToken = useClientAuthStore(s => s.accessToken);
  const [myApplications, setMyApplications] = useState<PortalApplication[]>([]);

  // All hooks must be called before any early return
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/portal/applications", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setMyApplications(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [accessToken]);

  // Guard: portal layout should prevent this, but be safe
  if (!client) return null;

  const initials = `${(client.firstName?.[0] ?? "?")}${(client.lastName?.[0] ?? "")}`.toUpperCase();

  const activeLoanApp = myApplications.find(a => a.status === "DISBURSED" || a.status === "APPROVED");
  const hasActiveLoan = !!activeLoanApp;
  const notifCount = myApplications.filter(a => a.status !== "SUBMITTED").length;

  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? "Good morning" : hourOfDay < 17 ? "Good afternoon" : "Good evening";

  // Safe date calculations — createdAt from API, with NaN protection
  const termMonths = activeLoanApp?.termMonths ?? 3;
  const submittedMs = activeLoanApp ? (new Date(activeLoanApp.createdAt).getTime() || 0) : 0;
  const monthsElapsed = submittedMs > 0
    ? Math.min(termMonths, Math.floor((Date.now() - submittedMs) / (30 * 86400000)))
    : 0;
  const pct = termMonths > 0 ? Math.round((monthsElapsed / termMonths) * 100) : 0;
  const nextPaymentMs = submittedMs > 0 ? submittedMs + (monthsElapsed + 1) * 30 * 86400000 : 0;
  const nextPaymentDate = nextPaymentMs > 0 ? new Date(nextPaymentMs).toISOString().slice(0, 10) : "";
  const daysToNext = nextPaymentDate
    ? Math.ceil((new Date(nextPaymentDate).getTime() - Date.now()) / 86400000)
    : 0;
  const monthlyPayment = activeLoanApp
    ? Math.round(activeLoanApp.amountRequested / Math.max(termMonths, 1))
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Hero greeting */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 via-slate-900 to-purple-900/30 border border-indigo-800/30 rounded-2xl p-6">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%)" }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-slate-400 text-sm">{greeting},</p>
              <h1 className="text-2xl font-bold text-white">{client.firstName} {client.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-indigo-400 font-mono">{client.clientNumber}</span>
                {client.kycStatus === "VERIFIED" && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    <BadgeCheck size={8} /> KYC Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link to="/portal/apply" className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/40">
            <Zap size={14} /> Apply Now
          </Link>
        </div>

        {/* Stats strip — only for active loan holders */}
        {hasActiveLoan && activeLoanApp && (
          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Outstanding", value: `K${activeLoanApp.amountRequested.toLocaleString()}`, color: "text-amber-400", sub: "active loan" },
              { label: "Next Payment", value: `K${monthlyPayment.toLocaleString()}`, color: "text-slate-200", sub: `in ${daysToNext} day${daysToNext !== 1 ? "s" : ""}` },
              { label: "Term Progress", value: `${pct}%`, color: "text-emerald-400", sub: `${monthsElapsed}/${termMonths} months` },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                <div className="text-[9px] text-slate-600">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* No-loan welcome strip */}
        {!hasActiveLoan && (
          <div className="relative flex items-center gap-3 mt-5 bg-white/5 border border-white/10 rounded-xl p-3">
            <Sparkles size={16} className="text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-slate-400">Welcome to Philix Finance! Complete your profile and apply for your first loan.</p>
          </div>
        )}
      </div>

      {/* KYC alert */}
      {client.kycStatus !== "VERIFIED" && (
        <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800/40 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-amber-400 text-sm">Complete Identity Verification</div>
            <div className="text-xs text-slate-500 mt-0.5">Upload your NRC to unlock full loan access and higher limits</div>
          </div>
          <Link to="/portal/kyc" className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all">
            Verify Now
          </Link>
        </div>
      )}

      {/* Active loan card */}
      {hasActiveLoan && activeLoanApp ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-200">Active Loan</h2>
            <Link to="/portal/loans" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-slate-200">{activeLoanApp.productType.replace(/_/g, " ")}</div>
                <div className="text-xs text-slate-500 font-mono">{activeLoanApp.reference}</div>
              </div>
              <span className="bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">{activeLoanApp.status}</span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{monthsElapsed} of {termMonths} months elapsed</span>
                <span className="text-emerald-400 font-semibold">{pct}% term elapsed</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between bg-indigo-900/20 border border-indigo-800/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-400" />
                <div>
                  <div className="text-xs text-slate-500">Next payment due</div>
                  <div className="text-sm font-semibold text-slate-200">
                    {nextPaymentDate ? new Date(nextPaymentDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "—"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-indigo-300">K{monthlyPayment.toLocaleString()}</div>
                <div className="text-xs text-slate-600">{daysToNext > 0 ? `${daysToNext} days away` : "Due soon"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No active loan state */
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-200">Active Loan</h2>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-900/40 flex items-center justify-center mx-auto mb-3">
              <CreditCard size={22} className="text-indigo-400" />
            </div>
            <div className="font-semibold text-slate-300 mb-1">No active loan</div>
            <div className="text-xs text-slate-500 mb-4">You don't have an active or approved loan yet.</div>
            <Link to="/portal/apply" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
              <FileText size={13} /> Apply Now
            </Link>
          </div>
        </div>
      )}

      {/* New clients — onboarding + eligibility side by side */}
      {!hasActiveLoan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <OnboardingChecklist kycVerified={client.kycStatus === "VERIFIED"} />
          <EligibilityCalc />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="font-bold text-slate-200 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: "/portal/apply", icon: FileText, label: "Apply for Loan", color: "from-indigo-600 to-indigo-700", glow: "shadow-indigo-900/40" },
            { to: "/portal/calculator", icon: Calculator, label: "Loan Calculator", color: "from-emerald-700 to-emerald-800", glow: "shadow-emerald-900/40" },
            { to: "/portal/kyc", icon: Shield, label: "KYC Verify", color: "from-amber-600 to-amber-700", glow: "shadow-amber-900/40" },
            { to: "/portal/loans", icon: CreditCard, label: "My Loans", color: "from-purple-700 to-purple-800", glow: "shadow-purple-900/40" },
          ].map(a => (
            <Link key={a.to} to={a.to}
              className={`bg-gradient-to-br ${a.color} hover:opacity-90 rounded-2xl p-4 flex flex-col gap-3 transition-all shadow-lg ${a.glow} group`}>
              <a.icon size={20} className="text-white/90" />
              <span className="text-xs font-semibold text-white leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Loan products — shown to ALL clients */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-200">Our Loan Products</h2>
          <Link to="/portal/apply" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">Apply <ChevronRight size={12} /></Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          {mockLoanProducts.filter(p => p.isActive).map((prod, i) => {
            const Icon = PRODUCT_ICONS[i % PRODUCT_ICONS.length];
            const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
            const lowestRate = Math.min(...prod.rates.map(r => r.interestRate));
            return (
              <div key={prod.id} className={`bg-gradient-to-br ${color} rounded-2xl p-5 relative overflow-hidden`}>
                <div className="absolute right-4 top-4 opacity-10">
                  <Icon size={56} />
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Icon size={15} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">{prod.productType.replace(/_/g, " ")}</span>
                  </div>
                  <div className="font-bold text-white text-lg mb-1">{prod.name}</div>
                  <div className="text-3xl font-black text-white mb-1">
                    K{prod.maxAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/60 mb-4">Up to · from {lowestRate}% flat · {prod.rates.filter(r => r.isActive).length} tiers</div>

                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {prod.rates.filter(r => r.isActive).map(r => (
                      <span key={r.id} className="bg-white/15 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {r.displayLabel}: {r.interestRate}%
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: "Min Loan",   value: `K${prod.minAmount.toLocaleString()}` },
                      { label: "Process Fee",value: `${prod.processingFee}%` },
                      { label: "Grace",      value: `${prod.gracePeriodDays}d` },
                    ].map(d => (
                      <div key={d.label} className="bg-white/10 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-[9px] text-white/50 uppercase tracking-wide">{d.label}</div>
                        <div className="text-xs font-bold text-white mt-0.5">{d.value}</div>
                      </div>
                    ))}
                  </div>

                  {prod.collateralRequired && (
                    <div className="flex items-center gap-1.5 text-[10px] text-white/60 mb-3">
                      <ShieldCheck size={11} className="text-white/40" />
                      Collateral required · {prod.ltvMode === "product_override" ? `Fixed ${prod.ltvOverrideValue}% LTV` : "LTV by condition (40–70%)"}
                    </div>
                  )}

                  <Link to="/portal/apply"
                    className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                    Apply Now <ChevronRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Summary — shown to active loan holders */}
      {hasActiveLoan && activeLoanApp && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-300 text-sm mb-4 flex items-center gap-2">
            <Wallet size={14} className="text-indigo-400" /> Account Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: "Client Since", value: new Date(client.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) },
              { label: "Total Borrowed", value: `K${activeLoanApp.amountRequested.toLocaleString()}` },
              { label: "Est. Repayable", value: `K${Math.round(activeLoanApp.amountRequested * 1.04 * termMonths).toLocaleString()}` },
              { label: "Loan Ref", value: activeLoanApp.reference },
              { label: "Status", value: activeLoanApp.status, valueClass: "text-emerald-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{s.label}</span>
                <span className={`font-semibold ${(s as { valueClass?: string }).valueClass ?? "text-slate-200"}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions — empty state */}
      {hasActiveLoan && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-300 text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" /> Recent Transactions
          </h3>
          <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
            <Info size={15} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-500">
              Payment history will appear here once your loan is disbursed.
            </p>
          </div>
        </div>
      )}

      {/* Tip card for new clients */}
      {!hasActiveLoan && (
        <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800/40 rounded-2xl p-4">
          <Info size={15} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-blue-300 mb-1">Tips for faster approval</div>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• Upload a clear photo of your NRC (front and back)</li>
              <li>• Provide your employer details and latest payslip</li>
              <li>• Applications submitted before 2 PM are reviewed same day</li>
            </ul>
          </div>
        </div>
      )}

      {/* Loyalty / promo banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-800/30 rounded-2xl p-5">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 text-8xl">🏆</div>
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            {hasActiveLoan ? <Star size={18} className="text-amber-400" /> : <Gift size={18} className="text-amber-400" />}
          </div>
          <div className="flex-1">
            <div className="font-bold text-amber-300">
              {hasActiveLoan ? "Loyal Client Benefit" : "First-Time Borrower Offer"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {hasActiveLoan
                ? "Repay on time to unlock lower interest rates on your next loan"
                : "New clients enjoy reduced fees on their first loan. Apply today!"}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile apply CTA */}
      <div className="sm:hidden space-y-2">
        <Link to="/portal/apply" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl text-sm transition-all">
          <Zap size={15} /> Apply for a New Loan
        </Link>
        <a href="tel:+260211000000" className="w-full flex items-center justify-center gap-2 bg-slate-800 text-slate-400 py-3 rounded-xl text-sm border border-slate-700">
          <Phone size={14} /> +260 211 XXX XXX — Need help?
        </a>
      </div>

      {/* Notifications shortcut */}
      <Link to="/portal/notifications" className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all group">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center relative flex-shrink-0">
          <Bell size={16} className="text-indigo-400" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-300">Notifications</div>
          <div className="text-xs text-slate-600">
            {notifCount > 0 ? `${notifCount} update${notifCount > 1 ? "s" : ""} on your loan application${notifCount > 1 ? "s" : ""}` : "No new notifications"}
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400" />
      </Link>
    </div>
  );
}
