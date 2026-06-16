import { useState } from "react";
import { MessageCircle, Send, CheckCheck, Clock, Settings, Users, Bot } from "lucide-react";

const conversations = [
  {
    id: "w1", client: "Chanda Mwale", phone: "+260 977 112 233", lastMessage: "Thank you for the reminder", time: "08:42", unread: 0, status: "ACTIVE",
    messages: [
      { from: "system", text: "Hello Chanda, this is a reminder that your payment of K850 is due in 3 days (20 Jun 2026). Loan ref: PHX-L-2026-0042. Pay via MTN Money to 096XXXXXXX. Philix Finance", time: "08:00" },
      { from: "client", text: "Thank you for the reminder", time: "08:42" },
    ],
  },
  {
    id: "w2", client: "Peter Banda", phone: "+260 955 445 566", lastMessage: "Can I get a statement?", time: "07:15", unread: 1, status: "ACTIVE",
    messages: [
      { from: "client", text: "Can I get a statement?", time: "07:15" },
    ],
  },
  {
    id: "w3", client: "Mary Phiri", phone: "+260 966 778 899", lastMessage: "Loan approved. K2,500 disbursed.", time: "Yesterday", unread: 0, status: "ACTIVE",
    messages: [
      { from: "system", text: "Hello Mary, your Philix Finance loan of K2,500 has been APPROVED and disbursed! Your first repayment of K700 is due on 30 Jun 2026. Ref: PHX-L-2026-0039.", time: "Yesterday" },
    ],
  },
];

const templates = [
  { name: "Loan Summary", preview: "Your loan {loanRef}: K{amount} disbursed on {date}. Repayment: K{installment} monthly. First due: {firstDue}." },
  { name: "Payment Reminder", preview: "REMINDER: K{amount} due on {dueDate} for {loanRef}. Reply BALANCE for outstanding amount." },
  { name: "Balance Query", preview: "Your outstanding balance for {loanRef} is K{balance}. Next payment: K{installment} due {dueDate}." },
  { name: "Welcome Message", preview: "Welcome to Philix Finance, {name}! Your client number is {clientNo}. Reply HELP for available commands." },
];

export default function WhatsAppPage() {
  const [tab, setTab] = useState<"inbox" | "templates" | "settings">("inbox");
  const [selectedConv, setSelectedConv] = useState(conversations[0]);
  const [reply, setReply] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setReply("");
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Business</h1>
          <p className="page-subtitle">Two-way client messaging via WhatsApp Business Cloud API</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 bg-amber-900/30 px-3 py-1.5 rounded-full border border-amber-800/50">
            Pending Meta Verification
          </span>
        </div>
      </div>

      <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 flex items-start gap-3">
        <MessageCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-300">
          <span className="font-semibold">WhatsApp Business API requires Meta verification.</span> Complete business verification at <span className="underline">business.facebook.com</span> and add your WhatsApp Business number in Settings below to activate this feature.
        </div>
      </div>

      <div className="flex border-b border-slate-800 gap-1">
        {(["inbox", "templates", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all ${tab === t ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t === "inbox" ? `Inbox (${conversations.reduce((s, c) => s + c.unread, 0)} unread)` : t === "templates" ? "Message Templates" : "API Settings"}
          </button>
        ))}
      </div>

      {tab === "inbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[520px]">
          <div className="space-y-1 overflow-y-auto">
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => setSelectedConv(conv)}
                className={`w-full text-left p-3 rounded-xl transition-all hover:bg-slate-800/50 ${selectedConv.id === conv.id ? "bg-slate-800/70 border border-slate-700" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center font-bold text-green-400 flex-shrink-0">
                    {conv.client[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-sm">{conv.client}</span>
                      <span className="text-xs text-slate-600">{conv.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 truncate">{conv.lastMessage}</span>
                      {conv.unread > 0 && <span className="w-4 h-4 rounded-full bg-green-500 text-white text-xs flex items-center justify-center flex-shrink-0">{conv.unread}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 philix-card flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-full bg-green-600/20 flex items-center justify-center font-bold text-green-400">
                {selectedConv.client[0]}
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-sm">{selectedConv.client}</div>
                <div className="text-xs text-slate-500">{selectedConv.phone}</div>
              </div>
              <div className="ml-auto flex gap-2">
                <button className="btn-secondary text-xs py-1.5"><Bot size={12} /> Auto-reply</button>
                <button className="btn-secondary text-xs py-1.5"><Users size={12} /> Assign</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedConv.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === "client" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.from === "client" ? "bg-slate-800 text-slate-200 rounded-tl-sm" : "bg-green-700/30 border border-green-800/40 text-green-200 rounded-tr-sm"
                  }`}>
                    {msg.text}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-50">{msg.time}</span>
                      {msg.from !== "client" && <CheckCheck size={12} className="text-green-400 opacity-70" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-slate-800 flex gap-2">
              <input type="text" value={reply} onChange={e => setReply(e.target.value)}
                className="input-base flex-1 text-sm" placeholder="Type a message..." />
              <button type="submit" className="btn-primary px-4"><Send size={14} /></button>
            </form>
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">Pre-approved message templates for automated WhatsApp notifications. Templates must be approved by Meta before use.</p>
          {templates.map((t, i) => (
            <div key={i} className="philix-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-200 mb-2">{t.name}</div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-sm text-slate-300 font-mono">{t.preview}</div>
                </div>
                <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full flex-shrink-0">Pending Approval</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="philix-card p-5 space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2"><Settings size={16} className="text-indigo-400" /> WhatsApp Business API</h3>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">WhatsApp Business Phone Number</label>
              <input type="tel" className="input-base" placeholder="+260 211 XXX XXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Meta App ID</label>
              <input type="text" className="input-base" placeholder="From developers.facebook.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Access Token</label>
              <input type="password" className="input-base" placeholder="WhatsApp Cloud API access token" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Webhook Verify Token</label>
              <input type="text" className="input-base" defaultValue="philix-whatsapp-webhook-2026" readOnly />
            </div>
            <button className="btn-primary w-full">Save WhatsApp Settings</button>
          </div>
        </div>
      )}
    </div>
  );
}
