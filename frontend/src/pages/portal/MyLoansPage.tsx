import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown, ChevronUp, CreditCard, CheckCircle, Clock,
  AlertCircle, Calendar, Receipt, FileText, ArrowRight
} from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import { useLoanApplicationStore } from "../../store/loanApplicationStore";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const APP_STATUS_STYLES: Record<string, string> = {
  PENDING:      "bg-amber-900/30 text-amber-400 border-amber-800/40",
  UNDER_REVIEW: "bg-blue-900/30 text-blue-400 border-blue-800/40",
  APPROVED:     "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  REJECTED:     "bg-red-900/30 text-red-400 border-red-800/40",
  DISBURSED:    "bg-indigo-900/30 text-indigo-400 border-indigo-800/40",
};

const APP_STATUS_DESC: Record<string, string> = {
  PENDING:      "Submitted — awaiting initial review by Philix Finance",
  UNDER_REVIEW: "Being reviewed by a Loan Officer",
  APPROVED:     "Approved! Funds being prepared for disbursement",
  REJECTED:     "Application was not approved at this time",
  DISBURSED:    "Funds have been disbursed to you",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  CLOSED: "bg-slate-800 text-slate-500 border-slate-700",
  OVERDUE: "bg-red-900/30 text-red-400 border-red-800/40",
  APPROVED: "bg-blue-900/30 text-blue-400 border-blue-800/40",
};

const scheduleStatusIcon = (s: string) => {
  if (s === "PAID") return <CheckCircle size={13} className="text-emerald-400" />;
  if (s === "OVERDUE") return <AlertCircle size={13} className="text-red-400" />;
  return <Clock size={13} className="text-slate-500" />;
};

// Historical/mock disbursed loans (would come from backend in production)
const mockLoans = [
  {
    id: "loan-hist-001", loanNumber: "PHX-L-2023-0015", product: "Micro Loan",
    principal: 1500, outstanding: 0, totalRepayable: 1800, interestRate: 6,
    termMonths: 2, monthsPaid: 2, disbursedAt: "2023-09-01",
    status: "CLOSED", nextPaymentDate: null, nextPaymentAmount: 0,
    payments: [
      { id: "p3", date: "2023-11-01", amount: 900, method: "Cash", reference: "RCP-20231101-001", status: "PAID" },
      { id: "p4", date: "2023-10-01", amount: 900, method: "Cash", reference: "RCP-20231001-001", status: "PAID" },
    ],
    schedule: [
      { month: 1, dueDate: "2023-10-01", amount: 900, status: "PAID" },
      { month: 2, dueDate: "2023-11-01", amount: 900, status: "PAID" },
    ],
  },
];

