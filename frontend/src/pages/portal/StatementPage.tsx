import { useState, useEffect, useCallback } from "react";
import { Download, FileText, RefreshCw, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import jsPDF from "jspdf";

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  totalRepayable?: number;
  termMonths: number;
  purpose: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  interestRate?: number;
  weeklyPayment?: number;
}

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED:    "bg-amber-900/30 text-amber-400 border-amber-800/40",
  UNDER_REVIEW: "bg-blue-900/30 text-blue-400 border-blue-800/40",
  APPROVED:     "bg-emerald-900/30 text-emerald-400 border-emerald-800/40",
  REJECTED:     "bg-red-900/30 text-red-400 border-red-800/40",
  DISBURSED:    "bg-indigo-900/30 text-indigo-400 border-indigo-800/40",
};

export default function StatementPage() {
  const client = useClientAuthStore(s => s.client);
  const token = useClientAuthStore(s => s.accessToken);
  const [apps, setApps] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/portal/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setApps(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const totalBorrowed = apps.filter(a => a.status === "DISBURSED").reduce((s, a) => s + a.amountRequested, 0);
  const totalRepayable = apps.filter(a => a.status === "DISBURSED").reduce((s, a) => s + (a.totalRepayable ?? a.amountRequested), 0);
  const activeCount = apps.filter(a => ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED"].includes(a.status)).length;

  function downloadPDF() {
    if (!client) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210;
      let y = 20;

      // Header bar
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.rect(0, 0, W, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("PHILIX FINANCE", 14, 14);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Account Statement", 14, 21);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, W - 14, 21, { align: "right" });

      y = 44;
      // Client info box
      doc.setFillColor(30, 41, 59); // slate-800
      doc.setDrawColor(71, 85, 105);
      doc.roundedRect(14, y, W - 28, 28, 3, 3, "FD");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.text("ACCOUNT HOLDER", 20, y + 7);
      doc.setTextColor(226, 232, 240); // slate-200
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${client.firstName} ${client.lastName}`, 20, y + 14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(client.email, 20, y + 20);
      doc.text(`Client No: ${client.clientNumber}`, W - 20, y + 14, { align: "right" });
      doc.text(`Status: ${client.status}`, W - 20, y + 20, { align: "right" });

      y += 36;
      // Summary row
      const boxes: [string, string][] = [
        ["Total Loans", apps.length.toString()],
        ["Disbursed", apps.filter(a => a.status === "DISBURSED").length.toString()],
        ["Total Borrowed", K(totalBorrowed)],
        ["Total Repayable", K(totalRepayable)],
      ];
      const bw = (W - 28 - 9) / 4;
      boxes.forEach(([label, val], i) => {
        const x = 14 + i * (bw + 3);
        doc.setFillColor(15, 23, 42);
        doc.setDrawColor(51, 65, 85);
        doc.roundedRect(x, y, bw, 18, 2, 2, "FD");
        doc.setTextColor(99, 102, 241);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(val, x + bw / 2, y + 9, { align: "center" });
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + bw / 2, y + 14, { align: "center" });
      });

      y += 26;
      // Table header
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, W - 28, 8, "F");
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      const cols = [14, 46, 86, 116, 146, 172, 195];
      ["Reference", "Product", "Amount", "Repayable", "Term", "Status", "Date"].forEach((h, i) => {
        doc.text(h, cols[i], y + 5.5);
      });

      y += 10;
      doc.setFont("helvetica", "normal");
      apps.forEach((a, idx) => {
        if (y > 265) { doc.addPage(); y = 20; }
        const bg = idx % 2 === 0 ? [15, 23, 42] : [20, 30, 50];
        doc.setFillColor(...(bg as [number, number, number]));
        doc.rect(14, y - 3, W - 28, 8, "F");
        doc.setTextColor(226, 232, 240);
        doc.setFontSize(7.5);
        doc.text(a.reference ?? a.id.slice(0, 10), cols[0], y + 2);
        doc.text(a.productType ?? "—", cols[1], y + 2);
        doc.text(K(a.amountRequested), cols[2], y + 2);
        doc.text(K(a.totalRepayable ?? a.amountRequested), cols[3], y + 2);
        doc.text(`${a.termMonths}W`, cols[4], y + 2);
        doc.setTextColor(a.status === "DISBURSED" ? 99 : a.status === "REJECTED" ? 239 : 148,
                         a.status === "DISBURSED" ? 102 : a.status === "REJECTED" ? 68 : 163,
                         a.status === "DISBURSED" ? 241 : a.status === "REJECTED" ? 68 : 184);
        doc.text(a.status, cols[5], y + 2);
        doc.setTextColor(100, 116, 139);
        doc.text(a.createdAt ? fmtDate(a.createdAt) : "—", cols[6], y + 2);
        y += 8;
      });

      // Footer
      y = 282;
      doc.setFillColor(15, 23, 42);
      doc.rect(0, y - 4, W, 20, "F");
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      doc.text("This statement is computer-generated and is an official record of your account with Philix Finance.", W / 2, y + 2, { align: "center" });
      doc.text(`Philix Finance · Lusaka, Zambia · support@philixfinance.com`, W / 2, y + 7, { align: "center" });

      doc.save(`PhilixFinance-Statement-${client.clientNumber}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Account Statement</h1>
          <p className="text-slate-500 text-sm mt-1">Your complete loan history and account summary</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-700 text-slate-500 hover:text-slate-300 transition-all">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={downloadPDF} disabled={generating || apps.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
            <Download size={14} />
            {generating ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Account summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: FileText, label: "Total Applications", value: apps.length, color: "indigo" },
          { icon: TrendingUp, label: "Total Borrowed", value: K(totalBorrowed), color: "blue" },
          { icon: CheckCircle, label: "Active", value: activeCount, color: "emerald" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${s.color}-600/20 text-${s.color}-400 flex-shrink-0`}>
              <s.icon size={16} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-100">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Applications table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <Calendar size={14} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">Loan History</h3>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-600">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-50" />
            Loading your statement…
          </div>
        ) : apps.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p>No loan history yet</p>
            <p className="text-xs mt-1">Your loan applications will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {apps.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-indigo-400 font-medium">{a.reference}</div>
                    <div className="text-sm font-semibold text-slate-200 truncate">{a.productType}</div>
                    <div className="text-xs text-slate-500">{a.purpose}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <div className="font-bold text-slate-100">{K(a.amountRequested)}</div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[a.status] ?? STATUS_STYLE.SUBMITTED}`}>
                    {a.status.replace("_", " ")}
                  </span>
                  <div className="text-xs text-slate-600">{fmtDate(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {apps.length > 0 && (
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between text-xs text-slate-500">
            <span>{apps.length} record{apps.length !== 1 ? "s" : ""}</span>
            <span>Statement as of {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-700">
        This is an official record of your Philix Finance account.
        Download a PDF copy for your records.
      </p>
    </div>
  );
}
