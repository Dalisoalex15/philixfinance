import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard, Users, CreditCard, Package, Receipt, AlertTriangle,
  BarChart2, DollarSign, TrendingUp, CheckSquare, UserCog, Activity,
  BookOpen, Megaphone, Shield, GitBranch, Settings, Calculator,
  Building2, Wrench, ChevronLeft, ChevronRight, Crown,
  BookMarked, Landmark, Banknote, RefreshCw, Slash, Gavel, Globe,
  ScanFace, Clock, FileWarning, PieChart, LineChart, MonitorDot,
  Calendar, Users2, FileText, ShoppingBag, Mail, Upload, Download,
  Search, Percent, Wallet, Scale,
  MessageSquare, Smartphone, MessageCircle, FileSignature, QrCode,
  Brain, ShieldAlert, Gift, UsersRound, Webhook, TrendingDown,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";
import PhilixLogo from "../ui/PhilixLogo";

interface SidebarProps { open: boolean; onToggle: () => void; }
interface NavItem {
  href: string; icon: React.ElementType; label: string;
  roles?: string[]; badge?: string; badgeColor?: string;
}
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/",      icon: LayoutDashboard, label: "Dashboard" },
      { href: "/ceo",   icon: Crown,           label: "CEO Dashboard",  roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/search",icon: Search,           label: "Global Search" },
    ],
  },
  {
    label: "Lending",
    items: [
      { href: "/clients",       icon: Users,       label: "Client CRM" },
      { href: "/loans",         icon: CreditCard,  label: "Loans" },
      { href: "/loan-products",  icon: Package,      label: "Loan Products" },
      { href: "/calculator",     icon: Calculator,   label: "Loan Calculator" },
      { href: "/collateral",     icon: Package,      label: "Collateral Vault" },
      { href: "/repayments",     icon: Receipt,      label: "Repayments" },
      { href: "/group-lending",  icon: UsersRound,   label: "Group Lending" },
      { href: "/referrals",      icon: Gift,         label: "Referral Programme" },
    ],
  },
  {
    label: "Client Management",
    items: [
      { href: "/online-applications", icon: Globe,        label: "Online Applications" },
      { href: "/kyc",                 icon: ScanFace,     label: "KYC Verification" },
      { href: "/client-timeline",     icon: Clock,        label: "Client Timeline" },
      { href: "/document-expiry",     icon: FileWarning,  label: "Document Expiry" },
    ],
  },
  {
    label: "Risk & Collections",
    items: [
      { href: "/collections",       icon: AlertTriangle, label: "Collections" },
      { href: "/recovery",          icon: Wrench,        label: "Recovery" },
      { href: "/loan-restructure",  icon: RefreshCw,     label: "Restructuring" },
      { href: "/write-offs",        icon: Slash,         label: "Write-offs & Penalties" },
      { href: "/collateral-auction",icon: Gavel,         label: "Collateral Auctions" },
      { href: "/provisioning",      icon: Percent,       label: "Provisioning (PAR)" },
      { href: "/credit-scoring",    icon: Brain,         label: "AI Credit Scoring" },
      { href: "/fraud-alerts",      icon: ShieldAlert,   label: "Fraud Detection" },
      { href: "/default-risk",      icon: TrendingDown,  label: "Default Risk" },
    ],
  },
  {
    label: "Accounting",
    items: [
      { href: "/accounting",         icon: BookMarked, label: "General Ledger" },
      { href: "/cashbook",           icon: Banknote,   label: "Cashbook" },
      { href: "/bank-reconciliation",icon: Scale,      label: "Bank Reconciliation" },
      { href: "/expenses",           icon: DollarSign, label: "Expenses" },
      { href: "/budgeting",          icon: Wallet,     label: "Budgeting" },
      { href: "/forecasting",        icon: LineChart,  label: "Cash Flow Forecast" },
    ],
  },
  {
    label: "Capital & Investors",
    items: [
      { href: "/investors",           icon: TrendingUp, label: "Investors",          roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/investor-statements", icon: FileText,   label: "Investor Statements",roles: ["SUPER_ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Analytics & Reports",
    items: [
      { href: "/reports",                icon: BarChart2,  label: "Reports" },
      { href: "/branch-profitability",   icon: PieChart,   label: "Branch P&L",       roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/portfolio-profitability",icon: MonitorDot, label: "Portfolio P&L",    roles: ["SUPER_ADMIN", "MANAGER"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/tasks",         icon: CheckSquare, label: "Tasks" },
      { href: "/leave",         icon: Calendar,    label: "Leave Management" },
      { href: "/meetings",      icon: Users2,      label: "Meeting Minutes" },
      { href: "/compliance",    icon: Shield,      label: "Compliance" },
      { href: "/procurement",   icon: ShoppingBag, label: "Procurement" },
      { href: "/assets",        icon: MonitorDot,  label: "Asset Register" },
      { href: "/email-logs",    icon: Mail,        label: "Email Logs" },
      { href: "/email-composer",icon: Mail,        label: "Email Clients" },
      { href: "/announcements", icon: Megaphone,   label: "Announcements" },
      { href: "/wiki",          icon: BookOpen,    label: "Knowledge Base" },
    ],
  },
  {
    label: "Communications",
    items: [
      { href: "/sms-notifications", icon: MessageSquare,  label: "SMS Notifications" },
      { href: "/mobile-money",      icon: Smartphone,     label: "Mobile Money" },
      { href: "/whatsapp",          icon: MessageCircle,  label: "WhatsApp Business" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/loan-agreement", icon: FileSignature, label: "Loan Agreements" },
      { href: "/qr-receipts",    icon: QrCode,        label: "QR Receipts" },
      { href: "/import",         icon: Upload,        label: "Import Data" },
      { href: "/export",         icon: Download,      label: "Export Center" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/users",      icon: UserCog,   label: "Staff",      roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/performance",icon: Activity,  label: "Performance",roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/branches",   icon: Building2, label: "Branches",   roles: ["SUPER_ADMIN"] },
      { href: "/audit",          icon: Shield,    label: "Audit Logs",    roles: ["SUPER_ADMIN", "MANAGER"] },
      { href: "/api-management", icon: Webhook,   label: "API Management", roles: ["SUPER_ADMIN"] },
      { href: "/settings",       icon: Settings,  label: "Settings",       roles: ["SUPER_ADMIN"] },
    ],
  },
];

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const pendingCount = useLoanApplicationStore(s =>
    s.applications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW").length
  );

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const canAccess = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  return (
    <div className={cn(
      "flex flex-col h-full transition-all duration-300 flex-shrink-0",
      "bg-navy-900 border-r border-navy-800",
      open ? "w-64" : "w-16"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-3 h-16 border-b border-navy-800 flex-shrink-0">
        {open ? (
          <PhilixLogo variant="full" size="sm" onDark className="flex-shrink-0" />
        ) : (
          <PhilixLogo variant="icon" size="sm" className="mx-auto flex-shrink-0" />
        )}
      </div>

      {/* Tagline (collapsed: hidden) */}
      {open && (
        <div className="px-4 py-2 border-b border-navy-800">
          <p className="text-[10px] text-gold-500 font-medium italic tracking-wide">
            "Creating A Future Together"
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(canAccess);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mb-3">
              {open && (
                <div className="px-3 mb-1 mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-navy-500">
                  {group.label}
                </div>
              )}
              {visibleItems.map((item) => {
                const dynamicBadge = item.href === "/online-applications" && pendingCount > 0
                  ? pendingCount.toString()
                  : item.badge;
                return (
                  <NavLink key={item.href} to={item.href} end={item.href === "/"}>
                    {() => (
                      <div
                        className={cn(
                          "nav-item",
                          isActive(item.href) && "active",
                          !open && "justify-center px-0 relative"
                        )}
                        title={!open ? item.label : undefined}
                      >
                        <item.icon size={16} className="flex-shrink-0" />
                        {!open && item.href === "/online-applications" && pendingCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                            {pendingCount > 9 ? "9+" : pendingCount}
                          </span>
                        )}
                        {open && <span className="truncate">{item.label}</span>}
                        {open && dynamicBadge && (
                          <span className={cn(
                            "ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold",
                            item.href === "/online-applications"
                              ? "bg-red-500/20 text-red-400"
                              : (item.badgeColor || "bg-gold-500/20 text-gold-400")
                          )}>
                            {dynamicBadge}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      {open && user && (
        <div className="flex-shrink-0 p-4 border-t border-navy-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-950 text-xs font-bold flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-navy-400 truncate">{user.role.replace(/_/g, " ")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 flex items-center justify-center h-9 border-t border-navy-800 text-navy-500 hover:text-gold-400 hover:bg-navy-800 transition-colors"
      >
        {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </div>
  );
}
