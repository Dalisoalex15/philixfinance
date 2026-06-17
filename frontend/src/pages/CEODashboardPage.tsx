import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell,
} from "recharts";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle, Users,
  Zap, ArrowUpRight, Crown,
} from "lucide-react";
import {
  mockKPIs, mockCapitalUtilization, mockPAR, mockTopOfficers,
  mockCampusPerformance,
  mockRepaymentTrend, mockMonthlyDisbursements, formatKwacha,
} from "../lib/mock-data";

const profitData = mockMonthlyDisbursements.map((m, i) => ({
  month: m.month.split(" ")[0],
  revenue: m.amount * 0.18,
  expenses: m.amount * 0.04 + 57000,
  profit: m.amount * 0.14 - 57000,
}));

export default function CEODashboardPage() {
  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  const monthlyInterest = mockMonthlyDisbursements[11].amount * 0.18;
  const monthlyExpenses = 58820;
  const netProfit = monthlyInterest - monthlyExpenses;

  return (
    <div className="space-y-6">
      {/* CEO Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown size={18} className="text-gold-500" />
            <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">CEO Dashboard</span>
          </div>
          <h1 className="page-title text-3xl">{greeting}, Daliso.</h1>
          <p className="text-navy-600 mt-1">
            Here's how Philix Finance is performing right now —{" "}
            <span className="text-emerald-600 font-medium">
              {today.toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-4xl font-bold font-mono text-navy-900">
            {today.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-xs text-navy-600 mt-1">CAT (Central Africa Time)</div>
        </div>
      </div>

      {/* Critical KPIs — "In 30 seconds" */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Collections", value: formatKwacha(24500), sub: "From 12 payments",
            icon: DollarSign, color: "emerald", change: "+K3,200 vs yesterday",
          },
          {
            label: "Outstanding Balance", value: formatKwacha(mockKPIs.totalOutstanding), sub: "Across 287 active loans",
            icon: TrendingUp, color: "indigo", change: `${mockKPIs.activeLoans} loans active`,
          },
          {
            label: "Default Rate", value: `${mockKPIs.defaultRate}%`, sub: "Industry avg: 5.0%",
            icon: AlertTriangle, color: mockKPIs.defaultRate < 5 ? "emerald" : "amber",
            change: `${mockKPIs.defaultedLoans} defaulted loans`,
          },
          {
            label: "Capital Utilization", value: `${mockCapitalUtilization.utilizationPct}%`, sub: formatKwacha(mockCapitalUtilization.availableCapital) + " free",
            icon: Zap, color: "indigo", change: `${formatKwacha(mockCapitalUtilization.capitalLoaned)} deployed`,
          },
        ].map((card) => (
          <div key={card.label} className="philix-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${
                card.color === "emerald" ? "bg-emerald-100 text-emerald-700" :
                card.color === "amber" ? "bg-amber-100 text-amber-700" :
                "bg-navy-100 text-navy-700"
              }`}>
                <card.icon size={18} />
              </div>
              <ArrowUpRight size={14} className="text-navy-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-navy-900">{card.value}</div>
            <div className="text-xs text-navy-600 mt-1 font-medium">{card.label}</div>
            <div className="text-xs text-navy-600 mt-0.5">{card.sub}</div>
            <div className="text-xs text-emerald-600 mt-2 font-medium">{card.change}</div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "Interest Revenue This Month", value: formatKwacha(monthlyInterest), color: "text-emerald-700", detail: "18% avg. interest rate" },
          { label: "Operating Expenses", value: formatKwacha(monthlyExpenses), color: "text-red-600", detail: "Salaries, rent, utilities" },
          { label: "Net Profit This Month", value: formatKwacha(netProfit), color: "text-navy-900", detail: `${((netProfit / monthlyInterest) * 100).toFixed(1)}% profit margin` },
        ].map((f) => (
          <div key={f.label} className="philix-card p-5 flex items-center gap-4">
            <div className="flex-1">
              <div className={`text-2xl font-bold font-mono ${f.color}`}>{f.value}</div>
              <div className="text-sm font-medium text-navy-700 mt-1">{f.label}</div>
              <div className="text-xs text-navy-600 mt-0.5">{f.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Profit Trend + Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Monthly P&L</h3>
            <p className="text-xs text-navy-600">Revenue, expenses & net profit trend</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={profitData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A227" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d0" />
              <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `K${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatKwacha(v)} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#059669" fill="url(#revGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#C9A227" fill="url(#profGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* PAR Gauge */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Portfolio at Risk (PAR)</h3>
            <p className="text-xs text-navy-600">CGAP microfinance health indicators</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {mockPAR.map((p) => (
              <div key={p.days} className="text-center p-3 bg-warm-50 border border-warm-200 rounded-xl">
                <div className={`text-2xl font-bold font-mono ${
                  p.percentage > 15 ? "text-red-600" : p.percentage > 8 ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {p.percentage}%
                </div>
                <div className="text-xs font-semibold text-navy-600 mt-1">PAR {p.days}+</div>
                <div className="text-xs text-navy-600">{p.count} loans</div>
                <div className="text-xs font-mono text-navy-500 mt-1">{formatKwacha(p.amount)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-warm-200">
            <div className="text-xs text-navy-500 font-medium mb-2">Risk Classification Guide</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "Healthy", range: "< 5%", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Watch", range: "5–10%", color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Critical", range: "> 10%", color: "text-red-600", bg: "bg-red-50" },
              ].map((g) => (
                <div key={g.label} className={`text-center p-2 rounded-lg ${g.bg}`}>
                  <div className={`font-bold ${g.color}`}>{g.range}</div>
                  <div className="text-navy-600">{g.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Collectors + Projected */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Collectors */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Top Collectors — This Month</h3>
            <p className="text-xs text-navy-600">Collection performance leaderboard</p>
          </div>
          <div className="space-y-4">
            {mockTopOfficers.map((officer, i) => (
              <div key={officer.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i === 0 ? "bg-gold-500 text-navy-950" :
                  i === 1 ? "bg-warm-300 text-navy-700" :
                  i === 2 ? "bg-orange-100 text-orange-700" : "bg-warm-100 text-navy-600"
                }`}>
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-navy-800">{officer.name}</span>
                    <span className="text-sm font-bold text-emerald-700">{formatKwacha(officer.totalCollected)}</span>
                  </div>
                  <div className="h-1.5 bg-warm-200 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${officer.collectionRate}%`,
                        backgroundColor: i === 0 ? "#C9A227" : i === 1 ? "#94a3b8" : "#0B1F3A",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-navy-600 mt-0.5">
                    <span>{officer.loansIssued} loans</span>
                    <span>{officer.collectionRate}% rate</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projected Numbers */}
        <div className="philix-card p-5">
          <div className="mb-4">
            <h3 className="section-title">Projected Metrics</h3>
            <p className="text-xs text-navy-600">Based on current trajectory</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Expected Collections This Month", value: formatKwacha(mockKPIs.totalCollected * 0.28), sub: "Based on active schedules", color: "text-emerald-700" },
              { label: "Projected Month-End Outstanding", value: formatKwacha(mockKPIs.totalOutstanding - mockKPIs.totalCollected * 0.15), sub: "After expected repayments", color: "text-navy-700" },
              { label: "Projected Monthly Profit", value: formatKwacha(netProfit * 1.08), sub: "+8% vs last month trajectory", color: "text-emerald-700" },
              { label: "Capital Available for New Loans", value: formatKwacha(mockCapitalUtilization.availableCapital + mockKPIs.totalCollected * 0.15), sub: "Current + projected collections", color: "text-gold-700" },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between p-3 bg-warm-50 border border-warm-200 rounded-lg">
                <div>
                  <div className="text-xs text-navy-600 font-medium">{p.label}</div>
                  <div className="text-xs text-navy-600 mt-0.5">{p.sub}</div>
                </div>
                <div className={`text-base font-bold font-mono ${p.color} ml-4 flex-shrink-0`}>{p.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campus Performance Breakdown (§5.8) */}
      <div className="philix-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="section-title">Campus Performance</h3>
            <p className="text-xs text-navy-600">Portfolio breakdown by university campus — UNZA · CBU · UNILUS</p>
          </div>
          <span className="text-xs bg-gold-100 text-gold-800 border border-gold-300 px-2.5 py-1 rounded-full font-semibold">§5.8 Report</span>
        </div>

        {/* Summary totals */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Campus Clients", value: mockCampusPerformance.reduce((s, c) => s + c.clients, 0).toString() },
            { label: "Total Disbursed", value: formatKwacha(mockCampusPerformance.reduce((s, c) => s + c.totalDisbursed, 0)) },
            { label: "Avg. Collection Rate", value: `${(mockCampusPerformance.reduce((s, c) => s + c.collectionRate, 0) / mockCampusPerformance.length).toFixed(1)}%` },
          ].map(t => (
            <div key={t.label} className="text-center p-3 bg-navy-900 rounded-xl">
              <div className="text-lg font-bold font-mono text-gold-400">{t.value}</div>
              <div className="text-xs text-navy-500 mt-0.5">{t.label}</div>
            </div>
          ))}
        </div>

        {/* Campus cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {mockCampusPerformance.map((campus, i) => (
            <div key={campus.campus} className={`rounded-xl border p-4 ${
              i === 0 ? "border-gold-300 bg-gold-50" : "border-warm-200 bg-white"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-gold-500 text-navy-950" : "bg-navy-900 text-gold-400"
                  }`}>
                    {campus.campus.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-navy-900 text-sm" style={{ fontFamily: "Fraunces, serif" }}>{campus.campus}</div>
                    <div className="text-[10px] text-navy-600">{campus.clients} clients · {campus.activeLoans} active</div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  campus.par30 < 5 ? "bg-emerald-100 text-emerald-700" :
                  campus.par30 < 8 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}>
                  PAR30: {campus.par30}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Disbursed</span>
                  <span className="font-mono font-semibold text-navy-800">{formatKwacha(campus.totalDisbursed)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Outstanding</span>
                  <span className="font-mono font-semibold text-navy-800">{formatKwacha(campus.totalOutstanding)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Collected</span>
                  <span className="font-mono font-semibold text-emerald-700">{formatKwacha(campus.totalCollected)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-600">Overdue Loans</span>
                  <span className={`font-semibold ${campus.overdueLoans > 10 ? "text-red-600" : "text-amber-600"}`}>{campus.overdueLoans}</span>
                </div>
              </div>
              {/* Collection rate bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-navy-600 mb-1">
                  <span>Collection Rate</span>
                  <span className="font-semibold text-navy-700">{campus.collectionRate}%</span>
                </div>
                <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${campus.collectionRate}%`,
                      backgroundColor: campus.collectionRate >= 92 ? "#059669" : campus.collectionRate >= 88 ? "#C9A227" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto border border-warm-200 rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-navy-900 text-navy-200">
                <th className="text-left px-4 py-3 font-semibold">Campus</th>
                <th className="text-right px-4 py-3 font-semibold">Clients</th>
                <th className="text-right px-4 py-3 font-semibold">Active Loans</th>
                <th className="text-right px-4 py-3 font-semibold">Disbursed</th>
                <th className="text-right px-4 py-3 font-semibold">Outstanding</th>
                <th className="text-right px-4 py-3 font-semibold">Collection %</th>
                <th className="text-right px-4 py-3 font-semibold">PAR &gt;30</th>
                <th className="text-right px-4 py-3 font-semibold">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {mockCampusPerformance.map((c) => (
                <tr key={c.campus} className="hover:bg-warm-50">
                  <td className="px-4 py-3 font-bold text-navy-900" style={{ fontFamily: "Fraunces, serif" }}>{c.campus}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-700">{c.clients}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-700">{c.activeLoans}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-800">{formatKwacha(c.totalDisbursed)}</td>
                  <td className="px-4 py-3 text-right font-mono text-navy-800">{formatKwacha(c.totalOutstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold font-mono ${
                      c.collectionRate >= 92 ? "text-emerald-700" : c.collectionRate >= 88 ? "text-amber-700" : "text-red-700"
                    }`}>{c.collectionRate}%</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold font-mono ${
                      c.par30 < 5 ? "text-emerald-700" : c.par30 < 8 ? "text-amber-700" : "text-red-700"
                    }`}>{c.par30}%</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">{c.overdueLoans}</td>
                </tr>
              ))}
              <tr className="bg-warm-50 border-t-2 border-warm-300">
                <td className="px-4 py-3 font-bold text-navy-900">Total</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{mockCampusPerformance.reduce((s, c) => s + c.clients, 0)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{mockCampusPerformance.reduce((s, c) => s + c.activeLoans, 0)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{formatKwacha(mockCampusPerformance.reduce((s, c) => s + c.totalDisbursed, 0))}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">{formatKwacha(mockCampusPerformance.reduce((s, c) => s + c.totalOutstanding, 0))}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">
                  {(mockCampusPerformance.reduce((s, c) => s + c.collectionRate, 0) / mockCampusPerformance.length).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-navy-900">
                  {(mockCampusPerformance.reduce((s, c) => s + c.par30, 0) / mockCampusPerformance.length).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-red-700">{mockCampusPerformance.reduce((s, c) => s + c.overdueLoans, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PAR >30 Alert Banner (CGAP standard) */}
      {(() => {
        const par30 = mockPAR.find(p => p.days === 30);
        if (!par30) return null;
        const isCritical = par30.percentage > 10;
        return (
          <div className={`rounded-xl border p-4 flex items-start gap-4 ${
            isCritical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
          }`}>
            <AlertTriangle size={20} className={isCritical ? "text-red-500 flex-shrink-0 mt-0.5" : "text-amber-500 flex-shrink-0 mt-0.5"} />
            <div className="flex-1">
              <div className={`font-bold text-sm ${isCritical ? "text-red-800" : "text-amber-800"}`} style={{ fontFamily: "Fraunces, serif" }}>
                PAR &gt;30 Days: {par30.percentage}% — {isCritical ? "Critical Risk Level" : "Watch Zone"} (CGAP Standard)
              </div>
              <div className={`text-xs mt-1 ${isCritical ? "text-red-600" : "text-amber-600"}`}>
                {par30.count} loans totalling {formatKwacha(par30.amount)} are overdue by more than 30 days.{" "}
                {isCritical
                  ? "Immediate action required — escalate to recovery team."
                  : "Monitor closely and initiate proactive follow-up with loan officers."}
              </div>
            </div>
            <div className={`text-3xl font-bold font-mono ${isCritical ? "text-red-700" : "text-amber-700"}`}>
              {par30.percentage}%
            </div>
          </div>
        );
      })()}
    </div>
  );
}
