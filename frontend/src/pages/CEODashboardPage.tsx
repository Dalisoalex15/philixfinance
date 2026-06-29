import { useEffect, useState, useCallback, memo } from "react";
import {
  DollarSign, TrendingUp, CheckCircle, Users,
  Zap, ArrowUpRight, Crown, Clock, XCircle, Activity, FileText,
  ThumbsUp, ThumbsDown, Banknote, RefreshCw, BarChart2, Trash2, ShieldOff, ShieldCheck,
  Bell, AlertTriangle, UserPlus, CreditCard,
  Mail, Send, TrendingDown, PhoneCall, MapPin, X, ChevronRight, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatKwacha } from "../lib/mock-data";
import { useLoanApplicationStore } from "../store/loanApplicationStore";
import { staffApi } from "../lib/api";

const fmtK = (n: number) => "K" + Number(n ?? 0).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ActivityEvent {
  id: string;
  type: string;
  client: string;
  ref: string;
  amount: number;
  description: string;
  timestamp: string;
}

interface AlertItem {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  detail: string;
  amount?: number;
  timestamp: string;
  link?: string;
}

interface PortalAccount {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
  _count?: { loanApplications: number };
}

interface DashboardSummary {
  loans_issued: number;
  principal_disbursed: number;
  total_paid_back: number;
  interest_collected: number;
  outstanding_balance: number;
  total_in_default: number;
  default_loan_count: number;
  paid_trend_pct: number;
  cached_at: string;
}

interface DefaultLoan {
  id: string;
  reference: string;
  clientName: string;
  clientNumber: string;
  email: string;
  phone: string;
  productType: string;
  principal: number;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  daysOverdue: number;
  lastPaymentDate: string | null;
}

interface InterestMonth {
  month: string;
  interest_billed: number;
  interest_collected: number;
}

const SkeletonTile = () => (
  <div className="philix-card p-5 animate-pulse">
    <div className="h-3 bg-gray-200 rounded w-24 mb-4" />
    <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
    <div className="h-2 bg-gray-100 rounded w-20" />
  </div>
);

const EVENT_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  APPLICATION_SUBMITTED: { icon: FileText,    color: "text-blue-700",    bg: "bg-blue-100" },
  APPLICATION_REVIEWING: { icon: Clock,       color: "text-amber-700",   bg: "bg-amber-100" },
  APPLICATION_APPROVED:  { icon: ThumbsUp,    color: "text-emerald-700", bg: "bg-emerald-100" },
  APPLICATION_REJECTED:  { icon: ThumbsDown,  color: "text-red-700",     bg: "bg-red-100" },
  LOAN_DISBURSED:        { icon: Banknote,    color: "text-indigo-700",  bg: "bg-indigo-100" },
  APPLICATION_UPDATED:   { icon: RefreshCw,   color: "text-navy-600",    bg: "bg-navy-100" },
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:       "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING_KYC:  "bg-amber-100 text-amber-700 border-amber-200",
  SUSPENDED:    "bg-red-100 text-red-700 border-red-200",
  BLACKLISTED:  "bg-red-200 text-red-800 border-red-300",
};

