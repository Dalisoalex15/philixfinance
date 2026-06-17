import { useState } from "react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";
import {
  CreditCard, FileText, Shield, AlertCircle, ChevronRight,
  TrendingUp, Clock, CheckCircle, Package, Bell, Wallet,
  ArrowUpRight, ArrowDownRight, Star, Zap, Phone, Calculator,
  BadgeCheck, ListChecks, Gift, Sparkles, Info, ShieldCheck,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { mockLoanProducts } from "../../lib/mock-data";

// Mock data for returning clients with active loans
const mockActiveLoan = {
  loanNumber: "PHX-L-2024-0034",
  product: "Salary Advance",
  principal: 5000,
  outstanding: 2160,
  nextPayment: 1080,
  nextPaymentDate: "2025-07-25",
  monthsPaid: 3,
  totalMonths: 5,
  status: "ACTIVE",
};

const repaymentHistory = [
  { month: "Apr", paid: 1080 },
  { month: "May", paid: 1080 },
  { month: "Jun", paid: 1080 },
  { month: "Jul", paid: 0 },
  { month: "Aug", paid: 0 },
];

const mockTransactions = [
  { id: "1", date: "2025-06-15", description: "Monthly Repayment", amount: -1080, type: "PAYMENT" },
  { id: "2", date: "2025-05-15", description: "Monthly Repayment", amount: -1080, type: "PAYMENT" },
  { id: "3", date: "2025-04-15", description: "Monthly Repayment", amount: -1080, type: "PAYMENT" },
  { id: "4", date: "2025-04-01", description: "Loan Disbursement", amount: 5000, type: "DISBURSEMENT" },
];

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
  const client = useClientAuthStore(s => s.client)!;
  const allApplications = useLoanApplicationStore(s => s.applications);
  const myApplications = allApplications.filter(a => a.clientId === client.id);
  const initials = `${client.firstName[0]}${client.lastName[0]}`.toUpperCase();

  const hasActiveLoan = myApplications.some(a => a.status === "DISBURSED" || a.status === "APPROVED");
  const notifCount = myApplications.filter(a => a.status !== "PENDING").length;
  const activeLoanApp = myApplications.find(a => a.status === "DISBURSED" || a.status === "APPROVED");

  // Use real application data when available, fallback to mock for demo
  const realLoan = activeLoanApp ? {
    loanNumber: activeLoanApp.ref,
    product: activeLoanApp.productName,
    principal: activeLoanApp.amount,
    outstanding: activeLoanApp.totalRepayable,
    nextPayment: Math.round(activeLoanApp.totalRepayable / 3),
    nextPaymentDate: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
    monthsPaid: 0,
    totalMonths: 3,
    status: activeLoanApp.status,
  } : mockActiveLoan;

  const pct = activeLoanApp
    ? Math.round((realLoan.monthsPaid / Math.max(realLoan.totalMonths, 1)) * 100)
    : Math.round(((mockActiveLoan.principal - mockActiveLoan.outstanding) / mockActiveLoan.principal) * 100);
  const daysToNext = Math.ceil((new Date(realLoan.nextPaymentDate).getTime() - Date.now()) / 86400000);

  const hourOfDay = new Date().getHours();
  const greeting = hourOfDay < 12 ? "Good morning" : hourOfDay < 17 ? "Good afternoon" : "Good evening";

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
        {hasActiveLoan && (
          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Outstanding", value: `K${realLoan.outstanding.toLocaleString()}`, color: "text-amber-400", sub: "active loan" },
              { label: "Next Payment", value: `K${realLoan.nextPayment.toLocaleString()}`, color: "text-slate-200", sub: `in ${daysToNext} day${daysToNext !== 1 ? "s" : ""}` },
              { label: "Repaid", value: `${pct}%`, color: "text-emerald-400", sub: `${realLoan.monthsPaid}/${realLoan.totalMonths} months` },
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

      {/* Active loan card — returning clients */}
      {hasActiveLoan && (
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
                <div className="font-bold text-slate-200">{realLoan.product}</div>
                <div className="text-xs text-slate-500 font-mono">{realLoan.loanNumber}</div>
              </div>
              <span className="bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">{realLoan.status}</span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{realLoan.monthsPaid} of {realLoan.totalMonths} payments made</span>
                <span className="text-emerald-400 font-semibold">{pct}% repaid</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="h-16 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={repaymentHistory}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="paid" stroke="#6366f1" fill="url(#pg)" strokeWidth={2} dot={false} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`K${v.toLocaleString()}`, "Paid"]} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between bg-indigo-900/20 border border-indigo-800/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-400" />
                <div>
                  <div className="text-xs text-slate-500">Next payment due</div>
                  <div className="text-sm font-semibold text-slate-200">{new Date(realLoan.nextPaymentDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-indigo-300">K{realLoan.nextPayment.toLocaleString()}</div>
                <div className="text-xs text-slate-600">{daysToNext} days away</div>
              </div>
            </div>
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

        {/* Product cards */}
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

                  {/* Rate pills */}
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {prod.rates.filter(r => r.isActive).map(r => (
                      <span key={r.id} className="bg-white/15 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {r.displayLabel}: {r.interestRate}%
                      </span>
                    ))}
                  </div>

                  {/* Key details row */}
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

                  {/* Collateral badge */}
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

      {/* Stats + Transactions grid — returning clients */}
      {hasActiveLoan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-300 text-sm mb-4 flex items-center gap-2">
              <Wallet size={14} className="text-indigo-400" /> Account Summary
            </h3>
            <div className="space-y-3">
              {[
                { label: "Client Since", value: new Date(client.joinedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) },
                { label: "Total Borrowed", value: "K5,000" },
                { label: "Total Repaid", value: `K${(mockActiveLoan.principal - realLoan.outstanding).toLocaleString()}` },
                { label: "Loan Count", value: "2 loans" },
                { label: "Credit Score", value: "Good ●", valueClass: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{s.label}</span>
                  <span className={`font-semibold ${(s as { valueClass?: string }).valueClass ?? "text-slate-200"}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" /> Recent Activity
              </h3>
              <Link to="/portal/loans" className="text-xs text-indigo-400">View all</Link>
            </div>
            <div className="space-y-3">
              {mockTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === "DISBURSEMENT" ? "bg-emerald-900/40" : "bg-slate-800"}`}>
                    {t.type === "DISBURSEMENT"
                      ? <ArrowDownRight size={13} className="text-emerald-400" />
                      : <ArrowUpRight size={13} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-300 truncate">{t.description}</div>
                    <div className="text-xs text-slate-600">{new Date(t.date).toLocaleDateString("en-GB")}</div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${t.amount > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                    {t.amount > 0 ? "+" : ""}K{Math.abs(t.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
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
