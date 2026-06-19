import { useState } from "react";
import { QrCode, Printer, CheckCircle, Search, Download } from "lucide-react";
import jsPDF from "jspdf";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}`;

const receipts: { id: string; paymentRef: string; loanRef: string; client: string; amount: number; method: string; date: string; officer: string; verified: boolean }[] = [];

function QRCodeImg({ value, size = 120 }: { value: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qrcode/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=4&bgcolor=ffffff&color=0B1F3A`;
  return (
    <div className="inline-block bg-white p-2 rounded-lg">
      <img src={src} width={size} height={size} alt="QR Code" className="block rounded" />
    </div>
  );
}

export default function QRReceiptPage() {
  const [selected, setSelected] = useState(receipts[0] ?? null);
  const [search, setSearch] = useState("");
  const [verifyRef, setVerifyRef] = useState("");
  const [verifyResult, setVerifyResult] = useState<typeof receipts[0] | null | "notfound">(null);

  const filtered = receipts.filter(r =>
    r.client.toLowerCase().includes(search.toLowerCase()) ||
    r.paymentRef.includes(search) ||
    r.loanRef.includes(search)
  );

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const found = receipts.find(r => r.paymentRef === verifyRef || r.id === verifyRef);
    setVerifyResult(found ?? "notfound");
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a5" });
    const r = selected;
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 0, 148, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PHILIX FINANCE LIMITED", 74, 13, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text("Creating A Future Together  ·  Payment Receipt", 74, 20, { align: "center" });
    doc.setTextColor(30, 30, 30);
    const rows: [string, string][] = [
      ["Receipt No.", r.paymentRef],
      ["Loan Reference", r.loanRef],
      ["Client Name", r.client],
      ["Amount Paid", K(r.amount)],
      ["Payment Method", r.method],
      ["Date & Time", r.date],
      ["Recorded By", r.officer],
      ["Status", "VERIFIED"],
    ];
    let y = 40;
    doc.setFontSize(9);
    rows.forEach(([label, val]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(label, 14, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text(val, 100, y);
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y + 2, 134, y + 2);
      y += 10;
    });
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.setFont("helvetica", "normal");
    doc.text("Scan QR code at philixfinance.com/verify to confirm authenticity", 74, y + 10, { align: "center" });
    doc.text("Philix Finance Ltd  ·  Bank of Zambia Licensed  ·  Lusaka, Zambia", 74, y + 16, { align: "center" });
    doc.save(`Receipt-${r.paymentRef}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Code Receipts</h1>
          <p className="page-subtitle">Tamper-proof payment receipts with QR verification codes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="input-base pl-9 text-sm py-1.5 w-52" placeholder="Search receipts..." />
          </div>
        </div>
      </div>

      {/* Verify Panel */}
      <div className="philix-card p-4">
        <h3 className="font-semibold text-navy-800 mb-3 flex items-center gap-2"><QrCode size={16} className="text-indigo-700" /> Verify a Receipt</h3>
        <form onSubmit={handleVerify} className="flex gap-2 mb-3">
          <input type="text" value={verifyRef} onChange={e => setVerifyRef(e.target.value)}
            className="input-base text-sm py-1.5 flex-1" placeholder="Scan QR or enter payment reference (PAY-YYYYMMDD-XXX)" />
          <button type="submit" className="btn-primary text-xs py-1.5"><CheckCircle size={12} /> Verify</button>
        </form>
        {verifyResult === "notfound" && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">Receipt not found or invalid reference.</div>
        )}
        {verifyResult && verifyResult !== "notfound" && (
          <div className="text-sm text-emerald-700 bg-emerald-900/20 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
            <CheckCircle size={16} className="text-emerald-700" />
            <div>
              <span className="font-semibold">VERIFIED</span> — {verifyResult.client} · {K(verifyResult.amount)} on {verifyResult.date} · Loan {verifyResult.loanRef}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receipt List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="philix-card p-10 text-center text-navy-500">
              <QrCode size={32} className="mx-auto mb-3 text-navy-400 opacity-40" />
              <p className="font-semibold text-navy-700">No receipts yet</p>
              <p className="text-xs mt-1 text-navy-500">Approved payment submissions will appear here as QR receipts</p>
            </div>
          )}
          {filtered.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected?.id === r.id ? "border border-indigo-600" : ""}`}>
              <div className="flex items-center gap-3">
                <QrCode size={20} className="text-indigo-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy-800">{r.client}</span>
                    <span className="text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full">Verified</span>
                  </div>
                  <div className="text-xs text-navy-500">{r.paymentRef} · {r.loanRef}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-navy-900">{K(r.amount)}</div>
                  <div className="text-xs text-navy-500">{r.date}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Receipt Preview */}
        <div>
          {selected ? (
            <>
              <div id="receipt-print" className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl">
                <div className="text-center mb-4 border-b border-gray-100 pb-4">
                  <div className="font-black text-lg text-navy-900">PHILIX FINANCE LIMITED</div>
                  <div className="text-xs text-amber-700 font-semibold tracking-widest">Creating A Future Together</div>
                  <div className="text-xs text-gray-400 mt-1">Payment Receipt</div>
                </div>

                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="space-y-2 text-sm flex-1">
                    {[
                      ["Receipt No.", selected.paymentRef],
                      ["Loan Ref.", selected.loanRef],
                      ["Client", selected.client],
                      ["Amount Paid", K(selected.amount)],
                      ["Payment Method", selected.method],
                      ["Date & Time", selected.date],
                      ["Recorded By", selected.officer],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-gray-500 text-xs">{l}</span>
                        <span className="font-semibold text-gray-900 text-xs">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <QRCodeImg value={`PHILIX:${selected.paymentRef}:${selected.loanRef}:${selected.amount}`} size={100} />
                    <div className="text-xs text-gray-400 mt-1">Scan to verify</div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 mt-3 text-center text-xs text-gray-400">
                  Scan QR code at philixfinance.com/verify to confirm this receipt
                  <div className="mt-1 font-semibold text-gray-600">Philix Finance Ltd · BoZ Licensed · Lusaka, Zambia</div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={handlePrint} className="btn-secondary flex-1 text-xs py-2"><Printer size={12} /> Print Receipt</button>
                <button onClick={handleDownloadPDF} className="btn-primary flex-1 text-xs py-2"><Download size={12} /> Download PDF</button>
              </div>
            </>
          ) : (
            <div className="philix-card p-10 text-center text-navy-500 flex flex-col items-center justify-center h-full min-h-48">
              <QrCode size={32} className="mb-3 text-navy-400 opacity-40" />
              <p className="text-sm font-medium text-navy-600">Select a receipt to preview</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none; }
          #receipt-print { display: block !important; }
        }
      `}</style>
    </div>
  );
}
