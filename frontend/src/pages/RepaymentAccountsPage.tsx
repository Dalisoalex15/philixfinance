import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Mail, Bell, Award, Flag, FileText,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Banknote, Users, Activity,
  Send, Download, Filter, Eye, Plus, Zap,
  AlertCircle, XCircle, StickyNote, Edit3, PlusCircle,
} from "lucide-react";
import StaffLoanModal from "../components/StaffLoanModal";

const API = "/api";
function getToken() { return localStorage.getItem("philix_staff_token") ?? ""; }
function auth() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${(n ?? 0).toLocaleString("en-ZM", { minimumFractionDigits: 0 })}`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface LedgerEntry { date: string; description: string; debit: number; paid: number; balance: number; type: string }
interface LoanAccount {
  id: string; reference: string; productType: string; status: string; purpose: string;
  account: { id: string; clientNumber: string; firstName: string; lastName: string; email: string; phone: string; occupation: string | null; employer: string | null; city: string | null };
  principal: number; interest: number; totalDue: number; weeklyPayment: number; termWeeks: number; rate: number;
  totalPaid: number; remaining: number; pct: number;
  startDate: string; dueDate: string; rawDueDate: string;
  daysLeft: number; daysOverdue: number; health: string;
  createdAt: string; reviewedAt: string | null; reviewedBy: string | null;
  ledger: LedgerEntry[]; paymentCount: number; lastPaymentDate: string | null;
}
interface Summary {
  totalPortfolio: number; totalCollected: number; outstanding: number;
  activeCount: number; overdueCount: number; settledCount: number; totalAccounts: number; collectionRate: number;
}

// ── Health badge ──────────────────────────────────────────────────────────────
function HealthBadge({ h }: { h: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    ON_TRACK: { label: "On Track",  bg: "rgba(34,197,94,0.15)",  color: "#22c55e" },
    DUE_SOON: { label: "Due Soon",  bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    LATE:     { label: "Late",      bg: "rgba(249,115,22,0.15)", color: "#f97316" },
    OVERDUE:  { label: "Overdue",   bg: "rgba(239,68,68,0.15)",  color: "#ef4444" },
    CRITICAL: { label: "Critical",  bg: "rgba(239,68,68,0.25)",  color: "#dc2626" },
    SETTLED:  { label: "Settled",   bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  };
  const m = map[h] ?? { label: h, bg: "rgba(100,116,139,0.15)", color: "#64748b" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

// ── Email action button ───────────────────────────────────────────────────────
function EmailBtn({ label, color, onClick, loading }: { label: string; color: string; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
      style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
      {loading ? <RefreshCw size={9} className="animate-spin" /> : <Send size={9} />}
      {label}
    </button>
  );
}

// ── Account Card (matches Google Sheets layout) ───────────────────────────────
function AccountCard({ acct, onRefresh, onEdit, onAddEntry }: { acct: LoanAccount; onRefresh: () => void; onEdit: (a: LoanAccount) => void; onAddEntry: (a: LoanAccount) => void }) {
  const [open, setOpen]       = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote]       = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast]     = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const action = async (type: string) => {
    setLoading(type);
    try {
      const res = await fetch(`${API}/accounts/${acct.id}/${type}`, { method: "POST", headers: auth() });
      const d = await res.json();
      showToast(d.ok, d.message ?? (d.ok ? "Done" : d.error));
    } catch { showToast(false, "Network error"); }
    finally { setLoading(null); }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setLoading("add-note");
    await fetch(`${API}/accounts/${acct.id}/add-note`, {
      method: "POST", headers: auth(), body: JSON.stringify({ note }),
    });
    setNote(""); setNoteOpen(false); showToast(true, "Note saved");
    setLoading(null);
  };

  const flag = async () => {
    setLoading("flag");
    await fetch(`${API}/accounts/${acct.id}/flag`, {
      method: "POST", headers: auth(), body: JSON.stringify({ flagged: true }),
    });
    showToast(true, "Account flagged for review"); setLoading(null);
  };

  const name = `${acct.account.firstName} ${acct.account.lastName}`;

  return (
    <div className="rounded-2xl overflow-hidden mb-4"
      style={{ background: "#0e1625", border: "1px solid rgba(255,255,255,0.08)" }}>

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-2 text-xs font-semibold ${toast.ok ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      {/* Account header — "DALISO PHIRI'S REPAYMENT ACCOUNT" style */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
            Repayment Account
          </div>
          <div className="font-black text-slate-100 text-base">{name.toUpperCase()}</div>
          <div className="text-xs text-slate-500">{acct.account.clientNumber} · {acct.reference}</div>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge h={acct.health} />
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Details row — matches Google Sheets DETAILS + LEDGER layout */}
      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>

        {/* DETAILS section */}
        <div className="p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">Details</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              ["Loan ID",       acct.reference],
              ["Client Name",   name],
              ["Phone",         acct.account.phone],
              ["Email",         acct.account.email],
              ["Start Date",    acct.startDate],
              ["Due Date",      acct.dueDate],
              ["Principal",     K(acct.principal)],
              ["Interest (%)",  `${acct.rate}%`],
              ["Weekly Payment",K(acct.weeklyPayment)],
              ["Product",       acct.productType.replace(/_/g, " ")],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <div className="text-[9px] text-slate-600 uppercase tracking-wider">{label}</div>
                <div className="text-xs text-slate-300 font-medium truncate">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LEDGER SHEET section */}
        <div className="p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">Ledger Sheet</div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Paid {K(acct.totalPaid)} of {K(acct.totalDue)}</span>
              <span>{acct.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${acct.pct}%`, background: acct.pct >= 100 ? "#22c55e" : acct.pct >= 70 ? "#F5A623" : "#6366f1" }} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Date", "Description", "Debit", "Paid", "Balance", "Active"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 text-slate-600 font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acct.ledger.slice(0, open ? undefined : 5).map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-1.5 pr-3 text-slate-500">{e.date}</td>
                    <td className="py-1.5 pr-3 text-slate-300 font-medium">{e.description}</td>
                    <td className="py-1.5 pr-3 text-red-400">{e.debit > 0 ? K(e.debit) : ""}</td>
                    <td className="py-1.5 pr-3 text-emerald-400">{e.paid > 0 ? K(e.paid) : ""}</td>
                    <td className="py-1.5 pr-3 text-slate-200 font-bold">{K(e.balance)}</td>
                    <td className="py-1.5">
                      <span className={`text-[9px] font-bold ${e.balance <= 0 ? "text-indigo-400" : "text-emerald-500"}`}>
                        {e.balance <= 0 ? "Settled" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!open && acct.ledger.length > 5 && (
                  <tr>
                    <td colSpan={6} className="py-2 text-slate-600 text-[10px]">
                      + {acct.ledger.length - 5} more entries — click to expand
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Outstanding */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">Outstanding Balance</span>
            <span className="text-base font-black" style={{ color: acct.remaining <= 0 ? "#22c55e" : "#ef4444" }}>
              {K(acct.remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Action bar — email + note + flag */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
        <EmailBtn label="Send Statement"       color="#6366f1" loading={loading === "send-statement"}      onClick={() => action("send-statement")} />
        <EmailBtn label="Send Reminder"        color="#f59e0b" loading={loading === "send-reminder"}       onClick={() => action("send-reminder")} />
        {acct.remaining <= 0 && (
          <EmailBtn label="Send Congratulations" color="#22c55e" loading={loading === "send-congratulations"} onClick={() => action("send-congratulations")} />
        )}
        {acct.daysOverdue > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold px-2 py-1 rounded-lg"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle size={9} /> {acct.daysOverdue}d overdue
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={() => onAddEntry(acct)}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-1.5 rounded-lg transition-all hover:bg-emerald-900/30"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <PlusCircle size={9} /> Add Entry
          </button>
          <button onClick={() => onEdit(acct)}
            className="flex items-center gap-1 text-[10px] font-bold text-amber-400 px-2 py-1.5 rounded-lg transition-all hover:bg-amber-900/30"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Edit3 size={9} /> Edit Loan
          </button>
          <button onClick={() => setNoteOpen(o => !o)}
            className="flex items-center gap-1 text-[10px] text-slate-400 px-2 py-1.5 rounded-lg transition-all hover:text-slate-200"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <StickyNote size={9} /> Note
          </button>
          <button onClick={flag} disabled={!!loading}
            className="flex items-center gap-1 text-[10px] text-slate-400 px-2 py-1.5 rounded-lg transition-all hover:text-amber-400"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <Flag size={9} /> Flag
          </button>
        </div>
      </div>

      {/* Note input */}
      {noteOpen && (
        <div className="px-4 pb-4 flex gap-2">
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note about this account..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-600" />
          <button onClick={addNote} disabled={loading === "add-note"}
            className="px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: "#6366f1", color: "#fff" }}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// ── Loan Table view (matches screenshot 2) ────────────────────────────────────
function LoanTable({ accounts }: { accounts: LoanAccount[] }) {
  const cols = [
    "Loan ID", "Borrower", "Email", "Phone", "Product", "Start Date", "Due Date",
    "Amount", "Term (wks)", "Rate (%)", "Interest", "Total Due",
    "Paid", "Remaining", "Status", "Days Left",
  ];

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {cols.map(c => (
              <th key={c} className="text-left px-3 py-3 text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((a, i) => (
            <tr key={a.id}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
              <td className="px-3 py-2.5 text-indigo-400 font-mono font-bold whitespace-nowrap">{a.reference}</td>
              <td className="px-3 py-2.5 text-slate-200 font-medium whitespace-nowrap">{a.account.firstName} {a.account.lastName}</td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{a.account.email}</td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{a.account.phone}</td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{a.productType.replace(/_/g, " ")}</td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{a.startDate}</td>
              <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{a.dueDate}</td>
              <td className="px-3 py-2.5 text-emerald-400 font-bold whitespace-nowrap">{K(a.principal)}</td>
              <td className="px-3 py-2.5 text-slate-300 text-center">{a.termWeeks}</td>
              <td className="px-3 py-2.5 text-slate-300 text-center">{a.rate}%</td>
              <td className="px-3 py-2.5 text-amber-400 whitespace-nowrap">{K(a.interest)}</td>
              <td className="px-3 py-2.5 text-slate-200 font-bold whitespace-nowrap">{K(a.totalDue)}</td>
              <td className="px-3 py-2.5 text-emerald-400 whitespace-nowrap">{K(a.totalPaid)}</td>
              <td className="px-3 py-2.5 font-bold whitespace-nowrap"
                style={{ color: a.remaining <= 0 ? "#22c55e" : "#ef4444" }}>{K(a.remaining)}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                  a.status === "DISBURSED" ? "bg-violet-900/40 text-violet-400"
                  : a.status === "REPAID"    ? "bg-emerald-900/40 text-emerald-400"
                  : a.status === "APPROVED"  ? "bg-blue-900/40 text-blue-400"
                  : "bg-slate-800 text-slate-400"
                }`}>{a.status}</span>
              </td>
              <td className="px-3 py-2.5 text-center font-bold"
                style={{ color: a.daysLeft < 0 ? "#ef4444" : a.daysLeft <= 7 ? "#f59e0b" : "#64748b" }}>
                {a.daysLeft < 0 ? `${Math.abs(a.daysLeft)}d OVR` : `${a.daysLeft}d`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RepaymentAccountsPage() {
  const [accounts, setAccounts]   = useState<LoanAccount[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [view, setView]           = useState<"cards" | "table">("cards");
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [bulkMsg, setBulkMsg]     = useState<{ ok: boolean; msg: string } | null>(null);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);

  // Modal state
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "entry"; loan?: LoanAccount } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search)       params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    const [ar, sr] = await Promise.all([
      fetch(`${API}/accounts?${params}`, { headers: auth() }),
      fetch(`${API}/accounts/summary`, { headers: auth() }),
    ]);
    const [ad, sd] = await Promise.all([ar.json(), sr.json()]);
    setAccounts(ad.accounts ?? []);
    setTotal(ad.total ?? 0);
    setSummary(sd);
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const bulkAction = async (type: string) => {
    setBulkLoading(type);
    try {
      const res = await fetch(`${API}/accounts/${type}`, { method: "POST", headers: auth() });
      const d = await res.json();
      setBulkMsg({ ok: true, msg: `Sent ${d.sent} emails, ${d.failed} failed` });
    } catch { setBulkMsg({ ok: false, msg: "Bulk send failed" }); }
    finally { setBulkLoading(null); setTimeout(() => setBulkMsg(null), 5000); }
  };

  const exportCSV = () => {
    // Format matching the Philix Finance Google Sheets repayment records format
    const headers = [
      "Loan ID", "Borrower Name", "Email Address", "Phone Number", "Loan Type",
      "Collateral Details", "Loan Start Date", "Loan Maturity Date",
      "Loan Amount", "Loan Duration (weeks)", "Interest Rate (%)",
      "Total Interest Amount", "Total Repayment Amount",
      "Paid Amount", "Remaining Balance", "Payment Status", "Days Until Maturity",
    ];
    const now = new Date();
    const rows = accounts.map(a => {
      const daysLeftNum = a.dueDate
        ? Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / 86400000)
        : null;
      const daysLeft = daysLeftNum !== null ? daysLeftNum : "";
      const paymentStatus = a.remaining <= 0 ? "Paid" : (daysLeftNum !== null && daysLeftNum < 0) ? "Overdue" : "Pending";
      // Escape commas in values
      const esc = (v: string | number) => {
        const s = String(v ?? "");
        return s.includes(",") ? `"${s}"` : s;
      };
      return [
        esc(a.reference),
        esc(`${a.account.firstName} ${a.account.lastName}`),
        esc(a.account.email),
        esc(a.account.phone ?? ""),
        esc(a.productType?.replace(/_/g, " ") ?? ""),
        esc((a as unknown as { collateralDetails?: string }).collateralDetails ?? "TRUSTED"),
        esc(a.startDate ?? ""),
        esc(a.dueDate ?? ""),
        a.principal,
        a.termWeeks ?? "",
        a.rate ?? "",
        a.interest,
        a.totalDue,
        a.totalPaid,
        a.remaining,
        esc(paymentStatus),
        daysLeft,
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel
    const url  = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Philix-Repayment-Records-${new Date().toISOString().split("T")[0]}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Repayment Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live loan accounts with ledger, email actions & health tracking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Create loan */}
          <button onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
            style={{ background: "#6366f1", color: "#fff", boxShadow: "0 0 20px rgba(99,102,241,0.35)" }}>
            <Plus size={12} /> Create Loan
          </button>
          {/* Bulk actions */}
          <button onClick={() => bulkAction("bulk-send-statements")} disabled={!!bulkLoading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-60"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}>
            {bulkLoading === "bulk-send-statements" ? <RefreshCw size={12} className="animate-spin" /> : <Mail size={12} />}
            Bulk Statements
          </button>
          <button onClick={() => bulkAction("bulk-send-reminders")} disabled={!!bulkLoading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-60"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
            {bulkLoading === "bulk-send-reminders" ? <RefreshCw size={12} className="animate-spin" /> : <Bell size={12} />}
            Bulk Reminders
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }}>
            <Download size={12} /> Export CSV
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Bulk action toast ── */}
      {bulkMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${bulkMsg.ok ? "bg-emerald-900/40 text-emerald-400 border border-emerald-800/50" : "bg-red-900/40 text-red-400 border border-red-800/50"}`}>
          {bulkMsg.ok ? "✓" : "✗"} {bulkMsg.msg}
        </div>
      )}

      {/* ── Portfolio Summary ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: "Total Portfolio", value: K(summary.totalPortfolio), color: "#818cf8", icon: Banknote },
            { label: "Collected",       value: K(summary.totalCollected), color: "#22c55e", icon: CheckCircle2 },
            { label: "Outstanding",     value: K(summary.outstanding),    color: "#f59e0b", icon: TrendingUp },
            { label: "Collection Rate", value: `${summary.collectionRate}%`, color: summary.collectionRate >= 80 ? "#22c55e" : "#f97316", icon: Activity },
            { label: "Active Loans",    value: String(summary.activeCount),    color: "#6366f1", icon: Zap },
            { label: "Overdue",         value: String(summary.overdueCount),   color: summary.overdueCount > 0 ? "#ef4444" : "#22c55e", icon: AlertCircle },
            { label: "Settled",         value: String(summary.settledCount),   color: "#4ade80", icon: Award },
            { label: "Total Accounts",  value: String(summary.totalAccounts),  color: "#94a3b8", icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={12} style={{ color }} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
              </div>
              <div className="font-extrabold text-sm" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters + View toggle ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <Search size={13} className="text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search loan ID, name, client no..."
            className="flex-1 bg-transparent text-slate-200 text-xs placeholder-slate-600 focus:outline-none" />
        </div>

        <div className="flex gap-1">
          {["ALL","SUBMITTED","UNDER_REVIEW","APPROVED","DISBURSED","REPAID","REJECTED"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${statusFilter === s ? "text-indigo-300" : "text-slate-600 hover:text-slate-400"}`}
              style={{ background: statusFilter === s ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)", border: `1px solid ${statusFilter === s ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}` }}>
              {s === "ALL" ? "All" : s === "UNDER_REVIEW" ? "Review" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1">
          <button onClick={() => setView("cards")}
            className={`flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${view === "cards" ? "text-indigo-300" : "text-slate-600"}`}
            style={{ background: view === "cards" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Eye size={11} /> Cards
          </button>
          <button onClick={() => setView("table")}
            className={`flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${view === "table" ? "text-indigo-300" : "text-slate-600"}`}
            style={{ background: view === "table" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Filter size={11} /> Table
          </button>
        </div>
      </div>

      {/* ── Accounts count ── */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-500">{total} account{total !== 1 ? "s" : ""} found</span>
        {total > 50 && (
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="text-xs px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-40">Prev</button>
            <span className="text-xs text-slate-500 px-2 py-1">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={accounts.length < 50}
              className="text-xs px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <FileText size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No accounts found</p>
        </div>
      ) : view === "cards" ? (
        <div>
          {accounts.map(a => (
            <AccountCard
              key={a.id} acct={a} onRefresh={load}
              onEdit={acc => setModal({ mode: "edit", loan: acc })}
              onAddEntry={acc => setModal({ mode: "entry", loan: acc })}
            />
          ))}
        </div>
      ) : (
        <LoanTable accounts={accounts} />
      )}

      {/* ── Staff Loan Modal ── */}
      {modal && (
        <StaffLoanModal
          mode={modal.mode}
          loan={modal.loan ? {
            id: modal.loan.id,
            reference: modal.loan.reference,
            productType: modal.loan.productType,
            amountRequested: modal.loan.principal,
            termMonths: modal.loan.termWeeks,
            interestRate: modal.loan.rate,
            status: modal.loan.status,
            purpose: modal.loan.purpose,
            account: {
              firstName: modal.loan.account.firstName,
              lastName: modal.loan.account.lastName,
              email: modal.loan.account.email,
            },
          } : undefined}
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
