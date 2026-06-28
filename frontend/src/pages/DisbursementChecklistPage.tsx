import { useState, useEffect, useCallback } from "react";
import { Search, CheckSquare, Square, RefreshCw, AlertTriangle, CheckCircle, X, Zap } from "lucide-react";

const API = "/api";
function getToken() { return localStorage.getItem("philix-auth-v3") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  totalRepayable: number;
  termMonths: number;
  status: string;
  submittedAt: string;
  purpose?: string;
  portalAccount?: { firstName: string; lastName: string; phone?: string; email?: string };
}

const CHECKLIST_ITEMS = [
  { id: "kyc",           label: "KYC documents verified",                      desc: "NRC/Passport copies reviewed and certified" },
  { id: "nrc",           label: "NRC/Passport checked",                         desc: "Identity document is valid and not expired" },
  { id: "employment",    label: "Employment letter verified",                    desc: "If salaried — letter from employer on file" },
  { id: "collateral",    label: "Collateral documented and valued",              desc: "Collateral form completed, photos uploaded" },
  { id: "agreement",     label: "Loan agreement signed",                         desc: "Client and officer signatures confirmed" },
  { id: "bank",          label: "Bank account details confirmed",                desc: "Account number and bank name verified" },
  { id: "kin",           label: "Next-of-kin information on file",              desc: "Emergency contact details captured" },
  { id: "credit",        label: "Credit check completed",                        desc: "Credit score reviewed and acceptable" },
  { id: "manager",       label: "Manager approval obtained",                     desc: "Branch manager sign-off recorded" },
  { id: "amount",        label: "Disbursement amount confirmed",                 desc: "Final amount matches loan agreement" },
];

function getStorageKey(ref: string) { return `philix_checklist_${ref}`; }

function loadChecked(ref: string): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(getStorageKey(ref)) ?? "{}"); } catch { return {}; }
}

function saveChecked(ref: string, checked: Record<string, boolean>) {
  localStorage.setItem(getStorageKey(ref), JSON.stringify(checked));
}

export default function DisbursementChecklistPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LoanApp[]>([]);
  const [selected, setSelected] = useState<LoanApp | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [disbursed, setDisbursed] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`${API}/admin/applications?search=${encodeURIComponent(q)}&limit=20`, { headers: authH() });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const apps: LoanApp[] = d.applications ?? d.data ?? d ?? [];
      setResults(apps.filter(a => ["APPROVED", "SUBMITTED", "UNDER_REVIEW"].includes(a.status)));
    } catch {
      setResults([]);
    } finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 350);
    return () => clearTimeout(t);
  }, [query, search]);

  function selectLoan(app: LoanApp) {
    setSelected(app);
    setChecked(loadChecked(app.reference));
    setResults([]);
    setQuery("");
    setDisbursed(false);
  }

  function toggle(id: string) {
    if (!selected) return;
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveChecked(selected.reference, next);
  }

  const completedCount = CHECKLIST_ITEMS.filter(i => checked[i.id]).length;
  const allComplete = completedCount === CHECKLIST_ITEMS.length;

  async function confirmDisburse() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setShowConfirm(false);
    setDisbursed(true);
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#C9A227]" />
            Disbursement Checklist
          </h1>
          <p className="text-sm text-slate-500 mt-1">Complete all verification steps before disbursing a loan</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search loan reference or client name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227] shadow-sm"
          />
          {searching && <RefreshCw className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg mb-6 overflow-hidden">
            {results.map(app => (
              <button
                key={app.id}
                onClick={() => selectLoan(app)}
                className="w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-[#F5F0E6] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#0B1F3A] text-sm">
                      {app.portalAccount ? `${app.portalAccount.firstName} ${app.portalAccount.lastName}` : "Unknown"}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">{app.reference} · {app.productType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-sm text-[#0B1F3A]">{K(app.amountRequested)}</p>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{app.status}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Loan Details + Checklist */}
        {selected ? (
          <div className="space-y-4">
            {/* Loan Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold text-[#0B1F3A] text-lg">
                    {selected.portalAccount ? `${selected.portalAccount.firstName} ${selected.portalAccount.lastName}` : "Unknown Client"}
                  </h2>
                  <p className="text-sm text-slate-400 font-mono">{selected.reference}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  { label: "Amount", value: K(selected.amountRequested), mono: true },
                  { label: "Product", value: selected.productType, mono: false },
                  { label: "Term", value: `${selected.termMonths ?? "—"} wks`, mono: false },
                  { label: "Status", value: selected.status, mono: false },
                ].map(item => (
                  <div key={item.label} className="bg-[#F5F0E6] rounded-lg p-2.5">
                    <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                    <p className={`font-semibold text-[#0B1F3A] ${item.mono ? "font-mono" : ""}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#0B1F3A]">Checklist Progress</span>
                <span className={`text-sm font-mono font-bold ${allComplete ? "text-emerald-600" : "text-[#C9A227]"}`}>
                  {completedCount} of {CHECKLIST_ITEMS.length} complete
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${allComplete ? "bg-emerald-500" : "bg-[#C9A227]"}`}
                  style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {CHECKLIST_ITEMS.map((item, i) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`flex-shrink-0 w-5 h-5 rounded mt-0.5 border-2 flex items-center justify-center transition-colors ${checked[item.id] ? "bg-[#C9A227] border-[#C9A227]" : "border-slate-300 hover:border-[#C9A227]"}`}
                  >
                    {checked[item.id] && <CheckCircle className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${checked[item.id] ? "text-slate-400 line-through" : "text-[#0B1F3A]"}`}>{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-xs text-slate-300 font-mono">{String(i + 1).padStart(2, "0")}</span>
                </label>
              ))}
            </div>

            {/* Disburse Button */}
            {disbursed ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-emerald-700">Disbursement Initiated</p>
                <p className="text-xs text-emerald-600 mt-1">Loan {selected.reference} has been queued for disbursement.</p>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!allComplete}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${allComplete ? "bg-[#C9A227] hover:bg-[#b8911f] text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
              >
                <Zap className="w-4 h-4" />
                {allComplete ? "Disburse Now" : `Complete all ${CHECKLIST_ITEMS.length - completedCount} remaining items to unlock`}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Search className="w-12 h-12" />
            <p className="font-medium">Search for a loan to begin the checklist</p>
            <p className="text-xs text-center max-w-sm">Enter a loan reference number or client name above to load the disbursement checklist</p>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirm && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0B1F3A] text-lg">Confirm Disbursement</h3>
              <button onClick={() => setShowConfirm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                This action cannot be undone. Ensure all details are correct.
              </p>
            </div>
            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Client</span><span className="font-medium text-[#0B1F3A]">{selected.portalAccount?.firstName} {selected.portalAccount?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Loan Ref</span><span className="font-mono text-[#0B1F3A]">{selected.reference}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-mono font-bold text-[#0B1F3A]">{K(selected.amountRequested)}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={confirmDisburse}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-[#C9A227] text-white text-sm font-medium hover:bg-[#b8911f] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Disburse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
