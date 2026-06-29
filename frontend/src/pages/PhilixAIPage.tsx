import { useState, useRef, useEffect, useCallback } from "react";
import {
  Brain, Send, Copy, Check, RefreshCw, Download, Trash2, X,
  ChevronDown, Sparkles, Shield, TrendingUp, FileText, Calculator,
  AlertTriangle, Users, BarChart2, Zap,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

// ── Markdown renderer ──────────────────────────────────────────────────────────
function Md({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 text-[#C9A227] px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
    .replace(/^### (.+)$/gm, '<div class="text-sm font-bold text-white/90 mt-3 mb-1">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-base font-bold text-white mt-4 mb-1">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-[#C9A227] mt-4 mb-2">$1</div>')
    .replace(/^[-•] (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-[#C9A227] flex-shrink-0 mt-0.5">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, (_, p) => `<div class="flex gap-2 py-0.5"><span class="text-[#C9A227]/60 flex-shrink-0">·</span><span>${p}</span></div>`)
    .replace(/\n{2,}/g, '<div class="mt-2"></div>')
    .replace(/\n/g, "<br/>");
  return (
    <div
      className="text-[13px] leading-relaxed text-white/80 space-y-0.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── Quick command templates ────────────────────────────────────────────────────
const COMMANDS = [
  {
    cmd: "/credit",
    label: "Credit Score a Client",
    icon: TrendingUp,
    color: "emerald",
    fill: () =>
      `/credit Score this client for a loan:\nName: [Client Name]\nNRC: [NRC Number]\nEmployer: [Employer]\nMonthly Income: K[Amount]\nLoan Amount Requested: K[Amount]\nCollateral: [Description]\nRepayment History: [Good/Fair/Poor]\n\nProvide full credit score breakdown, risk rating (LOW/MEDIUM/HIGH), and approval recommendation.`,
  },
  {
    cmd: "/fraud",
    label: "Fraud Check",
    icon: AlertTriangle,
    color: "red",
    fill: () =>
      `/fraud Run a fraud check on this application:\nName: [Client Name]\nNRC: [NRC Number]\nPhone: [Phone]\nAddress: [Address]\nCollateral submitted: [Description]\nRed flags noticed: [None or describe]\n\nProvide fraud risk score and recommended actions.`,
  },
  {
    cmd: "/calculate",
    label: "Loan Calculator",
    icon: Calculator,
    color: "indigo",
    fill: () =>
      `/calculate Compute loan details:\nPrincipal: K[Amount]\nInterest Rate: [Rate]% flat\nTerm: [N] weeks\n\nShow: total repayable, weekly payment, full amortization table, and penalty if 1 week late.`,
  },
  {
    cmd: "/demand",
    label: "Generate Demand Letter",
    icon: FileText,
    color: "amber",
    fill: () =>
      `/demand Generate a formal demand letter:\nClient: [Client Name]\nLoan Ref: [PHX-L-XXXX]\nAmount Overdue: K[Amount]\nDays Overdue: [N]\nPenalties Accrued: K[Amount]\nTotal Due: K[Amount]\n\nMake it firm, professional, with a 7-day payment deadline.`,
  },
  {
    cmd: "/portfolio",
    label: "Portfolio Analysis",
    icon: BarChart2,
    color: "purple",
    fill: () =>
      `/portfolio Analyze our current loan portfolio and provide:\n1. Portfolio health assessment\n2. Top risk indicators\n3. Collection strategy recommendations\n4. Actions to reduce PAR\n5. Growth opportunities for next quarter`,
  },
  {
    cmd: "/script",
    label: "Collections Call Script",
    icon: Users,
    color: "orange",
    fill: () =>
      `/script Write a professional collections call script for:\nClient: [Client Name]\nDays Overdue: [N]\nAmount Owed: K[Amount]\nPrevious contact attempts: [None/2 calls/etc]\nTone: Professional but firm`,
  },
  {
    cmd: "/collateral",
    label: "Collateral Assessment",
    icon: Shield,
    color: "teal",
    fill: () =>
      `/collateral Assess this collateral:\nItem: [Description]\nBrand/Model: [Details]\nEstimated Market Value: K[Amount]\nCondition: [Excellent/Good/Fair/Poor]\nLoan amount requested: K[Amount]\n\nCalculate FSV, LTV ratio, and provide Accept/Reject recommendation.`,
  },
];

const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
  red:     "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20",
  indigo:  "bg-indigo-500/15 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20",
  amber:   "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20",
  purple:  "bg-purple-500/15 text-purple-400 border-purple-500/25 hover:bg-purple-500/20",
  orange:  "bg-orange-500/15 text-orange-400 border-orange-500/25 hover:bg-orange-500/20",
  teal:    "bg-teal-500/15 text-teal-400 border-teal-500/25 hover:bg-teal-500/20",
};

export default function PhilixAIPage() {
  const user = useAuthStore(s => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [cmdFilter, setCmdFilter] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  };

  const handleInput = (v: string) => {
    setInput(v);
    if (v.startsWith("/") && !v.includes(" ")) {
      setCmdFilter(v.slice(1).toLowerCase());
      setShowCommands(true);
    } else if (!v.startsWith("/")) {
      setShowCommands(false);
    }
    resizeTextarea();
  };

  const applyCommand = (cmd: typeof COMMANDS[0]) => {
    const filled = cmd.fill();
    setInput(filled);
    setShowCommands(false);
    setTimeout(() => { textareaRef.current?.focus(); resizeTextarea(); }, 50);
  };

  const send = useCallback(async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setShowCommands(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    historyRef.current = [...historyRef.current, { role: "user" as const, content }].slice(-40);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/staff-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ messages: historyRef.current }),
      });
      const data = await res.json();
      const reply = data.text ?? "Sorry, I couldn't process that. Please try again.";
      const aiMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: reply, ts: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      historyRef.current = [...historyRef.current, { role: "assistant" as const, content: reply }].slice(-40);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: "assistant" as const,
        content: "Network error — please check your connection and try again.", ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const copyMsg = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id); setTimeout(() => setCopied(null), 2000);
    });
  };

  const exportChat = () => {
    const txt = messages.map(m =>
      `[${m.ts.toLocaleTimeString()}] ${m.role === "user" ? user?.firstName : "Philix AI"}:\n${m.content}`
    ).join("\n\n---\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
    a.download = `philix-ai-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const filteredCmds = COMMANDS.filter(c =>
    c.cmd.slice(1).startsWith(cmdFilter) || c.label.toLowerCase().includes(cmdFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px - 3rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Brain size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Philix Enterprise AI</h1>
            <p className="text-[10px] text-white/30">
              v35.0 · {user?.firstName} {user?.lastName} · {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button onClick={exportChat} title="Export chat"
              className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors border border-white/5">
              <Download size={14} />
            </button>
            <button onClick={() => { setMessages([]); historyRef.current = []; }} title="Clear chat"
              className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-white/5">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-8 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, {user?.firstName}
              </h2>
              <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed">
                I'm your enterprise intelligence system — credit decisions, risk assessment, document generation,
                collections strategy, financial calculations, and executive analysis.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {[
                { icon: Shield,       label: "Credit Score",      color: "emerald", msg: "Score a new client for a K5,000 salary loan. Name: John Banda. Formal employment at Zamtel. Monthly income: K8,000. Collateral: Android phone valued at K2,500. First loan application." },
                { icon: TrendingUp,   label: "Portfolio Analysis", color: "purple",  msg: "/portfolio Analyze our current portfolio health and give top 5 recommendations to improve collection rate this month." },
                { icon: FileText,     label: "Demand Letter",      color: "amber",   msg: "/demand Generate a firm demand letter for a client 14 days overdue on a K3,000 loan with K840 penalties accrued. Total due: K4,320." },
                { icon: Calculator,   label: "Loan Calc",          color: "indigo",  msg: "/calculate Principal K10,000 at 15% flat rate over 8 weeks. Show weekly payments, total repayable, and full amortization schedule." },
              ].map(({ icon: Icon, label, color, msg }) => (
                <button key={label} onClick={() => send(msg)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${colorMap[color]}`}>
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-white/20">
              Type <kbd className="bg-white/10 border border-white/10 px-1.5 py-0.5 rounded font-mono text-white/40">/</kbd> for command shortcuts
            </p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain size={13} className="text-indigo-400" />
                  </div>
                )}
                <div className="group relative max-w-[80%]">
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-indigo-600/20 border border-indigo-500/20 text-white/85"
                      : "bg-white/[0.04] border border-white/[0.07]"
                  }`}>
                    {msg.role === "assistant"
                      ? <Md text={msg.content} />
                      : <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-white/85">{msg.content}</p>
                    }
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <span className="text-[9px] text-white/15">
                      {msg.ts.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button onClick={() => copyMsg(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/50 p-0.5">
                      {copied === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    </button>
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-[#C9A227]/20 border border-[#C9A227]/25 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-[#C9A227]">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                  <Brain size={13} className="text-indigo-400 animate-pulse" />
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-4 relative">
        {showCommands && filteredCmds.length > 0 && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#0B1F3A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">AI Commands</span>
              <button onClick={() => setShowCommands(false)} className="text-white/20 hover:text-white/50 transition-colors">
                <X size={12} />
              </button>
            </div>
            {filteredCmds.map(cmd => {
              const Icon = cmd.icon;
              return (
                <button key={cmd.cmd} onClick={() => applyCommand(cmd)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/[0.03] last:border-none">
                  <div className={`p-1.5 rounded-lg border ${colorMap[cmd.color]}`}>
                    <Icon size={12} />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-white/70">{cmd.cmd}</span>
                    <span className="text-[11px] text-white/30 ml-2">{cmd.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="bg-white/[0.04] border border-white/8 rounded-2xl overflow-hidden focus-within:border-indigo-500/40 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && !showCommands) { e.preventDefault(); send(); }
              if (e.key === "Escape") setShowCommands(false);
              if (e.key === "ArrowDown" && showCommands) e.preventDefault();
            }}
            placeholder="Ask anything — credit score, fraud check, demand letter, portfolio analysis, calculations…"
            className="w-full bg-transparent px-4 pt-3 pb-2 text-[13px] text-white/80 placeholder:text-white/20 resize-none outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <button onClick={() => { setShowCommands(!showCommands); setCmdFilter(""); }}
              className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5">
              <Zap size={11} />
              <span>Commands</span>
              <ChevronDown size={9} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/15 hidden sm:block">Shift+Enter for new line</span>
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all">
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                Send
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-white/10 mt-2">
          Philix Enterprise AI · Powered by Claude · Not a substitute for legal or regulatory advice
        </p>
      </div>
    </div>
  );
}
