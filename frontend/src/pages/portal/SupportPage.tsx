import { useState } from "react";
import { Phone, MessageCircle, Mail, ChevronDown, ChevronUp, HelpCircle, Clock, Shield, CreditCard, FileText } from "lucide-react";

interface FAQ {
  q: string;
  a: string;
  icon: React.ElementType;
}

const FAQS: FAQ[] = [
  {
    icon: FileText,
    q: "How do I apply for a loan?",
    a: "Go to 'Apply for Loan' in the sidebar menu. Choose your loan product, fill in the application form, submit your collateral photos (if required), and complete KYC verification. Our team reviews applications within 24–48 hours.",
  },
  {
    icon: Clock,
    q: "How long does approval take?",
    a: "Most applications are reviewed within 24 hours on business days. Once approved, funds are disbursed within the same day or the next business day. You'll receive a notification in the app and via email at each stage.",
  },
  {
    icon: Shield,
    q: "What is KYC and why do I need it?",
    a: "KYC (Know Your Customer) is an identity verification process required by law. It helps us verify your identity and protect you from fraud. You'll need your NRC (National Registration Card) and a selfie. Verified clients get higher loan limits and faster decisions.",
  },
  {
    icon: CreditCard,
    q: "How do I repay my loan?",
    a: "Repayments can be made via mobile money (Airtel Money or MTN MoMo), bank transfer, or in person at our Lusaka office. After paying, upload your payment receipt via the 'My Loans' section so our team can confirm and mark it.",
  },
  {
    icon: HelpCircle,
    q: "My application was rejected. What can I do?",
    a: "Rejection reasons are shown in your loan details. Common reasons include incomplete KYC, insufficient income information, or existing unpaid obligations. You may reapply after addressing the issue — complete your profile, verify KYC, and ensure all information is accurate.",
  },
  {
    icon: CreditCard,
    q: "Can I apply for another loan while one is active?",
    a: "Currently, Philix Finance supports one active loan at a time per client. Once your existing loan is fully repaid, you can immediately apply for a new loan. Clients with a good repayment history may qualify for higher amounts.",
  },
  {
    icon: Shield,
    q: "Is my personal information safe?",
    a: "Yes. Philix Finance uses bank-grade encryption to protect your data. We never share your personal information with third parties without your consent. Your password is hashed and cannot be seen by anyone — including our staff.",
  },
];

const CHANNELS = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+260 777 158 901",
    desc: "Fastest response — usually within 1 hour",
    color: "emerald",
    href: "https://wa.me/260777158901",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+260 777 158 901",
    desc: "Monday – Friday, 08:00 – 17:00 CAT",
    color: "blue",
    href: "tel:+260777158901",
  },
  {
    icon: Mail,
    label: "Email",
    value: "support@philixfinance.com",
    desc: "Response within 24 hours",
    color: "indigo",
    href: "mailto:support@philixfinance.com",
  },
];

function FaqItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${open ? "border-indigo-700/50 bg-indigo-900/10" : "border-slate-800 bg-slate-900"}`}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${open ? "bg-indigo-600/20" : "bg-slate-800"}`}>
          <faq.icon size={14} className={open ? "text-indigo-400" : "text-slate-500"} />
        </div>
        <span className={`flex-1 text-sm font-medium ${open ? "text-slate-100" : "text-slate-300"}`}>{faq.q}</span>
        {open ? <ChevronUp size={14} className="text-indigo-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 ml-11">
          <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <HelpCircle size={24} className="text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Support Center</h1>
        <p className="text-slate-400 text-sm">Get help with your account, loans, and repayments</p>
      </div>

      {/* Contact Channels */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Contact Us</h2>
        <div className="grid grid-cols-1 gap-3">
          {CHANNELS.map(c => (
            <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-4 p-4 bg-${c.color}-900/10 border border-${c.color}-900/30 rounded-xl hover:border-${c.color}-700/50 transition-all group`}>
              <div className={`w-10 h-10 rounded-xl bg-${c.color}-600/20 flex items-center justify-center flex-shrink-0`}>
                <c.icon size={18} className={`text-${c.color}-400`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold text-${c.color}-400`}>{c.label}</span>
                </div>
                <div className="font-semibold text-slate-200 text-sm">{c.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.desc}</div>
              </div>
              <div className={`text-${c.color}-600 group-hover:text-${c.color}-400 transition-colors`}>
                <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />
              </div>
            </a>
          ))}
        </div>
        <div className="mt-4 p-3 bg-slate-950/50 rounded-xl flex items-center gap-2 text-xs text-slate-500">
          <Clock size={12} />
          Office hours: Monday – Friday 08:00–17:00 · Closed on public holidays
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">Frequently Asked Questions</h2>
        {FAQS.map(faq => <FaqItem key={faq.q} faq={faq} />)}
      </div>

      {/* Office */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Visit Our Office</h2>
        <div className="text-sm text-slate-400 space-y-1">
          <div className="font-semibold text-slate-200">Philix Finance Ltd</div>
          <div>Lusaka, Zambia</div>
          <div className="text-slate-500">Monday – Friday · 08:00 – 17:00 CAT</div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-700 pb-4">
        Philix Finance is a registered microfinance institution in Zambia.
        Our team is here to help you every step of the way.
      </p>
    </div>
  );
}