export default function CEODashboardPage() {
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const { applications, syncFromApi, updateStatus } = useLoanApplicationStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [liveActivity, setLiveActivity] = useState<ActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [clockTime, setClockTime] = useState(new Date());
  const [portalSummary, setPortalSummary] = useState({
    totalPortalAccounts: 0,
    pendingApplications: 0,
    submittedToday: 0,
    approvedToday: 0,
    totalApplications: 0,
    totalDisbursedAmount: 0,
    totalLoanedOut: 0,
    totalInterestEarned: 0,
    totalRepayable: 0,
    totalCollected: 0,
    repaidLoansCount: 0,
  });
  const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null);
  const [portalAccounts, setPortalAccounts] = useState<PortalAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [branchLeaderboard, setBranchLeaderboard] = useState<{
    branch: string; rank: number; officers: number; totalDisbursed: number;
    activeLoans: number; disbursedCount: number; collectionRate: number; parRate: number; score: number;
  }[]>([]);
  const [accountKpis, setAccountKpis] = useState<{
    totalPenalties: number; overdueCount: number; portfolioAtRisk: number;
    collectionsToday: number; totalPortfolio: number;
  } | null>(null);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [statementsMsg, setStatementsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [defaults, setDefaults] = useState<{ data: DefaultLoan[]; total: number; totalAmount: number; avgDaysOverdue: number } | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [interestData, setInterestData] = useState<InterestMonth[]>([]);
  const [interestLoading, setInterestLoading] = useState(false);
  const [contactingLoan, setContactingLoan] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");
  const [emailSearchResults, setEmailSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [emailTemplate, setEmailTemplate] = useState("custom");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [defaultsPage, setDefaultsPage] = useState(0);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch("/api/dashboard/alerts", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (r.ok) setAlerts(await r.json());
    } catch { /* ignore */ }
    finally { setAlertsLoading(false); }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch("/api/dashboard/summary", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (r.ok) setSummary(await r.json());
    } catch { /* ignore */ }
    finally { setSummaryLoading(false); }
  }, []);

  const fetchDefaults = useCallback(async (page = 0) => {
    setDefaultsLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch(`/api/dashboard/defaults?limit=25&offset=${page * 25}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (r.ok) setDefaults(await r.json());
    } catch { /* ignore */ }
    finally { setDefaultsLoading(false); }
  }, []);

  const fetchInterest = useCallback(async () => {
    setInterestLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch("/api/dashboard/interest-summary?months=6", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (r.ok) setInterestData(await r.json());
    } catch { /* ignore */ }
    finally { setInterestLoading(false); }
  }, []);

  const markContacted = async (loan: DefaultLoan, method: string) => {
    setContactingLoan(loan.id);
    try {
      const token = localStorage.getItem("philix_staff_token");
      await fetch("/api/dashboard/contact-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ loanRef: loan.reference, accountId: loan.id, method, notes: `Contacted via ${method}` }),
      });
    } catch { /* ignore */ }
    finally { setContactingLoan(null); }
  };

  const searchEmailClients = useCallback(async (q: string) => {
    if (q.length < 2) { setEmailSearchResults([]); return; }
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch(`/api/emails/clients/search?q=${encodeURIComponent(q)}&limit=5`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (r.ok) {
        const data = await r.json();
        setEmailSearchResults(data.map((c: { id: string; firstName: string; lastName: string; email: string }) => ({
          id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email,
        })));
      }
    } catch { /* ignore */ }
  }, []);

  const sendQuickEmail = async () => {
    if (!emailSubject || !emailBody) return;
    setEmailSending(true); setEmailResult(null);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ to: emailSearch, subject: emailSubject, templateKey: "custom", params: { subject: emailSubject, body: emailBody } }),
      });
      const d = await r.json();
      if (r.ok) { setEmailResult({ ok: true, text: "Email sent successfully!" }); setEmailSubject(""); setEmailBody(""); setEmailSearch(""); }
      else { setEmailResult({ ok: false, text: d.error || "Failed to send" }); }
    } catch { setEmailResult({ ok: false, text: "Network error" }); }
    finally { setEmailSending(false); }
  };

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [actRes, sumRes] = await Promise.all([
        fetch("/api/admin/activity", { headers }),
        fetch("/api/admin/summary", { headers }),
      ]);
      if (actRes.ok) setLiveActivity(await actRes.json());
      if (sumRes.ok) setPortalSummary(await sumRes.json());
    } catch {
      // fall back to store-derived events
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const fetchPortalAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const token = localStorage.getItem("philix_staff_token");
      if (!token) return;
      const [accRes, lbRes, kpiRes] = await Promise.all([
        fetch("/api/admin/portal-accounts", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/stats/branch-leaderboard", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/accounts/kpis", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (accRes.ok) setPortalAccounts(await accRes.json());
      if (lbRes.ok) setBranchLeaderboard(await lbRes.json());
      if (kpiRes.ok) setAccountKpis(await kpiRes.json());
    } catch {
      // ignore
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncFromApi();
    fetchSummary();
    fetchAlerts();
    // Lazy-load heavier data after the summary tiles render
    const lazyTimer = setTimeout(() => {
      fetchActivity();
      fetchPortalAccounts();
      fetchDefaults();
      fetchInterest();
    }, 120);
    const activityInterval = setInterval(() => { syncFromApi(); fetchActivity(); fetchAlerts(); fetchSummary(); }, 60000);
    const clockInterval = setInterval(() => setClockTime(new Date()), 1000);
    return () => { clearTimeout(lazyTimer); clearInterval(activityInterval); clearInterval(clockInterval); };
  }, [fetchActivity, fetchPortalAccounts, fetchAlerts, fetchSummary, fetchDefaults, fetchInterest]);

  const pendingApps = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");

  async function handleAction(id: string, action: "APPROVED" | "REJECTED") {
    setActionLoading(id);
    try {
      await staffApi.updateApplicationStatus(id, action);
      updateStatus(id, action);
      await syncFromApi();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccountStatus(id: string, status: string) {
    setAccountActionLoading(id + status);
    try {
      const token = localStorage.getItem("philix_staff_token");
      await fetch(`/api/admin/portal-accounts/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      await fetchPortalAccounts();
    } catch { /* ignore */ } finally {
      setAccountActionLoading(null);
    }
  }

  async function handleDeleteAccount(id: string, name: string) {
    if (!window.confirm(`Permanently delete ${name}'s account and all their data? This cannot be undone.`)) return;
    setAccountActionLoading(id + "DELETE");
    try {
      const token = localStorage.getItem("philix_staff_token");
      await fetch(`/api/admin/portal-accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchPortalAccounts();
      await fetchActivity();
    } catch { /* ignore */ } finally {
      setAccountActionLoading(null);
    }
  }

  async function sendMonthlyStatements() {
    setStatementsLoading(true);
    setStatementsMsg(null);
    try {
      const token = localStorage.getItem("philix_staff_token");
      const r = await fetch("/api/admin/send-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      if (r.ok) setStatementsMsg({ ok: true, text: `Monthly statements sent to ${d.sent} clients` });
      else setStatementsMsg({ ok: false, text: d.error || "Failed to send statements" });
    } catch { setStatementsMsg({ ok: false, text: "Network error" }); }
    finally { setStatementsLoading(false); }
  }

  // Account status breakdown
  const statusCounts = portalAccounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const recentAccounts = [...portalAccounts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Interest collection rate this month
  const lastInterestMonth = interestData[interestData.length - 1];
  const interestCollectionRate = lastInterestMonth && lastInterestMonth.interest_billed > 0
    ? Math.round((lastInterestMonth.interest_collected / lastInterestMonth.interest_billed) * 100)
    : 0;

  return (
    <div className="space-y-6">

      {/* ── 6 FINANCIAL SUMMARY TILES ─────────────────────────────────────────── */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <SkeletonTile key={i} />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {([
            { label: "LOANS ISSUED",          value: String(summary.loans_issued),                  sub: "All time",             icon: CreditCard,   color: "bg-indigo-100 text-indigo-700" },
            { label: "PRINCIPAL DISBURSED",   value: fmtK(summary.principal_disbursed),             sub: "Total loaned out",     icon: Banknote,     color: "bg-emerald-100 text-emerald-700" },
            { label: "TOTAL PAID BACK",       value: fmtK(summary.total_paid_back),                 sub: `${summary.paid_trend_pct >= 0 ? "+" : ""}${summary.paid_trend_pct}% vs last month`, icon: CheckCircle, color: "bg-teal-100 text-teal-700" },
            { label: "INTEREST COLLECTED",    value: fmtK(summary.interest_collected),              sub: "Net interest income",  icon: TrendingUp,   color: "bg-amber-100 text-amber-700" },
            { label: "OUTSTANDING BALANCE",   value: fmtK(summary.outstanding_balance),             sub: "Active loan book",     icon: DollarSign,   color: "bg-blue-100 text-blue-700" },
            { label: "TOTAL IN DEFAULT",      value: fmtK(summary.total_in_default),                sub: `${summary.default_loan_count} loan${summary.default_loan_count !== 1 ? "s" : ""} overdue 30+ days`, icon: AlertTriangle, color: "bg-red-100 text-red-700" },
          ] as { label: string; value: string; sub: string; icon: React.ElementType; color: string }[]).map((tile) => (
            <div key={tile.label} className={`philix-card p-4 ${tile.label === "TOTAL IN DEFAULT" && summary.default_loan_count > 0 ? "border-red-300 bg-red-50/50" : ""}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`p-1.5 rounded-lg ${tile.color}`}><tile.icon size={13} /></div>
                <span className="text-[9px] font-bold tracking-widest text-navy-500 uppercase">{tile.label}</span>
              </div>
              <div className="text-lg font-bold font-mono text-navy-900 leading-tight truncate">{tile.value}</div>
              <div className={`text-[10px] mt-1 ${tile.label === "TOTAL IN DEFAULT" && summary.default_loan_count > 0 ? "text-red-600 font-semibold" : "text-navy-500"}`}>{tile.sub}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── EMAIL QUICK-SEND ─────────────────────────────────────────────────── */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title flex items-center gap-2"><Mail size={16} className="text-[#C9A227]" />Quick Email Send</h3>
          <a href="/email-centre" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold">Full Email Centre <ChevronRight size={12} /></a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-navy-600 uppercase tracking-wide mb-1">To (email or client name)</label>
            <div className="relative">
              <input
                value={emailSearch}
                onChange={e => { setEmailSearch(e.target.value); searchEmailClients(e.target.value); }}
                placeholder="Search client or type email…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
              />
              {emailSearchResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {emailSearchResults.map(r => (
                    <button key={r.id} onClick={() => { setEmailSearch(r.email); setEmailSearchResults([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0">
                      <div className="font-medium text-navy-900">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-navy-600 uppercase tracking-wide mb-1">Subject</label>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
              placeholder="Email subject…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227]"
            />
          </div>
          <div className="flex items-end">
            <button onClick={sendQuickEmail} disabled={emailSending || !emailSearch || !emailSubject || !emailBody}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#0B1F3A] hover:bg-[#1a3560] text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-40">
              {emailSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {emailSending ? "Sending…" : "Send Email"}
            </button>
          </div>
        </div>
        <div className="mt-2">
          <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
            placeholder="Email message body…"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A227] resize-none"
          />
        </div>
        {emailResult && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${emailResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {emailResult.text}
          </div>
        )}
      </div>

      {/* CEO Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown size={18} className="text-gold-500" />
            <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">CEO Dashboard</span>
          </div>
          <h1 className="page-title text-3xl">{greeting}, Daliso.</h1>
          <p className="text-navy-600 mt-1">
            Here's how Philix Finance is performing right now —{" "}
            <span className="text-emerald-600 font-medium">
              {today.toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-4xl font-bold font-mono text-navy-900">
            {clockTime.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-xs text-navy-600 mt-1 flex items-center justify-end gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            LIVE · CAT
          </div>
        </div>
      </div>

      {/* Portal KPIs — Row 1 (from API summary) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Portal Accounts", value: String(portalSummary.totalPortalAccounts),
            sub: "Registered clients", icon: Users, color: "indigo",
          },
          {
            label: "Pending Applications", value: String(portalSummary.pendingApplications || pendingApps.length),
            sub: "Awaiting review", icon: Clock, color: portalSummary.pendingApplications > 0 ? "amber" : "emerald",
          },
          {
            label: "Submitted Today", value: String(portalSummary.submittedToday),
            sub: "New today", icon: Zap, color: "indigo",
          },
          {
            label: "Approved Today", value: String(portalSummary.approvedToday),
            sub: "Approved today", icon: TrendingUp, color: "emerald",
          },
          {
            label: "Total Applications", value: String(portalSummary.totalApplications),
            sub: "All-time", icon: DollarSign, color: "indigo",
          },
        ].map((card) => (
          <div key={card.label} className="philix-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${
                card.color === "emerald" ? "bg-emerald-100 text-emerald-700" :
                card.color === "amber" ? "bg-amber-100 text-amber-700" :
                "bg-navy-100 text-navy-700"
              }`}>
                <card.icon size={18} />
              </div>
              <ArrowUpRight size={14} className="text-navy-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-navy-900">{card.value}</div>
            <div className="text-xs text-navy-600 mt-1 font-medium">{card.label}</div>
            <div className="text-xs text-navy-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Financial totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="philix-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
            <Banknote size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-navy-900 truncate">
              {formatKwacha(portalSummary.totalDisbursedAmount)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Disbursed</div>
            <div className="text-xs text-navy-500">Zambian Kwacha (ZMW)</div>
          </div>
        </div>
        <div className="philix-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-100 text-teal-700 flex-shrink-0">
            <CheckCircle size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-teal-700 truncate">
              {formatKwacha(portalSummary.totalCollected)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Collected</div>
            <div className="text-xs text-navy-500">{portalSummary.repaidLoansCount} loan{portalSummary.repaidLoansCount !== 1 ? "s" : ""} fully repaid</div>
          </div>
        </div>
        <div className="philix-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-amber-700 truncate">
              {formatKwacha(portalSummary.totalInterestEarned)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Interest Earned</div>
            <div className="text-xs text-navy-500">Zambian Kwacha (ZMW)</div>
          </div>
        </div>
        <div className="philix-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700 flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-navy-900 truncate">
              {formatKwacha(portalSummary.totalRepayable)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Repayable</div>
            <div className="text-xs text-navy-500">Zambian Kwacha (ZMW)</div>
          </div>
        </div>
        <div className="philix-card p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-100 text-violet-700 flex-shrink-0">
            <Activity size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono text-navy-900 truncate">
              {formatKwacha(portalSummary.totalLoanedOut)}
            </div>
            <div className="text-xs font-semibold text-navy-600 mt-0.5">Active Book</div>
            <div className="text-xs text-navy-500">Zambian Kwacha (ZMW)</div>
          </div>
        </div>
      </div>

      {/* Penalty & Risk KPIs (from accounts/kpis) */}
      {accountKpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="philix-card p-5 flex items-center gap-4" style={{ borderColor: accountKpis.totalPenalties > 0 ? "rgba(239,68,68,0.4)" : undefined }}>
            <div className="p-3 rounded-xl bg-red-100 text-red-700 flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold font-mono text-red-600 truncate">{formatKwacha(accountKpis.totalPenalties)}</div>
              <div className="text-xs font-semibold text-navy-600 mt-0.5">Total Penalties</div>
              <div className="text-xs text-navy-500">2%/day after 3-day grace</div>
            </div>
          </div>
          <div className="philix-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100 text-orange-700 flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold font-mono text-orange-700 truncate">{accountKpis.overdueCount}</div>
              <div className="text-xs font-semibold text-navy-600 mt-0.5">Overdue Clients</div>
              <div className="text-xs text-navy-500">PAR: {accountKpis.portfolioAtRisk}%</div>
            </div>
          </div>
          <div className="philix-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
              <Zap size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold font-mono text-emerald-700 truncate">{formatKwacha(accountKpis.collectionsToday)}</div>
              <div className="text-xs font-semibold text-navy-600 mt-0.5">Collections Today</div>
              <div className="text-xs text-navy-500">Approved payments</div>
            </div>
          </div>
          <div className="philix-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
              <BarChart2 size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold font-mono text-navy-900 truncate">{formatKwacha(accountKpis.totalPortfolio)}</div>
              <div className="text-xs font-semibold text-navy-600 mt-0.5">Loan Portfolio</div>
              <div className="text-xs text-navy-500">Principal + Interest</div>
            </div>
          </div>
        </div>
      )}

      {/* Portal KPIs — Row 2 (from applications store) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Under Review", value: applications.filter(a => a.status === "UNDER_REVIEW").length, color: "bg-blue-100 text-blue-700" },
          { label: "Approved", value: applications.filter(a => a.status === "APPROVED").length, color: "bg-emerald-100 text-emerald-700" },
          { label: "Disbursed", value: applications.filter(a => a.status === "DISBURSED").length, color: "bg-indigo-100 text-indigo-700" },
          { label: "Rejected", value: applications.filter(a => a.status === "REJECTED").length, color: "bg-red-100 text-red-700" },
        ].map((card) => (
          <div key={card.label} className="philix-card p-4 flex items-center gap-4">
            <div className={`text-2xl font-bold font-mono ${card.color.split(" ")[1]}`}>{card.value}</div>
            <div>
              <div className="text-xs font-medium text-navy-600">{card.label}</div>
              <div className="text-xs text-navy-500">applications</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Portal Applications */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Pending Loan Applications
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">Online portal submissions awaiting review</p>
          </div>
          {pendingApps.length > 0 && (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingApps.length} pending
            </span>
          )}
        </div>

        {pendingApps.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-700 font-medium">All caught up — no pending applications right now.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApps.map(app => (
              <div key={app.id} className="flex items-center justify-between p-4 bg-warm-50 border border-warm-200 rounded-xl hover:border-gold-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-navy-900">{app.clientName}</span>
                    <span className="text-xs text-navy-500">·</span>
                    <span className="text-xs text-navy-600 font-mono">{app.ref}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      app.status === "UNDER_REVIEW"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {app.status === "UNDER_REVIEW" ? "Under Review" : "Pending"}
                    </span>
                  </div>
                  <div className="text-xs text-navy-600 mt-1">
                    <span className="font-medium text-navy-700">{app.productName}</span>
                    {" · "}
                    <span className="font-mono font-semibold text-navy-800">{formatKwacha(app.amount)}</span>
                    {" · "}
                    {app.rateDuration}
                    {app.purpose && <span> · {app.purpose}</span>}
                  </div>
                  <div className="text-xs text-navy-500 mt-0.5">
                    {app.clientEmail}
                    {" · Submitted "}
                    {new Date(app.submittedAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  {app.collateralPhotos && app.collateralPhotos.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {app.collateralPhotos.slice(0, 4).map((src, i) => (
                        <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                          <img src={src} alt={`Collateral ${i + 1}`} className="w-12 h-12 object-cover rounded-lg border border-warm-300 hover:border-gold-400 transition-colors" />
                        </a>
                      ))}
                      {app.collateralPhotos.length > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-warm-100 border border-warm-300 flex items-center justify-center text-xs font-semibold text-navy-600">
                          +{app.collateralPhotos.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleAction(app.id, "APPROVED")}
                    disabled={actionLoading === app.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(app.id, "REJECTED")}
                    disabled={actionLoading === app.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Portal Accounts Growth */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              Portal Accounts
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">Client account overview and recent registrations</p>
          </div>
          {accountsLoading && (
            <span className="text-xs text-navy-500 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Loading...
            </span>
          )}
          <a href="/portal-clients" className="text-xs text-indigo-700 hover:underline font-semibold">View All →</a>
        </div>

        {/* Status breakdown */}
        {portalAccounts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {["ACTIVE", "PENDING_KYC", "SUSPENDED", "BLACKLISTED"].map(status => (
              <div key={status} className="text-center p-3 bg-warm-50 border border-warm-200 rounded-xl">
                <div className="text-xl font-bold font-mono text-navy-900">{statusCounts[status] ?? 0}</div>
                <div className="text-xs text-navy-500 mt-0.5">{status.replace("_", " ")}</div>
              </div>
            ))}
          </div>
        )}

        {/* Most recent 5 accounts */}
        {recentAccounts.length === 0 ? (
          <div className="text-sm text-navy-500 py-4 text-center">No portal accounts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-navy-500 border-b border-warm-200">
                  <th className="text-left pb-2 font-medium">Client #</th>
                  <th className="text-left pb-2 font-medium">Name</th>
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Registered</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {recentAccounts.map(acc => {
                  const isLoading = accountActionLoading?.startsWith(acc.id);
                  const isActive = acc.status === "ACTIVE";
                  return (
                    <tr key={acc.id} className="hover:bg-warm-50 transition-colors">
                      <td className="py-2.5 pr-3 font-mono text-xs text-navy-600">{acc.clientNumber}</td>
                      <td className="py-2.5 pr-3 text-xs font-medium text-navy-800">{acc.firstName} {acc.lastName}</td>
                      <td className="py-2.5 pr-3 text-xs text-navy-600">{acc.email}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[acc.status] ?? "bg-warm-200 text-navy-600 border-warm-300"}`}>
                          {acc.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-navy-500">
                        {new Date(acc.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          {isActive ? (
                            <button
                              onClick={() => handleAccountStatus(acc.id, "SUSPENDED")}
                              disabled={!!isLoading}
                              title="Deactivate account"
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-40"
                            >
                              <ShieldOff size={11} /> Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAccountStatus(acc.id, "ACTIVE")}
                              disabled={!!isLoading}
                              title="Activate account"
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-40"
                            >
                              <ShieldCheck size={11} /> Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAccount(acc.id, `${acc.firstName} ${acc.lastName}`)}
                            disabled={!!isLoading}
                            title="Delete account permanently"
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Branch Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="philix-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title flex items-center gap-2">
                <BarChart2 size={16} className="text-purple-500" />
                Branch Leaderboard
              </h3>
              <p className="text-xs text-navy-600 mt-0.5">UNZA · CBU · UNILUS performance ranking</p>
            </div>
          </div>
          {branchLeaderboard.length === 0 ? (
            <div className="text-sm text-navy-500 py-6 text-center">No branch data yet — assign officers to branches first</div>
          ) : (
            <div className="space-y-3">
              {branchLeaderboard.map((b, i) => (
                <div key={b.branch} className={`rounded-xl p-4 border ${i === 0 ? "border-yellow-300 bg-yellow-50" : i === 1 ? "border-warm-300 bg-warm-50" : "border-warm-200 bg-warm-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : "bg-amber-600 text-white"}`}>
                        {b.rank}
                      </span>
                      <span className="font-bold text-navy-800">{b.branch}</span>
                    </div>
                    <span className="text-xs font-bold text-navy-600">Score: {b.score}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><div className="text-navy-500">Disbursed</div><div className="font-semibold text-navy-800">K{b.totalDisbursed.toLocaleString()}</div></div>
                    <div><div className="text-navy-500">Collection</div><div className={`font-semibold ${b.collectionRate >= 80 ? "text-emerald-600" : b.collectionRate >= 60 ? "text-amber-600" : "text-red-600"}`}>{b.collectionRate}%</div></div>
                    <div><div className="text-navy-500">PAR Rate</div><div className={`font-semibold ${b.parRate <= 5 ? "text-emerald-600" : b.parRate <= 15 ? "text-amber-600" : "text-red-600"}`}>{b.parRate}%</div></div>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${Math.min(100, b.collectionRate)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Statements */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              Monthly Statements
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">Send monthly statements to all active clients</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="text-sm font-semibold text-blue-800 mb-1">Auto Statement Delivery</div>
            <div className="text-xs text-blue-600">Sends personalised in-app statements to every client with an active loan. Each client receives their loan summary, outstanding balance, and a prompt to view payment history.</div>
          </div>
          {statementsMsg && (
            <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${statementsMsg.ok ? "text-emerald-700 bg-emerald-100 border border-emerald-200" : "text-red-700 bg-red-100"}`}>
              {statementsMsg.text}
            </div>
          )}
          <button onClick={sendMonthlyStatements} disabled={statementsLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50">
            {statementsLoading ? <><RefreshCw size={14} className="animate-spin" /> Sending…</> : "📧 Send Monthly Statements Now"}
          </button>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              Live Activity Feed
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">Real-time portal events — refreshes every 30 seconds</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE
            </div>
            <button
              onClick={() => { syncFromApi(); fetchActivity(); }}
              disabled={activityLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-warm-300 rounded-lg hover:bg-warm-50 text-navy-600 disabled:opacity-50"
            >
              <RefreshCw size={11} className={activityLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {(() => {
          const storeEvents: ActivityEvent[] = applications.slice(0, 10).map(a => ({
            id: a.id,
            type: a.status === "PENDING" ? "APPLICATION_SUBMITTED" :
                  a.status === "UNDER_REVIEW" ? "APPLICATION_REVIEWING" :
                  a.status === "APPROVED" ? "APPLICATION_APPROVED" :
                  a.status === "REJECTED" ? "APPLICATION_REJECTED" : "LOAN_DISBURSED",
            client: a.clientName,
            ref: a.ref,
            amount: a.amount,
            description: a.status === "PENDING"
              ? `${a.clientName} submitted a ${a.productName} application for ${formatKwacha(a.amount)}`
              : a.status === "APPROVED"
              ? `${a.clientName}'s loan of ${formatKwacha(a.amount)} was APPROVED`
              : a.status === "REJECTED"
              ? `${a.clientName}'s application was rejected`
              : `${a.clientName} — ${a.productName} · ${formatKwacha(a.amount)}`,
            timestamp: a.submittedAt,
          }));
          const events = liveActivity.length > 0 ? liveActivity : storeEvents;

          if (events.length === 0) {
            return (
              <div className="flex items-center gap-3 p-4 bg-warm-50 border border-warm-200 rounded-xl text-sm text-navy-600">
                <Activity size={16} className="text-navy-400 flex-shrink-0" />
                No activity yet — portal events will appear here as clients submit applications.
              </div>
            );
          }

          return (
            <div className="space-y-2">
              {events.slice(0, 12).map((evt) => {
                const meta = EVENT_ICONS[evt.type] ?? EVENT_ICONS.APPLICATION_UPDATED;
                const Icon = meta.icon;
                const ts = new Date(evt.timestamp);
                const isToday = ts.toDateString() === new Date().toDateString();
                const timeStr = isToday
                  ? ts.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })
                  : ts.toLocaleDateString("en-ZM", { day: "numeric", month: "short" });
                return (
                  <div key={evt.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-warm-50 transition-colors border border-transparent hover:border-warm-200">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${meta.bg}`}>
                      <Icon size={14} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy-800">{evt.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-navy-500">{evt.ref}</span>
                        <span className="text-navy-300">·</span>
                        <span className="text-xs text-navy-500">{timeStr}</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-semibold text-navy-700 flex-shrink-0">
                      {evt.amount > 0 ? formatKwacha(evt.amount) : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Real-Time Alert Feed */}
      <div className="philix-card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-red-500" />
            <h3 className="font-bold text-navy-900">Live Alert Feed</h3>
            {alerts.filter(a => a.severity === "critical").length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                {alerts.filter(a => a.severity === "critical").length} critical
              </span>
            )}
          </div>
          <button onClick={fetchAlerts} className="text-xs text-navy-500 hover:text-navy-700 flex items-center gap-1">
            <RefreshCw size={11} className={alertsLoading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        {alertsLoading && alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-navy-400">Loading alerts…</div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-navy-400 flex flex-col items-center gap-2">
            <CheckCircle size={20} className="text-emerald-400" />
            No critical events in the last 24 hours
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {alerts.map(alert => {
              const SEVERITY = {
                critical: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", icon: AlertTriangle, ic: "text-red-600" },
                warning:  { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", icon: AlertTriangle, ic: "text-amber-600" },
                info:     { bg: "bg-blue-50",  border: "border-blue-200",  dot: "bg-blue-400",  icon: FileText, ic: "text-blue-600" },
                success:  { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", icon: CreditCard, ic: "text-emerald-600" },
              }[alert.severity];
              const Icon = alert.type === "NEW_ACCOUNT" ? UserPlus : SEVERITY.icon;
              return (
                <div key={alert.id} className={`flex items-start gap-3 px-5 py-3.5 ${SEVERITY.bg} border-l-4 ${SEVERITY.border}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${alert.severity === "critical" ? "bg-red-100" : alert.severity === "warning" ? "bg-amber-100" : alert.severity === "success" ? "bg-emerald-100" : "bg-blue-100"}`}>
                    <Icon size={13} className={SEVERITY.ic} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-900 truncate">{alert.title}</div>
                    <div className="text-xs text-navy-500 mt-0.5 truncate">{alert.detail}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {alert.amount ? (
                      <div className="text-xs font-bold text-navy-700">K{alert.amount.toLocaleString()}</div>
                    ) : null}
                    <div className="text-[10px] text-navy-400 mt-0.5">
                      {new Date(alert.timestamp).toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DEFAULTS TRACKING ────────────────────────────────────────────────── */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <TrendingDown size={16} className="text-red-500" />
              Default Tracker — 30+ Days Overdue
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">
              {defaults ? `${defaults.total} loans in default — total K${(defaults.totalAmount ?? 0).toLocaleString()} at risk — avg ${defaults.avgDaysOverdue} days overdue` : "Loading…"}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fetchDefaults(defaultsPage)} disabled={defaultsLoading}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1 hover:bg-gray-50">
              <RefreshCw size={11} className={defaultsLoading ? "animate-spin" : ""} /> Refresh
            </button>
            <a href="/default-risk" className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 font-semibold">Full Report →</a>
          </div>
        </div>
        {defaultsLoading && !defaults ? (
          <div className="py-8 text-center text-sm text-navy-400"><Loader2 size={16} className="animate-spin inline mr-2" />Loading defaults…</div>
        ) : !defaults || defaults.data.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-700 font-medium">No loans in default — all active loans are within 30 days.</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B1F3A] text-white text-xs">
                    {["Client", "Loan Ref", "Product", "Principal", "Total Owed", "Paid", "Days Overdue", "Last Payment", "Action"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {defaults.data.map((loan, i) => (
                    <tr key={loan.id} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-red-50/30"}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-navy-900 text-xs">{loan.clientName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{loan.clientNumber}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-navy-600">{loan.reference}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{loan.productType?.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold">{fmtK(loan.principal)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs font-bold text-red-700">{fmtK(loan.remaining)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-emerald-700">{fmtK(loan.totalPaid)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${loan.daysOverdue > 90 ? "bg-red-200 text-red-800" : loan.daysOverdue > 60 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {loan.daysOverdue}d
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[10px] text-gray-500">
                        {loan.lastPaymentDate ? new Date(loan.lastPaymentDate).toLocaleDateString("en-ZM", { day: "numeric", month: "short" }) : "Never"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => markContacted(loan, "call")} disabled={contactingLoan === loan.id}
                            title="Log phone call"
                            className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-40">
                            <PhoneCall size={12} />
                          </button>
                          <button onClick={() => markContacted(loan, "visit")} disabled={contactingLoan === loan.id}
                            title="Log field visit"
                            className="p-1 rounded hover:bg-amber-100 text-amber-600 transition-colors disabled:opacity-40">
                            <MapPin size={12} />
                          </button>
                          <button onClick={async () => {
                            const token = localStorage.getItem("philix_staff_token");
                            await fetch("/api/emails/send", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
                              body: JSON.stringify({ to: loan.email, subject: "Loan Repayment Reminder — Philix Finance", templateKey: "overdue_notice", params: { clientName: loan.clientName, loanRef: loan.reference, amountDue: loan.remaining } }),
                            });
                            alert(`Overdue reminder sent to ${loan.email}`);
                          }} title="Send reminder email"
                            className="p-1 rounded hover:bg-indigo-100 text-indigo-600 transition-colors">
                            <Mail size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#0B1F3A]/5 border-t-2 border-gray-300">
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-bold text-navy-800">TOTAL ({defaults.total} loans)</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-black text-red-700">{fmtK(defaults.totalAmount)}</td>
                    <td colSpan={4} className="px-3 py-2.5 text-xs text-navy-500">Avg {defaults.avgDaysOverdue} days overdue</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Pagination */}
            {defaults.total > 25 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-xs text-gray-500">Showing {defaultsPage * 25 + 1}–{Math.min((defaultsPage + 1) * 25, defaults.total)} of {defaults.total}</span>
                <div className="flex gap-2">
                  <button onClick={() => { const p = Math.max(0, defaultsPage - 1); setDefaultsPage(p); fetchDefaults(p); }} disabled={defaultsPage === 0}
                    className="text-xs px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button onClick={() => { const p = defaultsPage + 1; setDefaultsPage(p); fetchDefaults(p); }} disabled={(defaultsPage + 1) * 25 >= defaults.total}
                    className="text-xs px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── INTEREST INCOME SECTION ───────────────────────────────────────────── */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-500" />
              Interest Income — 6 Month Overview
            </h3>
            <p className="text-xs text-navy-600 mt-0.5">Interest billed vs collected per month</p>
          </div>
          {interestLoading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>

        {/* 3 headline figures */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-navy-50 border border-navy-200 rounded-xl p-4 text-center">
            <div className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-1">Billed This Month</div>
            <div className="text-xl font-bold font-mono text-navy-900">{fmtK(lastInterestMonth?.interest_billed ?? 0)}</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Collected This Month</div>
            <div className="text-xl font-bold font-mono text-amber-800">{fmtK(lastInterestMonth?.interest_collected ?? 0)}</div>
          </div>
          <div className={`rounded-xl p-4 text-center border ${interestCollectionRate >= 80 ? "bg-emerald-50 border-emerald-200" : interestCollectionRate >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
            <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${interestCollectionRate >= 80 ? "text-emerald-700" : interestCollectionRate >= 60 ? "text-amber-700" : "text-red-700"}`}>Collection Rate</div>
            <div className={`text-xl font-bold font-mono ${interestCollectionRate >= 80 ? "text-emerald-800" : interestCollectionRate >= 60 ? "text-amber-800" : "text-red-800"}`}>{interestCollectionRate}%</div>
          </div>
        </div>

        {/* Bar chart */}
        {interestData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={interestData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `K${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => fmtK(value)} />
              <Legend />
              <Bar dataKey="interest_billed" name="Billed" fill="#0B1F3A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="interest_collected" name="Collected" fill="#C9A227" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-navy-400">
            {interestLoading ? <Loader2 size={16} className="animate-spin" /> : "No interest data yet — data will appear once loans are disbursed and repayments begin."}
          </div>
        )}
      </div>
    </div>
  );
}
