import { useState } from "react";
import { QrCode, Printer, CheckCircle, Search, Download } from "lucide-react";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}`;

const receipts = [
  { id: "rcpt-001", paymentRef: "PAY-20260617-001", loanRef: "PHX-L-2026-0042", client: "Chanda Mwale", amount: 850, method: "Cash", date: "17 Jun 2026 08:14", officer: "Mary Chirwa", verified: true },
  { id: "rcpt-002", paymentRef: "PAY-20260617-002", loanRef: "PHX-L-2026-0038", client: "Peter Banda", amount: 1200, method: "MTN Money", date: "17 Jun 2026 07:30", officer: "James Mutale", verified: true },
  { id: "rcpt-003", paymentRef: "PAY-20260616-007", loanRef: "PHX-L-2026-0031", client: "Grace Lungu", amount: 2000, method: "Airtel Money", date: "16 Jun 2026 14:45", officer: "Mary Chirwa", verified: true },
];

function QRCodeBox({ value, size = 120 }: { value: string; size?: number }) {
  // Simple visual QR placeholder — in production use qrcode.react library
  const cells = 21;
  const cellSize = size / cells;
  const pattern = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      // finder patterns
      if ((r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7)) return true;
      // data modules - pseudo-random based on value hash
      const hash = (value.charCodeAt((r * cells + c) % value.length) + r * 13 + c * 7) % 3;
      return hash === 0;
    })
  );

  return (
    <div className="inline-block bg-white p-2 rounded-lg">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {pattern.map((row, r) =>
          row.map((cell, c) =>
            cell ? <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#000" /> : null
          )
        )}
      </svg>
    </div>
  );
}

export default function QRReceiptPage() {
  const [selected, setSelected] = useState(receipts[0]);
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
          {filtered.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full text-left philix-card p-4 transition-all hover:border-indigo-700 ${selected.id === r.id ? "border border-indigo-600" : ""}`}>
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
                <QRCodeBox value={`PHILIX:${selected.paymentRef}:${selected.loanRef}:${selected.amount}`} size={100} />
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
            <button className="btn-primary flex-1 text-xs py-2"><Download size={12} /> Download PDF</button>
          </div>
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
