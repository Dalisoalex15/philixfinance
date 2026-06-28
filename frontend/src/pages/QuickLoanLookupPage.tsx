import { useState, useEffect, useCallback, useRef } from "react";
import { Search, User, CreditCard, RefreshCw, ArrowRight, Phone, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";

const API = "/api";
function getToken() { return localStorage.getItem("philix-auth-v3") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface PortalClient {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  kycStatus: string;
  status: string;
  applications?: { id: string; status: string }[];
}

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  status: string;
  submittedAt: string;
  termMonths?: number;
  portalAccount?: { firstName: string; lastName: string };
}

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED:    "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED:     "bg-emerald-100 text-emerald-700",
  DISBURSED:    "bg-indigo-100 text-indigo-700",
  REPAID:       "bg-green-100 text-green-700",
  REJECTED:     "bg-red-100 text-red-700",
};
const KYC_COLOR: Record<string, string> = {
  VERIFIED:     "text-emerald-600",
  SUBMITTED:    "text-amber-600",
  NOT_STARTED:  "text-slate-400",
  REJECTED:     "text-red-500",
};

export default function QuickLoanLookupPage() {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setClients([]); setLoans([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const [cr, lr] = await Promise.allSettled([
        fetch(`${API}/admin/portal-accounts?search=${encodeURIComponent(q)}&limit=10`, { headers: authH() }),
        fetch(`${API}/admin/applications?search=${encodeURIComponent(q)}&limit=10`, { headers: authH() }),
      ]);
      if (cr.status === "fulfilled" && cr.value.ok) {
        const d = await cr.value.json();
        setClients(d.accounts ?? d.clients ?? d ?? []);
      }
      if (lr.status === "fulfilled" && lr.value.ok) {
        const d = await lr.value.json();
        setLoans(d.applications ?? d.data ?? d ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const hasResults = clients.length > 0 || loans.length > 0;

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0B1F3A] mb-1">Quick Loan Lookup</h1>
          <p className="text-sm text-slate-500">Search clients, loan references, or phone numbers</p>
          <p className="text-xs text-slate-400 mt-1">Press <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+K</kbd> to focus</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, loan ref, phone, or client number..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-300 bg-white text-base shadow-md focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent"
          />
          {loading && <RefreshCw className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-[#C9A227] animate-spin" />}
        </div>

        {/* Results */}
        {searched && !loading && !hasResults && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-slate-600">No results for "{query}"</p>
            <ul className="text-xs mt-3 space-y-1">
              <li>Try searching by full name: "John Banda"</li>
              <li>Try a loan reference: "PHL-2024-001"</li>
              <li>Try a phone number: "097XXXXXXX"</li>
            </ul>
          </div>
        )}

        {/* Clients Section */}
        {clients.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3 h-3" /> Clients ({clients.length})
            </h2>
            <div className="space-y-2">
              {clients.map(c => {
                const activeLoans = (c.applications ?? []).filter(a => ["APPROVED", "DISBURSED", "SUBMITTED", "UNDER_REVIEW"].includes(a.status)).length;
                return (
                  <Link
                    key={c.id}
                    to="/portal-clients"
                    className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-[#C9A227] hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#0B1F3A] rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {c.firstName?.[0]}{c.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0B1F3A]">{c.firstName} {c.lastName}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono">{c.clientNumber}</span>
                            {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <p className={`font-medium flex items-center gap-1 justify-end ${KYC_COLOR[c.kycStatus] ?? "text-slate-400"}`}>
                            <BadgeCheck className="w-3 h-3" /> {c.kycStatus}
                          </p>
                          <p className="text-slate-400">{activeLoans} active loan{activeLoans !== 1 ? "s" : ""}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Loans Section */}
        {loans.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <CreditCard className="w-3 h-3" /> Loans ({loans.length})
            </h2>
            <div className="space-y-2">
              {loans.map(loan => {
                const clientName = loan.portalAccount
                  ? `${loan.portalAccount.firstName} ${loan.portalAccount.lastName}`
                  : "—";
                const dueDate = loan.submittedAt
                  ? new Date(new Date(loan.submittedAt).getTime() + (loan.termMonths ?? 1) * 7 * 86400000).toLocaleDateString()
                  : "—";
                return (
                  <Link
                    key={loan.id}
                    to="/portal-clients"
                    className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-[#C9A227] hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#C9A227]/10 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-[#C9A227]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-semibold text-[#0B1F3A]">{loan.reference}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[loan.status] ?? "bg-slate-100 text-slate-600"}`}>{loan.status}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span>{clientName}</span>
                            <span className="font-mono font-medium text-[#0B1F3A]">{K(loan.amountRequested)}</span>
                            <span>Due {dueDate}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state before any search */}
        {!searched && !loading && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Start typing to search across all clients and loans</p>
          </div>
        )}
      </div>
    </div>
  );
}
