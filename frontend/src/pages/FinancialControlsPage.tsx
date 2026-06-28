import { useState, useEffect, useCallback } from "react";
import {
  Lock, Pencil, Plus, Trash2, Edit2, CheckCircle, AlertTriangle,
  X, Loader2, TrendingUp, TrendingDown, Download, ChevronDown,
  Banknote, Building2, Wallet, ShieldAlert, ShieldCheck, RefreshCw,
  Medal,
} from "lucide-react";

const api = (path: string, opts?: RequestInit) => {
  const token = localStorage.getItem("philix-auth-v3");
  return fetch(`/api/financials${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opts?.headers },
  });
};

function fmtK(n: number) {
  return "K" + Number(n ?? 0).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FinancialSetting { settingKey: string; settingValue: number; description: string; lastUpdatedBy?: string; lastUpdatedAt?: string }
interface CashPosition { cash_in_bank: number; cash_at_hand: number; petty_cash: number; total_cash_available: number; minimum_reserve: number; net_available: number; disbursed_today: number; collected_today: number; expenses_today: number; can_disburse: boolean }
interface ManualEntry { id: string; entryType: string; direction: string; amount: number; description: string; effectiveDate: string; enteredBy: string; auditNote?: string; createdAt: string }
interface BranchData { branch: string; disbursed: number; collected: number; collectionRate: number; loanCount: number; par: number; disbTarget: number; rank: number }

const ENTRY_TYPES = [
  { value: "bank_deposit",       label: "Bank Deposit",          direction: "in"  },
  { value: "bank_withdrawal",    label: "Bank Withdrawal",       direction: "out" },
  { value: "capital_injection",  label: "Capital Injection",     direction: "in"  },
  { value: "capital_withdrawal", label: "Capital Withdrawal",    direction: "out" },
  { value: "external_income",    label: "External Income",       direction: "in"  },
  { value: "external_expense",   label: "External Expense",      direction: "out" },
  { value: "cash_adjustment",    label: "Cash Adjustment",       direction: "in"  },
];

const MEDAL: Record<number, { icon: string; color: string }> = {
  1: { icon: "🥇", color: "text-yellow-600" },
  2: { icon: "🥈", color: "text-gray-500" },
  3: { icon: "🥉", color: "text-amber-700" },
};

// ═════════════════════════════════════════════════════════════════════════════
// CASH POSITION CARD
// ═════════════════════════════════════════════════════════════════════════════
function CashPositionCard({ pos, onRefresh }: { pos: CashPosition | null; onRefresh: () => void }) {
  if (!pos) return <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse h-40" />;

  const healthy = pos.can_disburse && pos.net_available > 0;

  return (
    <div className={`border-2 rounded-xl p-6 ${healthy ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {healthy ? <ShieldCheck size={20} className="text-emerald-600" /> : <ShieldAlert size={20} className="text-red-600" />}
          <h3 className="font-bold text-[#0B1F3A]">Cash Position</h3>
        </div>
        <button onClick={onRefresh} className="p-1.5 rounded hover:bg-white/60 text-gray-400">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className={`rounded-lg px-4 py-3 mb-4 ${healthy ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
        <p className="font-bold text-sm">
          {healthy
            ? `${fmtK(pos.net_available)} available for disbursement.`
            : pos.net_available <= 0
              ? "Cash position below minimum reserve. Pause disbursements."
              : "Warning: Net available position is critical."}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label: "Bank",        value: pos.cash_in_bank },
          { label: "At Hand",     value: pos.cash_at_hand },
          { label: "Petty Cash",  value: pos.petty_cash },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-bold text-[#0B1F3A] font-mono text-sm">{fmtK(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-center text-gray-600">
        <div><span className="text-emerald-600 font-bold">{fmtK(pos.collected_today)}</span><br />Collected today</div>
        <div><span className="text-red-500 font-bold">{fmtK(pos.disbursed_today)}</span><br />Disbursed today</div>
        <div><span className="text-orange-500 font-bold">{fmtK(pos.expenses_today)}</span><br />Expenses today</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EDITABLE SETTING TILE
// ═════════════════════════════════════════════════════════════════════════════
function SettingTile({ setting, onSaved }: { setting: FinancialSetting; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState("");
  const [note, setNote]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    cash_in_bank:    { label: "Cash in Bank",      icon: Building2, color: "text-blue-600" },
    cash_at_hand:    { label: "Cash at Hand",      icon: Banknote,  color: "text-emerald-600" },
    petty_cash:      { label: "Petty Cash",        icon: Wallet,    color: "text-amber-600" },
    opening_capital: { label: "Opening Capital",   icon: TrendingUp, color: "text-indigo-600" },
    minimum_reserve: { label: "Minimum Reserve",   icon: ShieldAlert, color: "text-red-600" },
  };

  const meta = LABELS[setting.settingKey] || { label: setting.settingKey, icon: Banknote, color: "text-gray-600" };
  const Icon = meta.icon;

  const save = async () => {
    if (!note.trim()) { setError("Reason is required"); return; }
    setSaving(true); setError("");
    const r = await api(`/settings/${setting.settingKey}`, {
      method: "PUT",
      body: JSON.stringify({ value: Number(value), audit_note: note }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Save failed"); setSaving(false); return; }
    setSaving(false); setEditing(false); setValue(""); setNote(""); onSaved();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#C9A227]/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className={meta.color} />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{meta.label}</span>
        </div>
        <button onClick={() => { setEditing(!editing); setValue(String(setting.settingValue)); setNote(""); setError(""); }}
          className="p-1.5 text-gray-400 hover:text-[#C9A227] rounded hover:bg-gray-50">
          <Pencil size={14} />
        </button>
      </div>

      <p className="text-3xl font-bold text-[#0B1F3A] font-mono mb-1">{fmtK(setting.settingValue)}</p>
      <p className="text-xs text-gray-400 truncate">{setting.description}</p>
      {setting.lastUpdatedBy && (
        <p className="text-xs text-gray-400 mt-1">Last updated by {setting.lastUpdatedBy}</p>
      )}

      {editing && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">K</span>
            <input type="number" value={value} onChange={e => setValue(e.target.value)} min="0" step="0.01"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
              placeholder="New amount" />
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            placeholder="Reason for change (required)…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#C9A227]" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex-1 bg-[#0B1F3A] text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRANSACTION HISTORY TABLE
// ═════════════════════════════════════════════════════════════════════════════
function TransactionHistory({ onRefresh }: { onRefresh: () => void }) {
  const [entries, setEntries]     = useState<ManualEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [editEntry, setEditEntry] = useState<ManualEntry | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote]   = useState("");
  const [saving, setSaving]       = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const r = await api(`/entries?page=${page}&limit=20`);
    if (r.ok) { const d = await r.json(); setEntries(d.entries); setTotal(d.total); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this entry? This will reverse its effect on cash figures.")) return;
    const note = prompt("Enter reason for deletion:");
    if (!note) return;
    const r = await api(`/entries/${id}`, { method: "DELETE", body: JSON.stringify({ audit_note: note }) });
    if (r.ok) { fetchEntries(); onRefresh(); }
  };

  const saveEdit = async () => {
    if (!editEntry || !editNote.trim()) return;
    setSaving(true);
    const r = await api(`/entries/${editEntry.id}`, {
      method: "PUT",
      body: JSON.stringify({ amount: Number(editAmount), audit_note: editNote }),
    });
    if (r.ok) { fetchEntries(); onRefresh(); setEditEntry(null); }
    setSaving(false);
  };

  const exportCSV = () => {
    const headers = ["Date", "Type", "Direction", "Amount", "Description", "Entered By"];
    const rows = entries.map(e => [fmtDate(e.effectiveDate), e.entryType, e.direction, e.amount, e.description, e.enteredBy]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `transactions-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0B1F3A]">Transaction History ({total})</h3>
        <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-[#0B1F3A] text-white">
              {["Date", "Type", "Amount", "In/Out", "Description", "By", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400"><Loader2 size={18} className="animate-spin inline" /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No entries yet</td></tr>
            ) : entries.map((e, i) => (
              <tr key={e.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(e.effectiveDate)}</td>
                <td className="px-4 py-3 text-xs capitalize">{e.entryType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-xs font-bold font-mono text-[#0B1F3A]">{fmtK(e.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${e.direction === "in" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {e.direction === "in" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {e.direction.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{e.description}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{e.enteredBy}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditEntry(e); setEditAmount(String(e.amount)); setEditNote(""); }}
                      className="p-1.5 text-gray-400 hover:text-[#0B1F3A] rounded hover:bg-gray-100"><Edit2 size={12} /></button>
                    <button onClick={() => deleteEntry(e.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-[#0B1F3A] mb-4">Edit Entry</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">K</span>
                  <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reason (required)</label>
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A227]" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveEdit} disabled={saving || !editNote.trim()}
                  className="flex-1 bg-[#0B1F3A] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditEntry(null)} className="px-4 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BRANCH LEADERBOARD
// ═════════════════════════════════════════════════════════════════════════════
function BranchLeaderboard() {
  const [data, setData]     = useState<{ period: string; branches: BranchData[]; totalDisbursed: number; totalCollected: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    setLoading(true);
    api(`/branch-leaderboard?period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); });
  }, [period]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#0B1F3A] flex items-center gap-2"><Medal size={18} className="text-[#C9A227]" /> Branch Leaderboard</h3>
        <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9A227]" />
      </div>

      {loading ? <div className="py-8 text-center"><Loader2 size={20} className="animate-spin inline text-gray-400" /></div>
        : !data ? null
        : <div className="space-y-3">
            {data.branches.map(b => {
              const medalInfo = MEDAL[b.rank];
              const pctOfTarget = b.disbTarget > 0 ? Math.min(100, Math.round((b.disbursed / b.disbTarget) * 100)) : 0;
              return (
                <div key={b.branch} className="border border-gray-100 rounded-xl p-4 hover:border-[#C9A227]/30">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{medalInfo?.icon || `#${b.rank}`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#0B1F3A]">{b.branch}</p>
                        <span className={`text-xs font-bold ${b.collectionRate >= 80 ? "text-emerald-600" : b.collectionRate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                          {b.collectionRate}% collection rate
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{b.loanCount} loans · PAR {b.par}%</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-[#0B1F3A] font-mono">{fmtK(b.disbursed)}</p>
                      <p className="text-xs text-emerald-600">{fmtK(b.collected)} collected</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Target progress</span><span>{pctOfTarget}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full transition-all ${pctOfTarget >= 100 ? "bg-[#C9A227]" : pctOfTarget >= 70 ? "bg-emerald-500" : "bg-red-400"}`}
                        style={{ width: `${pctOfTarget}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LTV CONDITION SCALE EDITOR
// ═════════════════════════════════════════════════════════════════════════════
function LtvScaleEditor() {
  const [scale, setScale] = useState<{ id: string; condition: string; percentage: number; updatedBy?: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue]     = useState("");
  const [reason, setReason]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [affected, setAffected] = useState<any[]>([]);

  useEffect(() => {
    api("/ltv-scale").then(r => r.ok ? r.json() : []).then(setScale);
  }, []);

  const save = async (condition: string) => {
    setSaving(true);
    const r = await api(`/ltv-scale/${condition}`, {
      method: "PUT",
      body: JSON.stringify({ percentage: Number(value), reason }),
    });
    const d = await r.json();
    if (r.ok) {
      setScale(s => s.map(i => i.condition === condition ? { ...i, percentage: Number(value) } : i));
      if (d.affectedLoans?.length > 0) setAffected(d.affectedLoans);
      setEditing(null); setValue(""); setReason("");
    }
    setSaving(false);
  };

  const CONDITION_COLORS: Record<string, string> = {
    excellent: "text-emerald-700 bg-emerald-50",
    good:      "text-blue-700 bg-blue-50",
    fair:      "text-amber-700 bg-amber-50",
    poor:      "text-red-700 bg-red-50",
  };

  return (
    <div className="bg-white border border-[#C9A227]/30 rounded-xl p-5">
      <h3 className="font-bold text-[#0B1F3A] mb-4">LTV Condition Scale <span className="text-xs text-gray-400 font-normal ml-1">CEO only</span></h3>
      <div className="space-y-3">
        {scale.map(s => (
          <div key={s.condition} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${editing === s.condition ? "border-[#C9A227]" : "border-gray-100"}`}>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${CONDITION_COLORS[s.condition] || ""}`}>{s.condition}</span>
            {editing === s.condition ? (
              <>
                <div className="flex items-center gap-2 flex-1">
                  <input type="number" value={value} onChange={e => setValue(e.target.value)} min="10" max="100"
                    className="w-20 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none" />
                  <span className="text-sm text-gray-500">%</span>
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (required)"
                    className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none" />
                </div>
                <button onClick={() => save(s.condition)} disabled={saving || !reason.trim()}
                  className="px-3 py-1 bg-[#0B1F3A] text-white rounded text-xs font-semibold disabled:opacity-60">
                  {saving ? "…" : "Save"}
                </button>
                <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 font-bold font-mono text-[#0B1F3A]">{s.percentage}%</span>
                {s.updatedBy && <span className="text-xs text-gray-400">by {s.updatedBy}</span>}
                <button onClick={() => { setEditing(s.condition); setValue(String(s.percentage)); setReason(""); }}
                  className="p-1.5 text-gray-400 hover:text-[#C9A227]"><Pencil size={13} /></button>
              </>
            )}
          </div>
        ))}
      </div>
      {affected.length > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-bold text-amber-800 mb-2">⚠️ {affected.length} active loans are now over-leveraged after this change (informational only — no auto-action):</p>
          {affected.slice(0, 5).map((l: any) => (
            <p key={l.reference} className="text-xs text-amber-700">{l.reference} — {l.account?.firstName} {l.account?.lastName} ({fmtK(l.amountRequested)})</p>
          ))}
          <button onClick={() => setAffected([])} className="text-xs text-amber-600 mt-2 hover:underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RECORD TRANSACTION MODAL
// ═════════════════════════════════════════════════════════════════════════════
function RecordTransactionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ entry_type: "bank_deposit", direction: "in", amount: "", description: "", effective_date: today });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: string, v: string) => {
    if (k === "entry_type") {
      const et = ENTRY_TYPES.find(t => t.value === v);
      setForm(f => ({ ...f, entry_type: v, direction: et?.direction || f.direction }));
    } else {
      setForm(f => ({ ...f, [k]: v }));
    }
  };

  const submit = async () => {
    setError("");
    if (!form.amount || Number(form.amount) <= 0) { setError("Amount must be positive"); return; }
    if (form.description.trim().length < 10) { setError("Description must be at least 10 characters"); return; }
    setSaving(true);
    const r = await api("/entries", { method: "POST", body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Failed to save"); setSaving(false); return; }
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-[#0B1F3A]">Record Transaction</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Transaction Type</label>
            <div className="relative">
              <select value={form.entry_type} onChange={e => set("entry_type", e.target.value)}
                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:border-[#C9A227]">
                {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">K</span>
              <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} min="0.01" step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A227]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
              placeholder="Describe this transaction (min 10 characters)…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#C9A227]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Effective Date</label>
            <input type="date" value={form.effective_date} onChange={e => set("effective_date", e.target.value)}
              max={today}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A227]" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 bg-[#0B1F3A] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "Saving…" : "Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function FinancialControlsPage() {
  const [settings, setSettings]     = useState<FinancialSetting[]>([]);
  const [cashPos, setCashPos]       = useState<CashPosition | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const EDITABLE_KEYS = ["cash_in_bank", "cash_at_hand", "petty_cash"];
  const OTHER_KEYS    = ["opening_capital", "minimum_reserve"];

  const fetchAll = useCallback(async () => {
    const [s, c] = await Promise.all([
      api("/settings").then(r => r.ok ? r.json() : []),
      api("/cash-position").then(r => r.ok ? r.json() : null),
    ]);
    setSettings(s);
    setCashPos(c);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const keySettings  = settings.filter(s => EDITABLE_KEYS.includes(s.settingKey));
  const otherSettings = settings.filter(s => OTHER_KEYS.includes(s.settingKey));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
            <Lock size={22} className="text-[#C9A227]" /> Financial Controls
          </h1>
          <p className="text-sm text-gray-500 mt-1">CEO-only. Manage cash positions, record transactions, and monitor the portfolio.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0B1F3A] text-white rounded-xl text-sm font-semibold hover:bg-[#0B1F3A]/90">
          <Plus size={16} /> Record Transaction
        </button>
      </div>

      {/* Cash Position */}
      <CashPositionCard pos={cashPos} onRefresh={fetchAll} />

      {/* Editable Tiles */}
      <div>
        <h2 className="font-bold text-[#0B1F3A] mb-3 flex items-center gap-2 border-b border-[#C9A227]/30 pb-2">
          <Banknote size={16} className="text-[#C9A227]" /> Cash Figures
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {keySettings.map(s => <SettingTile key={s.settingKey} setting={s} onSaved={fetchAll} />)}
        </div>
      </div>

      {/* Other settings collapsible */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-[#0B1F3A] font-semibold text-sm">
          <span>Financial Settings (Capital &amp; Reserve)</span>
          <ChevronDown size={16} className={`transition-transform ${showSettings ? "rotate-180" : ""}`} />
        </button>
        {showSettings && (
          <div className="border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherSettings.map(s => <SettingTile key={s.settingKey} setting={s} onSaved={fetchAll} />)}
          </div>
        )}
      </div>

      {/* LTV Scale */}
      <LtvScaleEditor />

      {/* Branch Leaderboard */}
      <BranchLeaderboard />

      {/* Transaction History */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <TransactionHistory onRefresh={fetchAll} />
      </div>

      {/* Record Transaction Modal */}
      {showModal && <RecordTransactionModal onClose={() => setShowModal(false)} onSaved={fetchAll} />}
    </div>
  );
}
