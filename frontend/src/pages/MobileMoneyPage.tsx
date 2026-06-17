import { useState } from "react";
import { Smartphone, CheckCircle, Clock, AlertTriangle, RefreshCw, DollarSign, Link, Settings } from "lucide-react";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Payment {
  id: string; ref: string; phone: string; amount: number;
  matched: boolean; loanRef: string | null; clientName: string | null;
  receivedAt: string; network: string;
}

const incomingPayments: Payment[] = [
  { id: "mm1", ref: "MTN-2026061700142", phone: "+260 977 112 233", amount: 850, matched: true, loanRef: "PHX-L-2026-0042", clientName: "Chanda Mwale", receivedAt: "2026-06-17T08:14:00Z", network: "MTN" },
  { id: "mm2", ref: "AIR-2026061700089", phone: "+260 955 445 566", amount: 1200, matched: true, loanRef: "PHX-L-2026-0038", clientName: "Peter Banda", receivedAt: "2026-06-17T07:30:00Z", network: "Airtel" },
  { id: "mm3", ref: "MTN-2026061600301", phone: "+260 966 778 899", amount: 500, matched: false, loanRef: null, clientName: null, receivedAt: "2026-06-16T18:45:00Z", network: "MTN" },
  { id: "mm4", ref: "AIR-2026061600214", phone: "+260 955 334 455", amount: 2000, matched: true, loanRef: "PHX-L-2026-0031", clientName: "Grace Lungu", receivedAt: "2026-06-16T14:45:00Z", network: "Airtel" },
  { id: "mm5", ref: "ZTL-2026061600155", phone: "+260 950 012 345", amount: 300, matched: false, loanRef: null, clientName: null, receivedAt: "2026-06-16T11:20:00Z", network: "Zamtel" },
];

const NETWORK_COLORS: Record<string, string> = {
  MTN: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Airtel: "bg-red-100 text-red-700 border-red-200",
  Zamtel: "bg-green-100 text-green-800 border-green-200",
};

