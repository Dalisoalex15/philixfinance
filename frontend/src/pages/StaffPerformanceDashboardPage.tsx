import { useState, useEffect, useCallback } from "react";
import { BarChart2, RefreshCw, AlertCircle, TrendingUp, Users, DollarSign, Percent, MapPin } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from "recharts";

const API = "/api";
function getToken() { return localStorage.getItem("philix-auth-v3") ?? ""; }
function authH() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface Officer {
  userId: string;
  name: string;
  role: string;
  loansActual?: number;
  disbursementActual?: number;
  collectionActual?: number;
  collectionPct?: number;
}

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  status: string;
  submittedAt: string;
  officerName?: string;
  assignedOfficer?: { userId: string; name: string };
}

const PERIODS = [
  { key: "week",       label: "This Week" },
  { key: "month",      label: "This Month" },
  { key: "last_month", label: "Last Month" },
];

function getMonthStr(period: string) {
  const now = new Date();
  if (period === "last_month") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.toISOString().slice(0, 7);
  }
  return now.toISOString().slice(0, 7);
}

function generateChartData(loans: LoanApp[]) {
  const map: Record<string, number> = {};
  loans.forEach(l => {
    const day = l.submittedAt?.slice(0, 10) ?? "unknown";
    map[day] = (map[day] ?? 0) + l.amountRequested;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, amount]) => ({ date: date.slice(5), amount }));
}

export default function StaffPerformanceDashboardPage() {
  const [period, setPeriod] = useState("month");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState<string>("ALL");
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const month = getMonthStr(period);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [lr, or] = await Promise.allSettled([
        fetch(`${API}/admin/applications?limit=500`, { headers: authH() }),
        fetch(`${API}/dashboard/leaderboard?month=${month}`, { headers: authH() }),
      ]);
      if (lr.status === "fulfilled" && lr.value.ok) {
        const d = await lr.value.json();
        setLoans(d.applications ?? d.data ?? d ?? []);
      }
      if (or.status === "fulfilled" && or.value.ok) {
        const d = await or.value.json();
        setOfficers(d.officers ?? d.leaderboard ?? []);
      } else {
        // Fallback to targets endpoint
        const tr = await fetch(`${API}/admin/targets?month=${month}`, { headers: authH() });
        if (tr.ok) { const d = await tr.json(); setOfficers(d.officers ?? []); }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredLoans = selectedOfficer === "ALL"
    ? loans
    : loans.filter(l => l.assignedOfficer?.userId === selectedOfficer || l.officerName === selectedOfficer);

  const selectedOfficerData = officers.find(o => o.userId === selectedOfficer);

  const kpis = [
    { label: "Loans Issued", value: selectedOfficer === "ALL" ? loans.length : (selectedOfficerData?.loansActual ?? filteredLoans.length), icon: <TrendingUp className="w-5 h-5" />, mono: false, suffix: "" },
    { label: "Amount Disbursed", value: selectedOfficer === "ALL" ? K(loans.filter(l => ["DISBURSED", "APPROVED"].includes(l.status)).reduce((s, l) => s + l.amountRequested, 0)) : K(selectedOfficerData?.disbursementActual ?? 0), icon: <DollarSign className="w-5 h-5" />, mono: true, suffix: "" },
    { label: "Collections", value: selectedOfficer === "ALL" ? K(officers.reduce((s, o) => s + (o.collectionActual ?? 0), 0)) : K(selectedOfficerData?.collectionActual ?? 0), icon: <Percent className="w-5 h-5" />, mono: true, suffix: "" },
    { label: "Collection Rate", value: `${Math.round(selectedOfficer === "ALL" ? (officers.reduce((s, o) => s + (o.collectionPct ?? 0), 0) / Math.max(1, officers.length)) : (selectedOfficerData?.collectionPct ?? 0))}%`, icon: <BarChart2 className="w-5 h-5" />, mono: true, suffix: "" },
    { label: "Client Visits", value: JSON.parse(localStorage.getItem("philix_visits") ?? "[]").filter((v: { officer: string; status: string }) => (selectedOfficer === "ALL" || v.officer === selectedOfficerData?.name) && v.status === "COMPLETED").length, icon: <MapPin className="w-5 h-5" />, mono: false, suffix: "" },
  ];

  const chartData = generateChartData(filteredLoans);

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-[#C9A227]" />
              Staff Performance Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">Comprehensive performance overview by officer and period</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-white hover:bg-[#b8911f] text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Period selector */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p.key ? "bg-[#0B1F3A] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Officer selector */}
          <select
            value={selectedOfficer}
            onChange={e => setSelectedOfficer(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
          >
            <option value="ALL">All Officers</option>
            {officers.map(o => <option key={o.userId} value={o.userId}>{o.name}</option>)}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-[#C9A227]">{kpi.icon}</div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{kpi.label}</p>
              <p className={`text-xl font-bold text-[#0B1F3A] ${kpi.mono ? "font-mono" : ""}`}>{loading ? "—" : String(kpi.value)}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h2 className="font-bold text-[#0B1F3A] mb-4 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C9A227]" />
            Daily Disbursements — {PERIODS.find(p => p.key === period)?.label}
          </h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading chart...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300 flex-col gap-2">
              <BarChart2 className="w-8 h-8" />
              <p className="text-sm">No disbursement data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `K${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [K(value), "Disbursed"]} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#C9A227" strokeWidth={2} dot={{ r: 3 }} name="Amount Disbursed" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Officers Bar Chart */}
        {officers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
            <h2 className="font-bold text-[#0B1F3A] mb-4 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C9A227]" /> Officer Collection Rates
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={officers.map(o => ({ name: o.name.split(" ")[0], rate: o.collectionPct ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Collection Rate"]} />
                <Bar dataKey="rate" fill="#C9A227" radius={[4, 4, 0, 0]} name="Collection Rate" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Loans Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-[#0B1F3A] text-sm">Loans — {selectedOfficer === "ALL" ? "All Officers" : officers.find(o => o.userId === selectedOfficer)?.name ?? "Unknown"}</h2>
            <span className="text-xs text-slate-400">{filteredLoans.length} loans</span>
          </div>
          <div className="overflow-x-auto max-h-80">
            {loading ? (
              <div className="h-32 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading...
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No loans in this period</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {["Ref", "Product", "Amount", "Status", "Date"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((loan, i) => (
                    <tr key={loan.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#0B1F3A]">{loan.reference}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{loan.productType}</td>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[#0B1F3A]">{K(loan.amountRequested)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${loan.status === "DISBURSED" ? "bg-indigo-100 text-indigo-700" : loan.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{loan.submittedAt?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
