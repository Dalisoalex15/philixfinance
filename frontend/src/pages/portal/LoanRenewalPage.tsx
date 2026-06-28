import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Sparkles, RefreshCw, AlertCircle, CheckCircle, ArrowRight, Info } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";

const API = "/api";
const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface LoanApp {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number;
  interestRate?: number;
  status: string;
  createdAt: string;
  purpose?: string;
}

const TERM_OPTIONS = [1, 2, 3, 4];
const BASE_RATE: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 35 };
const LOYALTY_DISCOUNT = 0.5;

export default function LoanRenewalPage() {
  const { accessToken: token } = useClientAuthStore();
  const [loans, setLoans] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setError(e instanceof Error ? e.message : "Failed to load loans");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  // Find the most recent eligible loan (REPAID or DISBURSED)
  const eligibleLoan = loans.find(l => ["REPAID", "DISBURSED"].includes(l.status));
  const hasEligible = !!eligibleLoan;

  const [amount, setAmount] = useState(eligibleLoan?.amountRequested ?? 0);
  const [term, setTerm] = useState(eligibleLoan?.termMonths ?? 1);
  const [purpose, setPurpose] = useState(eligibleLoan?.purpose ?? "");

  useEffect(() => {
    if (eligibleLoan) {
      setAmount(eligibleLoan.amountRequested);
      setTerm(eligibleLoan.termMonths);
      setPurpose(eligibleLoan.purpose ?? "");
    }
  }, [eligibleLoan]);

  const originalRate = eligibleLoan?.interestRate ?? BASE_RATE[eligibleLoan?.termMonths ?? 1] ?? 10;
  const renewalRate = Math.max(0, originalRate - LOYALTY_DISCOUNT);

  const originalRepayable = eligibleLoan ? eligibleLoan.amountRequested * (1 + originalRate / 100) : 0;
  const newRepayable = amount * (1 + renewalRate / 100);
  const newWeekly = term > 0 ? Math.ceil(newRepayable / term) : 0;
  const savings = originalRepayable * (LOYALTY_DISCOUNT / (originalRate || 1));

  async function submitRenewal() {
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/portal/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amountRequested: amount,
          termMonths: term,
          productType: eligibleLoan?.productType ?? "SHORT_TERM",
          purpose,
          isRenewal: true,
          renewedFrom: eligibleLoan?.reference,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit renewal");
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1F3A] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-[#C9A227] animate-spin mr-2" />
        <span className="text-slate-400">Loading your loans...</span>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0B1F3A] flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Renewal Submitted!</h2>
          <p className="text-slate-400 text-sm">Your loan renewal application has been submitted for review. A loan officer will be in touch shortly.</p>
          <button
            onClick={() => { setSuccess(false); fetchLoans(); }}
            className="mt-5 w-full py-2.5 rounded-xl bg-[#C9A227] text-white font-medium hover:bg-[#b8911f] transition-colors"
          >
            Back to Renewal
          </button>
        </div>
      </div>
    );
  }

  if (!hasEligible) {
    return (
      <div className="min-h-screen bg-[#0B1F3A] p-4 flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-sm w-full text-center">
          <RotateCcw className="w-10 h-10 mx-auto mb-4 text-slate-600" />
          <h2 className="text-lg font-bold text-white mb-2">Renewal Not Available Yet</h2>
          <p className="text-slate-400 text-sm">Complete your current loan to unlock loyalty renewal with a discounted interest rate.</p>
          <div className="mt-4 bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-xl p-3">
            <p className="text-xs text-[#C9A227] font-medium">
              <Sparkles className="w-3.5 h-3.5 inline mr-1" />
              Loyal clients enjoy 0.5% interest discount on renewals
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1F3A] p-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#C9A227]" /> Loan Renewal
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/30">
              <Sparkles className="w-3 h-3" /> Loyalty Rate
            </span>
          </div>
          <p className="text-sm text-slate-400">Renew your loan with a loyalty discount of {LOYALTY_DISCOUNT}%</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Comparison Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#C9A227]" /> Your Previous vs. Renewal Terms
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Original */}
            <div className="bg-slate-700/50 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-2 font-medium">Previous Loan</p>
              <p className="text-xs text-slate-400 mb-0.5">Amount</p>
              <p className="font-mono font-bold text-white text-sm">{K(eligibleLoan?.amountRequested ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1.5 mb-0.5">Rate</p>
              <p className="font-mono text-sm text-slate-300">{originalRate}%</p>
              <p className="text-xs text-slate-400 mt-1.5 mb-0.5">Total Repayable</p>
              <p className="font-mono text-sm text-slate-300">{K(originalRepayable)}</p>
            </div>
            {/* New */}
            <div className="bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-xl p-3">
              <p className="text-xs text-[#C9A227] mb-2 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Renewal (Loyalty)
              </p>
              <p className="text-xs text-slate-400 mb-0.5">Amount</p>
              <p className="font-mono font-bold text-[#C9A227] text-sm">{K(amount)}</p>
              <p className="text-xs text-slate-400 mt-1.5 mb-0.5">Rate</p>
              <p className="font-mono text-sm text-emerald-400">{renewalRate}% <span className="text-xs text-emerald-600">(-{LOYALTY_DISCOUNT}%)</span></p>
              <p className="text-xs text-slate-400 mt-1.5 mb-0.5">Total Repayable</p>
              <p className="font-mono text-sm text-white">{K(newRepayable)}</p>
            </div>
          </div>
          {savings > 0 && (
            <div className="mt-3 bg-emerald-900/20 border border-emerald-800/30 rounded-lg px-3 py-2">
              <p className="text-xs text-emerald-400 font-medium">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                You save approximately {K(savings)} compared to standard rate
              </p>
            </div>
          )}
        </div>

        {/* Renewal Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white">Renewal Details</h3>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Loan Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">K</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                min={500}
                step={100}
                className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>
          </div>

          {/* Term */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Term (Weeks)</label>
            <div className="grid grid-cols-4 gap-2">
              {TERM_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTerm(t)}
                  className={`py-2 rounded-lg border text-sm font-semibold transition-colors ${term === t ? "bg-[#C9A227] border-[#C9A227] text-white" : "border-slate-600 text-slate-400 hover:border-slate-500"}`}
                >
                  {t}w
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="What will you use this loan for?"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            />
          </div>

          {/* Weekly Payment */}
          <div className="bg-slate-700/50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">Est. Weekly Payment</span>
            <span className="font-mono font-bold text-[#C9A227] text-lg">{K(newWeekly)}</span>
          </div>

          <button
            onClick={submitRenewal}
            disabled={submitting || !purpose.trim() || amount <= 0}
            className="w-full py-3 rounded-xl bg-[#C9A227] text-white font-semibold hover:bg-[#b8911f] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Submit Renewal Application</>}
          </button>
          <p className="text-xs text-slate-500 text-center">
            Subject to credit approval · Previous ref: {eligibleLoan?.reference}
          </p>
        </div>
      </div>
    </div>
  );
}
