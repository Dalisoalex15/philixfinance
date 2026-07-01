import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard, Users, CreditCard, Receipt, AlertTriangle, BarChart2,
  UserCog, Settings, ChevronLeft, ChevronRight, BookOpen,
  FileText, Brain, LogOut, TrendingUp, Wallet, ScanLine, Mail,
  CheckSquare, Calendar, ClipboardList, ShieldCheck, ShoppingCart,
  Package, Megaphone, Radio, BookMarked, MessageSquare, Layers,
  PieChart, Target, Search, UserCheck,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";
import PhilixLogo from "../ui/PhilixLogo";
import { useState, useEffect } from "react";

interface SidebarProps { open: boolean; onToggle: () => void; }

interface NavItem {
  to: string;
  Icon: React.ElementType;
  label: string;
  roles?: string[];
  liveCount?: boolean;
  proofCount?: boolean;
  aiAccent?: boolean;
  newBadge?: boolean;
}

interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command",
    items: [
      { to: "/",          Icon: LayoutDashboard, label: "Dashboard" },
      { to: "/philix-ai", Icon: Brain,           label: "Philix AI",  aiAccent: true },
      { to: "/search",    Icon: Search,           label: "Quick Lookup" },
    ],
  },
  {
    label: "Lending",
    items: [
      { to: "/online-applications",  Icon: FileText,   label: "Applications",    liveCount: true },
      { to: "/clients",              Icon: Users,      label: "Clients" },
      { to: "/client-hub",           Icon: UserCheck,  label: "Client Hub",      newBadge: true },
      { to: "/loans",                Icon: CreditCard, label: "Loans" },
      { to: "/repayments",           Icon: Receipt,    label: "Repayments" },
      { to: "/payment-submissions",  Icon: ScanLine,   label: "Payment Proofs",  proofCount: true },
      { to: "/accounts-management",  Icon: BookOpen,   label: "Accounts Centre", roles: ["SUPER_ADMIN", "MANAGER"] },
      { to: "/collateral",           Icon: Package,    label: "Collateral Vault" },
    ],
  },
  {
    label: "Risk & Reports",
    items: [
      { to: "/collections",    Icon: AlertTriangle, label: "Collections" },
      { to: "/credit-scoring", Icon: TrendingUp,    label: "Credit Scoring" },
      { to: "/reports",        Icon: BarChart2,     label: "Reports" },
      { to: "/ceo",            Icon: Wallet,        label: "CEO Dashboard", roles: ["SUPER_ADMIN", "MANAGER"] },
      { to: "/targets",        Icon: Target,        label: "Targets",       roles: ["SUPER_ADMIN", "MANAGER"] },
      { to: "/financial-statements", Icon: PieChart, label: "Financials",   roles: ["SUPER_ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/tasks",        Icon: CheckSquare,   label: "Tasks" },
      { to: "/leave",        Icon: Calendar,      label: "Leave Management" },
      { to: "/meetings",     Icon: ClipboardList, label: "Meeting Minutes" },
      { to: "/compliance",   Icon: ShieldCheck,   label: "Compliance" },
      { to: "/procurement",  Icon: ShoppingCart,  label: "Procurement" },
      { to: "/assets",       Icon: Package,       label: "Asset Register" },
    ],
  },
  {
    label: "Communications",
    items: [
      { to: "/email-logs",       Icon: Mail,         label: "Email Logs" },
      { to: "/email-centre",     Icon: Mail,         label: "Email Phil",        newBadge: true, roles: ["SUPER_ADMIN", "MANAGER"] },
      { to: "/announcements",    Icon: Megaphone,    label: "Announcements" },
      { to: "/client-broadcasts",Icon: Radio,        label: "Client Broadcasts" },
      { to: "/wiki",             Icon: BookMarked,   label: "Knowledge Base" },
      { to: "/sms-notifications",Icon: MessageSquare,label: "SMS Notifications" },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/portal-clients", Icon: Layers,   label: "Portal Clients",   roles: ["SUPER_ADMIN", "MANAGER"] },
      { to: "/users",          Icon: UserCog,  label: "Staff Management", roles: ["SUPER_ADMIN"] },
      { to: "/settings",       Icon: Settings, label: "Settings",         roles: ["SUPER_ADMIN"] },
    ],
  },
];

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pendingCount = useLoanApplicationStore(s =>
    s.applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW").length
  );
  const [pendingProofsCount, setPendingProofsCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("philix_staff_token");
    if (!token) return;
    const load = async () => {
      try {
        const r = await fetch("/api/admin/payment-submissions", { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const data: { status: string }[] = await r.json();
        setPendingProofsCount(data.filter(s => s.status === "PENDING").length);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 90_000);
    return () => clearInterval(t);
  }, []);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const roleLabel = (role?: string) => {
    const m: Record<string, string> = {
      SUPER_ADMIN: "CEO / Admin", MANAGER: "Manager",
      LOAN_OFFICER: "Loan Officer", COLLECTIONS_OFFICER: "Collections",
      ACCOUNTANT: "Accountant",
    };
    return role ? (m[role] ?? role) : "";
  };

  return (
    <div className={cn(
      "flex flex-col h-full transition-all duration-300 flex-shrink-0",
      "bg-[#0B1F3A] border-r border-white/5",
      open ? "w-56" : "w-14"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-white/5 flex-shrink-0 h-14",
        open ? "px-4 gap-3" : "justify-center"
      )}>
        {open ? (
          <PhilixLogo variant="full" size="sm" onDark className="flex-shrink-0" />
        ) : (
          <PhilixLogo variant="icon" size="sm" className="mx-auto flex-shrink-0" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter(canSee);
          if (!visible.length) return null;
          return (
            <div key={group.label} className="mb-1">
              {open && (
                <p className="px-3 pt-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
                  {group.label}
                </p>
              )}
              {!open && <div className="h-px bg-white/5 my-2 mx-1" />}
              {visible.map((item) => {
                const count = item.proofCount ? pendingProofsCount : (item.liveCount && pendingCount > 0 ? pendingCount : 0);
                const active = isActive(item.to);
                return (
                  <NavLink key={item.to} to={item.to} end={item.to === "/"}>
                    <div
                      title={!open ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150 relative group",
                        active
                          ? "bg-[#C9A227]/15 text-[#C9A227] font-semibold"
                          : "text-white/50 hover:text-white hover:bg-white/5",
                        !open && "justify-center px-0",
                        item.aiAccent && !active && "text-indigo-400/70 hover:text-indigo-300"
                      )}
                    >
                      {/* Gold left border for active */}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#C9A227] rounded-r-full" />
                      )}
                      <item.Icon size={15} className="flex-shrink-0" />
                      {open && (
                        <>
                          <span className="flex-1 truncate text-[13px]">{item.label}</span>
                          {item.newBadge && !count && (
                            <span className="ml-auto text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full tracking-wide">
                              NEW
                            </span>
                          )}
                          {count > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                              {count > 99 ? "99+" : count}
                            </span>
                          )}
                        </>
                      )}
                      {/* Collapsed: dot for pending count */}
                      {!open && count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold">
                          {count > 9 ? "9+" : count}
                        </span>
                      )}
                      {/* Tooltip on hover when collapsed */}
                      {!open && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10 shadow-xl">
                          {item.label}
                          {count > 0 && <span className="ml-1 text-amber-400">({count})</span>}
                        </div>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 border-t border-white/5">
        {open && user ? (
          <div className="p-3">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] text-[10px] font-bold flex-shrink-0">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-[12px] font-semibold text-white truncate leading-tight">{user.firstName} {user.lastName}</div>
                <div className="text-[10px] text-white/35 truncate">{roleLabel(user.role)}</div>
              </div>
              <button onClick={handleLogout} title="Sign out"
                className="text-white/25 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        ) : !open && (
          <button onClick={handleLogout} title="Sign out"
            className="flex items-center justify-center w-full h-10 text-white/20 hover:text-red-400 transition-colors">
            <LogOut size={14} />
          </button>
        )}

        {/* Toggle */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full h-9 text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors border-t border-white/5"
        >
          {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}
