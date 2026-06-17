import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, CreditCard, TrendingUp, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { mockLoans, mockKPIs, formatKwacha, formatDate, getStatusColor } from "../lib/mock-data";
import { useLoanApplicationStore, type LoanApplication } from "../store/loanApplicationStore";

const STATUSES = ["ALL", "ACTIVE", "OVERDUE", "DEFAULTED", "PAID", "PENDING_APPROVAL", "PORTAL"];

function portalStatusToLoanStatus(s: string): string {
  if (s === "PENDING") return "PENDING_APPROVAL";
  if (s === "UNDER_REVIEW") return "PENDING_APPROVAL";
  if (s === "APPROVED") return "APPROVED";
  if (s === "DISBURSED") return "ACTIVE";
  if (s === "REJECTED") return "REJECTED";
  return s;
}

export default function LoansPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { applications: portalApps, syncFromApi } = useLoanApplicationStore();

  useEffect(() => { syncFromApi(); }, []);

  // Build a unified row list — mock loans + portal applications
  type Row = {
    _type: "mock" | "portal";
    id: string;
    loanNumber: string;
    clientName: string;
    clientPhone: string;
    collateral: string;
    principal: number;
    totalDue: number;
    totalPaid: number;
    outstanding: number;
    installment: number;
    daysLate: number;
    status: string;
    disbursedAt: string | null;
    portalApp?: LoanApplication;
  };

  const mockRows: Row[] = mockLoans.map(l => ({
    _type: "mock",
    id: l.id,
    loanNumber: l.loanNumber,
    clientName: `${l.client.firstName} ${l.client.lastName}`,
    clientPhone: l.client.phone,
    collateral: [l.collateral?.brand, l.collateral?.model].filter(Boolean).join(" ") || "—",
    principal: l.principal,
    totalDue: l.totalDue,
    totalPaid: l.totalPaid,
    outstanding: l.outstandingBalance,
    installment: l.installmentAmount,
    daysLate: l.daysLate,
    status: l.status,
    disbursedAt: l.disbursementDate ?? null,
  }));

  const portalRows: Row[] = portalApps.map(a => ({
    _type: "portal",
    id: a.id,
    loanNumber: a.ref,
    clientName: a.clientName,
    clientPhone: a.clientPhone,
    collateral: a.collateralType
      ? [a.collateralType, a.collateralDescription].filter(Boolean).join(" · ")
      : "—",
    principal: a.amount,
    totalDue: a.totalRepayable || a.amount,
    totalPaid: 0,
    outstanding: a.amount,
    installment: a.weeklyPayment || 0,
    daysLate: 0,
    status: portalStatusToLoanStatus(a.status),
    disbursedAt: a.status === "DISBURSED" ? a.reviewedAt ?? null : null,
    portalApp: a,
  }));

  const allRows = [...mockRows, ...portalRows];

  const filtered = allRows.filter(r => {
    const matchSearch = search === "" ||
      r.loanNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.clientName.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "PORTAL") return r._type === "portal";
    return r.status === statusFilter;
  });

  const pendingPortal = portalApps.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">Loan origination, monitoring, and lifecycle management</p>
        </div>
        <button onClick={() => navigate("/loans/new")} className="btn-primary">
          <Plus size={16} />
          New Loan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Loans", value: mockKPIs.activeLoans, icon: CreditCard, color: "indigo" },
          { label: "Total Outstanding", value: formatKwacha(mockKPIs.totalOutstanding), icon: TrendingUp, color: "blue" },
          { label: "Overdue", value: mockKPIs.overdueLoans, icon: AlertTriangle, color: "amber" },
          { label: "Portal Pending", value: pendingPortal, icon: Clock, color: "emerald" },
        ].map((s) => (
          <div key={s.label} className="philix-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${s.color}-600/20 text-${s.color}-400`}>
              <s.icon size={18} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="philix-card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input-base pl-9"
              placeholder="Search by reference, loan number or client name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {s === "ALL" ? "All" : s === "PORTAL" ? "Portal Applications" : s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="philix-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ref / Loan #</th>
                <th>Client</th>
                <th>Product / Collateral</th>
                <th>Principal</th>
                <th>Total Due</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Installment</th>
                <th>Days Late</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="table-row-hover cursor-pointer"
                  onClick={() => {
                    if (row._type === "mock") {
                      navigate(`/loans/${row.id}`);
                    } else {
                      navigate("/online-applications");
                    }
                  }}
                >
                  <td>
                    <div className="font-mono text-xs text-indigo-400">{row.loanNumber}</div>
                    {row._type === "portal" && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Portal</span>
                        <ExternalLink size={10} className="text-slate-600" />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-medium text-slate-200">{row.clientName}</div>
                    <div className="text-xs text-slate-500">{row.clientPhone}</div>
                  </td>
                  <td>
                    {row._type === "portal" && row.portalApp ? (
                      <>
                        <div className="text-xs text-slate-300 font-medium">{row.portalApp.productName}</div>
                        <div className="text-xs text-slate-500">{row.collateral}</div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-300">{row.collateral}</div>
                    )}
                  </td>
                  <td className="font-medium">{formatKwacha(row.principal)}</td>
                  <td>{formatKwacha(row.totalDue)}</td>
                  <td className="text-emerald-400">{formatKwacha(row.totalPaid)}</td>
                  <td className="font-medium text-amber-400">{formatKwacha(row.outstanding)}</td>
                  <td>{row.installment ? formatKwacha(row.installment) : "—"}</td>
                  <td>
                    {row.daysLate > 0 ? (
                      <span className={`font-medium ${row.daysLate > 30 ? "text-red-400" : "text-amber-400"}`}>
                        {row.daysLate}d
                      </span>
                    ) : (
                      <span className="text-emerald-400">—</span>
                    )}
                  </td>
                  <td>
                    <span className={getStatusColor(row.status)}>{row.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="text-slate-500 text-xs">
                    {row.disbursedAt ? formatDate(row.disbursedAt) : row._type === "portal" ? formatDate(row.portalApp!.submittedAt) : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-500 text-sm">No loans match the current filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          Showing {filtered.length} entries · {mockRows.length} staff loans · {portalRows.length} portal applications
        </div>
      </div>
    </div>
  );
}
