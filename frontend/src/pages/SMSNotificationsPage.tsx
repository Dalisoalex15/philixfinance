import { useState } from "react";
import { MessageSquare, Send, Settings, CheckCircle, Clock, AlertTriangle, Phone, Users, Zap } from "lucide-react";

const templates = [
  {
    id: "approval",
    name: "Loan Approved",
    trigger: "Auto — on loan approval",
    message: "Hello {firstName}, your Philix Finance loan of K{amount} has been APPROVED! Disbursement within 24hrs. Ref: {loanRef}. Questions? Call +260 211 XXX XXX",
    active: true,
  },
  {
    id: "disbursement",
    name: "Disbursement Confirmation",
    trigger: "Auto — on disbursement",
    message: "Hello {firstName}, K{amount} has been disbursed for loan {loanRef}. Repayment of K{weeklyAmt} due on {dueDate}. Pay via MTN/Airtel Money to 096XXXXXXX. Ref: {loanRef}",
    active: true,
  },
  {
    id: "payment_received",
    name: "Payment Received",
    trigger: "Auto — on payment record",
    message: "Payment received: K{amount} for loan {loanRef} on {date}. Balance remaining: K{balance}. Thank you! — Philix Finance",
    active: true,
  },
  {
    id: "reminder_3day",
    name: "3-Day Payment Reminder",
    trigger: "Auto — 3 days before due",
    message: "REMINDER: K{amount} due on {dueDate} for loan {loanRef}. Pay early to avoid penalties. MTN/Airtel: 096XXXXXXX. Ref: {loanRef}. Philix Finance",
    active: true,
  },
  {
    id: "overdue",
    name: "Overdue Notice",
    trigger: "Auto — on grace period expiry",
    message: "URGENT: Your Philix Finance loan {loanRef} payment of K{amount} is overdue by {days} day(s). Pay NOW to avoid further penalties. Call +260 211 XXX XXX",
    active: true,
  },
  {
    id: "loyalty",
    name: "Loyalty/Premium Upgrade",
    trigger: "Auto — on tier upgrade",
    message: "Congratulations {firstName}! You've been upgraded to {tier} status at Philix Finance. You now qualify for better rates. Call us to learn more!",
    active: false,
  },
];

