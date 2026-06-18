import { useState, useEffect, useCallback } from "react";
import {
  PlusCircle, RefreshCw, Banknote, TrendingUp, TrendingDown,
  Wallet, X, Trash2, Smartphone, Building2, DollarSign, Users,
} from "lucide-react";

const API = "/api";
function token() { return localStorage.getItem("philix_staff_token") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SOURCES = [
  { value: "MOBILE_MONEY",  label: "Mobile Money",   icon: Smartphone },
  { value: "BANK_TRANSFER", label: "Bank Transfer",  icon: Building2 },
  { value: "CASH",          label: "Cash Deposit",   icon: Banknote },
  { value: "INVESTOR",      label: "Investor",        icon: Users },
  { value: "OTHER",         label: "Other",           icon: DollarSign },
];

const PROVIDERS: Record<string, string[]> = {
  MOBILE_MONEY:  ["Airtel Money", "MTN Mobile Money", "Zamtel Kwacha", "Other"],
  BANK_TRANSFER: ["Zanaco", "FNB Zambia", "Stanbic Zambia", "Atlas Mara", "Indo Zambia Bank", "Absa Zambia", "Other"],
  CASH:          [],
  INVESTOR:      [],
  OTHER:         [],
};

interface Entry {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  source: string;
  provider: string | null;
  reference: string | null;
  description: string | null;
  addedBy: string;
  entryDate: string;
  createdAt: string;
}

interface Summary {
  totalDeposits: number;
  totalWithdrawals: number;
  netCapital: number;
  entryCount: number;
}

const SOURCE_LABEL: Record<string, string> = {
  MOBILE_MONEY: "Mobile Money", BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash", INVESTOR: "Investor", OTHER: "Other",
};

const SOURCE_ICON: Record<string, React.ElementType> = {
  MOBILE_MONEY: Smartphone, BANK_TRANSFER: Building2,
  CASH: Banknote, INVESTOR: Users, OTHER: DollarSign,
};

export default function CapitalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalDeposits: 0, totalWithdrawals: 0, netCapital: 0, entryCount: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("MOBILE_MONEY");
  const [provider, setProvider] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/capital`, { headers: authH() });
      if (r.ok) {
        const data = await r.json();
        setEntries(data.entries);
        setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(t: "DEPOSIT" | "WITHDRAWAL") {
    setType(t);
    setAmount(""); setSource("MOBILE_MONEY"); setProvider("");
    setReference(""); setDescription("");
    setEntryDate(new Date().toISOString().slice(0, 10));
    setFormError("");
    setModal(true);
  }

  async function submit() {
    setFormError("");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFormError("Enter a valid amount greater than 0"); return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/capital`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ type, amount: Number(amount), source, provider: provider || undefined, reference: reference || undefined, description: description || undefined, entryDate }),
      });
      if (r.ok) {
        setModal(false);
        await load();
      } else {
        const d = await r.json();
        setFormError(d.error || "Failed to save entry");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this capital entry? This cannot be undone.")) return;
    setDeleteLoading(id);
    try {
      await fetch(`${API}/capital/${id}`, { method: "DELETE", headers: authH() });
      await load();
    } finally {
      setDeleteLoading(null);
    }
  }

  const providerOptions = PROVIDERS[source] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Capital & Funding</h1>
          <p className="page-subtitle">Track money deposited into and withdrawn from the business</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary py-2 px-3 flex items-center gap-1.5">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => openModal("WITHDRAWAL")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-100 text-red-700 border border-red-200 rounded-xl hover:bg-red-200 transition-colors">
            <TrendingDown size={15} /> Record Withdrawal
          </button>
          <button onClick={() => openModal("DEPOSIT")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow">
            <PlusCircle size={15} /> Add Funds
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="philix-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-navy-900">{K(summary.totalDeposits)}</div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Deposits</div>
            <div className="text-xs text-navy-500">All money added to business</div>
          </div>
        </div>

        <div className="philix-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-100 text-red-700 flex-shrink-0">
            <TrendingDown size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-navy-900">{K(summary.totalWithdrawals)}</div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Withdrawals</div>
            <div className="text-xs text-navy-500">Money taken out</div>
          </div>
        </div>

        <div className="philix-card p-5 flex items-center gap-4 border-2 border-indigo-200">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700 flex-shrink-0">
            <Wallet size={22} />
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${summary.netCapital >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {K(Math.abs(summary.netCapital))}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Net Capital Available</div>
            <div className="text-xs text-navy-500">{summary.netCapital >= 0 ? "Positive balance" : "Deficit — review withdrawals"}</div>
          </div>
        </div>
      </div>

      {/* Source breakdown */}
      {entries.length > 0 && (
        <div className="philix-card p-5">
          <h3 className="section-title mb-4">Deposits by Source</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SOURCES.map(s => {
              const total = entries
                .filter(e => e.type === "DEPOSIT" && e.source === s.value)
                .reduce((sum, e) => sum + e.amount, 0);
              const Icon = s.icon;
              return (
                <div key={s.value} className="text-center p-3 bg-warm-50 border border-warm-200 rounded-xl">
                  <Icon size={18} className="mx-auto mb-1 text-navy-500" />
                  <div className="text-sm font-bold font-mono text-navy-900">{K(total)}</div>
                  <div className="text-[10px] text-navy-500 mt-0.5">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="philix-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200">
          <h3 className="section-title">All Entries</h3>
          <span className="text-xs text-navy-500">{entries.length} records</span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-navy-500">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Wallet size={36} className="mx-auto mb-3 text-navy-300" />
            <div className="text-navy-500 font-medium">No capital entries yet</div>
            <div className="text-navy-400 text-sm mt-1">Click "Add Funds" to record your first deposit</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-navy-500 border-b border-warm-200 bg-warm-50">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Source</th>
                  <th className="text-left px-4 py-3 font-medium">Provider / Bank</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Added By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {entries.map(e => {
                  const SIcon = SOURCE_ICON[e.source] ?? DollarSign;
                  return (
                    <tr key={e.id} className="hover:bg-warm-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-navy-600 whitespace-nowrap">
                        {new Date(e.entryDate).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          e.type === "DEPOSIT"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }`}>
                          {e.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-navy-700">
                          <SIcon size={13} className="text-navy-400 flex-shrink-0" />
                          {SOURCE_LABEL[e.source] ?? e.source}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-navy-600">{e.provider || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-navy-600">{e.reference || "—"}</td>
                      <td className="px-4 py-3 text-xs text-navy-600 max-w-[200px] truncate">{e.description || "—"}</td>
                      <td className={`px-4 py-3 text-right text-sm font-bold font-mono whitespace-nowrap ${
                        e.type === "DEPOSIT" ? "text-emerald-700" : "text-red-700"
                      }`}>
                        {e.type === "WITHDRAWAL" ? "−" : "+"}{K(e.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-navy-500 whitespace-nowrap">{e.addedBy}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteEntry(e.id)}
                          disabled={deleteLoading === e.id}
                          className="p-1 text-navy-400 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Funds / Withdrawal Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-warm-200">
            {/* Modal header */}
            <div className={`flex items-center justify-between px-6 py-4 rounded-t-2xl ${
              type === "DEPOSIT" ? "bg-emerald-50 border-b border-emerald-100" : "bg-red-50 border-b border-red-100"
            }`}>
              <div className="flex items-center gap-2">
                {type === "DEPOSIT"
                  ? <TrendingUp size={18} className="text-emerald-600" />
                  : <TrendingDown size={18} className="text-red-600" />}
                <h2 className={`font-bold text-lg ${type === "DEPOSIT" ? "text-emerald-800" : "text-red-800"}`}>
                  {type === "DEPOSIT" ? "Add Funds" : "Record Withdrawal"}
                </h2>
              </div>
              <button onClick={() => setModal(false)} className="text-navy-400 hover:text-navy-700"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setType("DEPOSIT")}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                    type === "DEPOSIT"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-warm-50 text-navy-600 border-warm-300 hover:bg-warm-100"
                  }`}
                >
                  + Deposit
                </button>
                <button
                  onClick={() => setType("WITHDRAWAL")}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                    type === "WITHDRAWAL"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-warm-50 text-navy-600 border-warm-300 hover:bg-warm-100"
                  }`}
                >
                  − Withdrawal
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1.5">Amount (ZMW) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500 font-semibold text-sm">K</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    className="w-full pl-8 pr-4 py-2.5 border border-warm-300 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-indigo-500 bg-warm-50"
                  />
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1.5">Source *</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {SOURCES.map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.value}
                        onClick={() => { setSource(s.value); setProvider(""); }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-semibold transition-colors ${
                          source === s.value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-warm-50 text-navy-600 border-warm-200 hover:bg-warm-100"
                        }`}
                      >
                        <Icon size={15} />
                        {s.label.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider (if applicable) */}
              {providerOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-navy-600 mb-1.5">
                    {source === "MOBILE_MONEY" ? "Mobile Money Provider" : "Bank Name"}
                  </label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    className="w-full px-3 py-2.5 border border-warm-300 rounded-xl text-sm text-navy-900 bg-warm-50 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select…</option>
                    {providerOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1.5">Transaction Reference (optional)</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. TXN-2026-001234"
                  className="w-full px-3 py-2.5 border border-warm-300 rounded-xl text-sm text-navy-900 bg-warm-50 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-warm-300 rounded-xl text-sm text-navy-900 bg-warm-50 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1.5">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Initial capital injection for June operations"
                  rows={2}
                  className="w-full px-3 py-2 border border-warm-300 rounded-xl text-sm text-navy-900 bg-warm-50 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {formError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModal(false)} className="flex-1 py-2.5 text-sm font-semibold text-navy-600 border border-warm-300 rounded-xl hover:bg-warm-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting || !amount}
                  className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${
                    type === "DEPOSIT" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submitting ? "Saving…" : type === "DEPOSIT" ? "Record Deposit" : "Record Withdrawal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
