import { useState } from "react";
import { FileWarning, Bell, CheckCircle, RefreshCw, AlertTriangle, Clock } from "lucide-react";

interface DocEntry {
  id: string;
  clientName: string;
  clientId: string;
  documentType: string;
  expiryDate: string;
  daysLeft: number;
  status: "EXPIRING_SOON" | "EXPIRED" | "RENEWED";
}

// Instructions for production integration:
// Connect this to a real document expiry tracking system by:
// 1. Adding an `nrcExpiryDate`, `passportExpiryDate` etc. fields to the portal_accounts schema
// 2. Creating GET /api/admin/document-expiry endpoint that returns accounts with expiring docs
// 3. Adding POST /api/admin/portal-accounts/:id/notify for sending alert SMS/email
// The mock data below demonstrates the expected data shape.

const MOCK_DOCS: DocEntry[] = [
  { id: "1", clientName: "John Banda",    clientId: "c1", documentType: "NRC",            expiryDate: "2026-07-02", daysLeft: 4,  status: "EXPIRING_SOON" },
  { id: "2", clientName: "Mary Phiri",    clientId: "c2", documentType: "Passport",        expiryDate: "2026-07-08", daysLeft: 10, status: "EXPIRING_SOON" },
  { id: "3", clientName: "David Mwale",   clientId: "c3", documentType: "Employment Letter",expiryDate: "2026-07-15", daysLeft: 17, status: "EXPIRING_SOON" },
  { id: "4", clientName: "Grace Tembo",   clientId: "c4", documentType: "NRC",            expiryDate: "2026-07-25", daysLeft: 27, status: "EXPIRING_SOON" },
  { id: "5", clientName: "Peter Nkosi",   clientId: "c5", documentType: "Collateral Deed", expiryDate: "2026-06-20", daysLeft: -8, status: "EXPIRED" },
];

const TABS = [
  { key: "7",  label: "Expiring in 7 days" },
  { key: "14", label: "14 days" },
  { key: "30", label: "30 days" },
  { key: "all", label: "All + Expired" },
];

function daysColor(d: number) {
  if (d < 0) return "text-red-600 bg-red-50 border-red-200";
  if (d <= 7) return "text-red-500 bg-red-50 border-red-200";
  if (d <= 14) return "text-orange-500 bg-orange-50 border-orange-200";
  return "text-amber-600 bg-amber-50 border-amber-200";
}

const DOC_ICONS: Record<string, string> = {
  "NRC": "🪪",
  "Passport": "📔",
  "Employment Letter": "📄",
  "Collateral Deed": "🏠",
};

export default function DocumentExpiryAlertsPage() {
  const [tab, setTab] = useState("30");
  const [alerted, setAlerted] = useState<Set<string>>(new Set());
  const [renewed, setRenewed] = useState<Set<string>>(new Set());
  const [alerting, setAlerting] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function sendAlert(doc: DocEntry) {
    setAlerting(doc.id);
    await new Promise(r => setTimeout(r, 800));
    setAlerted(prev => new Set([...prev, doc.id]));
    setAlerting(null);
    showToast(`Alert sent to ${doc.clientName} for ${doc.documentType}`);
  }

  function markRenewed(doc: DocEntry) {
    setRenewed(prev => new Set([...prev, doc.id]));
    showToast(`${doc.documentType} marked as renewed for ${doc.clientName}`);
  }

  const filtered = MOCK_DOCS
    .filter(d => !renewed.has(d.id))
    .filter(d => {
      if (tab === "all") return true;
      const days = parseInt(tab);
      return d.daysLeft <= days;
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <FileWarning className="w-6 h-6 text-[#C9A227]" />
              Document Expiry Alerts
            </h1>
            <p className="text-sm text-slate-500 mt-1">Monitor and action expiring client documents</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-1.5 max-w-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Connect to real document data — see inline instructions</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-[#0B1F3A] text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Expired", count: MOCK_DOCS.filter(d => d.daysLeft < 0 && !renewed.has(d.id)).length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
            { label: "Expiring ≤7 days", count: MOCK_DOCS.filter(d => d.daysLeft >= 0 && d.daysLeft <= 7 && !renewed.has(d.id)).length, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
            { label: "Expiring ≤30 days", count: MOCK_DOCS.filter(d => d.daysLeft >= 0 && d.daysLeft <= 30 && !renewed.has(d.id)).length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.count}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="font-medium">No documents expiring in this window</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0B1F3A] text-white">
                    {["Client Name", "Document Type", "Expiry Date", "Days Left", "Status", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc, i) => (
                    <tr key={doc.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="px-4 py-3 font-semibold text-[#0B1F3A]">{doc.clientName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="flex items-center gap-1.5">
                          {DOC_ICONS[doc.documentType] ?? "📋"} {doc.documentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{doc.expiryDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border font-mono ${daysColor(doc.daysLeft)}`}>
                          <Clock className="w-3 h-3" />
                          {doc.daysLeft < 0 ? `${Math.abs(doc.daysLeft)}d overdue` : `${doc.daysLeft}d left`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${doc.daysLeft < 0 ? "text-red-600" : "text-amber-600"}`}>
                          {doc.daysLeft < 0 ? "EXPIRED" : "EXPIRING SOON"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => sendAlert(doc)}
                            disabled={alerted.has(doc.id) || alerting === doc.id}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors ${alerted.has(doc.id) ? "bg-emerald-50 text-emerald-600 cursor-default" : "bg-[#0B1F3A] text-white hover:bg-[#0B1F3A]/80"}`}
                          >
                            {alerting === doc.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : alerted.has(doc.id) ? <CheckCircle className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                            {alerted.has(doc.id) ? "Alerted" : "Send Alert"}
                          </button>
                          <button
                            onClick={() => markRenewed(doc)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Mark Renewed
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Showing {filtered.length} document{filtered.length !== 1 ? "s" : ""} · Renewed documents are hidden from this view
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0B1F3A] text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#C9A227]" /> {toast}
        </div>
      )}
    </div>
  );
}
