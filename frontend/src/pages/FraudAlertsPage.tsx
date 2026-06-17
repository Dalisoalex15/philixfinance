import { useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle, Eye, XCircle, User, Phone, CreditCard } from "lucide-react";

type AlertSeverity = "HIGH" | "MEDIUM" | "LOW";
type AlertStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

interface FraudAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  description: string;
  details: string;
  detectedAt: string;
  affectedClients: string[];
  icon: React.ElementType;
}

const alerts: FraudAlert[] = [
  {
    id: "fa1", type: "Duplicate NRC", severity: "HIGH", status: "OPEN",
    description: "NRC 123456/78/1 registered under two different client accounts",
    details: "PHX-C-00042 (Chanda Mwale) and PHX-C-00087 (Charles Mwale) share identical NRC number. Possible identity duplication or error.",
    detectedAt: "2026-06-17T08:00:00Z", affectedClients: ["PHX-C-00042", "PHX-C-00087"], icon: CreditCard,
  },
  {
    id: "fa2", type: "Same-day Multi-loan", severity: "HIGH", status: "INVESTIGATING",
    description: "Single borrower with 3 loan applications across different officers on same day",
    details: "Client PHX-C-00055 (Grace Tembo) submitted loan applications through Mary Chirwa, James Mutale, and Peter Siame on 2026-06-16 within 4 hours. Total requested: K9,000.",
    detectedAt: "2026-06-16T16:30:00Z", affectedClients: ["PHX-C-00055"], icon: AlertTriangle,
  },
  {
    id: "fa3", type: "Duplicate Phone", severity: "MEDIUM", status: "OPEN",
    description: "Phone +260 977 112 233 linked to two client accounts",
    details: "PHX-C-00012 and PHX-C-00096 share the same phone number. One may be a test account or data entry error.",
    detectedAt: "2026-06-17T06:45:00Z", affectedClients: ["PHX-C-00012", "PHX-C-00096"], icon: Phone,
  },
  {
    id: "fa4", type: "Duplicate Collateral", severity: "MEDIUM", status: "RESOLVED",
    description: "Samsung Galaxy A54 serial SN789012 pledged as collateral on two active loans",
    details: "Same device pledged for PHX-L-2026-0031 and PHX-L-2026-0044. One of these loans must be reviewed for collateral validity.",
    detectedAt: "2026-06-15T14:20:00Z", affectedClients: ["PHX-C-00031", "PHX-C-00044"], icon: ShieldAlert,
  },
  {
    id: "fa5", type: "Unusual Pattern", severity: "LOW", status: "DISMISSED",
    description: "5 loan applications from clients at same address in 2 weeks",
    details: "Stand 14, Mtendere, Lusaka has 5 loan applicants in the past 14 days. May indicate referral network or shared household. No fraud confirmed.",
    detectedAt: "2026-06-14T10:00:00Z", affectedClients: ["PHX-C-00042", "PHX-C-00043", "PHX-C-00044", "PHX-C-00045", "PHX-C-00046"], icon: User,
  },
];

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-warm-200 text-navy-600 border-warm-300",
};

const STATUS_STYLES: Record<AlertStatus, string> = {
  OPEN: "bg-red-100 text-red-700 border-red-200",
  INVESTIGATING: "bg-blue-100 text-blue-700 border-blue-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DISMISSED: "bg-warm-200 text-navy-500 border-warm-300",
};

