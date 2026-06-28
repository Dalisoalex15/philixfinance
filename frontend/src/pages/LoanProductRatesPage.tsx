// Feature 1 — Editable Loan Product Rates (CEO)
import { useState, useEffect } from "react";
import { Pencil, CheckCircle, X, Loader2, AlertTriangle, Info } from "lucide-react";

const api = (path: string, opts?: RequestInit) => {
  const token = localStorage.getItem("philix-auth-v3");
  return fetch(`/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opts?.headers },
  });
};

// Loan products are defined locally since they live in mock data on this stack
// The CEO edits rates here; new loans pick them up automatically
const BUILT_IN_PRODUCTS = [
  { key: "salary_loan",     name: "Salary Loan",      minAmount: 500,   maxAmount: 50000, minTerm: 1, maxTerm: 6,  interestRate: 20, processingFee: 2,  penaltyRate: 5,  gracePeriod: 3  },
  { key: "business_loan",   name: "Business Loan",    minAmount: 1000,  maxAmount: 100000, minTerm: 1, maxTerm: 12, interestRate: 25, processingFee: 3,  penaltyRate: 5,  gracePeriod: 3  },
  { key: "student_loan",    name: "Student Loan",     minAmount: 500,   maxAmount: 10000, minTerm: 1, maxTerm: 6,  interestRate: 15, processingFee: 1.5, penaltyRate: 3, gracePeriod: 7  },
  { key: "logbook_loan",    name: "Logbook Loan",     minAmount: 2000,  maxAmount: 200000, minTerm: 1, maxTerm: 24, interestRate: 18, processingFee: 2,  penaltyRate: 5,  gracePeriod: 3  },
  { key: "emergency_loan",  name: "Emergency Loan",   minAmount: 200,   maxAmount: 5000,  minTerm: 1, maxTerm: 3,  interestRate: 30, processingFee: 5,  penaltyRate: 8,  gracePeriod: 0  },
  { key: "group_loan",      name: "Group Loan",       minAmount: 500,   maxAmount: 20000, minTerm: 1, maxTerm: 6,  interestRate: 22, processingFee: 2,  penaltyRate: 5,  gracePeriod: 3  },
];

const RATE_FIELDS = [
  { key: "interestRate",   label: "Interest Rate",    suffix: "% flat/month" },
  { key: "processingFee",  label: "Processing Fee",   suffix: "%" },
  { key: "penaltyRate",    label: "Penalty Rate",     suffix: "% / week" },
  { key: "gracePeriod",    label: "Grace Period",     suffix: "days" },
  { key: "minAmount",      label: "Min Amount",       prefix: "K" },
  { key: "maxAmount",      label: "Max Amount",       prefix: "K" },
  { key: "minTerm",        label: "Min Term",         suffix: " month(s)" },
  { key: "maxTerm",        label: "Max Term",         suffix: " month(s)" },
];

type Product = typeof BUILT_IN_PRODUCTS[0];

export default function LoanProductRatesPage() {
  const [products, setProducts]       = useState<Product[]>(BUILT_IN_PRODUCTS);
  const [editing, setEditing]         = useState<string | null>(null);
  const [draft, setDraft]             = useState<Partial<Product>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved]             = useState<string | null>(null);

  // Load from localStorage (CEO persists edits locally until backend table exists)
  useEffect(() => {
    const stored = localStorage.getItem("philix-product-rates");
    if (stored) { try { setProducts(JSON.parse(stored)); } catch { /* ignore */ } }
  }, []);

  const startEdit = (p: Product) => { setEditing(p.key); setDraft({ ...p }); };

  const confirmSave = () => {
    if (!editing) return;
    const updated = products.map(p => p.key === editing ? { ...p, ...draft } : p);
    setProducts(updated);
    localStorage.setItem("philix-product-rates", JSON.stringify(updated));
    setSaved(editing);
    setEditing(null); setShowConfirm(false);
    setTimeout(() => setSaved(null), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1F3A]">Loan Product Rates</h1>
        <p className="text-sm text-gray-500 mt-1">CEO only. Editing rates applies to NEW loans only — existing loans keep their original rates.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-amber-700 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">Rate changes affect <strong>new loan applications only</strong>. All existing and disbursed loans retain the rate at origination time.</p>
      </div>

      <div className="space-y-4">
        {products.map(p => (
          <div key={p.key} className={`bg-white border-2 rounded-xl overflow-hidden transition-colors ${saved === p.key ? "border-emerald-400" : "border-gray-200 hover:border-[#C9A227]/40"}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {saved === p.key && <CheckCircle size={16} className="text-emerald-500" />}
                <h3 className="font-bold text-[#0B1F3A]">{p.name}</h3>
              </div>
              {editing !== p.key && (
                <button onClick={() => startEdit(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#C9A227] hover:text-[#0B1F3A]">
                  <Pencil size={13} /> Edit Rates
                </button>
              )}
            </div>

            {editing === p.key ? (
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {RATE_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#C9A227]">
                        {f.prefix && <span className="px-2 py-2 bg-gray-50 text-gray-500 text-xs border-r border-gray-200">{f.prefix}</span>}
                        <input type="number" value={(draft as any)[f.key] ?? ""} onChange={e => setDraft(d => ({ ...d, [f.key]: Number(e.target.value) }))}
                          min="0" step="0.1"
                          className="flex-1 px-3 py-2 text-sm focus:outline-none w-full" />
                        {f.suffix && <span className="px-2 py-2 bg-gray-50 text-gray-500 text-xs border-l border-gray-200 whitespace-nowrap">{f.suffix}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowConfirm(true)}
                    className="px-5 py-2 bg-[#0B1F3A] text-white rounded-lg text-sm font-semibold hover:bg-[#0B1F3A]/90">
                    Save Changes
                  </button>
                  <button onClick={() => { setEditing(null); setDraft({}); }}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {RATE_FIELDS.map(f => (
                  <div key={f.key}>
                    <p className="text-xs text-gray-500">{f.label}</p>
                    <p className="font-bold text-[#0B1F3A] font-mono text-sm">
                      {f.prefix || ""}{(p as any)[f.key]}{f.suffix || ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className="font-bold text-[#0B1F3A]">Confirm Rate Change</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">This applies to <strong>new loan applications only</strong>. All existing and disbursed loans keep their original rates. Continue?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              <button onClick={confirmSave} className="flex-1 py-2 bg-[#0B1F3A] text-white rounded-lg text-sm font-semibold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
