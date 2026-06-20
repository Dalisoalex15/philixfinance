import { useEffect } from "react";
import { Shield, TrendingDown, AlertTriangle, Download } from "lucide-react";
import { useLoanApplicationStore, LoanApplication } from "../store/loanApplicationStore";
import { formatDate } from "../lib/mock-data";

const K = (n: number) => `K${Math.round(n).toLocaleString()}`;

function getDaysOverdue(app: LoanApplication): number {
  const due = new Date(app.submittedAt).getTime() + (app.termMonths ?? 1) * 7 * 86400000;
  const diff = Date.now() - due;
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

interface PARBand {
  label: string;
  minDays: number;
  maxDays: number;
  rate: number;
  color: string;
  bg: string;
  badge: string;
}

const PAR_BANDS: PARBand[] = [
  { label: "Current (0 days)",   minDays: 0,  maxDays: 0,  rate: 0.01, color: "text-emerald-400", bg: "bg-emerald-500/10", badge: "badge-green" },
  { label: "PAR 1–30",           minDays: 1,  maxDays: 30, rate: 0.05, color: "text-amber-400",   bg: "bg-amber-500/10",   badge: "badge-yellow" },
  { label: "PAR 31–60",          minDays: 31, maxDays: 60, rate: 0.25, color: "text-orange-400",  bg: "bg-orange-500/10",  badge: "badge-yellow" },
  { label: "PAR 61–90",          minDays: 61, maxDays: 90, rate: 0.50, color: "text-red-400",     bg: "bg-red-500/10",     badge: "badge-red" },
  { label: "PAR 90+",            minDays: 91, maxDays: Infinity, rate: 1.00, color: "text-red-600", bg: "bg-red-900/20",   badge: "badge-red" },
];

function getBand(days: number): PARBand {
  return PAR_BANDS.find(b => days >= b.minDays && days <= b.maxDays) ?? PAR_BANDS[PAR_BANDS.length - 1];
}

export default function ProvisioningPage() {
  const { applications, syncFromApi } = useLoanApplicationStore();

  useEffect(() => { syncFromApi(); }, []);

  const disbursed = applications.filter(a => a.status === "DISBURSED");

  // Per-loan provisioning data
  const loanRows = disbursed.map(app => {
    const daysOverdue = getDaysOverdue(app);
    const band = getBand(daysOverdue);
    const provision = app.amount * band.rate;
    return { app, daysOverdue, band, provision };
  });

  // PAR band aggregates
  const bandStats = PAR_BANDS.map(band => {
    const loans = loanRows.filter(r => r.band.label === band.label);
    const balance = loans.reduce((s, r) => s + r.app.amount, 0);
    const provision = loans.reduce((s, r) => s + r.provision, 0);
    return { band, count: loans.length, balance, provision };
  });

  const totalPortfolio = disbursed.reduce((s, a) => s + a.amount, 0);
  const totalOverdue = loanRows.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.app.amount, 0);
  const totalProvision = loanRows.reduce((s, r) => s + r.provision, 0);
  const coverageRatio = totalOverdue > 0 ? (totalProvision / totalOverdue) * 100 : 0;

  function exportCSV() {
    const headers = ["Client", "Loan Ref", "Amount (K)", "Days Overdue", "PAR Band", "Rate %", "Provision (K)"];
    const rows = loanRows.map(r => [
      r.app.clientName,
      r.app.ref,
      Math.round(r.app.amount),
      r.daysOverdue,
      r.band.label,
      `${(r.band.rate * 100).toFixed(0)}%`,
      Math.round(r.provision),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `philix_provision_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: "Total Portfolio", value: K(totalPortfolio), icon: <Shield size={18} className="text-indigo-400" />, color: "text-indigo-400" },
    { label: "Total Overdue", value: K(totalOverdue), icon: <AlertTriangle size={18} className="text-amber-400" />, color: "text-amber-400" },
    { label: "Required Provision", value: K(totalProvision), icon: <TrendingDown size={18} className="text-red-400" />, color: "text-red-400" },
    { label: "Coverage Ratio", value: `${coverageRatio.toFixed(1)}%`, icon: <Shield size={18} className="text-emerald-400" />, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">IFRS-9 Provisioning</h1>
          <p className="page-subtitle">Loan loss provisioning by PAR band — real portfolio data</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary">
          <Download size={14} /> Export Provision Schedule
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="philix-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">{k.icon}</div>
            <div>
              <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-500">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PAR Band Summary Table */}
      <div className="philix-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">PAR Band Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr className="text-left">
                {["Band", "# Loans", "Loan Balance", "Rate %", "Provision Required"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {bandStats.map(({ band, count, balance, provision }) => (
                <tr key={band.label} className={`${band.bg} hover:bg-slate-800/30`}>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${band.color}`}>{band.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{count}</td>
                  <td className="px-4 py-3 text-slate-200">{K(balance)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${band.color}`}>{(band.rate * 100).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-100">{K(provision)}</td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-slate-800/60 border-t-2 border-slate-700 font-semibold">
                <td className="px-4 py-3 text-slate-100">TOTAL</td>
                <td className="px-4 py-3 text-slate-100">{disbursed.length}</td>
                <td className="px-4 py-3 text-slate-100">{K(totalPortfolio)}</td>
                <td className="px-4 py-3 text-slate-400">—</td>
                <td className="px-4 py-3 text-indigo-400">{K(totalProvision)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Loan Table */}
      <div className="philix-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">Per-Loan Provision Detail ({disbursed.length} loans)</h3>
        </div>
        {disbursed.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Shield size={36} className="mx-auto mb-2 opacity-40" />
            <p>No disbursed loans in portfolio.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800">
                <tr className="text-left">
                  {["Client", "Loan Ref", "Amount", "Submitted", "Days Overdue", "PAR Band", "Provision"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loanRows.map(({ app, daysOverdue, band, provision }) => (
                  <tr key={app.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-200">{app.clientName}</td>
                    <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{app.ref}</td>
                    <td className="px-4 py-3 text-slate-200">{K(app.amount)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(app.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${daysOverdue > 30 ? "text-red-400" : daysOverdue > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {daysOverdue}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={band.badge}>{band.label}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-orange-400">{K(provision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
