import { useState } from "react";
import { Key, Plus, Copy, CheckCircle, Trash2, Globe, Zap, Eye, EyeOff, Activity } from "lucide-react";

interface APIKey {
  id: string;
  name: string;
  key: string;
  partner: string;
  scopes: string[];
  created: string;
  lastUsed: string | null;
  requests: number;
  status: "ACTIVE" | "REVOKED";
}

const apiKeys: APIKey[] = [
  {
    id: "k1", name: "UNZA Integration", key: "phx_live_sk_1a2b3c4d5e6f7g8h9i0j", partner: "University of Zambia",
    scopes: ["loans:read", "clients:read", "applications:create"],
    created: "2026-06-01", lastUsed: "2026-06-17", requests: 1247, status: "ACTIVE",
  },
  {
    id: "k2", name: "MTN Webhook Key", key: "phx_live_wh_9z8y7x6w5v4u3t2s1r0q", partner: "MTN Zambia",
    scopes: ["payments:write", "webhooks:receive"],
    created: "2026-06-10", lastUsed: "2026-06-17", requests: 89, status: "ACTIVE",
  },
];

const webhookEvents = [
  { event: "loan.disbursed", desc: "Fired when a loan is marked as disbursed", enabled: true },
  { event: "payment.received", desc: "Fired when a payment is recorded", enabled: true },
  { event: "loan.overdue", desc: "Fired when a loan becomes overdue", enabled: true },
  { event: "client.created", desc: "Fired when a new client is onboarded", enabled: false },
  { event: "application.approved", desc: "Fired when a portal application is approved", enabled: true },
  { event: "application.rejected", desc: "Fired when a portal application is rejected", enabled: false },
];

const recentCalls = [
  { id: "a1", method: "GET", path: "/api/v1/loans", key: "UNZA Integration", status: 200, time: "12ms", at: "2026-06-17T08:14:00Z" },
  { id: "a2", method: "POST", path: "/api/v1/payments/webhook", key: "MTN Webhook", status: 200, time: "8ms", at: "2026-06-17T08:00:00Z" },
  { id: "a3", method: "GET", path: "/api/v1/clients/PHX-C-00042", key: "UNZA Integration", status: 200, time: "15ms", at: "2026-06-17T07:45:00Z" },
  { id: "a4", method: "POST", path: "/api/v1/applications", key: "UNZA Integration", status: 422, time: "7ms", at: "2026-06-17T07:30:00Z" },
];

const SCOPE_BADGES: Record<string, string> = {
  "loans:read": "bg-blue-900/30 text-blue-400 border-blue-800/40",
  "clients:read": "bg-indigo-900/30 text-indigo-400 border-indigo-800/40",
  "applications:create": "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  "payments:write": "bg-amber-900/30 text-amber-400 border-amber-800/40",
  "webhooks:receive": "bg-purple-900/30 text-purple-400 border-purple-800/40",
};

