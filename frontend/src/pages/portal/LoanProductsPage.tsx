import { useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, Briefcase, Package, Smartphone, Star, Crown,
  Check, ChevronRight, Calculator, X, ArrowRight,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: string;
  icon: typeof GraduationCap;
  iconColor: string;
  badgeColor: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  minRate: number;
  maxRate: number;
  minTerm: number;
  maxTerm: number;
  collateral: string;
  docs: string[];
  eligibility: string;
  highlight?: string;
}

const PRODUCTS: Product[] = [
  {
    id: "student", name: "Student Emergency Loan", type: "STUDENT",
    icon: GraduationCap, iconColor: "text-indigo-400", badgeColor: "bg-indigo-900/40 text-indigo-300 border-indigo-800",
    description: "Fast emergency funds for enrolled university students at UNZA, CBU, and UNILUS.",
    minAmount: 300, maxAmount: 10000, minRate: 10, maxRate: 35, minTerm: 1, maxTerm: 4,
    collateral: "Any electronics or valuables", docs: ["NRC", "Student ID"],
    eligibility: "Full-time university students",
  },
  {
    id: "salary", name: "Salary Advance Loan", type: "SALARY_ADVANCE",
    icon: Briefcase, iconColor: "text-emerald-400", badgeColor: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
    description: "Short-term advance against your next salary for formally employed individuals.",
    minAmount: 500, maxAmount: 20000, minRate: 10, maxRate: 35, minTerm: 1, maxTerm: 4,
    collateral: "Electronics, vehicles, or other assets", docs: ["NRC", "Payslip", "Employment Letter"],
    eligibility: "Employed individuals with verifiable salary",
  },
  {
    id: "business", name: "Business Working Capital", type: "BUSINESS",
    icon: Package, iconColor: "text-amber-400", badgeColor: "bg-amber-900/40 text-amber-300 border-amber-800",
    description: "Working capital for micro-businesses, market traders, and self-employed entrepreneurs.",
    minAmount: 1000, maxAmount: 50000, minRate: 10, maxRate: 35, minTerm: 1, maxTerm: 4,
    collateral: "Business assets, electronics, or vehicles", docs: ["NRC", "Trade Licence or Witness Letter"],
    eligibility: "Business owners and self-employed",
  },
  {
    id: "electronics", name: "Electronics Equity Loan", type: "ELECTRONICS_EQUITY",
    icon: Smartphone, iconColor: "text-purple-400", badgeColor: "bg-purple-900/40 text-purple-300 border-purple-800",
    description: "Get cash against your smartphone, laptop, or other electronics — 60% of market value.",
    minAmount: 500, maxAmount: 100000, minRate: 10, maxRate: 35, minTerm: 1, maxTerm: 4,
    collateral: "Smartphones, laptops, TVs, fridges", docs: ["NRC", "Purchase Receipt or Proof of Ownership"],
    eligibility: "Any individual with electronics",
  },
  {
    id: "loyalty", name: "Loyalty Client Loan", type: "LOYALTY",
    icon: Star, iconColor: "text-yellow-400", badgeColor: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
    description: "Preferential rates for clients who have repaid 2 or more loans without defaults.",
    minAmount: 300, maxAmount: 50000, minRate: 8, maxRate: 30, minTerm: 1, maxTerm: 4,
    collateral: "Electronics, vehicles, or other assets", docs: ["NRC"],
    eligibility: "2+ fully repaid loans, zero defaults",
    highlight: "Lower rates — reward for on-time repayment",
  },
  {
    id: "premium", name: "Premium Client Loan", type: "PREMIUM",
    icon: Crown, iconColor: "text-orange-400", badgeColor: "bg-orange-900/40 text-orange-300 border-orange-800",
    description: "Our best rates, reserved for Philix Finance's most trusted clients with 5+ repaid loans.",
    minAmount: 300, maxAmount: 50000, minRate: 5, maxRate: 25, minTerm: 1, maxTerm: 4,
    collateral: "Electronics, vehicles, or other assets", docs: ["NRC"],
    eligibility: "5+ repaid loans, zero defaults, good collateral",
    highlight: "Best rates in our portfolio",
  },
];

const K = (n: number) => `K${n.toLocaleString()}`;

function Calculator_({ product }: { product: Product }) {
  const [amount, setAmount] = useState(Math.round((product.minAmount + product.maxAmount) / 2));
  const [weeks, setWeeks] = useState(product.minTerm);
  const rate = product.minRate + ((weeks - product.minTerm) / Math.max(1, product.maxTerm - product.minTerm)) * (product.maxRate - product.minRate);
  const interest = Math.ceil(amount * (rate / 100));
  const total = amount + interest;

  return (
    <div className="bg-slate-800/60 rounded-xl p-4 mt-3 border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Calculator size={13} className="text-indigo-400" />
        <span className="text-xs font-semibold text-slate-300">Quick Calculator</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">Amount (K)</label>
          <input type="range" min={product.minAmount} max={product.maxAmount} step={100}
            value={amount} onChange={e => setAmount(Number(e.target.value))}
            className="w-full accent-indigo-500" />
          <div className="text-xs font-bold text-slate-200 mt-0.5">{K(amount)}</div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">Term (weeks)</label>
          <input type="range" min={product.minTerm} max={product.maxTerm} step={1}
            value={weeks} onChange={e => setWeeks(Number(e.target.value))}
            className="w-full accent-indigo-500" />
          <div className="text-xs font-bold text-slate-200 mt-0.5">{weeks} week{weeks > 1 ? "s" : ""}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-900/60 rounded-lg py-2">
          <div className="text-slate-500">Rate</div>
          <div className="font-bold text-slate-200">{rate.toFixed(0)}%</div>
        </div>
        <div className="bg-slate-900/60 rounded-lg py-2">
          <div className="text-slate-500">Interest</div>
          <div className="font-bold text-amber-400">{K(interest)}</div>
        </div>
        <div className="bg-indigo-900/40 rounded-lg py-2 border border-indigo-800">
          <div className="text-slate-500">Total Due</div>
          <div className="font-bold text-indigo-300">{K(total)}</div>
        </div>
      </div>
    </div>
  );
}

