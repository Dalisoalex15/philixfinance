import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, AlertTriangle, ShieldCheck, Search, RefreshCw, Settings } from "lucide-react";
import { staffApi, type PortalAccount } from "../lib/api";
import { toast } from "../store/toastStore";

const KYC_META: Record<string, { label: string; cls: string }> = {
  VERIFIED:    { label: "KYC Verified",  cls: "badge-green" },
  IN_REVIEW:   { label: "In Review",     cls: "badge-blue" },
  SUBMITTED:   { label: "Submitted",     cls: "badge-yellow" },
  NOT_STARTED: { label: "Not Started",   cls: "badge-gray" },
  REJECTED:    { label: "KYC Rejected",  cls: "badge-red" },
};
const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE:      { label: "Active",        cls: "badge-green" },
  PENDING_KYC: { label: "Pending KYC",  cls: "badge-yellow" },
  SUSPENDED:   { label: "Suspended",    cls: "badge-red" },
  BLACKLISTED: { label: "Blacklisted",  cls: "badge-red" },
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffApi.getPortalAccounts();
      setAccounts(data);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter(a => {
    const name = `${a.firstName} ${a.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) ||
      a.clientNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.phone.includes(search);
    const matchKyc = kycFilter === "ALL" || a.kycStatus === kycFilter;
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchSearch && matchKyc && matchStatus;
  });

  const stats = {
    total: accounts.length,
    active: accounts.filter(a => a.status === "ACTIVE").length,
    kycVerified: accounts.filter(a => a.kycStatus === "VERIFIED").length,
    suspended: accounts.filter(a => a.status === "SUSPENDED" || a.status === "BLACKLISTED").length,
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Directory</h1>
          <p className="page-subtitle">All registered portal clients — {accounts.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="btn-secondary text-xs py-1.5">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => navigate("/portal-clients")} className="btn-primary text-xs py-1.5">
            <Settings size={12} /> Manage Accounts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: stats.total, icon: Users, color: "indigo" },
          { label: "Active", value: stats.active, icon: UserCheck, color: "emerald" },
          { label: "KYC Verified", value: stats.kycVerified, icon: ShieldCheck, color: "blue" },
          { label: "Suspended/Blacklisted", value: stats.suspended, icon: AlertTriangle, color: "red" },
        ].map(s => (
          <div key={s.label} className="philix-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${s.color}-600/20 text-${s.color}-400`}>
              <s.icon size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="philix-card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-base pl-9" placeholder="Search by name, client number, email or phone..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select className="input-base w-auto text-xs" value={kycFilter} onChange={e => setKycFilter(e.target.value)}>
              <option value="ALL">All KYC</option>
              {["NOT_STARTED","SUBMITTED","IN_REVIEW","VERIFIED","REJECTED"].map(s => (
                <option key={s} value={s}>{KYC_META[s]?.label ?? s}</option>
              ))}
            </select>
            <select className="input-base w-auto text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              {["ACTIVE","PENDING_KYC","SUSPENDED","BLACKLISTED"].map(s => (
                <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="philix-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" /> Loading clients…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>KYC</th>
                  <th>Status</th>
                  <th>Loans</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="table-row-hover cursor-pointer"
                    onClick={() => navigate(`/portal-clients?id=${a.id}`)}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                          {a.firstName[0]}{a.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{a.firstName} {a.lastName}</div>
                          <div className="text-xs text-slate-500 font-mono">{a.clientNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-slate-300">{a.phone}</div>
                      <div className="text-xs text-slate-500 truncate max-w-40">{a.email}</div>
                    </td>
                    <td>
                      <span className={KYC_META[a.kycStatus]?.cls ?? "badge-gray"}>
                        {KYC_META[a.kycStatus]?.label ?? a.kycStatus}
                      </span>
                    </td>
                    <td>
                      <span className={STATUS_META[a.status]?.cls ?? "badge-gray"}>
                        {STATUS_META[a.status]?.label ?? a.status}
                      </span>
                    </td>
                    <td className="text-slate-300 font-medium">{a._count.loanApplications}</td>
                    <td className="text-slate-500 text-xs">
                      {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString("en-GB") : "Never"}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {new Date(a.createdAt).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">{search || kycFilter !== "ALL" || statusFilter !== "ALL" ? "No clients match your filters" : "No clients registered yet"}</p>
                {!search && kycFilter === "ALL" && statusFilter === "ALL" && (
                  <p className="text-xs mt-1">Clients appear here after they register through the portal</p>
                )}
              </div>
            )}
          </div>
        )}
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          Showing {filtered.length} of {accounts.length} portal clients
        </div>
      </div>
    </div>
  );
}