export default function APIManagementPage() {
  const [tab, setTab] = useState<"keys" | "webhooks" | "logs" | "docs">("keys");
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [webhooks, setWebhooks] = useState(webhookEvents);

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const maskKey = (key: string) => `${key.substring(0, 12)}${"•".repeat(20)}`;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">API Management</h1>
          <p className="page-subtitle">API keys, webhooks, and partner integrations for Philix Finance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-full font-mono">Base: /api/v1</span>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-xs py-1.5"><Plus size={12} /> New API Key</button>
        </div>
      </div>

      {showCreate && (
        <div className="philix-card p-5 space-y-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2"><Key size={16} className="text-indigo-400" /> Create API Key</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Key Name</label>
              <input className="input-base" placeholder="e.g. UNZA Integration" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Partner / System</label>
              <input className="input-base" placeholder="e.g. University of Zambia" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-400 mb-2 block">Permissions (Scopes)</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(SCOPE_BADGES).map(scope => (
                <label key={scope} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" className="accent-indigo-500" />
                  <span className={`px-2 py-0.5 rounded-full border text-xs ${SCOPE_BADGES[scope]}`}>{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm">Generate Key</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Keys", value: apiKeys.filter(k => k.status === "ACTIVE").length, icon: Key, color: "indigo" },
          { label: "Total API Calls", value: apiKeys.reduce((s, k) => s + k.requests, 0).toLocaleString(), icon: Activity, color: "emerald" },
          { label: "Webhook Events", value: webhooks.filter(w => w.enabled).length, icon: Zap, color: "amber" },
          { label: "Partners", value: apiKeys.length, icon: Globe, color: "blue" },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <k.icon size={16} className={`text-${k.color}-400 mb-2`} />
            <div className="text-2xl font-bold text-slate-100">{k.value}</div>
            <div className="text-xs text-slate-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-slate-800 gap-1">
        {(["keys", "webhooks", "logs", "docs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all ${tab === t ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {t === "keys" ? "API Keys" : t === "webhooks" ? "Webhooks" : t === "logs" ? "Request Logs" : "Documentation"}
          </button>
        ))}
      </div>

      {tab === "keys" && (
        <div className="space-y-3">
          {apiKeys.map(k => (
            <div key={k.id} className="philix-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-100">{k.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${k.status === "ACTIVE" ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/40" : "bg-slate-800 text-slate-500 border-slate-700"}`}>{k.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-3">Partner: {k.partner} · Created {k.created} · {k.requests.toLocaleString()} calls</div>

                  <div className="flex items-center gap-2 mb-3 font-mono text-xs bg-slate-800/60 rounded-lg px-3 py-2">
                    <span className="text-slate-300 flex-1">{revealed === k.id ? k.key : maskKey(k.key)}</span>
                    <button onClick={() => setRevealed(revealed === k.id ? null : k.id)} className="text-slate-500 hover:text-slate-300">
                      {revealed === k.id ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => copyKey(k.key, k.id)} className="text-slate-500 hover:text-slate-300">
                      {copied === k.id ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {k.scopes.map(s => (
                      <span key={s} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SCOPE_BADGES[s] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>{s}</span>
                    ))}
                  </div>
                </div>
                <button className="text-red-500 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "webhooks" && (
        <div className="space-y-3">
          <div className="philix-card p-4">
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">Webhook Endpoint URL</label>
            <input type="url" defaultValue="https://your-partner-server.com/philix-webhook" className="input-base font-mono text-sm" />
            <p className="text-xs text-slate-600 mt-1.5">All enabled events will POST to this URL with a JSON payload signed with your webhook secret.</p>
          </div>
          {webhooks.map((w, i) => (
            <div key={w.event} className="philix-card p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-sm text-indigo-400 mb-0.5">{w.event}</div>
                <div className="text-xs text-slate-500">{w.desc}</div>
              </div>
              <button onClick={() => setWebhooks(prev => prev.map((we, j) => j === i ? { ...we, enabled: !we.enabled } : we))}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${w.enabled ? "bg-indigo-600" : "bg-slate-700"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${w.enabled ? "left-6" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="philix-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Method</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Endpoint</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Key</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Time</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Called At</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map(c => (
                <tr key={c.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.method === "GET" ? "bg-blue-900/30 text-blue-400" : "bg-emerald-900/30 text-emerald-400"}`}>{c.method}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{c.path}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.key}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${c.status < 300 ? "text-emerald-400" : "text-red-400"}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.time}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{new Date(c.at).toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "docs" && (
        <div className="max-w-2xl space-y-4">
          <div className="philix-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4">Quick Start</h3>
            <div className="space-y-3 text-sm">
              <p className="text-slate-400">All API requests require a bearer token in the Authorization header:</p>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-emerald-400">
                {`curl -H "Authorization: Bearer phx_live_sk_..." \\
     https://api.philixfinance.com/api/v1/loans`}
              </div>
            </div>
          </div>
          {[
            { method: "GET", path: "/api/v1/loans", desc: "List all loans (paginated)", scopes: ["loans:read"] },
            { method: "GET", path: "/api/v1/clients/{id}", desc: "Get a client by ID", scopes: ["clients:read"] },
            { method: "POST", path: "/api/v1/applications", desc: "Submit a loan application", scopes: ["applications:create"] },
            { method: "GET", path: "/api/v1/payments?loanId=", desc: "Get payments for a loan", scopes: ["loans:read"] },
            { method: "POST", path: "/api/v1/payments/webhook", desc: "Receive mobile money webhook", scopes: ["webhooks:receive"] },
          ].map(e => (
            <div key={e.path} className="philix-card p-4 flex items-center gap-4">
              <span className={`text-xs font-bold px-2 py-1 rounded flex-shrink-0 ${e.method === "GET" ? "bg-blue-900/30 text-blue-400" : "bg-emerald-900/30 text-emerald-400"}`}>{e.method}</span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-slate-200">{e.path}</div>
                <div className="text-xs text-slate-500 mt-0.5">{e.desc}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {e.scopes.map(s => <span key={s} className={`text-xs px-1.5 py-0.5 rounded-full border ${SCOPE_BADGES[s] ?? ""}`}>{s}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
