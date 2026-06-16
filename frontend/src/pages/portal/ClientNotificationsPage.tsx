import { useState } from "react";
import { Mail, CheckCircle, Bell, X, ChevronRight } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";

interface Notification {
  id: string;
  type: "EMAIL" | "SYSTEM" | "ALERT";
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  category: "LOAN" | "PAYMENT" | "KYC" | "ACCOUNT" | "COLLECTION" | "GENERAL";
}

const CATEGORY_COLORS: Record<string, string> = {
  LOAN: "text-blue-400 bg-blue-900/30 border-blue-800/40",
  PAYMENT: "text-emerald-400 bg-emerald-900/30 border-emerald-800/40",
  KYC: "text-purple-400 bg-purple-900/30 border-purple-800/40",
  ACCOUNT: "text-indigo-400 bg-indigo-900/30 border-indigo-800/40",
  COLLECTION: "text-red-400 bg-red-900/30 border-red-800/40",
  GENERAL: "text-slate-400 bg-slate-800 border-slate-700",
};

const mockNotifications: Notification[] = [
  {
    id: "n1", type: "EMAIL", category: "LOAN", read: false,
    subject: "Your Loan Application Has Been Approved — Philix Finance",
    preview: "We are pleased to inform you that your loan application has been APPROVED...",
    date: "2025-04-01T10:00:00Z",
    body: `Dear Mwansa,

We are pleased to inform you that your loan application has been APPROVED.

LOAN DETAILS
─────────────────────────────
Loan Reference:    PHX-L-2024-0034
Product:           Salary Advance
Amount Approved:   K5,000
Term:              5 months
Monthly Payment:   K1,080
Interest Rate:     5% per month
Disbursement Date: 01 April 2025
─────────────────────────────

Your funds will be disbursed to your account within 24 hours of signing your loan agreement.

Warm regards,
Patricia Mwanza
Loan Officer — Philix Finance`,
  },
  {
    id: "n2", type: "EMAIL", category: "LOAN", read: true,
    subject: "Loan Disbursement Confirmation — Philix Finance",
    preview: "Your loan has been successfully DISBURSED to your account...",
    date: "2025-04-01T14:30:00Z",
    body: `Dear Mwansa,

Your loan has been successfully DISBURSED.

DISBURSEMENT DETAILS
─────────────────────────────
Loan Reference:  PHX-L-2024-0034
Amount:          K5,000
Date:            01 April 2025
Method:          Bank Transfer
Reference No:    TXN-20250401-001
─────────────────────────────

Your first repayment of K1,080 is due on 25 April 2025.

Thank you for banking with Philix Finance.`,
  },
  {
    id: "n3", type: "EMAIL", category: "PAYMENT", read: true,
    subject: "Payment Receipt Confirmation — Philix Finance",
    preview: "We confirm receipt of your payment of K1,080...",
    date: "2025-05-15T09:15:00Z",
    body: `Dear Mwansa,

We confirm receipt of your payment.

PAYMENT DETAILS
─────────────────────────────
Loan Reference:   PHX-L-2024-0034
Amount Paid:      K1,080
Payment Date:     15 May 2025
Receipt No:       RCP-20250515-001
Outstanding:      K3,240
─────────────────────────────

Your next payment of K1,080 is due on 25 June 2025.

Thank you for your prompt payment.
Philix Finance Ltd`,
  },
  {
    id: "n4", type: "EMAIL", category: "PAYMENT", read: true,
    subject: "Payment Receipt Confirmation — Philix Finance",
    preview: "We confirm receipt of your payment of K1,080...",
    date: "2025-06-15T11:00:00Z",
    body: `Dear Mwansa,

We confirm receipt of your payment.

PAYMENT DETAILS
─────────────────────────────
Loan Reference:   PHX-L-2024-0034
Amount Paid:      K1,080
Payment Date:     15 June 2025
Receipt No:       RCP-20250615-001
Outstanding:      K2,160
─────────────────────────────

Your next payment of K1,080 is due on 25 July 2025.

Thank you for your prompt payment.
Philix Finance Ltd`,
  },
  {
    id: "n5", type: "SYSTEM", category: "KYC", read: false,
    subject: "Identity Verification Complete",
    preview: "Your KYC has been verified. You now have full access to all loan products.",
    date: "2025-03-20T08:00:00Z",
    body: `Dear Mwansa,

Your identity verification (KYC) has been successfully completed.

VERIFICATION DETAILS
─────────────────────────────
Client Number:  PHX-C-0001
NRC Number:     123456/78/1
Verified On:    20 March 2025
Status:         VERIFIED ✓
─────────────────────────────

You now have full access to all Philix Finance loan products.

Philix Finance Ltd`,
  },
];

