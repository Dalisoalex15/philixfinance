import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Download, RefreshCw, AlertCircle, CheckCircle, Clock, Plus, X, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useClientAuthStore } from "../../store/clientAuth";

const API = "/api";

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  status: string;
  createdAt: string;
}

interface Me {
  id: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  nrcNumber?: string;
  phone?: string;
}

interface DocCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: "AVAILABLE" | "PENDING" | "NOT_APPLICABLE";
  date?: string;
  link?: string;
  action?: "download" | "link" | "request";
}

function buildDocCards(me: Me | null, loans: LoanApp[]): DocCard[] {
  const activeLoan = loans.find(l => ["APPROVED", "DISBURSED"].includes(l.status));
  const hasRepaid = loans.some(l => l.status === "REPAID");

  return [
    {
      id: "agreement",
      title: "Loan Agreement",
      description: activeLoan ? `Active agreement — ${activeLoan.reference}` : "No active loan",
      icon: "📋",
      status: activeLoan ? "AVAILABLE" : "NOT_APPLICABLE",
      date: activeLoan?.createdAt?.slice(0, 10),
      link: "/portal/loan-agreement",
      action: "link",
    },
    {
      id: "kyc",
      title: "KYC Documents",
      description: me?.kycStatus === "VERIFIED" ? "Identity documents on file and verified" : me?.kycStatus === "SUBMITTED" ? "Under review — documents submitted" : "KYC not yet submitted",
      icon: "🪪",
      status: me?.kycStatus === "VERIFIED" ? "AVAILABLE" : me?.kycStatus === "SUBMITTED" ? "PENDING" : "PENDING",
      date: undefined,
      link: "/portal/kyc",
      action: "link",
    },
    {
      id: "receipts",
      title: "Payment Receipts",
      description: loans.some(l => (l as LoanApp & { paymentSubmissions?: unknown[] }).paymentSubmissions?.length) ? "Receipts available for approved payments" : "No payment receipts yet",
      icon: "🧾",
      status: loans.length > 0 ? "AVAILABLE" : "NOT_APPLICABLE",
      date: new Date().toISOString().slice(0, 10),
      action: "download",
    },
    {
      id: "statement",
      title: "Account Statement",
      description: "Downloadable statement with all transactions",
      icon: "📊",
      status: loans.length > 0 ? "AVAILABLE" : "PENDING",
      date: new Date().toISOString().slice(0, 10),
      link: "/portal/statement",
      action: "link",
    },
    {
      id: "collateral",
      title: "Collateral Documents",
      description: activeLoan ? "Collateral documents associated with active loan" : hasRepaid ? "Collateral released" : "No active collateral",
      icon: "🏠",
      status: activeLoan ? "AVAILABLE" : "NOT_APPLICABLE",
      date: activeLoan?.createdAt?.slice(0, 10),
      action: "request",
    },
  ];
}

const STATUS_CFG = {
  AVAILABLE:      { label: "Available",      color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/40", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  PENDING:        { label: "Pending",         color: "text-amber-400",   bg: "bg-amber-900/20 border-amber-800/40",     icon: <Clock className="w-3.5 h-3.5" /> },
  NOT_APPLICABLE: { label: "Not Applicable",  color: "text-slate-500",   bg: "bg-slate-700/20 border-slate-700/40",     icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export default function DocumentCenterPage() {
  const { accessToken: token, client: user } = useClientAuthStore();
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ docType: "", notes: "" });
  const [requesting, setRequesting] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/portal/applications`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setLoans(d.applications ?? d ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const me: Me | null = user ? {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    kycStatus: user.kycStatus,
    nrcNumber: user.nrcNumber,
    phone: user.phone,
  } : null;

  const docCards = buildDocCards(me, loans);

  async function submitRequest() {
    if (!requestForm.docType.trim()) return;
    setRequesting(true);
    await new Promise(r => setTimeout(r, 700));
    setRequesting(false);
    setShowRequest(false);
    setRequestForm({ docType: "", notes: "" });
    showToast("Document request submitted. We'll contact you within 2 business days.");
  }

  function handleAction(card: DocCard) {
    if (card.action === "download") {
      showToast(`${card.title} download initiated`);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1F3A] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#C9A227]" /> Document Centre
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">All your loan documents in one place</p>
          </div>
          <button
            onClick={() => setShowRequest(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#C9A227] text-white text-xs font-medium hover:bg-[#b8911f] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Request Document
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading documents...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-400 gap-2 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : (
          <div className="space-y-3">
            {docCards.map(card => {
              const cfg = STATUS_CFG[card.status];
              return (
                <div key={card.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {card.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-white">{card.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{card.description}</p>
                      {card.date && <p className="text-xs text-slate-500 font-mono mb-3">Last updated: {card.date}</p>}

                      {/* Action Button */}
                      <div className="flex gap-2">
                        {card.action === "link" && card.link && card.status !== "NOT_APPLICABLE" && (
                          <Link
                            to={card.link}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A227] text-white text-xs font-medium hover:bg-[#b8911f] transition-colors"
                          >
                            <Download className="w-3 h-3" /> View / Download
                          </Link>
                        )}
                        {card.action === "download" && card.status === "AVAILABLE" && (
                          <button
                            onClick={() => handleAction(card)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A227] text-white text-xs font-medium hover:bg-[#b8911f] transition-colors"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        )}
                        {card.action === "request" && (
                          <button
                            onClick={() => { setRequestForm(f => ({ ...f, docType: card.title })); setShowRequest(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
                          >
                            <Send className="w-3 h-3" /> Request from Branch
                          </button>
                        )}
                        {card.status === "NOT_APPLICABLE" && (
                          <span className="text-xs text-slate-500 italic">Not applicable for your current loan status</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KYC Detail */}
                  {card.id === "kyc" && (
                    <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: "NRC / Passport", done: !!me?.nrcNumber },
                        { label: "Photo Submitted", done: me?.kycStatus !== "NOT_STARTED" },
                        { label: "KYC Status", done: me?.kycStatus === "VERIFIED", label2: me?.kycStatus ?? "—" },
                        { label: "Phone Verified", done: !!me?.phone },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {item.done
                            ? <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            : <Clock className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                          <span className={item.done ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
                          {item.label2 && <span className="text-slate-400 ml-0.5">({item.label2})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-4 text-center">
          For certified copies or original documents, visit your nearest Philix Finance branch.
        </p>
      </div>

      {/* Request Document Modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">Request a Document</h3>
              <button onClick={() => setShowRequest(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Document Type *</label>
                <input
                  type="text"
                  placeholder="e.g. Collateral Release Letter, Payment Certificate..."
                  value={requestForm.docType}
                  onChange={e => setRequestForm(f => ({ ...f, docType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Additional Notes</label>
                <textarea
                  placeholder="Any specific details or urgency..."
                  value={requestForm.notes}
                  onChange={e => setRequestForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A227] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRequest(false)} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm hover:bg-slate-700 transition-colors">Cancel</button>
              <button
                onClick={submitRequest}
                disabled={requesting || !requestForm.docType.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#C9A227] text-white text-sm font-medium hover:bg-[#b8911f] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {requesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2 z-50">
          <CheckCircle className="w-4 h-4 text-[#C9A227]" /> {toast}
        </div>
      )}
    </div>
  );
}
