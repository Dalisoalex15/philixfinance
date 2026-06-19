import { useState, useEffect } from "react";
import {
  Send, Sparkles, TrendingUp, Heart, Target, Quote,
  CheckCircle, Users, User, Search, Clock, RefreshCw,
  ChevronRight, Zap, BookOpen, Copy, Eye,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

const TEMPLATES: Record<string, { icon: typeof Sparkles; color: string; bg: string; messages: string[] }> = {
  "Motivational": {
    icon: Sparkles,
    color: "text-amber-400",
    bg: "bg-amber-900/20 border-amber-700/30",
    messages: [
      "Success is built from small actions repeated consistently over time.",
      "Your future income is hidden inside the skills you have not mastered yet.",
      "Discipline will take you further than motivation ever can.",
      "Every successful person was once a beginner who refused to quit.",
      "Difficult seasons develop the strength needed for greater opportunities.",
      "Focus on progress, not perfection.",
      "The habits you practice daily determine the life you live tomorrow.",
      "Winners are not people who never fail; they are people who never stop trying.",
      "Growth starts where comfort ends.",
      "Your biggest competition is the person you were yesterday.",
    ],
  },
  "Financial Tips": {
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-900/20 border-emerald-700/30",
    messages: [
      "Save a portion of every income before spending anything else.",
      "Create a monthly budget and track every expense.",
      "Avoid borrowing money for non-essential purchases.",
      "Build an emergency fund that can cover at least 3–6 months of expenses.",
      "Separate business money from personal money.",
      "Invest in assets that generate income rather than liabilities that consume it.",
      "Compare prices before making major purchases.",
      "Pay debts on time to maintain a strong financial reputation.",
      "Increase your income by developing valuable skills.",
      "Make financial decisions based on long-term goals, not short-term emotions.",
    ],
  },
  "Family & Friends": {
    icon: Heart,
    color: "text-rose-400",
    bg: "bg-rose-900/20 border-rose-700/30",
    messages: [
      "Success means little if there is no one to share it with.",
      "Make time for family; opportunities return, but moments do not.",
      "A strong family is one of life's greatest blessings.",
      "Encourage your friends to grow and celebrate their victories.",
      "Listen more carefully to the people you love.",
      "Kind words can strengthen relationships for years.",
      "Forgiveness often heals relationships more than pride ever can.",
      "Be present when spending time with family and friends.",
      "Invest in relationships with the same commitment you invest in your goals.",
      "The quality of your life is often reflected in the quality of your relationships.",
    ],
  },
  "Growth Challenges": {
    icon: Target,
    color: "text-indigo-400",
    bg: "bg-indigo-900/20 border-indigo-700/30",
    messages: [
      "Read 10 pages of a personal development book every day for 30 days.",
      "Save at least K20 every day for the next month.",
      "Wake up one hour earlier for 21 consecutive days.",
      "Learn one new skill for 30 minutes daily for a month.",
      "Spend seven days without buying anything unnecessary.",
      "Exercise for at least 20 minutes every day for 30 days.",
      "Write down three goals and work on them every day for a month.",
      "Contact one person each day to strengthen your network and relationships.",
      "Keep a daily record of every kwacha you spend for 30 days.",
      "Replace one hour of social media each day with learning or productive work for the next 30 days.",
    ],
  },
  "Philix Finance": {
    icon: Quote,
    color: "text-[#F5A623]",
    bg: "bg-amber-900/10 border-amber-600/20",
    messages: [
      "Financial freedom is not achieved by earning more alone; it is achieved by managing wisely, growing consistently, and staying disciplined.",
      "At Philix Finance, we don't just fund your goals — we partner with you to achieve them.",
      "Your repayment today is your credit score for tomorrow. Stay disciplined and unlock greater opportunities.",
      "Thank you for trusting Philix Finance. We are committed to your financial growth every step of the way.",
      "Every loan repaid on time brings you one step closer to financial independence.",
    ],
  },
};

interface PortalAccount {
  id: string;
  firstName: string;
  lastName: string;
  clientNumber: string;
  email: string;
}

interface BroadcastHistory {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
}

export default function ClientBroadcastPage() {
  const token = useAuthStore(s => s.accessToken);
  const auth = { Authorization: `Bearer ${token}` };

  const [activeTab, setActiveTab] = useState("Motivational");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"ALL" | "ONE">("ALL");
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PortalAccount | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ count: number } | null>(null);
  const [preview, setPreview] = useState(false);
  const [view, setView] = useState<"compose" | "history">("compose");

  useEffect(() => {
    fetch("/api/portal/applications/staff/all", { headers: auth })
      .then(r => r.ok ? r.json() : [])
      .then((data: { account?: PortalAccount }[]) => {
        const seen = new Set<string>();
        const unique: PortalAccount[] = [];
        for (const row of data) {
          if (row.account && !seen.has(row.account.id)) {
            seen.add(row.account.id);
            unique.push(row.account);
          }
        }
        setAccounts(unique);
      })
      .catch(() => {});

    loadHistory();
  }, []);

  function loadHistory() {
    fetch("/api/admin/broadcasts", { headers: auth })
      .then(r => r.ok ? r.json() : [])
      .then(setHistory)
      .catch(() => {});
  }

  function useTemplate(msg: string) {
    const subjectMap: Record<string, string> = {
      "Motivational": "💡 Daily Inspiration from Philix Finance",
      "Financial Tips": "💰 Financial Tip from Philix Finance",
      "Family & Friends": "❤️ A Message for You — Philix Finance",
      "Growth Challenges": "🎯 Growth Challenge from Philix Finance",
      "Philix Finance": "📣 A Message from Philix Finance",
    };
    setSubject(subjectMap[activeTab] ?? "Message from Philix Finance");
    setBody(msg);
    setSent(null);
  }

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSent(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          category: "ANNOUNCEMENT",
          targetAccountId: target === "ONE" && selectedAccount ? selectedAccount.id : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSent(data);
        setSubject("");
        setBody("");
        setSelectedAccount(null);
        loadHistory();
      }
    } finally {
      setSending(false);
    }
  }

  const filteredAccounts = accounts.filter(a =>
    `${a.firstName} ${a.lastName} ${a.clientNumber} ${a.email}`.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const tabs = Object.keys(TEMPLATES);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Client Broadcasts</h1>
          <p className="text-navy-500 text-sm mt-0.5">Send inspirational messages, tips, and announcements to clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("compose")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${view === "compose" ? "bg-indigo-700 text-white border-indigo-700" : "bg-white text-navy-600 border-warm-200 hover:border-indigo-400"}`}>
            <Send size={13} className="inline mr-1.5" /> Compose
          </button>
          <button onClick={() => setView("history")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${view === "history" ? "bg-indigo-700 text-white border-indigo-700" : "bg-white text-navy-600 border-warm-200 hover:border-indigo-400"}`}>
            <Clock size={13} className="inline mr-1.5" /> History ({history.length})
          </button>
        </div>
      </div>

      {view === "history" ? (
        /* ── HISTORY VIEW ── */
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="philix-card p-10 text-center text-navy-400">
              <Clock size={32} className="mx-auto mb-3 opacity-30" />
              <div>No broadcasts sent yet</div>
            </div>
          ) : history.map(h => (
            <div key={h.id} className="philix-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Send size={14} className="text-indigo-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy-800">{h.subject}</div>
                  <div className="text-sm text-navy-500 mt-0.5 line-clamp-2">{h.body}</div>
                </div>
                <div className="text-xs text-navy-400 whitespace-nowrap flex-shrink-0">
                  {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <button
                onClick={() => { setSubject(h.subject); setBody(h.body); setView("compose"); }}
                className="mt-2 ml-12 text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                <Copy size={11} /> Use as template
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* ── COMPOSE VIEW ── */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* LEFT — Template Library */}
          <div className="space-y-4">
            <div className="philix-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={15} className="text-indigo-700" />
                <h3 className="font-bold text-navy-800">Template Library</h3>
                <span className="ml-auto text-xs text-navy-400">Click any message to load it</span>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1.5 flex-wrap mb-4">
                {tabs.map(tab => {
                  const cfg = TEMPLATES[tab];
                  const Icon = cfg.icon;
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${activeTab === tab ? "bg-indigo-700 text-white border-indigo-700" : "bg-white text-navy-600 border-warm-200 hover:border-indigo-400"}`}>
                      <Icon size={11} />
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Messages list */}
              <div className={`rounded-xl border p-3 space-y-1.5 ${TEMPLATES[activeTab].bg}`}>
                {TEMPLATES[activeTab].messages.map((msg, i) => (
                  <button key={i} onClick={() => useTemplate(msg)}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/60 transition-all group">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-[9px] font-bold ${TEMPLATES[activeTab].color}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-navy-700 leading-relaxed flex-1">{msg}</span>
                    <ChevronRight size={12} className="text-navy-300 opacity-0 group-hover:opacity-100 mt-0.5 flex-shrink-0 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Composer */}
          <div className="space-y-4">
            <div className="philix-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Send size={15} className="text-indigo-700" />
                <h3 className="font-bold text-navy-800">Compose Broadcast</h3>
              </div>

              {/* Target selector */}
              <div>
                <label className="block text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">Send To</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTarget("ALL")}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${target === "ALL" ? "bg-indigo-700 text-white border-indigo-700" : "bg-white text-navy-600 border-warm-200 hover:border-indigo-400"}`}>
                    <Users size={14} /> All Clients
                    {target === "ALL" && <span className="ml-auto text-xs opacity-70">{accounts.length} people</span>}
                  </button>
                  <button onClick={() => setTarget("ONE")}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${target === "ONE" ? "bg-indigo-700 text-white border-indigo-700" : "bg-white text-navy-600 border-warm-200 hover:border-indigo-400"}`}>
                    <User size={14} /> Specific Client
                  </button>
                </div>

                {target === "ONE" && (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                      <input
                        type="text" value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                        placeholder="Search by name, ID or email…"
                        className="input-base pl-9 text-sm w-full" />
                    </div>
                    {clientSearch && (
                      <div className="border border-warm-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-white shadow-sm">
                        {filteredAccounts.length === 0 ? (
                          <div className="p-3 text-xs text-navy-400 text-center">No clients found</div>
                        ) : filteredAccounts.map(a => (
                          <button key={a.id} onClick={() => { setSelectedAccount(a); setClientSearch(""); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-warm-50 transition-all text-left ${selectedAccount?.id === a.id ? "bg-indigo-50" : ""}`}>
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-xs">
                              {a.firstName[0]}{a.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-navy-800 truncate">{a.firstName} {a.lastName}</div>
                              <div className="text-[10px] text-navy-400">{a.clientNumber} · {a.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedAccount && (
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
                        <CheckCircle size={13} className="text-indigo-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-indigo-700">{selectedAccount.firstName} {selectedAccount.lastName}</span>
                        <span className="text-xs text-indigo-400 ml-1">{selectedAccount.clientNumber}</span>
                        <button onClick={() => setSelectedAccount(null)} className="ml-auto text-indigo-400 hover:text-indigo-600 text-xs">✕</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-navy-500 uppercase tracking-wide mb-1.5">Message Subject</label>
                <input
                  type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. 💡 Daily Inspiration from Philix Finance"
                  className="input-base text-sm w-full" />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-navy-500 uppercase tracking-wide">Message</label>
                  <span className="text-xs text-navy-400">{body.length} chars</span>
                </div>
                <textarea
                  value={body} onChange={e => setBody(e.target.value)} rows={6}
                  placeholder="Type your message here, or click a template from the library on the left…"
                  className="w-full px-3 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-navy-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed" />
              </div>

              {/* Action row */}
              <div className="flex items-center gap-3">
                <button onClick={() => setPreview(!preview)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-navy-600 border border-warm-200 px-3 py-2 rounded-xl hover:border-indigo-400 transition-all">
                  <Eye size={12} /> {preview ? "Hide" : "Preview"}
                </button>
                <button
                  onClick={send}
                  disabled={sending || !subject.trim() || !body.trim() || (target === "ONE" && !selectedAccount)}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md shadow-indigo-900/20">
                  {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? "Sending…" : target === "ALL" ? `Send to All ${accounts.length} Clients` : `Send to ${selectedAccount?.firstName ?? "Client"}`}
                </button>
              </div>

              {sent && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                  <CheckCircle size={14} />
                  <span className="font-semibold">Sent successfully</span>
                  <span className="text-emerald-600"> — {sent.count} client{sent.count !== 1 ? "s" : ""} notified</span>
                </div>
              )}
            </div>

            {/* Preview */}
            {preview && (subject || body) && (
              <div className="philix-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={13} className="text-navy-500" />
                  <span className="text-xs font-bold text-navy-500 uppercase tracking-wide">Preview — as seen on client dashboard</span>
                </div>
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #0B1F3A 0%, #1a1155 100%)", border: "1px solid rgba(245,166,35,0.25)" }}>
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(245,166,35,0.2)" }}>
                      <Sparkles size={13} style={{ color: "#F5A623" }} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">From Philix Finance</p>
                      <p className="text-xs font-bold text-white">{subject || "Message Subject"}</p>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <p className="text-sm text-slate-300 leading-relaxed italic">"{body || "Message body will appear here…"}"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick stats footer */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Clients", value: accounts.length, icon: Users, color: "text-indigo-700 bg-indigo-100" },
          { label: "Broadcasts Sent", value: history.length, icon: Send, color: "text-emerald-700 bg-emerald-100" },
          { label: "Templates Available", value: Object.values(TEMPLATES).reduce((s, t) => s + t.messages.length, 0), icon: BookOpen, color: "text-amber-700 bg-amber-100" },
        ].map(s => (
          <div key={s.label} className="philix-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={16} />
            </div>
            <div>
              <div className="text-xl font-black text-navy-900">{s.value}</div>
              <div className="text-xs text-navy-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
