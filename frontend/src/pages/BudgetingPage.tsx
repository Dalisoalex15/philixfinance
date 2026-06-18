import { useState } from "react";
import { PieChart, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { mockBudgets, formatKwacha } from "../lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function BudgetingPage() {
  const [month, setMonth] = useState(6);
  const [year, setYear] = useState(2025);

  const totalBudgeted = mockBudgets.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = mockBudgets.reduce((s, b) => s + b.actual, 0);
  const variance = totalActual - totalBudgeted;

  const chartData = mockBudgets.map(b => ({
    name: b.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
    Budgeted: b.budgeted,
    Actual: b.actual,
  }));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Budget</h1>
          <p className="page-subtitle">Budget vs actual expense tracking by category</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input-base py-1.5 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <option key={m} value={i+1}>{m}</option>
            ))}
          </select>
          <input type="number" className="input-base py-1.5 text-sm w-20" value={year} onChange={e => setYear(Number(e.target.value))} />
          <button className="btn-primary text-xs py-1.5">+ Add Budget Line</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Budgeted", value: formatKwacha(totalBudgeted), color: "text-blue-400", icon: PieChart },
          { label: "Total Actual", value: formatKwacha(totalActual), color: totalActual > totalBudgeted ? "text-red-400" : "text-emerald-400", icon: TrendingUp },
          { label: "Variance", value: `${variance >= 0 ? "+" : ""}${formatKwacha(Math.abs(variance))}`, color: variance > 0 ? "text-red-400" : "text-emerald-400", icon: variance > 0 ? TrendingDown : TrendingUp },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <s.icon size={18} className={`${s.color} mb-2`} />
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="philix-card p-5">
        <h3 className="section-title mb-4">Budget vs Actual by Category</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
            <Legend />
            <Bar dataKey="Budgeted" fill="#6366f1" radius={[3,3,0,0]} />
            <Bar dataKey="Actual" fill="#f59e0b" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="philix-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Category</th><th>Budgeted</th><th>Actual</th><th>Variance</th><th>% Used</th><th>Status</th></tr>
          </thead>
          <tbody>
            {mockBudgets.map(b => {
              const v = b.actual - b.budgeted;
              const pct = b.budgeted > 0 ? Math.round((b.actual / b.budgeted) * 100) : 0;
              return (
                <tr key={b.id} className="table-row-hover">
                  <td className="font-medium text-slate-200">{b.category.replace(/_/g, " ")}</td>
                  <td className="text-slate-300">{formatKwacha(b.budgeted)}</td>
                  <td className={b.actual > b.budgeted ? "text-red-400 font-semibold" : "text-slate-300"}>{formatKwacha(b.actual)}</td>
                  <td className={v > 0 ? "text-red-400" : "text-emerald-400"}>{v > 0 ? "+" : ""}{formatKwacha(Math.abs(v))}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5" style={{ minWidth: 60 }}>
                        <div className={`h-1.5 rounded-full ${pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-8">{pct}%</span>
                    </div>
                  </td>
                  <td>
                    {pct > 100 ? <span className="badge-red text-xs">OVER</span>
                      : pct > 80 ? <span className="badge-yellow text-xs">NEAR LIMIT</span>
                      : <span className="badge-green text-xs">ON TRACK</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