export default function LoanProductsPage() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandCalc, setExpandCalc] = useState<string | null>(null);

  function toggleCompare(id: string) {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
        : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  }

  const compareProducts = PRODUCTS.filter(p => compareIds.includes(p.id));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Loan Products</h1>
        <p className="text-slate-500 text-sm mt-0.5">Compare our products and find the right fit for you</p>
      </div>

      {/* Compare bar */}
      {compareIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-indigo-950/90 border border-indigo-800 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
          <span className="text-sm text-indigo-300 font-semibold">Comparing:</span>
          {compareIds.map(id => {
            const p = PRODUCTS.find(x => x.id === id)!;
            return (
              <span key={id} className="flex items-center gap-1.5 text-xs bg-indigo-800/50 text-indigo-200 px-2.5 py-1 rounded-lg border border-indigo-700">
                {p.name}
                <button onClick={() => toggleCompare(id)} className="text-indigo-400 hover:text-white ml-1"><X size={10} /></button>
              </span>
            );
          })}
          {compareIds.length === 2 && (
            <button onClick={() => setCompareIds([])}
              className="ml-auto text-xs text-indigo-400 hover:text-white border border-indigo-700 rounded-lg px-3 py-1">
              Clear
            </button>
          )}
        </div>
      )}

      {/* Comparison table */}
      {compareIds.length === 2 && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800">
            <h2 className="font-bold text-slate-200">Side-by-Side Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Feature</th>
                  {compareProducts.map(p => (
                    <th key={p.id} className="px-4 py-3 text-left">
                      <div className="flex items-center gap-2">
                        <p.icon size={14} className={p.iconColor} />
                        <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[
                  ["Min Amount", p => K(p.minAmount)],
                  ["Max Amount", p => K(p.maxAmount)],
                  ["Interest Rate", p => `${p.minRate}–${p.maxRate}% flat`],
                  ["Term", p => `${p.minTerm}–${p.maxTerm} weeks`],
                  ["Collateral", p => p.collateral],
                  ["Documents", p => p.docs.join(", ")],
                  ["Who Qualifies", p => p.eligibility],
                ].map(([label, getValue]) => (
                  <tr key={label as string} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{label as string}</td>
                    {compareProducts.map(p => (
                      <td key={p.id} className="px-4 py-3 text-xs text-slate-300">{(getValue as (p: Product) => string)(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRODUCTS.map(product => {
          const isComparing = compareIds.includes(product.id);
          return (
            <div key={product.id} className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all
              ${isComparing ? "border-indigo-600 ring-1 ring-indigo-600" : "border-slate-800 hover:border-slate-700"}`}>
              {/* Card header */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${product.badgeColor.split(" ")[0].replace("text-", "bg-").replace("300", "900/40")}`}>
                    <product.icon size={18} className={product.iconColor} />
                  </div>
                  {product.highlight && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${product.badgeColor}`}>
                      {product.highlight}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-100 text-sm leading-tight">{product.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{product.description}</p>
              </div>

              {/* Key stats */}
              <div className="px-5 py-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">Loan Amount</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{K(product.minAmount)} – {K(product.maxAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">Interest Rate</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{product.minRate}–{product.maxRate}% flat</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">Term</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">{product.minTerm}–{product.maxTerm} weeks</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">Collateral</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5 leading-tight">{product.collateral.split(",")[0]}</div>
                </div>
              </div>

              {/* Documents */}
              <div className="px-5 pb-4">
                <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Required Documents</div>
                <div className="flex flex-wrap gap-1">
                  {product.docs.map(doc => (
                    <span key={doc} className="flex items-center gap-1 text-[10px] bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700">
                      <Check size={8} className="text-emerald-500" /> {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Calculator toggle */}
              <div className="px-5 pb-4">
                <button onClick={() => setExpandCalc(expandCalc === product.id ? null : product.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <Calculator size={11} /> {expandCalc === product.id ? "Hide Calculator" : "Calculate Repayment"}
                </button>
                {expandCalc === product.id && <Calculator_ product={product} />}
              </div>

              {/* Footer actions */}
              <div className="px-5 pb-5 flex gap-2">
                <Link to="/portal/apply"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all">
                  Apply Now <ArrowRight size={11} />
                </Link>
                <button onClick={() => toggleCompare(product.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${isComparing ? "bg-indigo-800 border-indigo-600 text-indigo-200" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}>
                  {isComparing ? <Check size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-700 pb-2">
        All loans are subject to credit assessment and collateral valuation. Rates are flat rates per term.
        Final approval at discretion of Philix Finance Ltd.
      </p>
    </div>
  );
}
