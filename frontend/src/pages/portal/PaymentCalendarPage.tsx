import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X, Bell, RefreshCw, AlertCircle } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";

const API = "/api";
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PaymentRecord {
  id: string;
  amount: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  totalRepayable?: number;
  termMonths: number;
  interestRate?: number;
  status: string;
  createdAt: string;
  paymentSubmissions?: PaymentRecord[];
}

interface DayInfo {
  date: Date;
  dueAmount?: number;
  paid?: boolean;
  overdue?: boolean;
  loanRef?: string;
}

function getDueDates(app: LoanApp): Date[] {
  const start = new Date(app.createdAt);
  const dates: Date[] = [];
  for (let w = 1; w <= app.termMonths; w++) {
    const d = new Date(start);
    d.setDate(start.getDate() + w * 7);
    dates.push(d);
  }
  return dates;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PaymentCalendarPage() {
  const { accessToken: token } = useClientAuthStore();
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [notifGranted, setNotifGranted] = useState(Notification.permission === "granted");

  const fetchLoans = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/portal/applications`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setLoans(d.applications ?? d ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load loan data");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  async function requestNotification() {
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === "granted");
    if (perm === "granted") {
      new Notification("Philix Finance", { body: "Payment reminders are now enabled!", icon: "/favicon.ico" });
    }
  }

  // Build day map for the current view month
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build due-date lookup
  const dueDateMap: Record<string, DayInfo> = {};
  loans.filter(l => ["APPROVED", "DISBURSED"].includes(l.status)).forEach(loan => {
    const weekly = Math.ceil((loan.totalRepayable ?? loan.amountRequested * 1.2) / loan.termMonths);
    getDueDates(loan).forEach(dueDate => {
      const key = dueDate.toDateString();
      const paid = (loan.paymentSubmissions ?? []).some(p => p.status === "APPROVED" && isSameDay(new Date(p.createdAt), dueDate));
      const overdue = !paid && dueDate < new Date();
      dueDateMap[key] = { date: dueDate, dueAmount: weekly, paid, overdue, loanRef: loan.reference };
    });
  });

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  const cells: (DayInfo | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return dueDateMap[d.toDateString()] ?? { date: d };
    }),
  ];

  return (
    <div className="min-h-screen bg-[#0B1F3A] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C9A227]" /> Payment Calendar
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Your upcoming payment schedule</p>
          </div>
          <button
            onClick={requestNotification}
            disabled={notifGranted}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${notifGranted ? "bg-emerald-900/30 text-emerald-400 cursor-default" : "bg-[#C9A227] text-white hover:bg-[#b8911f]"}`}
          >
            <Bell className="w-3.5 h-3.5" /> {notifGranted ? "Reminders On" : "Set Reminder"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading calendar...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-400 gap-2 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Month Navigator */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-bold text-white">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-700">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const isToday = cell && isSameDay(cell.date, new Date());
                return (
                  <div
                    key={i}
                    onClick={() => cell?.dueAmount && setSelectedDay(cell)}
                    className={`min-h-14 border-b border-r border-slate-700/50 p-1.5 last:border-r-0 transition-colors ${cell?.dueAmount ? "cursor-pointer hover:bg-slate-700/50" : ""} ${isToday ? "bg-slate-700/30" : ""}`}
                  >
                    {cell && (
                      <>
                        <p className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-[#C9A227] text-white" : "text-slate-400"}`}>
                          {cell.date.getDate()}
                        </p>
                        {cell.dueAmount && (
                          <div className={`rounded px-1 py-0.5 text-center ${cell.paid ? "bg-emerald-900/40 text-emerald-400" : cell.overdue ? "bg-red-900/40 text-red-400" : "bg-[#C9A227]/20 text-[#C9A227]"}`}>
                            <p className="text-xs font-mono font-bold leading-tight">{K(cell.dueAmount)}</p>
                            <p className="text-[10px] opacity-70 leading-tight">{cell.paid ? "Paid" : cell.overdue ? "Overdue" : "Due"}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 px-5 py-3 border-t border-slate-700 text-xs">
              {[
                { color: "bg-[#C9A227]/20 text-[#C9A227]", label: "Payment Due" },
                { color: "bg-emerald-900/40 text-emerald-400", label: "Paid" },
                { color: "bg-red-900/40 text-red-400", label: "Overdue" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${color}`} />
                  <span className="text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Day Detail Popup */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-sm border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">{selectedDay.date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`rounded-xl p-4 mb-3 ${selectedDay.paid ? "bg-emerald-900/30 border border-emerald-800/50" : selectedDay.overdue ? "bg-red-900/30 border border-red-800/50" : "bg-[#C9A227]/10 border border-[#C9A227]/30"}`}>
              <p className="text-xs text-slate-400 mb-1">Payment Amount</p>
              <p className={`text-2xl font-bold font-mono ${selectedDay.paid ? "text-emerald-400" : selectedDay.overdue ? "text-red-400" : "text-[#C9A227]"}`}>
                {K(selectedDay.dueAmount ?? 0)}
              </p>
              <p className={`text-xs mt-1 font-medium ${selectedDay.paid ? "text-emerald-500" : selectedDay.overdue ? "text-red-500" : "text-[#C9A227]"}`}>
                {selectedDay.paid ? "PAID" : selectedDay.overdue ? "OVERDUE — Please contact us" : "DUE — Ensure payment is on time"}
              </p>
            </div>
            <p className="text-xs text-slate-400">Loan Ref: <span className="font-mono text-slate-300">{selectedDay.loanRef}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