const STATUS_MESSAGES: Record<string, { subject: string; body: (ref: string, name: string, amount: number, product: string) => string; category: Notification["category"] }> = {
  UNDER_REVIEW: {
    subject: "Your Loan Application Is Under Review",
    category: "LOAN",
    body: (ref, name, amount, product) => `Dear ${name},\n\nYour loan application has been received and is currently being reviewed by a Philix Finance Loan Officer.\n\nAPPLICATION DETAILS\n─────────────────────────────\nReference:   ${ref}\nProduct:     ${product}\nAmount:      K${amount.toLocaleString()}\nStatus:      Under Review\n─────────────────────────────\n\nWe aim to provide a decision within 24–48 hours. You will be notified of any updates.\n\nPhilix Finance Ltd`,
  },
  APPROVED: {
    subject: "Your Loan Application Has Been Approved!",
    category: "LOAN",
    body: (ref, name, amount, product) => `Dear ${name},\n\nGreat news! Your loan application has been APPROVED.\n\nLOAN DETAILS\n─────────────────────────────\nReference:    ${ref}\nProduct:      ${product}\nAmount:       K${amount.toLocaleString()}\nStatus:       APPROVED ✓\n─────────────────────────────\n\nA Loan Officer will contact you to arrange disbursement. Please ensure you have your NRC and collateral ready.\n\nWarm regards,\nPhilix Finance Ltd`,
  },
  REJECTED: {
    subject: "Update on Your Loan Application",
    category: "LOAN",
    body: (ref, name, amount, product) => `Dear ${name},\n\nThank you for applying with Philix Finance.\n\nAfter reviewing your application, we are unable to approve it at this time.\n\nAPPLICATION REFERENCE: ${ref}\nPRODUCT: ${product}\nAMOUNT REQUESTED: K${amount.toLocaleString()}\n\nYou are welcome to reapply after 30 days or contact us to discuss your options.\n\nPhilix Finance Ltd`,
  },
  DISBURSED: {
    subject: "Loan Disbursement Confirmation",
    category: "LOAN",
    body: (ref, name, amount, product) => `Dear ${name},\n\nYour loan has been successfully DISBURSED.\n\nDISBURSEMENT DETAILS\n─────────────────────────────\nReference:  ${ref}\nProduct:    ${product}\nAmount:     K${amount.toLocaleString()}\nStatus:     Disbursed ✓\n─────────────────────────────\n\nPlease check your account. Your first repayment will be due according to your agreed schedule.\n\nThank you for choosing Philix Finance.\nPhilix Finance Ltd`,
  },
};

export default function ClientNotificationsPage() {
  const client = useClientAuthStore(s => s.client)!;
  const allApplications = useLoanApplicationStore(s => s.applications);
  const myApplications = allApplications.filter(a => a.clientId === client.id);

  // Build real notifications from application status changes
  const realNotifications: Notification[] = myApplications
    .filter(a => a.status !== "PENDING")
    .map(a => {
      const msg = STATUS_MESSAGES[a.status];
      if (!msg) return null;
      return {
        id: `app-notif-${a.id}-${a.status}`,
        type: "EMAIL" as const,
        category: msg.category,
        read: false,
        subject: msg.subject,
        preview: msg.body(a.ref, client.firstName, a.amount, a.productName).split("\n")[2] ?? "",
        date: a.submittedAt,
        body: msg.body(a.ref, client.firstName, a.amount, a.productName),
      };
    })
    .filter(Boolean) as Notification[];

  const [notifications, setNotifications] = useState([...realNotifications, ...mockNotifications]);
  const [selected, setSelected] = useState<Notification | null>(null);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const open = (n: Notification) => {
    setSelected(n);
    markRead(n.id);
  };

  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">Emails and alerts from Philix Finance</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800/40 px-3 py-1.5 rounded-xl">
            Mark all read
          </button>
        )}
      </div>

      {unread > 0 && (
        <div className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-800/40 rounded-xl px-4 py-3 text-sm">
          <Bell size={14} className="text-indigo-400" />
          <span className="text-indigo-300">You have <span className="font-bold">{unread}</span> unread notification{unread > 1 ? "s" : ""}</span>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[selected.category]}`}>{selected.category}</span>
                  <span className="text-xs text-slate-600">{new Date(selected.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <h3 className="font-bold text-slate-200 text-sm">{selected.subject}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                {selected.body}
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Mail size={11} /> Sent to: <span className="text-slate-400">{client.email}</span>
              </div>
              <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {notifications.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            <div>No notifications yet</div>
          </div>
        )}
        {notifications.map(n => (
          <button key={n.id} onClick={() => open(n)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${n.read ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-indigo-900/10 border-indigo-800/30 hover:border-indigo-700/50"}`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${n.read ? "bg-slate-800" : "bg-indigo-600/20"}`}>
                {n.type === "EMAIL" ? <Mail size={14} className={n.read ? "text-slate-500" : "text-indigo-400"} /> : <Bell size={14} className={n.read ? "text-slate-500" : "text-indigo-400"} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                    <span className={`text-sm font-medium truncate ${n.read ? "text-slate-400" : "text-slate-200"}`}>{n.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[n.category]}`}>{n.category}</span>
                    <ChevronRight size={12} className="text-slate-600" />
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-0.5 truncate">{n.preview}</div>
                <div className="text-xs text-slate-700 mt-1">{new Date(n.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {notifications.filter(n => n.read).length > 0 && (
        <div className="text-center">
          <div className="flex items-center gap-2 text-xs text-slate-600 justify-center">
            <CheckCircle size={11} /> {notifications.filter(n => n.read).length} read notification{notifications.filter(n => n.read).length > 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
