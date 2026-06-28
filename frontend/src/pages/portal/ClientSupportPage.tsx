import { useState } from "react";
import { MessageCircle, Plus, X, Copy, CheckCircle, RefreshCw, AlertCircle, Clock } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  hasAttachment: boolean;
}

const CATEGORIES = ["Payment Issue", "Loan Query", "KYC Help", "Technical", "Other"];

const STATUS_CFG = {
  OPEN:        { label: "Open",        color: "text-blue-400",    bg: "bg-blue-900/30 border-blue-800/50",     icon: <AlertCircle className="w-3 h-3" /> },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-400",   bg: "bg-amber-900/30 border-amber-800/50",   icon: <Clock className="w-3 h-3" /> },
  RESOLVED:    { label: "Resolved",    color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-800/50", icon: <CheckCircle className="w-3 h-3" /> },
};

function storageKey(accountId: string) { return `philix_support_tickets_${accountId}`; }

function loadTickets(accountId: string): SupportTicket[] {
  try { return JSON.parse(localStorage.getItem(storageKey(accountId)) ?? "[]"); } catch { return []; }
}

function saveTickets(accountId: string, tickets: SupportTicket[]) {
  localStorage.setItem(storageKey(accountId), JSON.stringify(tickets));
}

export default function ClientSupportPage() {
  const { client: user } = useClientAuthStore();
  const accountId = user?.id ?? "guest";

  const [tickets, setTickets] = useState<SupportTicket[]>(loadTickets(accountId));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", category: CATEGORIES[0], description: "" });
  const [hasFile, setHasFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function submitTicket() {
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 700));
    const ticket: SupportTicket = {
      id: `TKT-${Date.now().toString(36).toUpperCase()}`,
      ...form,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      hasAttachment: hasFile,
    };
    const next = [ticket, ...tickets];
    setTickets(next);
    saveTickets(accountId, next);
    setForm({ subject: "", category: CATEGORIES[0], description: "" });
    setHasFile(false);
    setShowForm(false);
    setSubmitting(false);
    showToast(`Ticket ${ticket.id} created successfully`);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Ticket ID copied to clipboard");
  }

  return (
    <div className="min-h-screen bg-[#0B1F3A] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#C9A227]" /> Support
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Get help from the Philix team</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#C9A227] text-white text-xs font-medium hover:bg-[#b8911f] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </button>
        </div>

        {/* Contact Info Banner */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-5">
          <p className="text-xs text-[#C9A227] font-semibold mb-1">Urgent? Contact us directly</p>
          <p className="text-sm text-slate-300">📞 <a href="tel:+260977000000" className="hover:text-[#C9A227] transition-colors">+260 977 000 000</a></p>
          <p className="text-xs text-slate-500 mt-1">Mon–Fri, 08:00–17:00 WAT · Tickets responded to within 24hrs</p>
        </div>

        {/* Ticket List */}
        {tickets.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-12 text-center">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 font-medium">No support tickets yet</p>
            <p className="text-xs text-slate-500 mt-1">Create a ticket if you need help with your account</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#C9A227] text-white text-sm font-medium hover:bg-[#b8911f] transition-colors"
            >
              Create First Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const cfg = STATUS_CFG[ticket.status];
              return (
                <div key={ticket.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <button
                          onClick={() => copyId(ticket.id)}
                          className="text-xs text-slate-500 font-mono flex items-center gap-1 hover:text-[#C9A227] transition-colors"
                        >
                          #{ticket.id}
                          {copiedId === ticket.id ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{ticket.category}</span>
                      </div>
                      <p className="font-semibold text-white text-sm">{ticket.subject}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                    <span>{new Date(ticket.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                    {ticket.hasAttachment && <span>📎 Attachment</span>}
                    <button
                      onClick={() => copyId(ticket.id)}
                      className="ml-auto flex items-center gap-1 hover:text-[#C9A227] transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy ID
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg">New Support Ticket</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Subject *</label>
                <input
                  type="text"
                  placeholder="Brief description of your issue"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
                <textarea
                  placeholder="Please describe your issue in detail..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A227] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Attach Screenshot (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setHasFile(!!e.target.files?.length)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-300 file:text-xs hover:file:bg-slate-600"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-sm text-slate-400 hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={submitTicket}
                disabled={submitting || !form.subject.trim() || !form.description.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#C9A227] text-white text-sm font-medium hover:bg-[#b8911f] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#C9A227]" /> {toast}
        </div>
      )}
    </div>
  );
}
