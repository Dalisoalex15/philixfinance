import {
  Users, CheckCircle, Clock, Download, CreditCard, TrendingUp, Banknote,
  AlertTriangle, BarChart2, Plus, Zap, ArrowRight, RefreshCw,
  Brain, Wallet, Activity, Bell, Mail, Info,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLoanApplicationStore } from "../store/loanApplicationStore";
import { useAuthStore } from "../store/auth";

interface LiveAlert { type: string; severity: string; title: string; detail: string; href: string; ts: string; }

const K = (n: number) =>
  `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface Summary {
  totalPortalAccounts: number; pendingApplications: number;
  approvedToday: number; submittedToday: number;
  totalApplications: number; totalDisbursedAmount: number;
  totalInterestEarned: number; totalRepayable: number;
}
interface AccountKpis {
  totalPenalties: number; overdueCount: number; portfolioAtRisk: number;
  collectionsToday: number; totalActiveLoans: number;
}

const STATUS_CHIP: Record<string, string> = {
  PENDING:      "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  UNDER_REVIEW: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  APPROVED:     "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  REJECTED:     "bg-red-500/15 text-red-400 border border-red-500/25",
  DISBURSED:    "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
};

function MetricCard({
  label, value, sub, Icon, accent = "slate", alert = false,
}: {
  label: string; value: string; sub?: string; Icon: React.ElementType;
  accent?: string; alert?: boolean;
}) {
  const iconBg: Record<string, string> = {
    gold:    "bg-[#C9A227]/15 text-[#C9A227]",
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber:   "bg-amber-500/15 text-amber-400",
    red:     "bg-red-500/15 text-red-400",
    indigo:  "bg-indigo-500/15 text-indigo-400",
    slate:   "bg-white/5 text-white/40",
  };
  return (
    <div className={`rounded-2xl p-4 border transition-all ${alert ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.03] border-white/5 hover:border-white/10"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${iconBg[accent] ?? iconBg.slate}`}>
          <Icon size={16} />
        </div>
        {alert && <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Alert</span>}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight leading-none mb-1">{value}</div>
      <div className="text-[11px] font-medium text-white/40 leading-snug">{label}</div>
      {sub && <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>}
    </div>
  );
}

