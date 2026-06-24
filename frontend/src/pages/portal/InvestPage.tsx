import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, CheckCircle, RefreshCw, Banknote, Smartphone,
  Building2, ChevronRight, X, Lock, Info, Wallet, ArrowRight,
  Shield, Clock, PieChart, BadgeCheck,
} from "lucide-react";

const API = "/api";
const K = (n: number) =>
  `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function token() { return localStorage.getItem("philix_portal_token") ?? ""; }
function auth() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }

const TYPE_LABELS: Record<string, string> = {
  FIXED_DEPOSIT: "Fixed Deposit",
  SAVINGS: "Smart Savings",
  MONEY_MARKET: "Money Market",
  NOTICE: "Notice Account",
};

const TYPE_COLORS: Record<string, string> = {
  FIXED_DEPOSIT: "amber",
  SAVINGS: "emerald",
  MONEY_MARKET: "indigo",
  NOTICE: "violet",
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash in Hand", icon: Banknote, desc: "Pay at any Philix branch" },
  { value: "MOBILE_MONEY", label: "Mobile Money", icon: Smartphone, desc: "Airtel Money, MTN, Zamtel" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2, desc: "Zanaco, FNB, Stanbic, etc." },
];

interface Product {
  id: string;
  name: string;
  description?: string;
  type: string;
  interestRate: number;
  minAmount: number;
  maxAmount?: number;
  termMonths: number;
}

interface Investment {
  id: string;
  reference: string;
  productId: string;
  amountInvested: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  maturityDate: string;
  status: string;
  expectedReturn: number;
  actualReturn?: number;
  paymentMethod?: string;
  product: { name: string; type: string };
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  ACTIVE:    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  MATURED:   "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  WITHDRAWN: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export default function InvestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState({ totalInvested: 0, totalExpected: 0, totalMatured: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "portfolio">("browse");

  // Modal
  const [modal, setModal] = useState<Product | null>(null);
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState<number>(0);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, iRes] = await Promise.all([
        fetch(`${API}/portal/investments/products`, { headers: auth() }),
        fetch(`${API}/portal/investments`, { headers: auth() }),
      ]);
      if (pRes.ok) setProducts(await pRes.json());
      if (iRes.ok) {
        const d = await iRes.json();
        setInvestments(d.investments || []);
        setSummary(d.summary || {});
      }
    } finally {
      setLoading(false);
    }
  }

  function openModal(p: Product) {
    setModal(p);
    setMonths(p.termMonths);
    setAmount(String(p.minAmount));
    setPayMethod("CASH");
    setPayRef("");
    setFormError("");
    setSuccess("");
  }

  function projected() {
    const a = parseFloat(amount) || 0;
    const r = modal?.interestRate ?? 0;
    const t = months || 1;
    return a + a * (r / 100) * (t / 12);
  }

  function interest() {
    return projected() - (parseFloat(amount) || 0);
  }

  async function handleSubmit() {
    if (!modal) return;
    const a = parseFloat(amount);
    if (!a || a < modal.minAmount) {
      setFormError(`Minimum investment is ${K(modal.minAmount)}`);
      return;
    }
    if (modal.maxAmount && a > modal.maxAmount) {
      setFormError(`Maximum investment is ${K(modal.maxAmount)}`);
      return;
    }
    if (months < modal.termMonths) {
      setFormError(`Minimum term is ${modal.termMonths} months`);
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`${API}/portal/investments`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          productId: modal.id,
          amountInvested: a,
          termMonths: months,
          paymentMethod: payMethod,
          paymentRef: payRef || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to submit");
      setSuccess(`Investment submitted! Reference: ${data.reference}. Our team will confirm within 24 hours.`);
      await loadAll();
      setTab("portfolio");
      setTimeout(() => setModal(null), 3000);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const color = (type: string) => TYPE_COLORS[type] || "amber";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b border-slate-800 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Invest with Philix</h1>
              <p className="text-slate-400 text-sm">Grow your money with competitive returns</p>
            </div>
          </div>

          {/* Portfolio summary */}
          {summary.count > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: "Total Invested", value: K(summary.totalInvested), color: "text-white" },
                { label: "Expected Return", value: K(summary.totalExpected), color: "text-emerald-400" },
                { label: "Matured", value: K(summary.totalMatured), color: "text-indigo-400" },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="max-w-3xl mx-auto px-4 mt-5">
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
          {(["browse", "portfolio"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize
                ${tab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {t === "browse" ? "Investment Plans" : `My Portfolio (${investments.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-5 space-y-4">

        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={24} className="animate-spin text-indigo-400" />
          </div>
        )}

        {/* ── BROWSE PRODUCTS ──────────────────────────────────────────────── */}
        {!loading && tab === "browse" && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <PieChart size={40} className="mx-auto mb-3 opacity-40" />
                <p>No investment products available yet.</p>
                <p className="text-sm mt-1">Check back soon or contact support.</p>
              </div>
            ) : (
              <>
                <p className="text-slate-500 text-sm">
                  {products.length} plan{products.length !== 1 ? "s" : ""} available
                </p>
                {products.map(p => (
                  <div key={p.id}
                    className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-${color(p.type)}-500/40 transition-colors`}>
                    {/* Header stripe */}
                    <div className={`bg-${color(p.type)}-500/10 border-b border-${color(p.type)}-500/20 px-5 py-4 flex items-start justify-between`}>
                      <div>
                        <span className={`text-xs font-semibold text-${color(p.type)}-400 uppercase tracking-wider`}>
                          {TYPE_LABELS[p.type] || p.type}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-0.5">{p.name}</h3>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-black text-${color(p.type)}-400`}>{p.interestRate}%</p>
                        <p className="text-slate-500 text-xs">per annum</p>
                      </div>
                    </div>

                    <div className="px-5 py-4 space-y-4">
                      {p.description && (
                        <p className="text-slate-400 text-sm">{p.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-800/60 rounded-xl p-3">
                          <p className="text-white font-bold text-sm">{K(p.minAmount)}</p>
                          <p className="text-slate-500 text-xs mt-0.5">Min. amount</p>
                        </div>
                        <div className="bg-slate-800/60 rounded-xl p-3">
                          <p className="text-white font-bold text-sm">{p.maxAmount ? K(p.maxAmount) : "No cap"}</p>
                          <p className="text-slate-500 text-xs mt-0.5">Max. amount</p>
                        </div>
                        <div className="bg-slate-800/60 rounded-xl p-3">
                          <p className="text-white font-bold text-sm">{p.termMonths}m</p>
                          <p className="text-slate-500 text-xs mt-0.5">Min. term</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Shield size={11} /> Capital protected</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> Locked for {p.termMonths} months</span>
                        <span className="flex items-center gap-1"><BadgeCheck size={11} /> Philix guaranteed</span>
                      </div>

                      <button onClick={() => openModal(p)}
                        className={`w-full bg-${color(p.type)}-500 hover:bg-${color(p.type)}-400 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors`}>
                        Invest Now <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ── PORTFOLIO ────────────────────────────────────────────────────── */}
        {!loading && tab === "portfolio" && (
          <>
            {investments.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Wallet size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium text-slate-400">No investments yet</p>
                <p className="text-sm mt-1">Browse plans and start growing your money today.</p>
                <button onClick={() => setTab("browse")}
                  className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
                  Browse Plans
                </button>
              </div>
            ) : (
              investments.map(inv => {
                const c = TYPE_COLORS[inv.product.type] || "amber";
                const progress = inv.status === "ACTIVE"
                  ? Math.min(100, Math.round(
                      (Date.now() - new Date(inv.startDate).getTime()) /
                      (new Date(inv.maturityDate).getTime() - new Date(inv.startDate).getTime()) * 100
                    ))
                  : inv.status === "MATURED" || inv.status === "WITHDRAWN" ? 100 : 0;

                return (
                  <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-mono">{inv.reference}</p>
                        <p className="font-bold text-white">{inv.product.name}</p>
                        <p className="text-slate-400 text-sm">{TYPE_LABELS[inv.product.type] || inv.product.type}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STATUS_STYLES[inv.status]}`}>
                        {inv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-white font-bold">{K(inv.amountInvested)}</p>
                        <p className="text-slate-500 text-xs">Invested</p>
                      </div>
                      <div>
                        <p className={`font-bold text-${c}-400`}>{K(inv.actualReturn ?? inv.expectedReturn)}</p>
                        <p className="text-slate-500 text-xs">{inv.actualReturn ? "Returned" : "At maturity"}</p>
                      </div>
                      <div>
                        <p className="text-white font-bold">{inv.interestRate}% p.a.</p>
                        <p className="text-slate-500 text-xs">Interest rate</p>
                      </div>
                    </div>

                    {inv.status === "ACTIVE" && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{new Date(inv.startDate).toLocaleDateString()}</span>
                          <span className="text-slate-400">{progress}% complete</span>
                          <span>Matures {new Date(inv.maturityDate).toLocaleDateString()}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${c}-500 rounded-full transition-all`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {inv.status === "MATURED" && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                        <p className="text-emerald-400 text-sm font-medium">
                          Your return of {K(inv.actualReturn ?? inv.expectedReturn)} is ready for withdrawal.
                          Contact us to collect.
                        </p>
                      </div>
                    )}

                    {inv.status === "PENDING" && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
                        <Info size={16} className="text-amber-400 shrink-0" />
                        <p className="text-amber-400 text-sm">
                          Awaiting confirmation. Please complete your payment via {inv.paymentMethod?.replace("_", " ")} and our team will activate within 24 hours.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ── INVESTMENT MODAL ──────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <p className="text-xs text-slate-500">{TYPE_LABELS[modal.type]}</p>
                <h2 className="text-lg font-bold text-white">{modal.name}</h2>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {success ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-semibold">Investment Submitted!</p>
                  <p className="text-slate-400 text-sm">{success}</p>
                </div>
              ) : (
                <>
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Amount to invest (ZMW)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">K</span>
                      <input type="number" value={amount} min={modal.minAmount}
                        max={modal.maxAmount || undefined}
                        onChange={e => { setAmount(e.target.value); setFormError(""); }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <p className="text-slate-500 text-xs mt-1.5">
                      Min: {K(modal.minAmount)}{modal.maxAmount ? ` · Max: ${K(modal.maxAmount)}` : ""}
                    </p>
                  </div>

                  {/* Term */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Investment term (months)
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[modal.termMonths, modal.termMonths * 2, modal.termMonths * 3, modal.termMonths * 4]
                        .filter((v, i, a) => a.indexOf(v) === i && v <= 60)
                        .map(m => (
                          <button key={m} onClick={() => setMonths(m)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                              ${months === m ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                            {m}m
                          </button>
                        ))}
                      <input type="number" value={months} min={modal.termMonths} max={60}
                        onChange={e => setMonths(parseInt(e.target.value) || modal.termMonths)}
                        placeholder="Custom"
                        className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <p className="text-slate-500 text-xs mt-1.5">
                      <Lock size={10} className="inline mr-1" />Funds locked for the chosen term
                    </p>
                  </div>

                  {/* Projection */}
                  {parseFloat(amount) > 0 && (
                    <div className="bg-indigo-950/60 border border-indigo-800/40 rounded-xl p-4 space-y-2">
                      <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Return projection</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Principal</span>
                        <span className="text-white font-medium">{K(parseFloat(amount) || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Interest @ {modal.interestRate}% × {months}m</span>
                        <span className="text-emerald-400 font-medium">+{K(interest())}</span>
                      </div>
                      <div className="border-t border-indigo-800/40 pt-2 flex justify-between">
                        <span className="text-white font-bold">Total at maturity</span>
                        <span className="text-indigo-300 font-black text-lg">{K(projected())}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment method */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Payment method</label>
                    <div className="space-y-2">
                      {PAYMENT_METHODS.map(pm => {
                        const Icon = pm.icon;
                        return (
                          <button key={pm.value} onClick={() => setPayMethod(pm.value)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors
                              ${payMethod === pm.value
                                ? "border-indigo-500 bg-indigo-500/10"
                                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"}`}>
                            <Icon size={18} className={payMethod === pm.value ? "text-indigo-400" : "text-slate-500"} />
                            <div>
                              <p className={`text-sm font-medium ${payMethod === pm.value ? "text-white" : "text-slate-300"}`}>
                                {pm.label}
                              </p>
                              <p className="text-slate-500 text-xs">{pm.desc}</p>
                            </div>
                            {payMethod === pm.value && (
                              <CheckCircle size={16} className="text-indigo-400 ml-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment reference */}
                  {payMethod !== "CASH" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Payment reference / transaction ID <span className="text-slate-500">(optional)</span>
                      </label>
                      <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)}
                        placeholder="e.g. MM-20260624-001"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  )}

                  {formError && (
                    <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <button onClick={handleSubmit} disabled={submitting || !amount}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                    {submitting ? (
                      <><RefreshCw size={16} className="animate-spin" /> Submitting…</>
                    ) : (
                      <><TrendingUp size={16} /> Submit Investment Request</>
                    )}
                  </button>

                  <p className="text-slate-500 text-xs text-center">
                    By investing you agree to Philix Finance's investment terms. Your capital is protected.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
