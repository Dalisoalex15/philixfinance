import { useState, useEffect, useRef } from "react";
import { X, Search, User, Plus, Edit3, Banknote, Calendar, Percent, FileText, CheckCircle2, Zap } from "lucide-react";

const API = "/api";
function getToken() { return localStorage.getItem("philix_staff_token") ?? ""; }
function auth() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${Number(n || 0).toLocaleString("en-ZM", { minimumFractionDigits: 0 })}`;

interface Client { id: string; clientNumber: string; firstName: string; lastName: string; email: string; phone: string; status: string }
interface ExistingLoan {
  id: string; reference: string; productType: string; amountRequested: number;
  termMonths: number; interestRate: number; status: string; purpose: string;
  account: { firstName: string; lastName: string; email: string }
}

interface Props {
  mode: "create" | "edit" | "entry";
  loan?: ExistingLoan;
  onClose: () => void;
  onSuccess: () => void;
}

const PRODUCTS = ["BUSINESS", "SALARY", "STUDENT", "LOGBOOK", "EMERGENCY", "AGRICULTURAL", "GROUP", "OTHER"];
const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED", "REPAID", "REJECTED"];

export default function StaffLoanModal({ mode, loan, onClose, onSuccess }: Props) {
  // Client search (create mode)
  const [query,   setQuery]   = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form fields
  const [product,    setProduct]    = useState(loan?.productType ?? "BUSINESS");
  const [amount,     setAmount]     = useState(String(loan?.amountRequested ?? ""));
  const [weeks,      setWeeks]      = useState(String(loan?.termMonths ?? "4"));
  const [rate,       setRate]       = useState(String(loan?.interestRate ?? "20"));
  const [purpose,    setPurpose]    = useState(loan?.purpose ?? "Business");
  const [status,     setStatus]     = useState(loan?.status ?? "SUBMITTED");
  const [disburse,   setDisburse]   = useState(false);
  const [notes,      setNotes]      = useState("");

  // Manual entry fields
  const [entryType,   setEntryType]   = useState("PAYMENT");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryMethod, setEntryMethod] = useState("CASH");
  const [entryRef,    setEntryRef]    = useState("");
  const [entryNotes,  setEntryNotes]  = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // Live loan preview
  const principal = parseFloat(amount) || 0;
  const w = parseInt(weeks) || 1;
  const r = parseFloat(rate) || 20;
  const interest = Math.round(principal * (r / 100));
  const totalDue = principal + interest;
  const weeklyPmt = w > 0 ? Math.ceil(totalDue / w) : 0;

  // Search portal clients
  useEffect(() => {
    if (mode !== "create") return;
    if (debounce.current) clearTimeout(debounce.current);
    if (query.length < 2) { setClients([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`${API}/accounts/search-clients?q=${encodeURIComponent(query)}`, { headers: auth() });
      const d = await res.json();
      setClients(d.clients ?? []);
      setSearching(false);
    }, 300);
  }, [query, mode]);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      let res: Response;

      if (mode === "create") {
        if (!selected) { setError("Select a client first"); setLoading(false); return; }
        if (!amount || !weeks) { setError("Amount and term are required"); setLoading(false); return; }
        res = await fetch(`${API}/accounts/create-loan`, {
          method: "POST", headers: auth(),
          body: JSON.stringify({
            accountId: selected.id, productType: product,
            amountRequested: parseFloat(amount), termWeeks: parseInt(weeks),
            interestRate: parseFloat(rate), purpose, description: notes,
            status, disbursedNow: disburse,
            staffName: "Staff",
          }),
        });
      } else if (mode === "edit") {
        res = await fetch(`${API}/accounts/${loan!.id}`, {
          method: "PATCH", headers: auth(),
          body: JSON.stringify({
            amountRequested: parseFloat(amount),
            termWeeks: parseInt(weeks),
            interestRate: parseFloat(rate),
            purpose, status, reviewedBy: "Staff",
          }),
        });
      } else {
        // manual entry
        if (!entryAmount) { setError("Amount required"); setLoading(false); return; }
        res = await fetch(`${API}/accounts/${loan!.id}/manual-entry`, {
          method: "POST", headers: auth(),
          body: JSON.stringify({
            type: entryType, amount: parseFloat(entryAmount),
            paymentMethod: entryMethod, reference: entryRef || undefined,
            notes: entryNotes, staffName: "Staff",
          }),
        });
      }

      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Something went wrong"); }
      else { setSuccess(mode === "entry" ? "Entry added to ledger" : `Loan ${mode === "create" ? "created" : "updated"} — Ref: ${d.reference ?? d.loan?.reference ?? ""}!`); setTimeout(() => { onSuccess(); onClose(); }, 2000); }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  const title = mode === "create" ? "Create Staff Loan" : mode === "edit" ? `Edit Loan — ${loan?.reference}` : `Add Manual Entry — ${loan?.reference}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.1)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            {mode === "create" ? <Plus size={16} className="text-indigo-400" />
            : mode === "edit"  ? <Edit3 size={16} className="text-amber-400" />
            : <Banknote size={16} className="text-emerald-400" />}
            <h2 className="font-bold text-slate-200">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">

          {/* ── Feedback ── */}
          {error   && <div className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-900/40 text-red-400 border border-red-800/50">{error}</div>}
          {success && (
            <div className="px-3 py-3 rounded-xl text-sm font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 flex items-center gap-2">
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          {/* ── MANUAL ENTRY mode ── */}
          {mode === "entry" && (
            <>
              <div className="text-xs text-slate-400 bg-slate-800/50 rounded-xl p-3">
                Adding entry to: <span className="font-bold text-slate-200">{loan?.account?.firstName} {loan?.account?.lastName}</span> · {loan?.reference}
              </div>

              {/* Entry type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Entry Type</label>
                <div className="flex gap-2">
                  {["PAYMENT", "ADJUSTMENT", "WRITE-OFF", "PENALTY"].map(t => (
                    <button key={t} onClick={() => setEntryType(t)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${entryType === t ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (ZMW)" value={entryAmount} onChange={setEntryAmount} type="number" placeholder="e.g. 700" />
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Method</label>
                  <select value={entryMethod} onChange={e => setEntryMethod(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-600">
                    {["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE", "OTHER"].map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>

              <Field label="Transaction Reference (optional)" value={entryRef} onChange={setEntryRef} placeholder="e.g. TXN-12345" />
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                  placeholder="Any additional notes about this entry..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600 resize-none h-20" />
              </div>
            </>
          )}

          {/* ── CREATE / EDIT mode ── */}
          {mode !== "entry" && (
            <>
              {/* Client search (create only) */}
              {mode === "create" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Search Client</label>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
                      placeholder="Name, phone, email, or client number..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600" />
                  </div>

                  {/* Search results */}
                  {(clients.length > 0 || searching) && !selected && (
                    <div className="mt-1.5 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                      {searching && <div className="px-3 py-2.5 text-xs text-slate-500">Searching…</div>}
                      {clients.map(c => (
                        <button key={c.id} onClick={() => { setSelected(c); setQuery(`${c.firstName} ${c.lastName}`); setClients([]); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 text-left transition-colors"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-[10px]">
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-200">{c.firstName} {c.lastName}</div>
                            <div className="text-[10px] text-slate-500">{c.clientNumber} · {c.phone} · {c.email}</div>
                          </div>
                          <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-900/40 text-emerald-400" : "bg-amber-900/40 text-amber-400"}`}>{c.status}</span>
                        </button>
                      ))}
                      {!searching && clients.length === 0 && (
                        <div className="px-3 py-2.5 text-xs text-slate-500">No clients found</div>
                      )}
                    </div>
                  )}

                  {/* Selected client chip */}
                  {selected && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
                      <User size={12} className="text-indigo-400" />
                      <span className="text-sm font-semibold text-indigo-300">{selected.firstName} {selected.lastName}</span>
                      <span className="text-xs text-slate-500">{selected.clientNumber}</span>
                      <button onClick={() => { setSelected(null); setQuery(""); }} className="ml-auto text-slate-500 hover:text-red-400">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Edit mode — show client info */}
              {mode === "edit" && loan && (
                <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Editing loan for: <span className="font-bold text-slate-200">{loan.account.firstName} {loan.account.lastName}</span>
                </div>
              )}

              {/* Product type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product Type</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTS.map(p => (
                    <button key={p} onClick={() => setProduct(p)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${product === p ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount + Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    <Banknote size={10} className="inline mr-1" />Principal Amount (ZMW)
                  </label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" step="100"
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    <Calendar size={10} className="inline mr-1" />Term (weeks)
                  </label>
                  <input value={weeks} onChange={e => setWeeks(e.target.value)} type="number" min="1" max="52"
                    placeholder="e.g. 4"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600" />
                </div>
              </div>

              {/* Interest rate + Purpose */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    <Percent size={10} className="inline mr-1" />Interest Rate (%)
                  </label>
                  <input value={rate} onChange={e => setRate(e.target.value)} type="number" min="0" max="100" step="0.5"
                    placeholder="e.g. 20"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600" />
                </div>
                <Field label="Purpose" value={purpose} onChange={setPurpose} placeholder="e.g. Stock purchase" />
              </div>

              {/* Status (edit only) */}
              {mode === "edit" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-600">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <FileText size={10} className="inline mr-1" />{mode === "create" ? "Notes / Description" : "Edit Reason"}
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600 resize-none h-16" />
              </div>

              {/* Live preview */}
              {principal > 0 && (
                <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-3">Loan Preview</div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Principal",  value: K(principal) },
                      { label: "Interest",   value: K(interest) },
                      { label: "Total Due",  value: K(totalDue) },
                      { label: `Weekly (÷${w})`, value: K(weeklyPmt) },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
                        <div className="text-sm font-extrabold text-indigo-300">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disburse now toggle (create only) */}
              {mode === "create" && (
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all" style={{ background: disburse ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${disburse ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${disburse ? "bg-emerald-500" : "bg-slate-700"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${disburse ? "translate-x-4" : ""}`} />
                  </div>
                  <input type="checkbox" checked={disburse} onChange={e => setDisburse(e.target.checked)} className="hidden" />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">Disburse immediately</div>
                    <div className="text-[10px] text-slate-500">Mark as DISBURSED and send statement email to client</div>
                  </div>
                  <Zap size={14} className={disburse ? "text-emerald-400 ml-auto" : "text-slate-600 ml-auto"} />
                </label>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors" style={{ background: "rgba(255,255,255,0.04)" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading || !!success}
            className="flex-2 flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: mode === "entry" ? "#059669" : mode === "edit" ? "#d97706" : "#6366f1" }}>
            {loading ? "Saving…" : mode === "create" ? "Create Loan" : mode === "edit" ? "Save Changes" : "Add to Ledger"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600" />
    </div>
  );
}
