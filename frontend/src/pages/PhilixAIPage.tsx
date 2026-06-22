import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, Trash2, FileText, TrendingUp, Shield, AlertTriangle, Calculator, Users, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useAuthStore } from "../store/auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: Date;
}

const MODULE_PROMPTS = [
  { icon: TrendingUp,    label: "Credit Score a Client",   prompt: "Credit score this application: Client Name: [NAME], Monthly Income: K[X], Employer: [EMPLOYER], Employment Type: [TYPE], Collateral: [ITEM worth KX], Previous loans: [Y repaid, Z defaults], NRC: [verified/unverified], References: [yes/no]" },
  { icon: AlertTriangle, label: "Fraud Check",              prompt: "Run a fraud check on this application: Client Name: [NAME], NRC: [NRC NUMBER], Phone: [NUMBER], Address: [ADDRESS], Stated Income: K[X], Employer: [NAME]. Red flags to check: [any suspicious details]" },
  { icon: Shield,        label: "Collateral Assessment",    prompt: "Assess this collateral: Item: [ITEM], Stated market value: K[X], Condition: [EXCELLENT/GOOD/FAIR/POOR], Year: [YEAR], Serial: [SERIAL], Ownership documents: [YES/NO], Insurance: [YES/NO]. Calculate FSV and LTV for a K[LOAN AMOUNT] loan." },
  { icon: FileText,      label: "Generate Demand Letter",   prompt: "Generate a formal demand letter for: Client: [NAME], Loan Reference: [REF], Amount Overdue: K[X], Days Overdue: [N], Previous contact attempts: [NUMBER], Loan Officer: [OFFICER NAME]" },
  { icon: FileText,      label: "Generate Loan Agreement",  prompt: "Generate a complete loan agreement for: Client: [NAME], NRC: [NRC], Address: [ADDRESS], Loan Amount: K[X], Interest Rate: [Y]% flat, Term: [Z] weeks, Weekly Payment: K[W], Collateral: [ITEM], Guarantor: [NAME & PHONE], Disbursement Date: [DATE]" },
  { icon: Calculator,    label: "Loan Calculator",          prompt: "Calculate a loan: Principal K[AMOUNT], flat interest rate [X]%, term [N] weeks. Show: total interest, total repayable, weekly payment, full repayment schedule by week, and penalty if 2 weeks late." },
  { icon: Users,         label: "Collection Script",        prompt: "Generate a collection call script for a client [X] days overdue on their K[AMOUNT] loan (Ref: [REF]). Overdue amount including penalties: K[TOTAL]. Previous promises to pay: [YES/NO]. Script should be firm but empathetic." },
  { icon: TrendingUp,    label: "Portfolio Analysis",       prompt: "Analyse our current loan portfolio and give me: PAR (Portfolio at Risk) interpretation, collection efficiency tips, top risk indicators to watch, and 3 strategic recommendations to reduce defaults this quarter." },
  { icon: Shield,        label: "Compliance Check",         prompt: "Check this loan application for regulatory compliance: [PASTE LOAN DETAILS]. Check against: Bank of Zambia regulations, internal KYC requirements, AML procedures, and our credit policy." },
  { icon: TrendingUp,    label: "Business Advice (CEO)",    prompt: "As my AI Chief Risk Officer, analyse this situation and give executive-level recommendations: [DESCRIBE THE BUSINESS SITUATION OR DECISION YOU NEED HELP WITH]" },
];

function RenderMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-[13px] leading-relaxed space-y-0.5">
      {lines.map((line, i) => {
        const html = line
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/`(.*?)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 text-[11px]">$1</code>')
          .replace(/__(.*?)__/g, "<u>$1</u>");
        if (line.startsWith("# ")) return <h2 key={i} className="font-black text-base text-white mt-2 mb-1">{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-sm text-slate-200 mt-2 mb-0.5">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="font-semibold text-sm text-slate-300 mt-1">{line.slice(4)}</h4>;
        if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="ml-4 list-disc text-slate-300" dangerouslySetInnerHTML={{ __html: html.slice(2) }} />;
        if (/^\d+\./.test(line)) return <li key={i} className="ml-4 list-decimal text-slate-300" dangerouslySetInnerHTML={{ __html: html.replace(/^\d+\.\s/, "") }} />;
        return <p key={i} className={line === "" ? "h-1.5" : "text-slate-300"} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

export default function PhilixAIPage() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.accessToken);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModules, setShowModules] = useState(true);
  const conversationRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowModules(false);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, time: new Date() };
    setMessages(p => [...p, userMsg]);
    conversationRef.current = [...conversationRef.current, { role: "user", content: msg }];
    setLoading(true);

    try {
      const r = await fetch("/api/ai/staff-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: conversationRef.current }),
      });
      const data = await r.json();
      const reply = data.text ?? "Sorry, I couldn't process that. Please try again.";
      conversationRef.current = [...conversationRef.current, { role: "assistant", content: reply }];
      if (conversationRef.current.length > 40) conversationRef.current = conversationRef.current.slice(-40);
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: reply, time: new Date() }]);
    } catch {
      setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: "Network error — please check your connection and try again.", time: new Date() }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    conversationRef.current = [];
    setShowModules(true);
  }

  function downloadChat() {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `philix-ai-session-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg">Philix Enterprise AI</div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Version 35.0 · Enterprise Intelligence Edition · {user?.firstName} ({user?.role})
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button onClick={downloadChat} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-all">
                <Download size={12} /> Export
              </button>
              <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-all">
                <Trash2 size={12} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4">

        {/* Welcome + Modules */}
        {messages.length === 0 && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-900 border border-indigo-800/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">🤖</div>
                <div>
                  <div className="font-black text-white text-xl">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.firstName}.</div>
                  <div className="text-slate-400 text-sm">I am the Philix Finance Enterprise AI Operating System.</div>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                I am not a generic chatbot. I am built to protect company capital, reduce defaults, support credit decisions, generate documents, and provide executive intelligence — all in real time.
              </p>
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                {["Protect Capital", "Reduce Defaults", "Credit Analysis", "Document Generation"].map(cap => (
                  <div key={cap} className="bg-indigo-900/30 border border-indigo-800/30 rounded-lg px-3 py-2 text-indigo-300 text-center font-semibold">{cap}</div>
                ))}
              </div>
            </div>

            <div>
              <button onClick={() => setShowModules(s => !s)} className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 hover:text-slate-200">
                {showModules ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Quick-Start Templates
              </button>
              {showModules && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODULE_PROMPTS.map(mod => (
                    <button key={mod.label} onClick={() => setInput(mod.prompt)}
                      className="flex items-center gap-3 text-left p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-indigo-700/50 hover:bg-indigo-900/10 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-indigo-900/40 border border-indigo-800/40 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-800/40">
                        <mod.icon size={14} className="text-indigo-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{mod.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white text-sm"
                  : "bg-slate-900 border border-slate-800"
              }`}>
                {msg.role === "assistant" ? (
                  <RenderMessage text={msg.content} />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                <div className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-indigo-300 text-right" : "text-slate-600"}`}>
                  {msg.time.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Enterprise AI processing…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-800 px-4 lg:px-6 py-3 bg-slate-950">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              rows={input.split("\n").length > 2 ? 3 : 1}
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
              placeholder="Ask anything — credit scoring, fraud check, calculations, documents, strategy…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-700 mt-1.5 text-center">
            Enterprise AI · Powered by Claude · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
