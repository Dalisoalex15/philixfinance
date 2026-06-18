import { useState } from "react";
import { FileText, Printer, Download, CheckSquare, Edit3 } from "lucide-react";
import { formatKwacha } from "../lib/mock-data";

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const sampleAgreement = {
  ref: "PHX-L-2026-0042",
  date: "17 June 2026",
  client: { name: "Chanda Mwale", nrc: "123456/78/1", phone: "+260 977 112 233", address: "Stand 14, Mtendere, Lusaka", employer: "University of Zambia (UNZA)", dob: "01 Jan 2000" },
  loan: { product: "Student Emergency Loan", principal: 2500, rate: 20, term: "2 weeks", disbursedDate: "17 June 2026", dueDate: "1 July 2026", totalRepayable: 3000 },
  collateral: { description: "Samsung Galaxy A14", condition: "Good", marketValue: 4500, ltvPercent: 60, maxContribution: 2700 },
  officer: "Mary Chirwa",
  branch: "UNZA Branch",
};

export default function LoanAgreementPage() {
  const [loanRef, setLoanRef] = useState(sampleAgreement.ref);
  const [agreement] = useState(sampleAgreement);
  const [signed, setSigned] = useState(false);

  const handlePrint = () => window.print();

  const schedule = [
    { installment: 1, dueDate: agreement.loan.dueDate, amount: agreement.loan.totalRepayable, balance: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Loan Agreement Generator</h1>
          <p className="page-subtitle">Auto-generate, preview, and print signed loan agreements</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" value={loanRef} onChange={e => setLoanRef(e.target.value)}
            className="input-base text-sm py-1.5 w-44" placeholder="Loan reference..." />
          <button onClick={handlePrint} className="btn-secondary text-xs py-1.5"><Printer size={12} /> Print / PDF</button>
          <button className="btn-primary text-xs py-1.5"><Download size={12} /> Download PDF</button>
        </div>
      </div>

      {/* Agreement Document */}
      <div id="loan-agreement" className="bg-white text-gray-900 rounded-2xl p-10 shadow-xl max-w-3xl mx-auto print:shadow-none print:rounded-none print:p-8">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-navy-900 pb-6">
          <div className="text-2xl font-black text-navy-900 mb-1">PHILIX FINANCE LIMITED</div>
          <div className="text-sm font-semibold text-amber-700 tracking-widest uppercase mb-2">Creating A Future Together</div>
          <div className="text-xs text-gray-500">P.O. Box XXXXX, Lusaka, Zambia · Tel: +260 777 158 901 · BoZ Licensed MFI</div>
          <div className="mt-4 text-lg font-bold text-navy-900 uppercase tracking-wide border border-navy-900 inline-block px-6 py-1 rounded">
            LOAN AGREEMENT
          </div>
        </div>

        {/* Agreement Reference */}
        <div className="flex justify-between text-sm mb-6">
          <div><span className="font-semibold">Agreement Ref:</span> {agreement.ref}</div>
          <div><span className="font-semibold">Date:</span> {agreement.date}</div>
          <div><span className="font-semibold">Branch:</span> {agreement.branch}</div>
        </div>

        {/* Parties */}
        <div className="mb-6">
          <h3 className="font-bold text-navy-900 border-b border-gray-200 pb-1 mb-3">PARTIES</h3>
          <p className="text-sm leading-relaxed mb-2">
            This Loan Agreement is entered into between <span className="font-bold">Philix Finance Limited</span> (hereinafter "the Lender") and:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Full Name", agreement.client.name],
              ["NRC Number", agreement.client.nrc],
              ["Phone", agreement.client.phone],
              ["Date of Birth", agreement.client.dob],
              ["Employer / Institution", agreement.client.employer],
              ["Address", agreement.client.address],
            ].map(([l, v]) => (
              <div key={l}>
                <span className="text-gray-500 text-xs">{l}</span>
                <div className="font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loan Terms */}
        <div className="mb-6">
          <h3 className="font-bold text-navy-900 border-b border-gray-200 pb-1 mb-3">LOAN TERMS</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ["Product", agreement.loan.product],
              ["Principal Amount", K(agreement.loan.principal)],
              ["Interest Rate", `${agreement.loan.rate}% flat`],
              ["Loan Term", agreement.loan.term],
              ["Disbursement Date", agreement.loan.disbursedDate],
              ["Repayment Due Date", agreement.loan.dueDate],
              ["Total Repayable", K(agreement.loan.totalRepayable)],
              ["Interest Amount", K(agreement.loan.totalRepayable - agreement.loan.principal)],
            ].map(([l, v]) => (
              <div key={l} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">{l}</div>
                <div className="font-bold text-navy-900">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Collateral */}
        <div className="mb-6">
          <h3 className="font-bold text-navy-900 border-b border-gray-200 pb-1 mb-3">COLLATERAL SECURITY</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ["Item Description", agreement.collateral.description],
              ["Condition", agreement.collateral.condition],
              ["Market Value", K(agreement.collateral.marketValue)],
              ["LTV Applied", `${agreement.collateral.ltvPercent}%`],
              ["Max Contribution", K(agreement.collateral.maxContribution)],
            ].map(([l, v]) => (
              <div key={l} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">{l}</div>
                <div className="font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Repayment Schedule */}
        <div className="mb-6">
          <h3 className="font-bold text-navy-900 border-b border-gray-200 pb-1 mb-3">REPAYMENT SCHEDULE</h3>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th className="text-left px-3 py-2 text-xs">Installment</th>
                <th className="text-left px-3 py-2 text-xs">Due Date</th>
                <th className="text-right px-3 py-2 text-xs">Amount</th>
                <th className="text-right px-3 py-2 text-xs">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(s => (
                <tr key={s.installment} className="border-t border-gray-100">
                  <td className="px-3 py-2">{s.installment}</td>
                  <td className="px-3 py-2">{s.dueDate}</td>
                  <td className="px-3 py-2 text-right font-bold">{K(s.amount)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600 font-bold">{K(s.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Terms */}
        <div className="mb-8 text-xs text-gray-600 space-y-1 bg-gray-50 rounded-lg p-4">
          <p className="font-semibold text-gray-800 mb-2">TERMS AND CONDITIONS</p>
          <p>1. The borrower agrees to repay the total amount of {K(agreement.loan.totalRepayable)} by {agreement.loan.dueDate}.</p>
          <p>2. Late payment incurs a penalty of 5% of the outstanding balance per week after the due date.</p>
          <p>3. The collateral remains in the custody of Philix Finance until full repayment.</p>
          <p>4. Failure to repay may result in collateral forfeiture and credit bureau reporting.</p>
          <p>5. Early repayment is permitted with no penalty.</p>
          <p>6. This agreement is governed by the laws of the Republic of Zambia.</p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="border-b-2 border-gray-300 h-12 mb-2" />
            <div className="text-sm font-semibold">{agreement.client.name}</div>
            <div className="text-xs text-gray-500">Borrower · NRC: {agreement.client.nrc}</div>
            <div className="text-xs text-gray-400 mt-1">Date: _______________</div>
          </div>
          <div>
            <div className="border-b-2 border-gray-300 h-12 mb-2" />
            <div className="text-sm font-semibold">{agreement.officer}</div>
            <div className="text-xs text-gray-500">Loan Officer · Philix Finance Limited</div>
            <div className="text-xs text-gray-400 mt-1">Date: {agreement.date}</div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
          This agreement is legally binding. Philix Finance Limited is licensed by the Bank of Zambia.
        </div>
      </div>

      {/* Digital signature acknowledgement */}
      <div className="no-print max-w-3xl mx-auto philix-card p-4 flex items-center gap-4">
        <button onClick={() => setSigned(!signed)}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors ${signed ? "text-emerald-700" : "text-navy-600"}`}>
          <CheckSquare size={18} className={signed ? "text-emerald-700" : "text-navy-500"} />
          {signed ? "Client has signed — agreement confirmed" : "Mark as signed by client"}
        </button>
        {signed && (
          <span className="ml-auto text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
            Signed {new Date().toLocaleString("en-GB")}
          </span>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