const recentLogs = [
  { id: "s1", to: "+260 977 112 233", client: "Chanda Mwale", template: "3-Day Payment Reminder", status: "DELIVERED", sentAt: "2026-06-17T08:14:00Z", cost: "K0.10" },
  { id: "s2", to: "+260 955 445 566", client: "Peter Banda", template: "Loan Approved", status: "DELIVERED", sentAt: "2026-06-17T07:30:00Z", cost: "K0.10" },
  { id: "s3", to: "+260 966 778 899", client: "Mary Phiri", template: "Payment Received", status: "DELIVERED", sentAt: "2026-06-17T06:55:00Z", cost: "K0.10" },
  { id: "s4", to: "+260 977 001 122", client: "James Mutale", template: "Overdue Notice", status: "FAILED", sentAt: "2026-06-16T15:20:00Z", cost: "—" },
  { id: "s5", to: "+260 955 334 455", client: "Grace Lungu", template: "Disbursement Confirmation", status: "DELIVERED", sentAt: "2026-06-16T14:45:00Z", cost: "K0.10" },
];

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function SMSNotificationsPage() {
  const [tab, setTab] = useState<"templates" | "send" | "logs" | "settings">("templates");
  const [activeTemplates, setActiveTemplates] = useState(templates.map(t => ({ ...t })));
  const [manualPhone, setManualPhone] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [gateway, setGateway] = useState("MTN");
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("PhilixFin");

  const toggleTemplate = (id: string) => {
    setActiveTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setManualPhone("");
    setManualMessage("");
  };

  const totalSent = recentLogs.filter(l => l.status === "DELIVERED").length;
  const totalFailed = recentLogs.filter(l => l.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">SMS Notifications</h1>
          <p className="page-subtitle">Automated SMS alerts via Zambian telecom APIs — MTN, Airtel, Zamtel</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Gateway: {gateway}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Sent Today", value: "47", icon: Send, color: "indigo" },
          { label: "Delivered", value: `${totalSent}/5`, icon: CheckCircle, color: "emerald" },
          { label: "Failed", value: totalFailed.toString(), icon: AlertTriangle, color: "red" },
          { label: "Est. Cost Today", value: "K4.70", icon: Zap, color: "amber" },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <k.icon size={16} className={`text-${k.color}-400 mb-2`} />
            <div className="text-2xl font-bold text-navy-900">{k.value}</div>
            <div className="text-xs text-navy-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-warm-200 gap-1">
        {(["templates", "send", "logs", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all ${tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-navy-500 hover:text-navy-700"}`}>
            {t === "templates" ? "Message Templates" : t === "send" ? "Send Manual SMS" : t === "logs" ? "Send Log" : "API Settings"}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="space-y-3">
          <p className="text-sm text-navy-600">Toggle automated SMS messages. Active templates are sent automatically when the trigger event occurs.</p>
          {activeTemplates.map(t => (
            <div key={t.id} className="philix-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-navy-800">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${t.active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-warm-200 text-navy-500 border-warm-300"}`}>
                      {t.active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-700 mb-2"><Zap size={10} className="inline mr-1" />{t.trigger}</p>
                  <div className="bg-warm-100 rounded-lg p-3 font-mono text-xs text-navy-700 leading-relaxed">{t.message}</div>
                </div>
                <button onClick={() => toggleTemplate(t.id)}
                  className={`flex-shrink-0 w-11 h-6 rounded-full transition-all relative ${t.active ? "bg-indigo-600" : "bg-slate-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${t.active ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "send" && (
        <div className="max-w-lg">
          {sent && (
            <div className="mb-4 bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-700 text-sm">
              <CheckCircle size={15} /> SMS sent successfully!
            </div>
          )}
          <form onSubmit={handleSend} className="philix-card p-5 space-y-4">
            <h3 className="font-semibold text-navy-800 flex items-center gap-2"><Phone size={16} className="text-indigo-700" /> Send Manual SMS</h3>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">Recipient Phone Number</label>
              <input type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} required
                className="input-base" placeholder="+260 977 123 456" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">Message <span className="text-navy-500">({manualMessage.length}/160)</span></label>
              <textarea value={manualMessage} onChange={e => setManualMessage(e.target.value)} required
                className="input-base" rows={4} maxLength={160} placeholder="Type your message..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={sending} className="btn-primary flex-1">
                {sending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</> : <><Send size={14} /> Send SMS</>}
              </button>
            </div>
            <p className="text-xs text-navy-500">Estimated cost: K0.10 per SMS · Sender ID: PhilixFin</p>
          </form>

          <div className="mt-4 philix-card p-4">
            <h4 className="text-sm font-semibold text-navy-700 mb-3 flex items-center gap-2"><Users size={14} className="text-indigo-700" /> Bulk SMS</h4>
            <p className="text-xs text-navy-500 mb-3">Send to groups of clients by status or loan state.</p>
            <div className="grid grid-cols-2 gap-2">
              {["All Active Borrowers", "Overdue (7+ days)", "Due This Week", "All Clients"].map(g => (
                <button key={g} className="btn-secondary text-xs py-2 text-left">{g}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="philix-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-100">
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Phone</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Template</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Sent At</th>
                <th className="text-right text-xs font-semibold text-navy-500 px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map(log => (
                <tr key={log.id} className="border-b border-warm-200 hover:bg-warm-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy-800">{log.client}</td>
                  <td className="px-4 py-3 text-navy-600 font-mono text-xs">{log.to}</td>
                  <td className="px-4 py-3 text-navy-600">{log.template}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[log.status]}`}>{log.status}</span>
                  </td>
                  <td className="px-4 py-3 text-navy-500 text-xs">{new Date(log.sentAt).toLocaleString("en-GB")}</td>
                  <td className="px-4 py-3 text-right text-navy-600 text-xs">{log.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="philix-card p-5 space-y-4">
            <h3 className="font-semibold text-navy-800 flex items-center gap-2"><Settings size={16} className="text-indigo-700" /> SMS Gateway Configuration</h3>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">Gateway Provider</label>
              <select value={gateway} onChange={e => setGateway(e.target.value)} className="input-base">
                <option value="MTN">MTN Zambia Bulk SMS</option>
                <option value="Airtel">Airtel Zambia Bulk SMS</option>
                <option value="Zamtel">Zamtel Bulk SMS</option>
                <option value="AfricasTalking">Africa's Talking (multi-network)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                className="input-base" placeholder="Enter your SMS gateway API key" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-600 mb-1.5 block">Sender ID <span className="text-navy-500">(max 11 chars)</span></label>
              <input type="text" value={senderId} onChange={e => setSenderId(e.target.value)} maxLength={11}
                className="input-base" placeholder="PhilixFin" />
            </div>
            <button className="btn-primary w-full">Save Configuration</button>
          </div>
          <div className="philix-card p-4 text-xs text-navy-500 space-y-1">
            <p className="font-semibold text-navy-600">Cost estimate at scale:</p>
            <p>• 100 clients × K0.10/SMS = K10.00 per campaign</p>
            <p>• Daily automated reminders: ~K5–K20/day at 50–200 active loans</p>
            <p>• Register at <span className="text-indigo-700">developers.mtn.com</span> or <span className="text-indigo-700">africastalking.com</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
