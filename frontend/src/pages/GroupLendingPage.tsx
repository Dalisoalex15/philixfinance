import { useState } from "react";
import { Users, Plus, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, DollarSign, UserPlus } from "lucide-react";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}`;

interface GroupMember {
  name: string;
  clientNo: string;
  contribution: number;
  paid: boolean;
}

interface Group {
  id: string;
  name: string;
  loanRef: string;
  totalAmount: number;
  totalRepayable: number;
  status: string;
  dueDate: string;
  createdAt: string;
  members: GroupMember[];
}

const groups: Group[] = [
  {
    id: "g1", name: "UNZA Women's Savings Group", loanRef: "PHX-GRP-2026-001",
    totalAmount: 10000, totalRepayable: 12000, status: "ACTIVE", dueDate: "2026-07-17", createdAt: "2026-06-17",
    members: [
      { name: "Chanda Mwale", clientNo: "PHX-C-00042", contribution: 2500, paid: true },
      { name: "Grace Lungu", clientNo: "PHX-C-00031", contribution: 2500, paid: true },
      { name: "Mary Phiri", clientNo: "PHX-C-00019", contribution: 2500, paid: false },
      { name: "Alice Banda", clientNo: "PHX-C-00056", contribution: 2500, paid: false },
    ],
  },
  {
    id: "g2", name: "Mtendere Market Traders", loanRef: "PHX-GRP-2026-002",
    totalAmount: 15000, totalRepayable: 18000, status: "ACTIVE", dueDate: "2026-07-01", createdAt: "2026-06-01",
    members: [
      { name: "Peter Banda", clientNo: "PHX-C-00038", contribution: 5000, paid: true },
      { name: "James Mutale", clientNo: "PHX-C-00029", contribution: 5000, paid: false },
      { name: "John Tembo", clientNo: "PHX-C-00067", contribution: 5000, paid: false },
    ],
  },
  {
    id: "g3", name: "UNILUS Engineering Students", loanRef: "PHX-GRP-2025-015",
    totalAmount: 6000, totalRepayable: 7200, status: "CLOSED", dueDate: "2026-01-15", createdAt: "2025-12-15",
    members: [
      { name: "David Mwale", clientNo: "PHX-C-00012", contribution: 2000, paid: true },
      { name: "Carol Phiri", clientNo: "PHX-C-00021", contribution: 2000, paid: true },
      { name: "Bob Tembo", clientNo: "PHX-C-00033", contribution: 2000, paid: true },
    ],
  },
];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  OVERDUE: "bg-red-900/30 text-red-400 border-red-800/40",
  CLOSED: "bg-slate-800 text-slate-500 border-slate-700",
  PENDING: "bg-amber-900/30 text-amber-400 border-amber-800/40",
};

export default function GroupLendingPage() {
  const [selected, setSelected] = useState<Group>(groups[0]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const paidMembers = selected.members.filter(m => m.paid).length;
  const paidAmount = selected.members.filter(m => m.paid).reduce((s, m) => s + m.contribution, 0);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Group Lending</h1>
          <p className="page-subtitle">Joint liability groups — shared responsibility, expanded access</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-xs py-1.5">
          <Plus size={12} /> New Group
        </button>
      </div>

      {showNew && (
        <div className="philix-card p-5 space-y-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2"><UserPlus size={16} className="text-indigo-400" /> Create New Group</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Group Name</label>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="input-base" placeholder="e.g. UNZA Women's Group" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Total Loan Amount (ZMW)</label>
              <input type="number" className="input-base" placeholder="10000" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Product</label>
              <select className="input-base">
                <option>Business Working Capital Loan</option>
                <option>Student Emergency Loan</option>
                <option>Salary Advance Loan</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400 mb-1.5 block">Number of Members (2–5)</label>
              <input type="number" min={2} max={5} defaultValue={3} className="input-base" />
            </div>
          </div>
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            Joint liability: if one member defaults, the remaining members must cover the shortfall before any group member can borrow again.
          </div>
          <div className="flex gap-2">
            <button className="btn-primary text-sm">Create Group Loan</button>
            <button onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Groups", value: groups.filter(g => g.status === "ACTIVE").length, color: "emerald" },
          { label: "Total Members", value: groups.reduce((s, g) => s + g.members.length, 0), color: "indigo" },
          { label: "Total Disbursed", value: K(groups.reduce((s, g) => s + g.totalAmount, 0)), color: "blue" },
          { label: "Fully Repaid", value: groups.filter(g => g.status === "CLOSED").length, color: "slate" },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className={`text-2xl font-bold text-${k.color}-400 mb-1`}>{k.value}</div>
            <div className="text-xs text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.id}>
              <button onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected.id === g.id ? "border border-indigo-600" : ""}`}
                onFocus={() => setSelected(g)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0 text-left" onClick={() => setSelected(g)}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{g.name}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[g.status]}`}>{g.status}</span>
                    </div>
                    <div className="text-xs text-slate-500">{g.loanRef} · {g.members.length} members</div>
                  </div>
                  <div className="text-right mr-2">
                    <div className="font-bold text-slate-100">{K(g.totalAmount)}</div>
                    <div className="text-xs text-slate-500">Due {g.dueDate}</div>
                  </div>
                  {expanded === g.id ? <ChevronUp size={14} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />}
                </div>
              </button>
              {expanded === g.id && (
                <div className="mt-1 bg-slate-900/40 border border-slate-800 rounded-xl p-3 ml-4 space-y-2">
                  {g.members.map(m => (
                    <div key={m.clientNo} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {m.paid ? <CheckCircle size={12} className="text-emerald-400" /> : <AlertTriangle size={12} className="text-amber-400" />}
                        <span className="text-slate-300">{m.name}</span>
                        <span className="text-xs text-slate-600 font-mono">{m.clientNo}</span>
                      </div>
                      <span className={`text-xs font-semibold ${m.paid ? "text-emerald-400" : "text-amber-400"}`}>{K(m.contribution)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="philix-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center"><Users size={18} className="text-indigo-400" /></div>
            <div>
              <div className="font-bold text-slate-100">{selected.name}</div>
              <div className="text-xs text-slate-500">{selected.loanRef}</div>
            </div>
            <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-full border ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Loan", value: K(selected.totalAmount) },
              { label: "Total Repayable", value: K(selected.totalRepayable) },
              { label: "Due Date", value: selected.dueDate },
              { label: "Members", value: selected.members.length.toString() },
            ].map(f => (
              <div key={f.label} className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-0.5">{f.label}</div>
                <div className="font-semibold text-slate-200">{f.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Repayment Progress</span>
              <span>{paidMembers}/{selected.members.length} members paid · {K(paidAmount)} collected</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full transition-all"
                style={{ width: `${(paidMembers / selected.members.length) * 100}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 mb-2">Member Status</div>
            {selected.members.map(m => (
              <div key={m.clientNo} className="flex items-center justify-between bg-slate-800/40 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  {m.paid ? <CheckCircle size={14} className="text-emerald-400" /> : <DollarSign size={14} className="text-amber-400" />}
                  <div>
                    <div className="text-sm font-medium text-slate-200">{m.name}</div>
                    <div className="text-xs text-slate-600 font-mono">{m.clientNo}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${m.paid ? "text-emerald-400" : "text-amber-400"}`}>{K(m.contribution)}</div>
                  <div className={`text-xs ${m.paid ? "text-emerald-500" : "text-amber-500"}`}>{m.paid ? "Paid" : "Outstanding"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
