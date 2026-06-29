// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, AlertTriangle, Users, CheckCircle, Clock,
  Download, Search, RefreshCw, Eye, ChevronDown, ChevronRight,
  FileText, CreditCard, BarChart2, AlertCircle, Zap, Shield,
  Calendar, Phone, Mail, X, Plus, Printer, ArrowUpRight,
  BookOpen,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

const API = "/api";
const K  = (n: number) => `K${Number(n ?? 0).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d: string | Date | null | undefined) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
function token() { return localStorage.getItem("philix_staff_token") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }; }

type Tab = "overview" | "register" | "repayment" | "ledger" | "penalties" | "collections" | "reports";

interface KPIs {
  totalActiveLoans: number; totalRepaidLoans: number; pendingApplications: number;
  totalOutstandingPrincipal: number; totalInterestReceivable: number; totalPortfolio: number;
  totalCollectedEver: number; totalPenalties: number; overdueCount: number;
  portfolioAtRisk: number; collectionsToday: number; collectionsWeek: number;
  collectionsMonth: number;
  arrears: { current: number; watchlist: number; delinquent: number; serious: number; default: number };
}

interface LoanRow {
  loanId: string; borrowerName: string; email: string; phoneNumber: string;
  loanType: string; collateralDetails: string; loanStartDate: string;
  loanMaturityDate: string; loanAmount: number; loanDurationWeeks: number;
  interestRate: number; totalInterestAmount: number; totalRepaymentAmount: number;
  weeklyPayment: number; paidAmount: number; remainingBalance: number;
  penaltyAmount: number; daysOverdue: number; paymentStatus: string;
  daysUntilMaturity: number; status: string;
  ledger: { date: string; description: string; debit: number; paid: number; balance: number; method: string; reference: string }[];
}

interface PenaltyRow {
  loanRef: string; client: { firstName: string; lastName: string; email: string; phone: string };
  productType: string; amountRequested: number; outstanding: number;
  daysOverdue: number; penaltyAmount: number; hasPenalty: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  PAID:     "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  ACTIVE:   "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
  OVERDUE:  "bg-red-900/40 text-red-300 border-red-700/50",
  "DUE SOON": "bg-amber-900/40 text-amber-300 border-amber-700/50",
};

const ARREARS_CONFIG = [
  { key: "current",     label: "Current",           days: "0 days",    color: "#10b981" },
  { key: "watchlist",   label: "Watchlist",         days: "1–7 days",  color: "#f59e0b" },
  { key: "delinquent",  label: "Delinquent",        days: "8–30 days", color: "#f97316" },
  { key: "serious",     label: "Serious",           days: "31–90 days",color: "#ef4444" },
  { key: "default",     label: "Default",           days: "90+ days",  color: "#7f1d1d" },
];

function KpiCard({ label, value, sub, color, icon: Icon, highlight }: {
  label: string; value: string; sub?: string; color: string; icon: any; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 border transition-all ${highlight ? "bg-gradient-to-br from-amber-950/50 to-orange-950/30 border-amber-700/50" : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center`} style={{ background: color + "22" }}>
          <Icon size={16} style={{ color }} />
        </div>
        {highlight && <ArrowUpRight size={12} className="text-amber-500" />}
      </div>
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function SkeletonRow() {
  return <tr><td colSpan={17} className="py-2 px-4"><div className="h-4 rounded portal-skeleton" /></td></tr>;
}

