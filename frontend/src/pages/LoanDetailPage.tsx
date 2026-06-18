import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Send, DollarSign } from "lucide-react";
import { mockLoans, formatKwacha, formatDate, getStatusColor } from "../lib/mock-data";
import { useState } from "react";

export default function LoanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(mockLoans.find((l) => l.id === id));
  const [action, setAction] = useState<string | null>(null);

  if (!loan) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Loan not found</p>
        <button onClick={() => navigate("/loans")} className="btn-secondary mt-4">Back to Loans</button>
      </div>
    );
  }

  const handleApprove = () => {
    setLoan((l: any) => l ? { ...l, status: "APPROVED" } : l);
    setAction("approved");
  };
  const handleReject = () => {
    setLoan((l: any) => l ? { ...l, status: "REJECTED" } : l);
    setAction("rejected");
  };
  const handleDisburse = () => {
    setLoan((l: any) => l ? { ...l, status: "ACTIVE", disbursementDate: new Date().toISOString() } : l);
    setAction("disbursed");
  };

  const progress = loan.totalDue > 0 ? (loan.totalPaid / loan.totalDue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/loans")} className="btn-secondary py-2 px-3">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{loan.loanNumber}</h1>
            <span className={getStatusColor(loan.status)}>{loan.status.replace("_", " ")}</span>
          </div>
          <p className="page-subtitle">{loan.client.firstName} {loan.client.lastName} · {loan.loanType}</p>
        </div>
      </div>

      {action && (
        <div className="flex items-center gap-2 p-3 bg-emerald-900/20 border border-emerald-800/50 rounded-lg text-emerald-400 text-sm animate-fade-in">
          <CheckCircle size={14} />
          Loan has been {action} successfully.
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {loan.status === "PENDING_APPROVAL" && (
          <>
            <button onClick={handleApprove} className="btn-success"><CheckCircle size={14} /> Approve Loan</button>
            <button onClick={handleReject} className="btn-danger"><XCircle size={14} /> Reject</button>
          </>
        )}
        {loan.status === "APPROVED" && (
          <button onClick={handleDisburse} className="btn-primary"><Send size={14} /> Disburse Loan</button>
        )}
        {(loan.status === "ACTIVE" || loan.status === "OVERDUE") && (
          <button onClick={() => navigate("/repayments")} className="btn-success">
            <DollarSign size={14} /> Record Payment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Summary */}
        <div className="philix-card p-5">
          <h3 className="section-title mb-4">Loan Summary</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: "Principal", value: formatKwacha(loan.principal) },
              { label: "Interest Rate", value: `${loan.interestRate}% p.a.` },
              { label: "Total Due", value: formatKwacha(loan.totalDue), bold: true },
              { label: "Total Paid", value: formatKwacha(loan.totalPaid), color: "text-emerald-400" },
              { label: "Outstanding", value: formatKwacha(loan.outstandingBalance), color: "text-amber-400", bold: true },
              { label: "Installment", value: formatKwacha(loan.installmentAmount) },
              { label: "Frequency", value: loan.repaymentFrequency },
              { label: "Installments", value: `${loan._count.payments} / ${loan.totalInstallments}` },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-slate-400">{r.label}</span>
                <span className={`${r.color || "text-slate-200"} ${r.bold ? "font-bold" : "font-medium"}`}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Repayment Progress</span>
              <span className="text-slate-300">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="philix-card p-5">
          <h3 className="section-title mb-4">Timeline</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: "Application Date", value: formatDate(loan.createdAt) },
              { label: "Disbursement", value: loan.disbursementDate ? formatDate(loan.disbursementDate) : "Not disbursed" },
              { label: "First Payment", value: "—" },
              { label: "Maturity Date", value: "—" },
              { label: "Days Late", value: loan.daysLate > 0 ? `${loan.daysLate} days` : "Not overdue", color: loan.daysLate > 0 ? "text-red-400" : "text-emerald-400" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-slate-400">{r.label}</span>
                <span className={r.color || "text-slate-200"}>{r.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Collection Status</h4>
            <span className={`text-sm font-medium ${
              loan.collectionStatus === "CURRENT" ? "text-emerald-400" :
              loan.collectionStatus === "DEFAULT" ? "text-red-400" : "text-amber-400"
            }`}>
              {loan.collectionStatus?.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Collateral */}
        <div className="philix-card p-5">
          <h3 className="section-title mb-4">Collateral</h3>
          {loan.collateral ? (
            <div className="space-y-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="font-medium text-slate-200">{loan.collateral.brand} {loan.collateral.model}</div>
                <div className="text-xs text-slate-500 mt-0.5">{loan.collateral.type.replace("_", " ")}</div>
                <div className="font-mono text-xs text-indigo-400 mt-1">{loan.collateral.vaultId}</div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Market Value", value: formatKwacha(0) },
                  { label: "Forced Sale Value", value: "—" },
                  { label: "Status", value: "HELD", color: "text-emerald-400" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-slate-400">{r.label}</span>
                    <span className={r.color || "text-slate-200"}>{r.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/collateral")} className="btn-secondary w-full text-xs py-1.5">
                View in Vault
              </button>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">No collateral linked</div>
          )}
        </div>
      </div>
    </div>
  );
}