export default function MobileMoneyPage() {
  const [tab, setTab] = useState<"incoming" | "reconcile" | "settings">("incoming");
  const [reconciling, setReconciling] = useState<string | null>(null);
  const [payments, setPayments] = useState(incomingPayments);
  const [manualLoanRef, setManualLoanRef] = useState("");

  const unmatched = payments.filter(p => !p.matched);
  const matched = payments.filter(p => p.matched);
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

  const handleMatch = (id: string) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, matched: true, loanRef: manualLoanRef || "PHX-L-2026-MANUAL" } : p));
    setReconciling(null);
    setManualLoanRef("");
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mobile Money Integration</h1>
          <p className="page-subtitle">MTN Money & Airtel Money repayment matching — automatic reconciliation</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs py-1.5"><RefreshCw size={12} /> Sync Now</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Received Today", value: K(3050), icon: DollarSign, color: "emerald" },
          { label: "Matched", value: matched.length.toString(), icon: CheckCircle, color: "indigo" },
          { label: "Unmatched", value: unmatched.length.toString(), icon: AlertTriangle, color: "amber" },
          { label: "Total (Period)", value: K(totalReceived), icon: Smartphone, color: "blue" },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <k.icon size={16} className={`text-${k.color}-400 mb-2`} />
            <div className="text-2xl font-bold text-navy-900">{k.value}</div>
            <div className="text-xs text-navy-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {unmatched.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" />
          <p className="text-sm text-amber-700">{unmatched.length} payment(s) could not be automatically matched to a loan. Manual reconciliation required below.</p>
        </div>
      )}

      <div className="flex border-b border-warm-200 gap-1">
        {(["incoming", "reconcile", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all ${tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-navy-500 hover:text-navy-700"}`}>
            {t === "incoming" ? "Incoming Payments" : t === "reconcile" ? `Unmatched (${unmatched.length})` : "Merchant Settings"}
          </button>
        ))}
      </div>

      {tab === "incoming" && (
        <div className="philix-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-warm-100">
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Reference</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Network</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Phone</th>
                <th className="text-right text-xs font-semibold text-navy-500 px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Loan</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Client</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-navy-500 px-4 py-3">Received</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-warm-200 hover:bg-warm-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-navy-600">{p.ref}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${NETWORK_COLORS[p.network]}`}>{p.network}</span>
                  </td>
                  <td className="px-4 py-3 text-navy-600 text-xs">{p.phone}</td>
                  <td className="px-4 py-3 text-right font-bold text-navy-900">{K(p.amount)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-indigo-700">{p.loanRef ?? "—"}</td>
                  <td className="px-4 py-3 text-navy-700">{p.clientName ?? <span className="text-amber-700">Unmatched</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${p.matched ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                      {p.matched ? "Matched" : "Unmatched"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-navy-500 text-xs">{new Date(p.receivedAt).toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reconcile" && (
        <div className="space-y-3">
          {unmatched.length === 0 && (
            <div className="philix-card p-10 text-center">
              <CheckCircle size={32} className="text-emerald-700 mx-auto mb-3" />
              <p className="text-navy-700 font-semibold">All payments matched!</p>
              <p className="text-navy-500 text-sm mt-1">No unmatched payments require manual reconciliation.</p>
            </div>
          )}
          {unmatched.map(p => (
            <div key={p.id} className="philix-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${NETWORK_COLORS[p.network]}`}>{p.network}</span>
                    <span className="font-mono text-xs text-navy-600">{p.ref}</span>
                  </div>
                  <div className="text-lg font-bold text-navy-900">{K(p.amount)}</div>
                  <div className="text-sm text-navy-600">{p.phone} · {new Date(p.receivedAt).toLocaleString("en-GB")}</div>
                </div>
                <div className="flex-shrink-0">
                  {reconciling === p.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={manualLoanRef} onChange={e => setManualLoanRef(e.target.value)}
                        className="input-base text-xs py-1.5 w-40" placeholder="PHX-L-2026-XXXX" />
                      <button onClick={() => handleMatch(p.id)} className="btn-success text-xs py-1.5">
                        <Link size={12} /> Match
                      </button>
                      <button onClick={() => setReconciling(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setReconciling(p.id)} className="btn-secondary text-xs">
                      <Link size={12} /> Match to Loan
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-lg space-y-4">
          <div className="philix-card p-5 space-y-4">
            <h3 className="font-semibold text-navy-800 flex items-center gap-2"><Settings size={16} className="text-indigo-700" /> Merchant Account Configuration</h3>
            <div className="space-y-3">
              {["MTN Money", "Airtel Money"].map(network => (
                <div key={network} className="bg-warm-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy-700">{network}</span>
                    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Pending Setup</span>
                  </div>
                  <input type="text" className="input-base text-xs" placeholder={`${network} Merchant Number`} />
                  <input type="password" className="input-base text-xs" placeholder={`${network} API Secret`} />
                  <input type="text" className="input-base text-xs" placeholder="Webhook URL (auto-generated)" defaultValue="https://api.philixfinance.com/webhooks/mobile-money" readOnly />
                </div>
              ))}
            </div>
            <button className="btn-primary w-full">Save Merchant Settings</button>
          </div>
          <div className="philix-card p-4 text-xs text-navy-500 space-y-1">
            <p className="font-semibold text-navy-600">Setup instructions:</p>
            <p>1. Register at <span className="text-indigo-700">developers.mtn.zm</span> or <span className="text-indigo-700">airtel.africa/zambia</span></p>
            <p>2. Apply for a merchant/paybill account</p>
            <p>3. Configure the webhook URL above in your merchant dashboard</p>
            <p>4. Incoming payments will auto-match using the loan reference in the payment narration</p>
          </div>
        </div>
      )}
    </div>
  );
}
