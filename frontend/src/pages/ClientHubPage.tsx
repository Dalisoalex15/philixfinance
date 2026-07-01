import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, ArrowRight, Phone, Mail, CreditCard,
  RefreshCw, ShieldCheck, ShieldX, Clock, CheckCircle,
  AlertTriangle, UserCheck, XCircle, Loader2,
} from "lucide-react";
import { staffApi, type PortalAccount } from "../lib/api";

// ── helpers ────────────────────────────────────────────────────────────────────
const initials = (a: PortalAccount) =>
  `${a.firstName[0] ?? ""}${a.lastName[0] ?? ""}`.toUpperCase();

const avatarColor = (id: string) => {
  const colors = [
    "from-[#C9A227] to-amber-600",
    "from-blue-500 to-blue-700",
    "from-emerald-500 to-emerald-700",
    "from-purple-500 to-purple-700",
    "from-rose-500 to-rose-700",
    "from-cyan-500 to-cyan-700",
    "from-orange-500 to-orange-700",
    "from-teal-500 to-teal-700",
  ];
  const i = id.charCodeAt(0) % colors.length;
  return colors[i];
};

const KYC_CFG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  VERIFIED:    { label: "KYC Verified",  icon: ShieldCheck, cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  IN_REVIEW:   { label: "In Review",    icon: Clock,       cls: "text-blue-400    bg-blue-400/10    border-blue-400/20"    },
  SUBMITTED:   { label: "Submitted",    icon: CheckCircle, cls: "text-amber-400  bg-amber-400/10  border-amber-400/20"  },
  NOT_STARTED: { label: "No KYC",       icon: ShieldX,     cls: "text-slate-400  bg-slate-400/10  border-slate-400/20"  },
  REJECTED:    { label: "KYC Rejected", icon: XCircle,     cls: "text-red-400    bg-red-400/10    border-red-400/20"    },
};

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  ACTIVE:      { label: "Active",       dot: "bg-emerald-400" },
  PENDING_KYC: { label: "Pending KYC", dot: "bg-amber-400"   },
  SUSPENDED:   { label: "Suspended",   dot: "bg-orange-400"  },
  BLACKLISTED: { label: "Blacklisted", dot: "bg-red-500"     },
};

const STATUS_FILTERS = ["ALL", "ACTIVE", "PENDING_KYC", "SUSPENDED", "BLACKLISTED"];

// ── Client card ────────────────────────────────────────────────────────────────
function ClientCard({ a, onOpen }: { a: PortalAccount; onOpen: () => void }) {
  const kyc    = KYC_CFG[a.kycStatus]  ?? KYC_CFG.NOT_STARTED;
  const status = STATUS_CFG[a.status]  ?? STATUS_CFG.ACTIVE;
  const KycIcon = kyc.icon;

  return (
    <div className="group relative bg-[#0B1F3A] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:border-[#C9A227]/30 hover:shadow-lg hover:shadow-[#C9A227]/5 transition-all duration-200">

      {/* Status dot */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
        <span className="text-[10px] text-white/30 font-medium">{status.label}</span>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor(a.id)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg`}>
          {initials(a)}
        </div>
        <div className="overflow-hidden">
          <div className="text-[14px] font-bold text-white truncate leading-tight">
            {a.firstName} {a.lastName}
          </div>
          <div className="text-[11px] text-[#C9A227] font-mono font-semibold mt-0.5">
            {a.clientNumber}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 flex-1">
        {a.phone && (
          <div className="flex items-center gap-2 text-white/40 text-[12px]">
            <Phone size={11} className="flex-shrink-0" />
            <span className="truncate">{a.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-white/40 text-[12px]">
          <Mail size={11} className="flex-shrink-0" />
          <span className="truncate">{a.email}</span>
        </div>
        <div className="flex items-center gap-2 text-white/40 text-[12px]">
          <CreditCard size={11} className="flex-shrink-0" />
          <span>{a._count?.loanApplications ?? 0} loan{(a._count?.loanApplications ?? 0) !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* KYC badge */}
      <div className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${kyc.cls}`}>
        <KycIcon size={11} />
        {kyc.label}
      </div>

      {/* Open button */}
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-center gap-2 bg-[#C9A227]/10 hover:bg-[#C9A227]/20 border border-[#C9A227]/20 hover:border-[#C9A227]/40 text-[#C9A227] font-bold text-[13px] py-2.5 rounded-xl transition-all duration-150 group-hover:bg-[#C9A227]/15"
      >
        Open Client <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ClientHubPage() {
  const navigate = useNavigate();
  const [clients, setClients]         = useState<PortalAccount[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffApi.getPortalAccounts();
      setClients(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.clientNumber.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
      );
    });
  }, [clients, search, statusFilter]);

  // Stats
  const total      = clients.length;
  const active     = clients.filter(c => c.status === "ACTIVE").length;
  const verified   = clients.filter(c => c.kycStatus === "VERIFIED").length;
  const withLoans  = clients.filter(c => (c._count?.loanApplications ?? 0) > 0).length;

  return (
    <div className="p-6 space-y-6 min-h-full">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <UserCheck size={24} className="text-[#C9A227]" />
            Client Hub
            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full tracking-wide">NEW</span>
          </h1>
          <p className="text-sm text-white/35 mt-1">Click any client card to jump straight to their profile.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Clients",    value: total,    icon: Users,       color: "text-[#C9A227]",    bg: "bg-[#C9A227]/10"  },
          { label: "Active",           value: active,   icon: CheckCircle, color: "text-emerald-400",  bg: "bg-emerald-400/10" },
          { label: "KYC Verified",     value: verified, icon: ShieldCheck, color: "text-blue-400",     bg: "bg-blue-400/10"    },
          { label: "Have Loans",       value: withLoans,icon: CreditCard,  color: "text-purple-400",   bg: "bg-purple-400/10"  },
        ].map(s => (
          <div key={s.label} className="bg-[#0B1F3A] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-white/35">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, client number, phone or email…"
            className="w-full bg-[#0B1F3A] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A227]/40 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                statusFilter === f
                  ? "bg-[#C9A227] text-[#0B1F3A] border-[#C9A227]"
                  : "bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              {f === "ALL" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-[12px] text-white/30">
          Showing <span className="text-white/60 font-semibold">{filtered.length}</span> of {total} clients
          {search && <> matching <em className="text-[#C9A227]">"{search}"</em></>}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[#C9A227]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/25">
          <Users size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No clients found</p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-2 text-[#C9A227] text-xs hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => (
            <ClientCard
              key={c.id}
              a={c}
              onOpen={() => navigate(`/clients/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