export default function FraudAlertsPage() {
  const [selected, setSelected] = useState<FraudAlert | null>(alerts[0]);
  const [filter, setFilter] = useState<AlertStatus | "ALL">("ALL");
  const [alertsState, setAlertsState] = useState(alerts);

  const updateStatus = (id: string, status: AlertStatus) => {
    setAlertsState(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const filtered = alertsState.filter(a => filter === "ALL" || a.status === filter);
  const openCount = alertsState.filter(a => a.status === "OPEN").length;
  const investigatingCount = alertsState.filter(a => a.status === "INVESTIGATING").length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fraud Detection Alerts</h1>
          <p className="page-subtitle">Automated detection of duplicate NRCs, suspicious patterns, and multi-loan abuse</p>
        </div>
        <div className="flex items-center gap-2">
          {openCount > 0 && (
            <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <AlertTriangle size={12} /> {openCount} Open Alert{openCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open", count: alertsState.filter(a => a.status === "OPEN").length, color: "red" },
          { label: "Investigating", count: investigatingCount, color: "blue" },
          { label: "Resolved", count: alertsState.filter(a => a.status === "RESOLVED").length, color: "emerald" },
          { label: "Dismissed", count: alertsState.filter(a => a.status === "DISMISSED").length, color: "slate" },
        ].map(k => (
          <div key={k.label} className="stat-card cursor-pointer" onClick={() => setFilter(k.label.toUpperCase() as AlertStatus)}>
            <div className={`text-3xl font-bold text-${k.color}-400 mb-1`}>{k.count}</div>
            <div className="text-xs text-navy-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {(["ALL", "OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${filter === f ? "bg-indigo-600 border-indigo-500 text-white" : "border-warm-300 text-navy-500 hover:text-navy-700"}`}>
            {f === "ALL" ? "All Alerts" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          {filtered.map(alert => (
            <button key={alert.id} onClick={() => setSelected(alert)}
              className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected?.id === alert.id ? "border border-indigo-600" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${SEVERITY_STYLES[alert.severity]}`}>
                  <alert.icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy-800 text-sm">{alert.type}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${SEVERITY_STYLES[alert.severity]}`}>{alert.severity}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[alert.status]}`}>{alert.status}</span>
                  </div>
                  <p className="text-xs text-navy-500 mt-1 line-clamp-2">{alert.description}</p>
                  <div className="text-xs text-navy-500 mt-1">{new Date(alert.detectedAt).toLocaleString("en-GB")}</div>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="philix-card p-10 text-center">
              <CheckCircle size={32} className="text-emerald-700 mx-auto mb-3" />
              <p className="text-navy-600 font-semibold">No alerts with this status</p>
            </div>
          )}
        </div>

        {selected ? (
          <div className="philix-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-navy-900 text-lg">{selected.type}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[selected.severity]}`}>{selected.severity}</span>
                </div>
                <div className="text-xs text-navy-500">{new Date(selected.detectedAt).toLocaleString("en-GB")}</div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
            </div>

            <div className="bg-warm-50 rounded-xl p-4">
              <p className="text-sm text-navy-700 leading-relaxed">{selected.details}</p>
            </div>

            <div>
              <div className="text-xs text-navy-500 mb-2">Affected Clients</div>
              <div className="flex flex-wrap gap-2">
                {selected.affectedClients.map(c => (
                  <span key={c} className="text-xs font-mono bg-warm-200 text-indigo-700 px-2 py-1 rounded-lg">{c}</span>
                ))}
              </div>
            </div>

            {(selected.status === "OPEN" || selected.status === "INVESTIGATING") && (
              <div className="flex gap-2 pt-2">
                {selected.status === "OPEN" && (
                  <button onClick={() => updateStatus(selected.id, "INVESTIGATING")} className="btn-secondary flex-1 text-xs">
                    <Eye size={12} /> Investigate
                  </button>
                )}
                <button onClick={() => updateStatus(selected.id, "RESOLVED")} className="btn-success flex-1 text-xs">
                  <CheckCircle size={12} /> Mark Resolved
                </button>
                <button onClick={() => updateStatus(selected.id, "DISMISSED")} className="btn-danger text-xs px-3">
                  <XCircle size={12} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="philix-card flex items-center justify-center text-navy-500 text-sm" style={{ minHeight: 300 }}>
            Select an alert to review details
          </div>
        )}
      </div>
    </div>
  );
}
