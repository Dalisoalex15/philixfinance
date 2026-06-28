import { Outlet, NavLink, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";
import {
  LayoutDashboard, CreditCard, Package, FileText, User,
  LogOut, Bell, Menu, X, Shield, Phone, ChevronRight,
  Zap, Home, Calculator, BarChart2, Users, HelpCircle,
  ClipboardList, TrendingUp, Sparkles, Calendar, RefreshCw,
  Folder, MessageSquare, Download,
} from "lucide-react";
import { useState, useEffect } from "react";
import PhilixLogo from "../ui/PhilixLogo";
import PortalChatbot from "./PortalChatbot";

const navGroups = [
  {
    label: "Quick Actions",
    items: [
      { href: "/portal/dashboard",    icon: LayoutDashboard, label: "Dashboard",           color: "text-indigo-400" },
      { href: "/portal/get-a-loan",   icon: Sparkles,        label: "Get a Loan in 15 Min",color: "text-amber-400", highlight: true },
      { href: "/portal/apply",        icon: FileText,        label: "Apply for Loan",       color: "text-blue-400" },
      { href: "/portal/renew",        icon: RefreshCw,       label: "Renew My Loan",        color: "text-emerald-400", badge: "NEW" },
    ],
  },
  {
    label: "My Loans",
    items: [
      { href: "/portal/loans",            icon: CreditCard,   label: "My Loans",             color: "text-emerald-400" },
      { href: "/portal/payment-calendar", icon: Calendar,     label: "Payment Calendar",     color: "text-cyan-400", badge: "NEW" },
      { href: "/portal/account-statement",icon: Download,     label: "Account Statement",    color: "text-sky-400", badge: "NEW" },
      { href: "/portal/products",         icon: Package,      label: "Compare Loan Products",color: "text-orange-400" },
      { href: "/portal/calculator",       icon: Calculator,   label: "Loan Calculator",      color: "text-cyan-400" },
      { href: "/portal/eligibility",      icon: ClipboardList,label: "Loan Eligibility",     color: "text-teal-400" },
    ],
  },
  {
    label: "My Account",
    items: [
      { href: "/portal/credit-score",  icon: BarChart2, label: "Credit Score",          color: "text-violet-400" },
      { href: "/portal/documents",     icon: Folder,    label: "Document Centre",        color: "text-amber-400", badge: "NEW" },
      { href: "/portal/statement",     icon: TrendingUp,label: "Statements",             color: "text-sky-400" },
      { href: "/portal/invest",        icon: TrendingUp,label: "Invest",                 color: "text-indigo-400" },
      { href: "/portal/referral",      icon: Users,     label: "Refer & Earn",           color: "text-orange-400" },
    ],
  },
  {
    label: "Verification",
    items: [
      { href: "/portal/collateral",    icon: Package, label: "Submit Collateral",     color: "text-amber-400" },
      { href: "/portal/kyc",           icon: Shield,  label: "Identity Verification", color: "text-purple-400" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/portal/help",          icon: MessageSquare, label: "Support Tickets",   color: "text-green-400", badge: "NEW" },
      { href: "/portal/about",         icon: HelpCircle,    label: "About Philix",      color: "text-amber-400" },
      { href: "/portal/notifications", icon: Bell,          label: "Notifications",     color: "text-pink-400" },
      { href: "/portal/profile",       icon: User,          label: "My Profile",        color: "text-slate-400" },
    ],
  },
];

// Flat list for mobile nav and anywhere that needs the full list
const navItems = navGroups.flatMap(g => g.items);

const bottomNav = [
  { href: "/portal/dashboard", icon: Home, label: "Home" },
  { href: "/portal/loans", icon: CreditCard, label: "Loans" },
  { href: "/portal/apply", icon: Zap, label: "Apply", highlight: true },
  { href: "/portal/notifications", icon: Bell, label: "Alerts" },
  { href: "/portal/profile", icon: User, label: "Profile" },
];

function PortalLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Loading your account…</span>
      </div>
    </div>
  );
}

