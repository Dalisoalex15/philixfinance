import { useState, useRef } from "react";
import { Upload, Download, CheckCircle, AlertTriangle, X, FileText, ChevronRight, RefreshCw } from "lucide-react";

interface ParsedRow {
  loanRef: string;
  clientName: string;
  amount: string;
  date: string;
  reference: string;
  valid: boolean;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];
  // Skip header if present
  const start = lines[0].toLowerCase().includes("loan ref") ? 1 : 0;
  return lines.slice(start).map(line => {
    const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
    const [loanRef = "", clientName = "", amount = "", date = "", reference = ""] = parts;
    const errors: string[] = [];
    if (!loanRef) errors.push("Missing Loan Ref");
    if (!clientName) errors.push("Missing Client Name");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errors.push("Invalid Amount");
    if (!date || isNaN(Date.parse(date))) errors.push("Invalid Date");
    return { loanRef, clientName, amount, date, reference, valid: errors.length === 0, errors };
  });
}

function generateTemplate(): string {
  return [
    "Loan Ref,Client Name,Amount,Date,Reference",
    "PHL-2024-001,John Banda,1500.00,2024-12-01,MTN-REF-001",
    "PHL-2024-002,Mary Phiri,2000.00,2024-12-01,ZANACO-REF-002",
  ].join("\n");
}

export default function BulkPaymentImportPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "philix-payment-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmSubmit() {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  }

  const valid = rows.filter(r => r.valid);
  const invalid = rows.filter(r => !r.valid);
  const preview = rows.slice(0, 10);

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F0E6] p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1F3A] mb-2">Payments Queued</h2>
          <p className="text-slate-600 mb-2">{valid.length} payment{valid.length !== 1 ? "s" : ""} queued for review.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-left">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Review Required — A loan officer must verify each payment before it is posted to the loan account.
            </p>
          </div>
          <button
            onClick={() => { setStep(1); setRows([]); setFileName(""); setSubmitted(false); }}
            className="w-full py-2.5 rounded-xl bg-[#0B1F3A] text-white font-medium hover:bg-[#0B1F3A]/80 transition-colors"
          >
            Import Another File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <Upload className="w-6 h-6 text-[#C9A227]" />
              Bulk Payment Import
            </h1>
            <p className="text-sm text-slate-500 mt-1">Upload a CSV file to import multiple payments at once</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#0B1F3A]/20 text-[#0B1F3A] hover:bg-[#0B1F3A]/5 text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Download Template
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-3 mb-6">
          {[{ n: 1, label: "Upload CSV" }, { n: 2, label: "Review & Confirm" }].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= n ? "bg-[#C9A227] text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > n ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={`text-sm font-medium ${step >= n ? "text-[#0B1F3A]" : "text-slate-400"}`}>{label}</span>
              {n < 2 && <ChevronRight className="w-4 h-4 text-slate-300" />}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {/* CSV Format Guide */}
            <div className="bg-[#0B1F3A]/5 border border-[#0B1F3A]/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-[#0B1F3A] mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C9A227]" /> Expected CSV Format
              </p>
              <div className="font-mono text-xs bg-white rounded-lg p-3 border border-slate-200 overflow-x-auto">
                <p className="text-slate-500">Loan Ref, Client Name, Amount, Date, Reference</p>
                <p className="text-[#0B1F3A]">PHL-2024-001, John Banda, 1500.00, 2024-12-01, MTN-001</p>
                <p className="text-[#0B1F3A]">PHL-2024-002, Mary Phiri, 2000.00, 2024-12-01, ZANACO-002</p>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? "border-[#C9A227] bg-[#C9A227]/5" : "border-slate-300 hover:border-[#C9A227] hover:bg-slate-50"}`}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? "text-[#C9A227]" : "text-slate-300"}`} />
              <p className="font-medium text-slate-600">{fileName ? fileName : "Drop CSV file here or click to browse"}</p>
              <p className="text-xs text-slate-400 mt-1">Accepts .csv files only</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {rows.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#0B1F3A]">Preview ({rows.length} rows)</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{valid.length} valid</span>
                    {invalid.length > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{invalid.length} invalid</span>}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        {["", "Loan Ref", "Client Name", "Amount", "Date", "Reference", "Status"].map(h => (
                          <th key={h} className="pb-2 pr-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className={`border-b border-slate-50 ${!row.valid ? "bg-red-50" : ""}`}>
                          <td className="py-2 pr-2">{row.valid ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-red-500" />}</td>
                          <td className="py-2 pr-3 font-mono">{row.loanRef || "—"}</td>
                          <td className="py-2 pr-3">{row.clientName || "—"}</td>
                          <td className="py-2 pr-3 font-mono">{row.amount || "—"}</td>
                          <td className="py-2 pr-3 font-mono">{row.date || "—"}</td>
                          <td className="py-2 pr-3 font-mono">{row.reference || "—"}</td>
                          <td className="py-2">
                            {row.valid
                              ? <span className="text-emerald-600 font-medium">Valid</span>
                              : <span className="text-red-600" title={row.errors.join(", ")}>Invalid — {row.errors[0]}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 10 && <p className="text-xs text-slate-400 mt-2">Showing 10 of {rows.length} rows</p>}
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={valid.length === 0}
                  className="mt-4 w-full py-2.5 rounded-xl bg-[#C9A227] text-white font-medium hover:bg-[#b8911f] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  Continue with {valid.length} valid rows <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4" /> Review Required
              </p>
              <p className="text-xs text-amber-700">
                All imported payments will be queued as PENDING and require manual verification by a loan officer before being posted to client accounts.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-[#0B1F3A] mb-4">Confirm Import</h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-[#F5F0E6] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Valid Payments</p>
                  <p className="text-2xl font-bold text-[#0B1F3A] font-mono">{valid.length}</p>
                </div>
                <div className={`rounded-lg p-3 ${invalid.length > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
                  <p className="text-xs text-slate-500 mb-1">Invalid Rows (skipped)</p>
                  <p className={`text-2xl font-bold font-mono ${invalid.length > 0 ? "text-red-600" : "text-slate-400"}`}>{invalid.length}</p>
                </div>
              </div>
              <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
                {valid.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                    <span className="font-mono text-slate-600">{row.loanRef}</span>
                    <span className="text-slate-600">{row.clientName}</span>
                    <span className="font-mono font-semibold text-[#0B1F3A]">K{parseFloat(row.amount).toFixed(2)}</span>
                    <span className="text-slate-400 font-mono">{row.date}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
                  Back
                </button>
                <button
                  onClick={confirmSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#C9A227] text-white font-medium hover:bg-[#b8911f] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : <><CheckCircle className="w-4 h-4" /> Queue {valid.length} Payments</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
