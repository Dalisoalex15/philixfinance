import { useState, useRef, useEffect, useCallback } from "react";
import {
  Brain, Send, Copy, Check, RefreshCw, Download, Trash2, X,
  ChevronDown, Sparkles, Shield, TrendingUp, FileText, Calculator,
  AlertTriangle, Users, BarChart2, Zap, ChevronRight, Wifi, WifiOff,
  BookOpen, Scale, Building2, PieChart, Target, Phone, Gavel,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: Date;
  streaming?: boolean;
}

const STORAGE_KEY = "philix-ai-conversation";

function Md({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 text-[#C9A227] px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
    .replace(/^#### (.+)$/gm, '<div class="text-[11px] font-bold text-white/60 uppercase tracking-wider mt-3 mb-1">$1</div>')
    .replace(/^### (.+)$/gm, '<div class="text-sm font-bold text-white/90 mt-3 mb-1 border-b border-white/10 pb-1">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-base font-bold text-white mt-4 mb-1.5">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-[#C9A227] mt-4 mb-2 flex items-center gap-2">$1</div>')
    .replace(/^\| (.+) \|$/gm, (_, row) => {
      const cells = row.split(" | ").map((c: string) => `<td class="px-3 py-1.5 border border-white/10 text-[12px]">${c}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .replace(/<tr>.*<\/tr>/gs, (table) => `<table class="border-collapse w-full my-2 text-xs">${table}</table>`)
    .replace(/^[-•] (.+)$/gm, '<div class="flex gap-2 py-0.5 ml-1"><span class="text-[#C9A227] flex-shrink-0 mt-0.5 text-xs">▸</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, (_, n, p) => `<div class="flex gap-2 py-0.5 ml-1"><span class="text-[#C9A227]/70 flex-shrink-0 font-bold text-xs w-4">${n}.</span><span>${p}</span></div>`)
    .replace(/^---+$/gm, '<hr class="border-white/10 my-3" />')
    .replace(/\n{2,}/g, '<div class="mt-2"></div>')
    .replace(/\n/g, "<br/>");
  return (
    <div className="text-[13px] leading-relaxed text-white/80 space-y-0.5"
      dangerouslySetInnerHTML={{ __html: html }} />
  );
}

const COMMANDS = [
  { cmd: "/credit", label: "Credit Score", icon: Shield, color: "emerald",
    fill: () => `/credit Score this client for a loan:\nName: [Full Name]\nNRC: [XXXXXXXX/XX/X]\nEmployer: [Employer Name]\nMonthly Income: K[Amount]\nTenure: [X years]\nLoan Requested: K[Amount]\nCollateral: [Item + estimated value]\nRepayment History: [Excellent/Good/Fair/Poor]\nPrevious loans: [X completed, X defaults]\n\nProvide: full 8-factor score breakdown, risk tier, max approvable amount, specific conditions, and a final approval recommendation.` },
  { cmd: "/fraud", label: "Fraud Check", icon: AlertTriangle, color: "red",
    fill: () => `/fraud Conduct fraud risk assessment on this application:\nName: [Full Name]\nNRC: [Number]\nPhone: [Number]\nAddress: [Full Address]\nEmployer: [Name + verified?]\nCollateral: [Description]\nMonthly income claimed: K[Amount]\nRed flags noticed: [List any]\n\nProvide: fraud risk score (0-100), specific red flags found, severity rating (LOW/MEDIUM/HIGH/CRITICAL), and recommended investigation actions.` },
  { cmd: "/calculate", label: "Loan Calculator", icon: Calculator, color: "indigo",
    fill: () => `/calculate Full loan breakdown:\nPrincipal: K[Amount]\nInterest Rate: [X]% flat\nTerm: [N] weeks\nClient monthly income: K[Amount]\n\nShow: total repayable, weekly payment, monthly payment equivalent, effective APR, affordability check (30% income rule), full week-by-week amortization table, and penalty calculation if 2 weeks late.` },
  { cmd: "/demand", label: "Demand Letter", icon: FileText, color: "amber",
    fill: () => `/demand Generate a formal demand letter:\nClient: [Full Name]\nLoan Ref: [PHX-L-XXXX]\nPrincipal: K[Amount]\nOutstanding: K[Amount]\nPenalties accrued: K[Amount]\nTotal owed: K[Amount]\nDays overdue: [N]\nAddress: [Client address]\n\nProduce a complete, ready-to-send formal demand letter with firm 7-day deadline and legal recourse warning.` },
  { cmd: "/portfolio", label: "Portfolio Analysis", icon: BarChart2, color: "purple",
    fill: () => `/portfolio Perform a full portfolio health analysis using today's live data. Include:\n1. Overall portfolio health rating and PAR assessment\n2. Top 5 risk concentrations (product, employer, geography)\n3. Collection efficiency analysis\n4. Liquidity risk assessment\n5. Top overdue accounts requiring immediate action\n6. Revenue projection for next 30 days\n7. Three highest-priority recommendations with specific actions` },
  { cmd: "/script", label: "Collections Script", icon: Phone, color: "orange",
    fill: () => `/script Write a professional collections call script:\nClient: [Name]\nDays overdue: [N]\nAmount owed: K[Amount]\nPrevious calls: [X attempts / None]\nClient attitude: [Cooperative/Evasive/Aggressive]\nGuarantor available: [Yes/No]\n\nProvide: opening, probing questions, negotiation points, payment arrangements, closing, and follow-up actions.` },
  { cmd: "/collateral", label: "Collateral Assessment", icon: Shield, color: "teal",
    fill: () => `/collateral Assess this collateral for loan security:\nItem: [Detailed description]\nBrand/Model: [Specifics]\nYear: [Year]\nCondition: [Excellent/Good/Fair/Poor]\nEstimated market value: K[Amount]\nLoan amount requested: K[Amount]\n\nProvide: condition notes, estimated market value, Forced Sale Value (FSV), LTV ratio, and Accept/Conditionally Accept/Reject recommendation with specific reasons.` },
  { cmd: "/document", label: "Generate Document", icon: Gavel, color: "gold",
    fill: () => `/document Generate a [demand_letter / loan_agreement / approval_letter / rejection_letter / recovery_notice / collateral_report]:\nClient: [Full Name]\nLoan Ref: [Reference]\nAmount: K[Amount]\n[Add any other relevant details]\n\nProduce a complete, professionally formatted document ready for use.` },
  { cmd: "/risk", label: "Risk Report", icon: Scale, color: "amber",
    fill: () => `/risk Generate a risk assessment report for:\nClient/Portfolio: [Name or "full portfolio"]\nPeriod: [This month / This quarter / YTD]\n\nInclude: concentration risk, liquidity risk, credit risk (PAR breakdown), operational risk, and recommendations to reduce exposure.` },
  { cmd: "/performance", label: "Officer Performance", icon: Target, color: "purple",
    fill: () => `/performance Analyse loan officer performance for:\nPeriod: [This month / Last month]\nOfficer: [Name or "all officers"]\n\nProvide: disbursement vs. target, collection rate, PAR contribution, ranking, and individual improvement recommendations.` },
  { cmd: "/forecast", label: "Revenue Forecast", icon: TrendingUp, color: "emerald",
    fill: () => `/forecast Project revenue and collections for the next 30 days based on current portfolio data. Include:\n1. Expected interest income\n2. Expected collections (principal + interest)\n3. Expected new disbursements needed to maintain portfolio\n4. Cash flow projection\n5. Key assumptions and risks` },
  { cmd: "/compliance", label: "Compliance Check", icon: Building2, color: "blue",
    fill: () => `/compliance Check compliance status for:\nArea: [AML / KYC / BOZ reporting / ZICB / all]\nPeriod: [Current quarter]\n\nProvide: compliance checklist status, outstanding items, regulatory deadlines, and recommended corrective actions.` },
  { cmd: "/profitability", label: "Profitability Analysis", icon: PieChart, color: "indigo",
    fill: () => `/profitability Analyse Philix Finance profitability for the current month:\n1. Interest revenue earned (all active loans)\n2. Penalties collected\n3. Provision requirements (IFRS 9 expected credit loss)\n4. Net interest margin\n5. Break-even analysis\n6. Return on portfolio` },
  { cmd: "/client", label: "Client Deep-Dive", icon: BookOpen, color: "cyan",
    fill: () => `/client Full client profile analysis:\nClient Name or Number: [Name or PHX-C-XXXXX]\nPurpose: [Loan assessment / Review / Recovery]\n\nProvide: complete credit history summary, risk assessment, recommended action, and any flags or opportunities.` },
];

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
  red:     "bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/20",
  indigo:  "bg-indigo-500/15 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20",
  amber:   "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20",
  purple:  "bg-purple-500/15 text-purple-400 border-purple-500/25 hover:bg-purple-500/20",
  orange:  "bg-orange-500/15 text-orange-400 border-orange-500/25 hover:bg-orange-500/20",
  teal:    "bg-teal-500/15 text-teal-400 border-teal-500/25 hover:bg-teal-500/20",
  gold:    "bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/25 hover:bg-[#C9A227]/20",
  blue:    "bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/20",
  cyan:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/25 hover:bg-cyan-500/20",
  pink:    "bg-pink-500/15 text-pink-400 border-pink-500/25 hover:bg-pink-500/20",
};

const getToken = () => localStorage.getItem("philix_staff_token") ?? "";

const STARTER_PROMPTS = [
  { icon: Shield,     color: "emerald", label: "Credit Score",    msg: "Score a new client: Name: Jane Mwanza, Employer: Zamtel (10yr tenure), Monthly income: K8,000, Loan requested: K5,000 salary loan, Collateral: Samsung Galaxy S21 (K2,800). First-time borrower. Provide full 8-factor assessment and approval recommendation." },
  { icon: BarChart2,  color: "purple",  label: "Portfolio Health", msg: "/portfolio Analyse our current portfolio health using today's live data. Identify the top 3 risks and give me a specific action plan for this week." },
  { icon: FileText,   color: "amber",   label: "Demand Letter",   msg: "/demand Generate a demand letter for a client 21 days overdue on a K3,000 loan. Outstanding: K3,000. Penalties: K1,260. Total owed: K4,260. Reference: PHX-L-2025-001." },
  { icon: Calculator, color: "indigo",  label: "Loan Calculator", msg: "/calculate Principal K15,000 at 12% flat rate over 12 weeks. Client income K20,000/month. Show full amortization table, affordability check, effective APR, and penalty if 5 days late." },
  { icon: TrendingUp, color: "teal",    label: "Revenue Forecast", msg: "/forecast Based on today's live portfolio data, project our revenue and collections for the next 30 days. Include best/base/worst case scenarios." },
  { icon: AlertTriangle, color: "red",  label: "Fraud Alert",     msg: "/fraud Fraud check: Client claims K12,000 salary from Zamtel but submitted a handwritten payslip. NRC shows age 22. Requesting K10,000 business loan. Red flags: New account (3 days old), phone number matches 2 other applications. Rate fraud risk." },
];

export default function PhilixAIPage() {
  const user = useAuthStore(s => s.user);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, ts: new Date(m.ts) }));
      }
    } catch { /* ignore */ }
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [cmdFilter, setCmdFilter] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  // Restore history from saved messages
  useEffect(() => {
    historyRef.current = messages.map(m => ({ role: m.role, content: m.content })).slice(-60);
  }, []);

  // Persist messages
  useEffect(() => {
    try {
      const toSave = messages.filter(m => !m.streaming).slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
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
    setInput(cmd.fill());
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
    const newHistory = [...historyRef.current, { role: "user" as const, content }].slice(-60);
    historyRef.current = newHistory;
    setLoading(true);
    setStreaming(true);

    const streamingId = `a-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamingId, role: "assistant", content: "", ts: new Date(), streaming: true }]);

    try {
      const res = await fetch("/api/ai/staff-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              accumulated += data.text;
              const snapshot = accumulated;
              setMessages(prev => prev.map(m =>
                m.id === streamingId ? { ...m, content: snapshot } : m
              ));
            }
            if (data.done || data.error) break;
          } catch { /* ignore parse errors */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === streamingId ? { ...m, streaming: false } : m
      ));
      historyRef.current = [...historyRef.current, { role: "assistant" as const, content: accumulated }].slice(-60);
      setIsOnline(true);
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? { ...m, content: "Connection error — please check your network and try again.", streaming: false }
          : m
      ));
      setIsOnline(false);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [input, loading]);

  const clearChat = () => {
    setMessages([]);
    historyRef.current = [];
    localStorage.removeItem(STORAGE_KEY);
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

  const copyMsg = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id); setTimeout(() => setCopied(null), 2000);
    });
  };

  const filteredCmds = COMMANDS.filter(c =>
    c.cmd.slice(1).startsWith(cmdFilter) || c.label.toLowerCase().includes(cmdFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px - 3rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 flex-shrink-0 border-b border-white/5 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Brain size={18} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white leading-tight">Philix Enterprise AI</h1>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-bold tracking-wide">OPUS</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-white/30">{user?.firstName} {user?.lastName} · {user?.role?.replace(/_/g, " ")}</p>
              <span className={`flex items-center gap-1 text-[9px] ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
                {isOnline ? <Wifi size={8} /> : <WifiOff size={8} />}
                {streaming ? "Thinking…" : isOnline ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <>
              <button onClick={exportChat} title="Export chat"
                className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors border border-white/5">
                <Download size={13} />
              </button>
              <button onClick={clearChat} title="Clear chat"
                className="p-2 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-white/5">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-6 gap-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/10">
                <Sparkles size={28} className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, {user?.firstName}
              </h2>
              <p className="text-sm text-white/35 max-w-lg mx-auto leading-relaxed">
                I'm your enterprise financial intelligence system — credit decisions, fraud detection, risk analysis,
                document generation, collections strategy, and real-time portfolio insights. Powered by Claude Opus.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl w-full">
              {STARTER_PROMPTS.map(({ icon: Icon, color, label, msg }) => (
                <button key={label} onClick={() => send(msg)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${colorMap[color]}`}>
                  <Icon size={13} className="flex-shrink-0" />
                  <span>{label}</span>
                  <ChevronRight size={10} className="ml-auto opacity-50 flex-shrink-0" />
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="text-[11px] text-white/20 mb-2">
                Type <kbd className="bg-white/10 border border-white/10 px-1.5 py-0.5 rounded font-mono text-white/40">/</kbd> for {COMMANDS.length} AI commands
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {COMMANDS.slice(0, 7).map(c => (
                  <span key={c.cmd} className="text-[9px] bg-white/5 border border-white/8 text-white/25 px-2 py-0.5 rounded-full font-mono">{c.cmd}</span>
                ))}
                <span className="text-[9px] text-white/20 px-1">+{COMMANDS.length - 7} more</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.streaming ? "bg-indigo-500/30 border border-indigo-500/40" : "bg-indigo-500/20 border border-indigo-500/25"}`}>
                    <Brain size={13} className={`text-indigo-400 ${msg.streaming ? "animate-pulse" : ""}`} />
                  </div>
                )}
                <div className="group relative max-w-[82%]">
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-indigo-600/20 border border-indigo-500/20 text-white/85"
                      : "bg-white/[0.04] border border-white/[0.07]"
                  }`}>
                    {msg.role === "assistant" ? (
                      msg.content ? (
                        <>
                          <Md text={msg.content} />
                          {msg.streaming && (
                            <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 animate-pulse rounded-sm" />
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex gap-1">
                            {[0, 150, 300].map(d => (
                              <div key={d} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </div>
                          <span className="text-[11px] text-white/30">Thinking…</span>
                        </div>
                      )
                    ) : (
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-white/85">{msg.content}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <span className="text-[9px] text-white/15">
                      {msg.ts.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {!msg.streaming && (
                      <button onClick={() => copyMsg(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/50 p-0.5">
                        {copied === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>
                    )}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-[#C9A227]/20 border border-[#C9A227]/25 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-[#C9A227]">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-3 relative">
        {showCommands && filteredCmds.length > 0 && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#0B1F3A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 sticky top-0 bg-[#0B1F3A]">
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">AI Commands ({filteredCmds.length})</span>
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
                    <Icon size={11} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-bold text-white/70">{cmd.cmd}</span>
                    <span className="text-[11px] text-white/30 ml-2">{cmd.label}</span>
                  </div>
                  <ChevronRight size={10} className="text-white/20 flex-shrink-0" />
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
            }}
            disabled={loading}
            placeholder="Ask anything — credit score, fraud check, demand letter, portfolio analysis, forecasts…"
            className="w-full bg-transparent px-4 pt-3 pb-2 text-[13px] text-white/80 placeholder:text-white/20 resize-none outline-none leading-relaxed disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowCommands(!showCommands); setCmdFilter(""); }}
                className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5">
                <Zap size={11} />
                <span>/{COMMANDS.length} Commands</span>
                <ChevronDown size={9} />
              </button>
              {messages.length > 0 && (
                <span className="text-[9px] text-white/15">{messages.length} messages in session</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/15 hidden sm:block">Shift+Enter for new line</span>
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all">
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                {loading ? "Thinking…" : "Send"}
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-white/10 mt-2">
          Philix Enterprise AI · Claude Opus · Live portfolio data · {new Date().toLocaleDateString("en-ZM")}
        </p>
      </div>
    </div>
  );
}