export default function ClientPortalLayout() {
  const client = useClientAuthStore(s => s.client);
  const logout = useClientAuthStore(s => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const allApplications = useLoanApplicationStore(s => s.applications);
  const notifCount = client
    ? allApplications.filter(a => a.clientId === client.id && a.status !== "PENDING").length
    : 0;

  // Use Zustand's official persist.hasHydrated() + persist.onFinishHydration()
  // to detect when localStorage has been restored. Never redirect during hydration.
  const [hydrated, setHydrated] = useState(() => useClientAuthStore.persist.hasHydrated());

  useEffect(() => {
    // If storage was synchronously read before first render, nothing to do
    if (useClientAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    // Subscribe to hydration completion; returns an unsubscribe function
    const unsub = useClientAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // Safety fallback: if onFinishHydration never fires (e.g. empty storage),
    // resolve after 300ms so the user isn't stuck on the spinner forever.
    const timer = setTimeout(() => setHydrated(true), 300);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/portal/login");
  };

  if (!hydrated) return <PortalLoader />;

  if (!client) {
    return <Navigate to="/portal/login" replace />;
  }

  const initials = `${client.firstName[0]}${client.lastName[0]}`.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800/60 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 flex-shrink-0">
          <PhilixLogo variant="full" size="sm" onDark />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-900/40 border border-indigo-800/50 px-2 py-0.5 rounded-full">CLIENT</span>
            <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Client card */}
        <div className="px-4 py-4 border-b border-slate-800/40 flex-shrink-0">
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 border border-indigo-800/30 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-lg shadow-indigo-900/40">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200 text-sm truncate">{client.firstName} {client.lastName}</div>
                <div className="text-xs text-slate-400 truncate">{client.email}</div>
                <div className="text-[10px] text-indigo-400 font-mono">{client.clientNumber}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${client.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className="text-[10px] text-slate-500 capitalize">{client.status.toLowerCase().replace("_", " ")}</span>
                </div>
              </div>
            </div>
            {client.kycStatus === "VERIFIED" && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-900/20 border border-emerald-900/30 rounded-lg px-2 py-1">
                <Shield size={9} /> KYC Verified
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label} className="mb-3">
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-1">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = location.pathname === item.href;
                  const typedItem = item as { badge?: string | number; highlight?: boolean };
                  return (
                    <NavLink key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        typedItem.highlight && !isActive
                          ? "bg-indigo-600/20 border border-indigo-600/30 text-indigo-300 hover:bg-indigo-600/30"
                          : isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                          : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}>
                        <item.icon size={15} className={isActive ? "text-white" : item.color} />
                        <span className="flex-1 font-medium text-[13px]">{item.label}</span>
                        {typedItem.badge && !isActive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {typedItem.badge}
                          </span>
                        )}
                        {typedItem.highlight && !isActive && (
                          <Zap size={11} className="text-indigo-400 flex-shrink-0" />
                        )}
                        {isActive && <ChevronRight size={12} />}
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* KYC nudge */}
        {client.kycStatus !== "VERIFIED" && (
          <div className="mx-3 mb-3 bg-amber-900/20 border border-amber-800/40 rounded-xl p-3">
            <div className="text-xs font-bold text-amber-400 mb-1">⚠️ Complete KYC</div>
            <div className="text-xs text-slate-500 mb-2">Verify your identity to unlock higher loan limits and faster approvals.</div>
            <Link to="/portal/kyc" onClick={() => setMobileOpen(false)} className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
              Verify Now <ChevronRight size={10} />
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-800/60 p-3 space-y-1">
          <a href="tel:+260777158901" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-slate-400 rounded-xl hover:bg-slate-800/50 transition-all">
            <Phone size={12} /> +260 777 158 901 — Support
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500/70 hover:text-red-400 rounded-xl hover:bg-red-900/20 transition-all">
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-slate-900/80 backdrop-blur border-b border-slate-800/60 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-300 p-1">
            <Menu size={20} />
          </button>
          <div className="lg:hidden">
            <PhilixLogo variant="full" size="sm" onDark />
          </div>
          <div className="flex-1 min-w-0 hidden lg:block">
            <div className="text-sm font-semibold text-slate-300 truncate">
              {[...navItems, { href: "/portal/calculator", label: "Loan Calculator" }].find(n => n.href === location.pathname)?.label ?? "Client Portal"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {client.kycStatus === "VERIFIED" && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 px-2 py-1 rounded-full font-semibold">
                <Shield size={9} /> KYC Verified
              </span>
            )}
            <Link to="/portal/notifications" className="relative text-slate-500 hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-800 transition-all">
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>
            <Link to="/portal/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
              {initials}
            </Link>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* AI Chatbot */}
        <PortalChatbot />

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800/60 px-2 py-2 flex items-center justify-around">
          {bottomNav.map(item => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink key={item.href} to={item.href}
                className="flex flex-col items-center gap-0.5 relative">
                {item.highlight ? (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isActive ? "bg-indigo-500 shadow-indigo-900/50" : "bg-indigo-600 shadow-indigo-900/30"}`}>
                    <item.icon size={20} className="text-white" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? "bg-indigo-600/20" : ""}`}>
                    <item.icon size={18} className={isActive ? "text-indigo-400" : "text-slate-600"} />
                    {item.href === "/portal/notifications" && notifCount > 0 && !isActive && (
                      <span className="absolute -top-0.5 right-0 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                        {notifCount > 9 ? "9+" : notifCount}
                      </span>
                    )}
                  </div>
                )}
                <span className={`text-[9px] font-medium ${isActive ? "text-indigo-400" : "text-slate-600"} ${item.highlight ? "text-indigo-300" : ""}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
