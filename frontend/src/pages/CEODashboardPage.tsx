import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, TrendingUp, CheckCircle, Users,
  Zap, ArrowUpRight, Crown, Clock, XCircle, Activity, FileText,
  ThumbsUp, ThumbsDown, Banknote, RefreshCw, BarChart2,
} from "lucide-react";
import { formatKwacha } from "../lib/mock-data";
import { useLoanApplicationStore } from "../store/loanApplicationStore";
import { staffApi } from "../lib/api";

interface ActivityEvent {
  id: string;
  type: string;
  client: string;
  ref: string;
  amount: number;
  description: string;
  timestamp: string;
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
  });
  const [portalAccounts, setPortalAccounts] = useState<PortalAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

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
      const res = await fetch("/api/admin/portal-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPortalAccounts(await res.json());
    } catch {
      // ignore
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncFromApi();
    fetchActivity();
    fetchPortalAccounts();
    const activityInterval = setInterval(() => { syncFromApi(); fetchActivity(); }, 30000);
    const clockInterval = setInterval(() => setClockTime(new Date()), 1000);
    return () => { clearInterval(activityInterval); clearInterval(clockInterval); };
  }, [fetchActivity, fetchPortalAccounts]);

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

  // Account status breakdown
  const statusCounts = portalAccounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const recentAccounts = [...portalAccounts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {recentAccounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-warm-50 transition-colors">
                    <td className="py-2.5 pr-3 font-mono text-xs text-navy-600">{acc.clientNumber}</td>
                    <td className="py-2.5 pr-3 text-xs font-medium text-navy-800">{acc.firstName} {acc.lastName}</td>
                    <td className="py-2.5 pr-3 text-xs text-navy-600">{acc.email}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[acc.status] ?? "bg-warm-200 text-navy-600 border-warm-300"}`}>
                        {acc.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-navy-500">
                      {new Date(acc.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* Financial Metrics — Launching Soon */}
      <div className="philix-card p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="section-title mb-1">Financial Metrics — Launching Soon</h3>
            <p className="text-sm text-navy-600">
              Revenue, collections, PAR, and P&amp;L data will appear here automatically as loans are issued and repayments are recorded.
            </p>
            <p className="text-xs text-navy-500 mt-2">
              Once the first loan is disbursed and repayments begin, you'll see monthly P&amp;L charts, portfolio-at-risk gauges,
              campus performance breakdowns, top collector leaderboards, and projected metrics — all derived from live data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