function exportCSV(applications: ReturnType<typeof useLoanApplicationStore.getState>["applications"]) {
  const rows = [
    ["Ref", "Client", "Email", "Product", "Amount", "Repayable", "Status", "Submitted"],
    ...applications.map(a => [
      a.ref, a.clientName, a.clientEmail, a.productName, a.amount, a.totalRepayable, a.status,
      new Date(a.submittedAt).toLocaleDateString("en-GB"),
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `philix-apps-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const { applications, updateStatus, syncFromApi } = useLoanApplicationStore();
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [summary, setSummary] = useState<Summary>({
    totalPortalAccounts: 0, pendingApplications: 0, approvedToday: 0,
    submittedToday: 0, totalApplications: 0, totalDisbursedAmount: 0,
    totalInterestEarned: 0, totalRepayable: 0,
  });
  const [kpis, setKpis] = useState<AccountKpis | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  const isCEO = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const load = useCallback(async () => {
    const token = localStorage.getItem("philix_staff_token");
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    await Promise.all([
      syncFromApi(),
      fetch("/api/admin/summary", { headers: h }).then(r => r.ok ? r.json() : null).then(d => d && setSummary(d)),
      fetch("/api/accounts/kpis", { headers: h }).then(r => r.ok ? r.json() : null).then(d => d && setKpis(d)),
      fetch("/api/dashboard/alerts", { headers: h }).then(r => r.ok ? r.json() : []).then(d => setAlerts(d ?? [])),
    ]);
    setLastRefresh(new Date());
  }, [syncFromApi]);

  const sendReminders = useCallback(async () => {
    setReminderLoading(true); setReminderResult(null);
    const token = localStorage.getItem("philix_staff_token");
    try {
      const r = await fetch("/api/admin/send-payment-reminders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const d = await r.json();
      setReminderResult(d.message ?? `Reminders sent to ${d.sent ?? 0} clients`);
    } catch { setReminderResult("Failed to send reminders"); }
    finally { setReminderLoading(false); setTimeout(() => setReminderResult(null), 5000); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60 s
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const handleRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pending = applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">
            {greeting}, {user?.firstName}
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            {isCEO ? "Executive overview — Philix Finance" : "Your work queue for today"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            {lastRefresh.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
          </button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New Client",     icon: Plus,       color: "indigo",  to: "/clients/new" },
          { label: "Review Apps",    icon: CheckCircle,color: "amber",   to: "/online-applications" },
          { label: "Client Hub",     icon: Users,      color: "gold",    to: "/client-hub",  isNew: true },
          { label: "Ask Philix AI",  icon: Brain,      color: "purple",  to: "/philix-ai" },
        ].map(({ label, icon: Icon, color, to, isNew }) => (
          <button key={label} onClick={() => navigate(to)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-all group hover:scale-[1.02] active:scale-100
              ${color === "indigo"  ? "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-400"
              : color === "amber"  ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15 text-amber-400"
              : color === "emerald"? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-400"
              : color === "gold"   ? "bg-[#C9A227]/10 border-[#C9A227]/25 hover:bg-[#C9A227]/20 text-[#C9A227]"
              :                     "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15 text-purple-400"}`}>
            <Icon size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{label}</span>
            {isNew && <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full ml-1">NEW</span>}
            <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Portal Clients"
          value={summary.totalPortalAccounts.toString()}
          sub="Registered accounts"
          Icon={Users}
          accent="slate"
        />
        <MetricCard
          label="Pending Review"
          value={pending.length.toString()}
          sub={pending.length > 0 ? "Action required" : "All clear"}
          Icon={Clock}
          accent={pending.length > 0 ? "amber" : "slate"}
        />
        <MetricCard
          label="New Today"
          value={summary.submittedToday.toString()}
          sub="Applications submitted"
          Icon={Zap}
          accent="indigo"
        />
        <MetricCard
          label="Approved Today"
          value={summary.approvedToday.toString()}
          sub="Processed today"
          Icon={CheckCircle}
          accent="emerald"
        />
      </div>

      {/* Financial row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-[#C9A227]/15"><Banknote size={18} className="text-[#C9A227]" /></div>
          <div>
            <div className="text-[11px] text-white/35 font-medium">Total Disbursed</div>
            <div className="text-lg font-bold text-white font-mono">{K(summary.totalDisbursedAmount)}</div>
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/15"><TrendingUp size={18} className="text-emerald-400" /></div>
          <div>
            <div className="text-[11px] text-white/35 font-medium">Interest Earned</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">{K(summary.totalInterestEarned)}</div>
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/15"><CreditCard size={18} className="text-indigo-400" /></div>
          <div>
            <div className="text-[11px] text-white/35 font-medium">Total Repayable</div>
            <div className="text-lg font-bold text-white font-mono">{K(summary.totalRepayable)}</div>
          </div>
        </div>
      </div>

      {/* Risk row — only when there are issues */}
      {kpis && (kpis.overdueCount > 0 || kpis.totalPenalties > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard
            label="Penalties Outstanding" value={K(kpis.totalPenalties)}
            sub="2% / day after 3-day grace" Icon={AlertTriangle} accent="red" alert
          />
          <MetricCard
            label="Overdue Clients" value={kpis.overdueCount.toString()}
            sub={`PAR: ${kpis.portfolioAtRisk}%`} Icon={Activity} accent="amber"
          />
          <MetricCard
            label="Collections Today" value={K(kpis.collectionsToday ?? 0)}
            sub="Payments received" Icon={BarChart2} accent="emerald"
          />
        </div>
      )}

      {/* Applications table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">Loan Applications</h2>
            {pending.length > 0 && (
              <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">
                {pending.length} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/online-applications" className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={10} />
            </Link>
            {applications.length > 0 && (
              <button onClick={() => exportCSV(applications)}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 border border-white/5 hover:border-white/10 px-2.5 py-1 rounded-lg transition-all">
                <Download size={10} /> Export
              </button>
            )}
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard size={28} className="mx-auto mb-3 text-white/10" />
            <p className="text-sm text-white/25">No applications yet</p>
            <p className="text-xs text-white/15 mt-1">Applications submitted by portal clients will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {["Ref", "Client", "Product", "Amount", "Repayable", "Status", "Submitted", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-white/25 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={app.id}
                    className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${i === applications.length - 1 ? "border-none" : ""}`}>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/30">{app.ref}</td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] font-medium text-white/80">{app.clientName}</div>
                      <div className="text-[10px] text-white/30">{app.clientEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-white/50 max-w-[130px] truncate">{app.productName}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-white/70 font-mono">{K(app.amount)}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#C9A227] font-mono">{K(app.totalRepayable)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[app.status] ?? "bg-white/5 text-white/30 border border-white/10"}`}>
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-white/30 whitespace-nowrap">
                      {new Date(app.submittedAt).toLocaleDateString("en-ZM", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {app.status === "PENDING" && (
                          <>
                            <button onClick={() => updateStatus(app.id, "UNDER_REVIEW")}
                              className="text-[10px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                              Review
                            </button>
                            <button onClick={() => updateStatus(app.id, "APPROVED")}
                              className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                              Approve
                            </button>
                            <button onClick={() => updateStatus(app.id, "REJECTED")}
                              className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20">
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === "UNDER_REVIEW" && (
                          <>
                            <button onClick={() => updateStatus(app.id, "APPROVED")}
                              className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                              Approve
                            </button>
                            <button onClick={() => updateStatus(app.id, "REJECTED")}
                              className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20">
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === "APPROVED" && (
                          <button onClick={() => updateStatus(app.id, "DISBURSED")}
                            className="text-[10px] px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20">
                            Disburse
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Alert Feed + Reminder Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Alert feed */}
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-white/30" />
              <h3 className="text-sm font-semibold text-white/70">Live Alerts</h3>
              {alerts.filter(a => a.severity === "danger").length > 0 && (
                <span className="text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full">
                  {alerts.filter(a => a.severity === "danger").length} critical
                </span>
              )}
            </div>
          </div>
          <div className="divide-y divide-white/[0.03] max-h-56 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-white/20">
                <CheckCircle size={20} className="mx-auto mb-2 text-emerald-500/30" />
                All clear — no active alerts
              </div>
            ) : alerts.slice(0, 8).map((a, i) => (
              <Link key={i} to={a.href}
                className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors block">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${a.severity === "danger" ? "bg-red-500" : a.severity === "warn" ? "bg-amber-500" : a.severity === "success" ? "bg-emerald-500" : "bg-blue-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-white/70">{a.title}</div>
                  <div className="text-[11px] text-white/35 truncate">{a.detail}</div>
                </div>
                <div className="text-[9px] text-white/20 whitespace-nowrap flex-shrink-0 mt-0.5">
                  {Math.floor((Date.now() - new Date(a.ts).getTime()) / 3600000) < 1
                    ? `${Math.floor((Date.now() - new Date(a.ts).getTime()) / 60000)}m ago`
                    : `${Math.floor((Date.now() - new Date(a.ts).getTime()) / 3600000)}h ago`}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Actions panel */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white/60">Quick Actions</h3>
          <button onClick={sendReminders} disabled={reminderLoading}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all text-left group disabled:opacity-50">
            <Mail size={15} className="text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-[12px] font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
                {reminderLoading ? "Sending…" : "Send Payment Reminders"}
              </div>
              <div className="text-[10px] text-white/25">Email all clients due this week</div>
            </div>
            {reminderLoading && <RefreshCw size={12} className="text-amber-400 animate-spin ml-auto" />}
          </button>
          {reminderResult && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
              <CheckCircle size={11} /> {reminderResult}
            </div>
          )}
          <Link to="/online-applications"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-all group">
            <Clock size={15} className="text-indigo-400 flex-shrink-0" />
            <div>
              <div className="text-[12px] font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">Review Applications</div>
              <div className="text-[10px] text-white/25">{pending.length} pending review</div>
            </div>
          </Link>
          <Link to="/accounts-management"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-all group">
            <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
            <div>
              <div className="text-[12px] font-semibold text-red-400 group-hover:text-red-300 transition-colors">Overdue Accounts</div>
              <div className="text-[10px] text-white/25">{kpis?.overdueCount ?? 0} clients overdue</div>
            </div>
          </Link>
          <Link to="/philix-ai"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-all group">
            <Info size={15} className="text-purple-400 flex-shrink-0" />
            <div>
              <div className="text-[12px] font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">Ask Philix AI</div>
              <div className="text-[10px] text-white/25">Credit scoring, docs, analysis</div>
            </div>
          </Link>
        </div>
      </div>

      {/* AI nudge — bottom CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/20 border border-indigo-500/15 p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/20">
            <Brain size={20} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Philix Enterprise AI is standing by</div>
            <div className="text-xs text-white/40 mt-0.5">
              Credit scoring · fraud detection · demand letters · portfolio analysis · loan calculations
            </div>
          </div>
        </div>
        <button onClick={() => navigate("/philix-ai")}
          className="flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 px-4 py-2 rounded-xl transition-all flex-shrink-0">
          Open AI <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