// ── Ledger Modal ───────────────────────────────────────────────────────────────
function LedgerModal({ row, onClose }: { row: LoanRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <div>
            <h3 className="font-bold text-white text-base">{row.borrowerName} — Repayment Ledger</h3>
            <p className="text-xs font-mono text-amber-400">{row.loanId}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-xl hover:bg-slate-800"><X size={16} /></button>
        </div>

        {/* Loan summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-slate-800">
          {[
            { label: "Principal",      value: K(row.loanAmount) },
            { label: "Interest",       value: K(row.totalInterestAmount) },
            { label: "Total Due",      value: K(row.totalRepaymentAmount), accent: true },
            { label: "Paid",           value: K(row.paidAmount) },
            { label: "Balance",        value: K(row.remainingBalance), red: row.remainingBalance > 0 },
            { label: "Penalty",        value: K(row.penaltyAmount), red: row.penaltyAmount > 0 },
            { label: "Interest Rate",  value: `${row.interestRate}%` },
            { label: "Duration",       value: `${row.loanDurationWeeks} weeks` },
          ].map(f => (
            <div key={f.label}>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">{f.label}</p>
              <p className={`font-bold text-sm ${f.accent ? "text-amber-400" : f.red ? "text-red-400" : "text-white"}`}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* Ledger table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Debit</th>
                <th className="text-right px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Paid</th>
                <th className="text-right px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* Opening disbursement */}
              <tr className="bg-indigo-900/10">
                <td className="px-4 py-3 text-slate-400">{row.loanStartDate}</td>
                <td className="px-4 py-3 text-indigo-300 font-semibold">Loan Disbursement</td>
                <td className="px-4 py-3 text-right text-red-400 font-mono">{K(row.loanAmount)}</td>
                <td className="px-4 py-3 text-right text-slate-600">—</td>
                <td className="px-4 py-3 text-right text-amber-400 font-mono font-bold">{K(row.totalRepaymentAmount)}</td>
              </tr>
              <tr className="bg-slate-800/20">
                <td className="px-4 py-3 text-slate-400">{row.loanStartDate}</td>
                <td className="px-4 py-3 text-yellow-400">Interest Charge ({row.interestRate}% flat rate)</td>
                <td className="px-4 py-3 text-right text-red-400 font-mono">{K(row.totalInterestAmount)}</td>
                <td className="px-4 py-3 text-right text-slate-600">—</td>
                <td className="px-4 py-3 text-right text-amber-400 font-mono">{K(row.totalRepaymentAmount)}</td>
              </tr>
              {/* Payments */}
              {row.ledger.map((entry, i) => (
                <tr key={i} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-400">{entry.date}</td>
                  <td className="px-4 py-3 text-slate-300">{entry.description}</td>
                  <td className="px-4 py-3 text-right text-slate-600">—</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono font-semibold">{K(entry.paid)}</td>
                  <td className="px-4 py-3 text-right text-amber-300 font-mono">{K(entry.balance)}</td>
                </tr>
              ))}
              {/* Penalty */}
              {row.penaltyAmount > 0 && (
                <tr className="bg-red-950/30">
                  <td className="px-4 py-3 text-red-400 font-semibold">TODAY</td>
                  <td className="px-4 py-3 text-red-300 font-semibold">Late Payment Penalty — {row.daysOverdue} days @ 2%/day</td>
                  <td className="px-4 py-3 text-right text-red-400 font-mono font-bold">{K(row.penaltyAmount)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">—</td>
                  <td className="px-4 py-3 text-right text-red-400 font-mono font-bold">{K(row.remainingBalance + row.penaltyAmount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-800/50">
                <td colSpan={2} className="px-4 py-3 font-bold text-white text-right">TOTALS</td>
                <td className="px-4 py-3 text-right font-bold text-red-400 font-mono">{K(row.totalRepaymentAmount + row.penaltyAmount)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-400 font-mono">{K(row.paidAmount)}</td>
                <td className="px-4 py-3 text-right font-bold text-amber-400 font-mono">{K(row.remainingBalance + row.penaltyAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-4 flex gap-3 border-t border-slate-800">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800">
            <Printer size={13} /> Print Statement
          </button>
          <button onClick={onClose} className="ml-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AccountsManagementPage() {
  const user = useAuthStore(s => s.user);
  const [tab, setTab] = useState<Tab>("overview");
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [penalties, setPenalties] = useState<PenaltyRow[]>([]);
  const [collections, setCollections] = useState<{ dueToday: any[]; dueSoon: any[]; overdue: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [waiverModal, setWaiverModal] = useState<string | null>(null);
  const [waiverReason, setWaiverReason] = useState("");
  const [waiverLoading, setWaiverLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, lRes, pRes, cRes] = await Promise.all([
        fetch(`${API}/accounts/kpis`, { headers: authH() }),
        fetch(`${API}/accounts/repayment-register?status=${statusFilter}&search=${search}`, { headers: authH() }),
        fetch(`${API}/accounts/penalties`, { headers: authH() }),
        fetch(`${API}/accounts/collections-center`, { headers: authH() }),
      ]);
      if (kRes.ok) setKpis(await kRes.json());
      if (lRes.ok) { const d = await lRes.json(); setLoans(d.loans ?? []); }
      if (pRes.ok) { const d = await pRes.json(); setPenalties(d.loans ?? []); }
      if (cRes.ok) setCollections(await cRes.json());
    } finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function waivePenalty() {
    if (!waiverModal || !waiverReason.trim()) return;
    setWaiverLoading(true);
    try {
      await fetch(`${API}/accounts/penalties/${waiverModal}/waive`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ reason: waiverReason }),
      });
      setWaiverModal(null); setWaiverReason("");
      await loadAll();
    } finally { setWaiverLoading(false); }
  }

  function exportCSV() {
    const headers = [
      "Loan ID", "Borrower Name", "Email Address", "Phone Number", "Loan Type", "Collateral Details",
      "Loan Start Date", "Loan Maturity Date", "Loan Amount", "Loan Duration (weeks)",
      "Interest Rate (%)", "Total Interest Amount", "Total Repayment Amount", "Weekly Payment",
      "Paid Amount", "Remaining Balance", "Penalty Amount", "Days Overdue",
      "Payment Status", "Days Until Maturity",
    ];
    const rows = loans.map(r => [
      r.loanId, r.borrowerName, r.email, r.phoneNumber, r.loanType, r.collateralDetails,
      r.loanStartDate, r.loanMaturityDate, r.loanAmount, r.loanDurationWeeks,
      r.interestRate, r.totalInterestAmount, r.totalRepaymentAmount, r.weeklyPayment,
      r.paidAmount, r.remainingBalance, r.penaltyAmount, r.daysOverdue,
      r.paymentStatus, r.daysUntilMaturity,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Philix-Accounts-${new Date().toLocaleDateString("en-GB").replace(/\//g,"-")}.csv`;
    a.click();
  }

  const penaltiedLoans = penalties.filter(p => p.hasPenalty);

  // ── TAB NAVIGATION ──────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview",    label: "Overview",       icon: BarChart2 },
    { id: "register",    label: "Loan Register",  icon: FileText },
    { id: "repayment",   label: "Repayment Accounts", icon: BookOpen },
    { id: "penalties",   label: "Penalties",      icon: AlertTriangle, badge: penaltiedLoans.length },
    { id: "collections", label: "Collections",    icon: Phone, badge: collections?.overdue.length },
    { id: "reports",     label: "Reports",        icon: Download },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-800/60"
        style={{ background: "rgba(2,6,23,0.96)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center">
                <BookOpen size={16} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-base font-black text-white">Accounts Management Center</h1>
                <p className="text-[10px] text-slate-600">Philix Finance · Live Financial Data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadAll} className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-400 border border-amber-700/40 hover:bg-amber-900/20 transition-all">
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-px scrollbar-none">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                  tab === t.id ? "text-amber-400 border-amber-500" : "text-slate-600 border-transparent hover:text-slate-400"
                }`}>
                <t.icon size={12} />
                {t.label}
                {t.badge ? <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">

        {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* KPI Grid */}
            {kpis ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <KpiCard label="Active Loans"    value={kpis.totalActiveLoans.toString()} icon={CreditCard} color="#6366f1" />
                  <KpiCard label="Loan Portfolio"  value={K(kpis.totalPortfolio)}           icon={DollarSign} color="#C9A227" highlight />
                  <KpiCard label="Collections Today" value={K(kpis.collectionsToday)}       icon={Zap}        color="#10b981" />
                  <KpiCard label="Collections Month" value={K(kpis.collectionsMonth)}       icon={TrendingUp} color="#3b82f6" />
                  <KpiCard label="Overdue Clients" value={kpis.overdueCount.toString()}     icon={AlertTriangle} color="#ef4444" sub={`PAR: ${kpis.portfolioAtRisk}%`} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard label="Outstanding Principal" value={K(kpis.totalOutstandingPrincipal)} icon={DollarSign} color="#8b5cf6" />
                  <KpiCard label="Interest Receivable"   value={K(kpis.totalInterestReceivable)}  icon={TrendingUp} color="#f59e0b" />
                  <KpiCard label="Total Penalties"       value={K(kpis.totalPenalties)}           icon={AlertCircle} color="#ef4444" />
                  <KpiCard label="Loans Fully Repaid"    value={kpis.totalRepaidLoans.toString()} icon={CheckCircle} color="#10b981" />
                </div>

                {/* Arrears Buckets */}
                <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Arrears Classification</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {ARREARS_CONFIG.map(a => (
                      <div key={a.key} className="rounded-xl p-4 text-center"
                        style={{ background: a.color + "15", border: `1px solid ${a.color}30` }}>
                        <div className="text-2xl font-black mb-1" style={{ color: a.color }}>
                          {kpis.arrears[a.key as keyof typeof kpis.arrears] ?? 0}
                        </div>
                        <div className="text-xs font-semibold text-white mb-0.5">{a.label}</div>
                        <div className="text-[10px] text-slate-500">{a.days} overdue</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4">Portfolio Health</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={[
                          { name: "Current",    value: kpis.arrears.current,    fill: "#10b981" },
                          { name: "Watchlist",  value: kpis.arrears.watchlist,  fill: "#f59e0b" },
                          { name: "Delinquent", value: kpis.arrears.delinquent, fill: "#f97316" },
                          { name: "Serious",    value: kpis.arrears.serious,    fill: "#ef4444" },
                          { name: "Default",    value: kpis.arrears.default,    fill: "#7f1d1d" },
                        ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                          {[...Array(5)].map((_, i) => <Cell key={i} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [v, "Loans"]} contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                        <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4">Collections Summary</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { period: "Today",  amount: kpis.collectionsToday },
                        { period: "Week",   amount: kpis.collectionsWeek },
                        { period: "Month",  amount: kpis.collectionsMonth },
                      ]} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `K${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [K(v), "Collections"]} contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="amount" fill="#C9A227" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => <div key={i} className="h-24 rounded-2xl portal-skeleton" />)}
              </div>
            )}
          </div>
        )}

        {/* ── LOAN REGISTER TAB ─────────────────────────────────────────────── */}
        {(tab === "register" || tab === "repayment") && (
          <div className="space-y-4">
            {/* Search + Filter */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, loan ID, phone…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-800/60 border border-slate-700/50 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-700/60" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl text-xs bg-slate-800/60 border border-slate-700/50 text-slate-300 focus:outline-none focus:border-amber-700/60">
                <option value="ALL">All Status</option>
                <option value="DISBURSED">Active</option>
                <option value="REPAID">Repaid</option>
                <option value="APPROVED">Approved</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <div className="text-xs text-slate-500 ml-auto">{loans.length} records</div>
            </div>

            {/* Register Table — matches Google Sheets columns */}
            <div className="rounded-2xl border border-slate-700/40 overflow-hidden">
              {/* Philix Finance header (matching Google Sheets) */}
              <div className="bg-slate-800/80 border-b border-slate-700/60 px-6 py-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
                  <BarChart2 size={12} className="text-white" />
                </div>
                <span className="font-black text-white tracking-wide">
                  {tab === "register" ? "LOAN REGISTER" : "REPAYMENT ACCOUNTS & LEDGER"}
                </span>
                <span className="ml-auto text-[10px] text-slate-500 font-mono">Philix Finance 2025</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-700/50">
                      {tab === "register" ? <>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Loan ID</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Borrower Name</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Email</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Phone</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Loan Type</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Collateral</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Start Date</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Maturity Date</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Loan Amount</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Duration (W)</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Rate (%)</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Interest</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Total Due</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Paid</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Balance</th>
                        <th className="text-right px-3 py-3 text-red-500 font-semibold uppercase tracking-wide">Penalty</th>
                        <th className="text-center px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Status</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Days Maturity</th>
                        <th className="px-3 py-3"></th>
                      </> : <>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Loan ID</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Client Name</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Phone</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Email</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Start Date</th>
                        <th className="text-left px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Due Date</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Principal</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Interest%</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Weekly Pmt</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Paid</th>
                        <th className="text-right px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Balance</th>
                        <th className="text-right px-3 py-3 text-red-500 font-semibold uppercase tracking-wide">Penalty</th>
                        <th className="text-center px-3 py-3 text-slate-500 font-semibold uppercase tracking-wide">Active</th>
                        <th className="px-3 py-3"></th>
                      </>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />) :
                     loans.length === 0 ? (
                       <tr><td colSpan={19} className="py-12 text-center text-slate-600 text-sm">No records found</td></tr>
                     ) : loans.map(row => {
                      const isExpanded = expandedLoan === row.loanId;
                      return <>
                        <tr key={row.loanId}
                          className={`hover:bg-slate-800/30 transition-all cursor-pointer ${row.penaltyAmount > 0 ? "bg-red-950/10" : ""}`}
                          onClick={() => setExpandedLoan(isExpanded ? null : row.loanId)}>
                          {tab === "register" ? <>
                            <td className="px-3 py-3 font-mono text-amber-400 font-semibold">{row.loanId}</td>
                            <td className="px-3 py-3 text-slate-200 font-semibold">{row.borrowerName}</td>
                            <td className="px-3 py-3 text-slate-400">{row.email}</td>
                            <td className="px-3 py-3 text-slate-400">{row.phoneNumber}</td>
                            <td className="px-3 py-3 text-slate-300">{row.loanType}</td>
                            <td className="px-3 py-3 text-slate-500 max-w-[120px] truncate">{row.collateralDetails}</td>
                            <td className="px-3 py-3 text-slate-400">{row.loanStartDate}</td>
                            <td className="px-3 py-3 text-slate-400">{row.loanMaturityDate}</td>
                            <td className="px-3 py-3 text-right font-mono text-slate-200">{K(row.loanAmount)}</td>
                            <td className="px-3 py-3 text-right text-slate-400">{row.loanDurationWeeks}</td>
                            <td className="px-3 py-3 text-right text-slate-400">{row.interestRate}%</td>
                            <td className="px-3 py-3 text-right font-mono text-yellow-400">{K(row.totalInterestAmount)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-amber-400">{K(row.totalRepaymentAmount)}</td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-400">{K(row.paidAmount)}</td>
                            <td className="px-3 py-3 text-right font-mono text-slate-300">{K(row.remainingBalance)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-red-400">{row.penaltyAmount > 0 ? K(row.penaltyAmount) : "—"}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[row.paymentStatus] ?? "bg-slate-700/40 text-slate-400 border-slate-700/40"}`}>
                                {row.paymentStatus}
                              </span>
                            </td>
                            <td className={`px-3 py-3 text-right font-semibold ${row.daysUntilMaturity < 0 ? "text-red-400" : row.daysUntilMaturity <= 3 ? "text-amber-400" : "text-slate-400"}`}>
                              {row.daysUntilMaturity < 0 ? `${Math.abs(row.daysUntilMaturity)}d OD` : `${row.daysUntilMaturity}d`}
                            </td>
                            <td className="px-3 py-3">
                              <button onClick={e => { e.stopPropagation(); setSelectedLoan(row); }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all">
                                <Eye size={12} />
                              </button>
                            </td>
                          </> : <>
                            <td className="px-3 py-3 font-mono text-amber-400 font-semibold">{row.loanId}</td>
                            <td className="px-3 py-3 text-slate-200 font-semibold">{row.borrowerName}</td>
                            <td className="px-3 py-3 text-slate-400">{row.phoneNumber}</td>
                            <td className="px-3 py-3 text-slate-400">{row.email}</td>
                            <td className="px-3 py-3 text-slate-400">{row.loanStartDate}</td>
                            <td className="px-3 py-3 text-slate-400">{row.loanMaturityDate}</td>
                            <td className="px-3 py-3 text-right font-mono text-slate-200">{K(row.loanAmount)}</td>
                            <td className="px-3 py-3 text-right text-slate-400">{row.interestRate}%</td>
                            <td className="px-3 py-3 text-right font-mono text-indigo-400">{K(row.weeklyPayment)}</td>
                            <td className="px-3 py-3 text-right font-mono text-emerald-400">{K(row.paidAmount)}</td>
                            <td className="px-3 py-3 text-right font-mono text-slate-300">{K(row.remainingBalance)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-red-400">{row.penaltyAmount > 0 ? K(row.penaltyAmount) : "—"}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`w-2.5 h-2.5 inline-block rounded-full ${row.status === "DISBURSED" ? "bg-emerald-500" : "bg-slate-600"}`} />
                            </td>
                            <td className="px-3 py-3">
                              <button onClick={e => { e.stopPropagation(); setSelectedLoan(row); }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all">
                                <Eye size={12} />
                              </button>
                            </td>
                          </>}
                        </tr>
                        {/* Expanded ledger inline (for repayment tab) */}
                        {tab === "repayment" && isExpanded && (
                          <tr>
                            <td colSpan={14} className="bg-slate-900/80 border-b border-slate-800">
                              <div className="px-4 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">LEDGER SHEET — {row.borrowerName} ({row.loanId})</p>
                                <table className="w-full text-xs">
                                  <thead><tr className="text-slate-600">
                                    <th className="text-left py-1.5 pr-4">Date</th>
                                    <th className="text-left py-1.5 pr-4">Description</th>
                                    <th className="text-right py-1.5 pr-4">Debit</th>
                                    <th className="text-right py-1.5 pr-4">Paid</th>
                                    <th className="text-right py-1.5">Balance</th>
                                  </tr></thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    <tr><td className="py-1.5 pr-4 text-slate-500">{row.loanStartDate}</td><td className="py-1.5 pr-4 text-indigo-400">Loan Disbursement</td><td className="py-1.5 pr-4 text-right text-red-400">{K(row.loanAmount)}</td><td className="py-1.5 pr-4 text-right text-slate-600">—</td><td className="py-1.5 text-right text-amber-400">{K(row.totalRepaymentAmount)}</td></tr>
                                    <tr><td className="py-1.5 pr-4 text-slate-500">{row.loanStartDate}</td><td className="py-1.5 pr-4 text-yellow-400">Interest Added ({row.interestRate}%)</td><td className="py-1.5 pr-4 text-right text-red-400">{K(row.totalInterestAmount)}</td><td className="py-1.5 pr-4 text-right text-slate-600">—</td><td className="py-1.5 text-right text-amber-400">{K(row.totalRepaymentAmount)}</td></tr>
                                    {row.ledger.map((e, i) => (
                                      <tr key={i}><td className="py-1.5 pr-4 text-slate-500">{e.date}</td><td className="py-1.5 pr-4 text-slate-300">PAID</td><td className="py-1.5 pr-4 text-right text-slate-600">—</td><td className="py-1.5 pr-4 text-right text-emerald-400 font-semibold">{K(e.paid)}</td><td className="py-1.5 text-right text-amber-300">{K(e.balance)}</td></tr>
                                    ))}
                                    {row.penaltyAmount > 0 && (
                                      <tr className="bg-red-950/20"><td className="py-1.5 pr-4 text-red-400 font-semibold">TODAY</td><td className="py-1.5 pr-4 text-red-300 font-semibold">Late Penalty ({row.daysOverdue}d @ 2%)</td><td className="py-1.5 pr-4 text-right text-red-400 font-bold">{K(row.penaltyAmount)}</td><td className="py-1.5 pr-4 text-right text-slate-600">—</td><td className="py-1.5 text-right text-red-400 font-bold">{K(row.remainingBalance + row.penaltyAmount)}</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PENALTIES TAB ──────────────────────────────────────────────────── */}
        {tab === "penalties" && (
          <div className="space-y-4">
            <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-300 mb-1">Penalty Policy: 2% per day after 3-day grace period</p>
                <p className="text-xs text-slate-400">Penalties auto-calculate daily on all loans past maturity + 3 days grace. The total outstanding balance is used as the base. Managers can waive penalties with a reason.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/40 overflow-hidden">
              <div className="bg-slate-800/80 border-b border-slate-700/60 px-6 py-3 flex items-center gap-3">
                <AlertTriangle size={14} className="text-red-400" />
                <span className="font-bold text-white">OVERDUE LOANS — PENALTY TRACKER</span>
                <span className="ml-auto text-xs text-red-400 font-semibold">{penaltiedLoans.length} loans in default</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-700/50">
                      <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Loan ID</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Client</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Phone</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Outstanding</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-semibold uppercase tracking-wide">Days Overdue</th>
                      <th className="text-right px-4 py-3 text-red-500 font-semibold uppercase tracking-wide">Penalty (2%/day)</th>
                      <th className="text-right px-4 py-3 text-red-500 font-semibold uppercase tracking-wide">Total Now Due</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {penaltiedLoans.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 text-center text-slate-600">No loans currently in default</td></tr>
                    ) : penaltiedLoans.map(row => (
                      <tr key={row.loanRef} className="hover:bg-slate-800/30 bg-red-950/05">
                        <td className="px-4 py-3 font-mono text-amber-400 font-semibold">{row.loanRef}</td>
                        <td className="px-4 py-3 text-slate-200 font-semibold">{row.client.firstName} {row.client.lastName}</td>
                        <td className="px-4 py-3 text-slate-400">{row.client.phone}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-300">{K(row.outstanding)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-red-400 font-black text-sm">{row.daysOverdue}</span>
                          <span className="text-slate-600 ml-1">days</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-red-400 text-sm">{K(row.penaltyAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono font-black text-red-300">{K(row.outstanding + row.penaltyAmount)}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <a href={`tel:${row.client.phone}`}
                            className="p-1.5 rounded-lg text-emerald-500 bg-emerald-900/20 border border-emerald-800/30 hover:bg-emerald-900/40 transition-all">
                            <Phone size={11} />
                          </a>
                          <a href={`mailto:${row.client.email}`}
                            className="p-1.5 rounded-lg text-blue-400 bg-blue-900/20 border border-blue-800/30 hover:bg-blue-900/40 transition-all">
                            <Mail size={11} />
                          </a>
                          {(user?.role === "SUPER_ADMIN" || user?.role === "MANAGER") && (
                            <button onClick={() => { setWaiverModal(row.loanRef); setWaiverReason(""); }}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold text-amber-400 bg-amber-900/20 border border-amber-700/30 hover:bg-amber-900/40 transition-all">
                              Waive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {penaltiedLoans.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-slate-700 bg-slate-800/60">
                        <td colSpan={5} className="px-4 py-3 font-bold text-white">TOTAL PENALTIES OUTSTANDING</td>
                        <td className="px-4 py-3 text-right font-black text-red-400 text-sm font-mono">
                          {K(penaltiedLoans.reduce((s, r) => s + r.penaltyAmount, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-red-300 font-mono">
                          {K(penaltiedLoans.reduce((s, r) => s + r.outstanding + r.penaltyAmount, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── COLLECTIONS CENTER TAB ────────────────────────────────────────── */}
        {tab === "collections" && collections && (
          <div className="space-y-6">
            {[
              { label: "Due Today", icon: Zap, data: collections.dueToday, color: "#f59e0b", bg: "from-amber-950/40 to-orange-950/20 border-amber-800/40" },
              { label: "Due in Next 3 Days", icon: Calendar, data: collections.dueSoon, color: "#60a5fa", bg: "from-blue-950/40 to-indigo-950/20 border-blue-800/40" },
              { label: "Overdue — Action Required", icon: AlertTriangle, data: collections.overdue, color: "#ef4444", bg: "from-red-950/40 to-rose-950/20 border-red-800/40" },
            ].map(section => (
              <div key={section.label} className={`rounded-2xl border bg-gradient-to-br ${section.bg} overflow-hidden`}>
                <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: section.color + "30" }}>
                  <section.icon size={14} style={{ color: section.color }} />
                  <span className="font-bold text-white text-sm">{section.label}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full ml-auto" style={{ background: section.color + "20", color: section.color }}>
                    {section.data.length} clients
                  </span>
                </div>
                {section.data.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-600">No clients in this bucket</div>
                ) : (
                  <div className="divide-y divide-slate-800/40">
                    {section.data.map((c: any) => (
                      <div key={c.loanRef} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/20 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{c.client.firstName} {c.client.lastName}</p>
                          <p className="text-xs text-slate-500 font-mono">{c.loanRef}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white text-xs">{K(c.outstanding)}</p>
                          {c.daysOverdue > 0 && (
                            <p className="text-[10px] text-red-400">+{K(c.penaltyAmount)} penalty</p>
                          )}
                        </div>
                        <div className="text-right hidden sm:block">
                          {c.daysOverdue > 0 ? (
                            <p className="text-red-400 font-black">{c.daysOverdue}d overdue</p>
                          ) : (
                            <p className="text-amber-400 text-xs">Due {fmt(c.maturityDate)}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <a href={`tel:${c.client.phone}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 hover:bg-emerald-900/40 transition-all">
                            <Phone size={10} /> Call
                          </a>
                          <a href={`mailto:${c.client.email}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-blue-400 bg-blue-900/20 border border-blue-800/30 hover:bg-blue-900/40 transition-all">
                            <Mail size={10} /> Email
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── REPORTS TAB ───────────────────────────────────────────────────── */}
        {tab === "reports" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Loan Portfolio Report", desc: "Full list of all active, repaid, and defaulted loans", action: "Download CSV" },
                { title: "Collections Report",    desc: "All payments received — today, week, month breakdown", action: "Download CSV" },
                { title: "Arrears Report",        desc: "Loans by arrears bucket — current through default", action: "Download CSV" },
                { title: "Penalty Income Report", desc: "All penalties accrued and waived", action: "Download CSV" },
                { title: "Interest Income Report",desc: "Interest charged vs collected by period", action: "Download CSV" },
                { title: "Outstanding Balances",  desc: "All outstanding loan balances as of today", action: "Download CSV" },
              ].map(r => (
                <div key={r.title} className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 hover:border-amber-700/40 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-amber-900/20 border border-amber-700/30 flex items-center justify-center mb-3">
                    <FileText size={14} className="text-amber-400" />
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1">{r.title}</h4>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{r.desc}</p>
                  <button onClick={exportCSV}
                    className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                    <Download size={11} /> {r.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Ledger Modal */}
      {selectedLoan && <LedgerModal row={selectedLoan} onClose={() => setSelectedLoan(null)} />}

      {/* Penalty Waiver Modal */}
      {waiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="bg-slate-900 border border-amber-700/40 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white text-base mb-1">Waive Penalty — {waiverModal}</h3>
            <p className="text-xs text-slate-500 mb-4">This will cancel the outstanding penalty for this loan. A ledger entry will be created.</p>
            <textarea value={waiverReason} onChange={e => setWaiverReason(e.target.value)}
              placeholder="Reason for waiver (required)…" rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-600 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={waivePenalty} disabled={waiverLoading || !waiverReason.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0B1F3A] disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg,#C9A227,#F5A623)" }}>
                {waiverLoading ? "Waiving…" : "Confirm Waiver"}
              </button>
              <button onClick={() => setWaiverModal(null)} className="px-4 py-2.5 rounded-xl text-sm text-slate-400 border border-slate-700 hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
