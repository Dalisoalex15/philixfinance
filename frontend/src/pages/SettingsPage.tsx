import { useState } from "react";
import { Settings, Shield, Database, Bell, Mail, Server, AlertTriangle, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { staffApi } from "../lib/api";

export default function SettingsPage() {
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleWipe() {
    if (wipeConfirm !== "WIPE") return;
    setWiping(true);
    try {
      await staffApi.wipeDemoData();
      setWipeResult({ success: true, message: "All demo data wiped. CEO account preserved. System ready for live use." });
      setWipeConfirm("");
    } catch (e: any) {
      setWipeResult({ success: false, message: e.message ?? "Wipe failed" });
    } finally {
      setWiping(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure Philix Finance system parameters and integrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Settings */}
        <div className="philix-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-indigo-400" />
            <h3 className="section-title">Company Profile</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Company Name", value: "Philix Finance" },
              { label: "Slogan", value: "Creating a Future Together" },
              { label: "Country", value: "Zambia" },
              { label: "Currency", value: "Zambian Kwacha (ZMW)" },
              { label: "Tax Rate", value: "16% VAT" },
              { label: "Fiscal Year Start", value: "January" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-sm text-slate-400">{s.label}</span>
                <span className="text-sm text-slate-200 font-medium">{s.value}</span>
              </div>
            ))}
          </div>
          <button className="btn-secondary w-full mt-4 text-sm">Edit Company Profile</button>
        </div>

        {/* Loan Parameters */}
        <div className="philix-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-emerald-400" />
            <h3 className="section-title">Default Loan Parameters</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Min Interest Rate", value: "10% p.a." },
              { label: "Max Interest Rate", value: "36% p.a." },
              { label: "Default Processing Fee", value: "2%" },
              { label: "Penalty Rate", value: "5% per month" },
              { label: "Max Loan Duration", value: "52 weeks / 12 months" },
              { label: "Loan-to-Value Ratio", value: "75% of forced sale value" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-sm text-slate-400">{s.label}</span>
                <span className="text-sm text-slate-200 font-medium">{s.value}</span>
              </div>
            ))}
          </div>
          <button className="btn-secondary w-full mt-4 text-sm">Edit Loan Parameters</button>
        </div>

        {/* Email / SMTP */}
        <div className="philix-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-amber-400" />
            <h3 className="section-title">Email / SMTP Configuration</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">SMTP Host</label>
              <input className="input-base text-sm" defaultValue="smtp.gmail.com" readOnly />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Port</label>
                <input className="input-base text-sm" defaultValue="587" readOnly />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Security</label>
                <input className="input-base text-sm" defaultValue="STARTTLS" readOnly />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">From Address</label>
              <input className="input-base text-sm" defaultValue="noreply@philixfinance.com" readOnly />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-secondary text-sm flex-1">Edit SMTP</button>
            <button className="btn-secondary text-sm">Send Test Email</button>
          </div>
        </div>

        {/* Security */}
        <div className="philix-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-red-400" />
            <h3 className="section-title">Security Settings</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "MFA Required", value: "Optional (Recommended)", status: "amber" },
              { label: "Session Timeout", value: "15 minutes", status: "green" },
              { label: "Failed Login Lockout", value: "5 attempts → 30 min", status: "green" },
              { label: "Audit Logging", value: "All actions — Enabled", status: "green" },
              { label: "IP Tracking", value: "Enabled", status: "green" },
              { label: "Password Policy", value: "Min 8 chars, change every 90 days", status: "green" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-sm text-slate-400">{s.label}</span>
                <span className={`text-xs font-medium ${s.status === "green" ? "text-emerald-400" : "text-amber-400"}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="philix-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-blue-400" />
            <h3 className="section-title">System Health</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Database", status: "Operational", color: "emerald", detail: "PostgreSQL 16 · Last backup: 6 hours ago" },
              { label: "API Server", status: "Running", color: "emerald", detail: "Node.js · Port 4000 · Uptime: 99.97%" },
              { label: "Storage", status: "Operational", color: "emerald", detail: "S3-compatible · 2.3 GB used" },
              { label: "Email Service", status: "Operational", color: "emerald", detail: "SMTP Gmail · Last sent: 2h ago" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full bg-${s.color}-400`} />
                  <span className="text-sm font-medium text-slate-200">{s.label}</span>
                </div>
                <div className={`text-xs font-semibold text-${s.color}-400`}>{s.status}</div>
                <div className="text-xs text-slate-600 mt-1">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clean-Slate Launch Protocol */}
      <div className="philix-card p-5 border border-red-200 bg-red-50/50">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100 flex-shrink-0">
            <Trash2 size={16} className="text-red-600" />
          </div>
          <div>
            <h3 className="section-title text-red-800">Clean-Slate Launch Protocol</h3>
            <p className="text-xs text-red-600 mt-0.5">
              Wipes all portal demo data (client accounts, loan applications, KYC documents, notifications).
              Your CEO staff account and system configuration are preserved. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-red-700 font-semibold">
            <AlertTriangle size={14} />
            What will be deleted:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              "All client portal accounts",
              "All loan applications",
              "All KYC documents",
              "All client notifications",
              "All portal refresh tokens",
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-red-600">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold pt-2 border-t border-red-100">
            <CheckCircle size={14} />
            What is preserved: CEO account · staff users · system configuration
          </div>
        </div>

        {wipeResult && (
          <div className={`mt-3 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            wipeResult.success
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {wipeResult.success ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {wipeResult.message}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <input
            type="text"
            placeholder='Type "WIPE" to confirm'
            value={wipeConfirm}
            onChange={e => { setWipeConfirm(e.target.value); setWipeResult(null); }}
            className="input-base text-sm flex-1 border-red-200 focus:border-red-400"
          />
          <button
            onClick={handleWipe}
            disabled={wipeConfirm !== "WIPE" || wiping}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {wiping ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {wiping ? "Wiping…" : "Wipe Demo Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