export default function MyLoansPage() {
  const client = useClientAuthStore(s => s.client)!;
  const allApplications = useLoanApplicationStore(s => s.applications);
  const myApplications = allApplications.filter(a => a.clientId === client.id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<Record<string, "history" | "schedule">>({});
  const getTab = (id: string) => tab[id] ?? "history";

  const activeApp = myApplications.find(a => a.status === "APPROVED" || a.status === "DISBURSED");
  const pendingCount = myApplications.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">My Loans</h1>
        <p className="text-slate-500 text-sm mt-1">Your loan applications and repayment records</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-emerald-400 mb-1">{myApplications.filter(a => a.status === "DISBURSED").length || mockLoans.filter(l => l.status === "ACTIVE").length}</div>
          <div className="text-xs text-slate-500">Active Loans</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-slate-200 mb-1">{myApplications.length}</div>
          <div className="text-xs text-slate-500">Applications Submitted</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-amber-400 mb-1">{pendingCount}</div>
          <div className="text-xs text-slate-500">Pending Review</div>
        </div>
      </div>

      {/* Live applications */}
      {myApplications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Loan Applications</h2>
          </div>
          {myApplications.map(app => (
            <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-bold text-slate-200">{app.productName}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{app.ref}</div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${APP_STATUS_STYLES[app.status] ?? ""}`}>
                  {app.status.replace("_", " ")}
                </span>
              </div>

              {/* Status progress bar */}
              <div className="flex items-center gap-1 mb-3">
                {(["PENDING", "UNDER_REVIEW", "APPROVED", "DISBURSED"] as const).map((s, i) => {
                  const steps = ["PENDING", "UNDER_REVIEW", "APPROVED", "DISBURSED"];
                  const currentIdx = app.status === "REJECTED" ? -1 : steps.indexOf(app.status);
                  const reached = i <= currentIdx;
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className={`h-1.5 w-full rounded-full transition-all ${
                        app.status === "REJECTED" ? "bg-red-900/40" :
                        reached ? "bg-indigo-500" : "bg-slate-800"
                      }`} />
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500 mb-3">{APP_STATUS_DESC[app.status]}</p>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 mb-0.5">Amount</div>
                  <div className="font-semibold text-slate-200">{K(app.amount)}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Total Repayable</div>
                  <div className="font-semibold text-emerald-400">{K(app.totalRepayable)}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5">Duration</div>
                  <div className="font-semibold text-slate-200">{app.rateDuration}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-600">
                <span>Submitted {new Date(app.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="font-medium">{app.purpose}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No applications yet */}
      {myApplications.length === 0 && mockLoans.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <CreditCard size={32} className="text-slate-700 mx-auto mb-3" />
          <div className="text-slate-400 font-semibold mb-1">No loans yet</div>
          <p className="text-slate-600 text-sm mb-4">Apply for your first loan and track it here.</p>
          <Link to="/portal/apply" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
            Apply Now <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Historical / disbursed loans */}
      {mockLoans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Loan History</h2>
          </div>
          {mockLoans.map(loan => {
            const isOpen = expanded === loan.id;
            const pct = Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100);
            const currentTab = getTab(loan.id);

            return (
              <div key={loan.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : loan.id)}
                  className="w-full text-left p-5 flex items-start gap-4 hover:bg-slate-800/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={18} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-200">{loan.product}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[loan.status] ?? statusColors.ACTIVE}`}>
                        {loan.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{loan.loanNumber}</div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <div><span className="text-slate-500 text-xs">Principal: </span><span className="text-slate-300 font-medium">{K(loan.principal)}</span></div>
                      {loan.outstanding > 0
                        ? <div><span className="text-slate-500 text-xs">Outstanding: </span><span className="text-amber-400 font-medium">{K(loan.outstanding)}</span></div>
                        : <div><span className="text-emerald-400 font-medium text-xs">Fully Repaid ✓</span></div>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-slate-600">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-800">
                    <div className="px-5 pt-4 pb-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>{loan.monthsPaid} / {loan.termMonths} payments made</span>
                        <span className="text-emerald-400 font-semibold">{pct}% repaid</span>
                      </div>
                      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="px-5 py-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      {[
                        { l: "Interest Rate", v: `${loan.interestRate}% / month` },
                        { l: "Term", v: `${loan.termMonths} months` },
                        { l: "Total Repayable", v: K(loan.totalRepayable) },
                        { l: "Disbursed", v: new Date(loan.disbursedAt).toLocaleDateString("en-GB") },
                      ].map(r => (
                        <div key={r.l} className="flex justify-between border-b border-slate-800/50 pb-1.5">
                          <span className="text-slate-500">{r.l}</span>
                          <span className="text-slate-300 font-medium">{r.v}</span>
                        </div>
                      ))}
                    </div>

                    <div className="px-5 pb-1">
                      <div className="flex border-b border-slate-800">
                        {(["history", "schedule"] as const).map(t => (
                          <button key={t} onClick={() => setTab(prev => ({ ...prev, [loan.id]: t }))}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${currentTab === t ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-600 hover:text-slate-400"}`}>
                            {t === "history" ? <Receipt size={12} /> : <Calendar size={12} />}
                            {t === "history" ? "Payment History" : "Repayment Schedule"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 pt-3 space-y-2">
                      {currentTab === "history" && (
                        <>
                          {loan.payments.length === 0
                            ? <div className="text-center text-sm text-slate-600 py-6">No payments recorded yet</div>
                            : loan.payments.map(p => (
                              <div key={p.id} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                                  <div>
                                    <div className="text-sm text-slate-300 font-medium">{K(p.amount)}</div>
                                    <div className="text-xs text-slate-600 mt-0.5">{new Date(p.date).toLocaleDateString("en-GB")} · {p.method}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">{p.status}</span>
                                  <div className="text-xs text-slate-600 mt-0.5 font-mono truncate max-w-[120px]">{p.reference}</div>
                                </div>
                              </div>
                            ))}
                        </>
                      )}

                      {currentTab === "schedule" && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-800">
                                <th className="text-left text-slate-600 font-semibold py-2 pr-4">#</th>
                                <th className="text-left text-slate-600 font-semibold py-2 pr-4">Due Date</th>
                                <th className="text-right text-slate-600 font-semibold py-2 pr-4">Amount</th>
                                <th className="text-right text-slate-600 font-semibold py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loan.schedule.map(s => (
                                <tr key={s.month} className={`border-b border-slate-800/40 ${s.status === "UPCOMING" ? "opacity-60" : ""}`}>
                                  <td className="py-2.5 pr-4 text-slate-500">{s.month}</td>
                                  <td className="py-2.5 pr-4 text-slate-300">
                                    {new Date(s.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                  </td>
                                  <td className="py-2.5 pr-4 text-right font-semibold text-slate-200">{K(s.amount)}</td>
                                  <td className="py-2.5 text-right">
                                    <span className="flex items-center gap-1 justify-end">
                                      {scheduleStatusIcon(s.status)}
                                      <span className={s.status === "PAID" ? "text-emerald-400" : s.status === "OVERDUE" ? "text-red-400" : "text-slate-500"}>
                                        {s.status === "UPCOMING" ? "Upcoming" : s.status}
                                      </span>
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Apply CTA */}
      {myApplications.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-slate-300 text-sm">Need another loan?</div>
            <div className="text-xs text-slate-600 mt-0.5">Apply for a new loan or contact support for assistance</div>
          </div>
          <Link to="/portal/apply" className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
            Apply <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
        <div className="font-semibold text-slate-300 mb-1">Need help with a loan?</div>
        <div className="text-xs text-slate-500 mb-3">Contact our support team for repayment assistance or loan restructuring</div>
        <a href="tel:+260211000000" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">📞 +260 211 XXX XXX</a>
      </div>
    </div>
  );
}
