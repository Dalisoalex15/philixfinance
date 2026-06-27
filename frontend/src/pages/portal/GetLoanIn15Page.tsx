import { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus, MailCheck, ShieldCheck, FileText, Banknote,
  Clock, ChevronRight, Zap, Check, Calculator,
  Star, Phone, ArrowRight, Sparkles, BadgeCheck,
  CreditCard, Briefcase, GraduationCap, Car,
} from "lucide-react";
import PhilixLogo from "../../components/ui/PhilixLogo";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduleItem { week: number; dueDate: string; amount: number; balance: number }
interface CalcResult {
  principal: number; interest: number; totalDue: number;
  weeklyPayment: number; weeks: number; effectiveApr: number;
  schedule: ScheduleItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS = [
  { icon: UserPlus,    label: "Create Account",    time: "2 min",  desc: "Register with your name, phone number and email address. Free, instant and secure." },
  { icon: MailCheck,   label: "Verify Your Email", time: "1 min",  desc: "Enter the one-time code we send to your inbox. One step to confirm it's you." },
  { icon: ShieldCheck, label: "Upload KYC Docs",   time: "5 min",  desc: "Take a photo of your NRC and a recent payslip or bank statement. Upload right from your phone." },
  { icon: FileText,    label: "Submit Application", time: "3 min",  desc: "Pick your loan amount, product type and repayment term. Tell us what the money is for." },
  { icon: Banknote,    label: "Receive Your Loan", time: "4 min",  desc: "A loan officer reviews and approves your request. Funds sent directly to your account." },
];

const PRODUCTS = [
  { icon: Briefcase,    key: "BUSINESS",    label: "Business",    max: "K100,000", rate: "20%", term: "Up to 12 wks", color: "#6366f1" },
  { icon: CreditCard,   key: "SALARY",      label: "Salary",      max: "K50,000",  rate: "15%", term: "Up to 8 wks",  color: "#22c55e" },
  { icon: GraduationCap,key: "STUDENT",     label: "Student",     max: "K20,000",  rate: "10%", term: "Up to 16 wks", color: "#f59e0b" },
  { icon: Car,          key: "LOGBOOK",     label: "Logbook",     max: "K200,000", rate: "25%", term: "Up to 24 wks", color: "#ec4899" },
];

const FAQS = [
  { q: "Do I need a bank account?", a: "Yes, you need an active Zambian bank account or mobile money wallet to receive your funds after approval." },
  { q: "What documents do I need?", a: "Your National Registration Card (NRC) and proof of income — a recent payslip, bank statement, or business registration." },
  { q: "Is there any application fee?", a: "No. Applying is completely free. You only pay the agreed interest on the loan once it is disbursed." },
  { q: "How quickly will I get the money?", a: "Our target is 15 minutes from start to disbursement during business hours. Some applications may take up to 24 hours." },
  { q: "What if I am rejected?", a: "You will receive a clear reason and can reapply once you have addressed it. Your credit score feedback will guide you." },
  { q: "Can I repay early?", a: "Yes. Early repayment is welcome and helps build a higher credit score for larger loans in the future." },
];

const K = (n: number) => `K${n.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── Mini Calculator ───────────────────────────────────────────────────────────
function MiniCalc() {
  const [amount, setAmount]   = useState(5000);
  const [weeks, setWeeks]     = useState(8);
  const [rate]                = useState(20);
  const [result, setResult]   = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountRequested: amount, termMonths: weeks, interestRate: rate }),
      });
      if (res.ok) setResult(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <Calculator size={16} className="text-amber-400" />
        <span className="font-semibold text-slate-200 text-sm">Quick Calculator</span>
        <span className="ml-auto text-[10px] text-slate-500">See what you'd repay</span>
      </div>
      <div className="p-5 space-y-4">
        {/* Amount slider */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs text-slate-400">Loan Amount</label>
            <span className="text-sm font-bold text-amber-400">{K(amount)}</span>
          </div>
          <input type="range" min={500} max={100000} step={500} value={amount}
            onChange={e => setAmount(+e.target.value)}
            className="w-full accent-amber-500 cursor-pointer h-1.5" />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>K500</span><span>K100,000</span>
          </div>
        </div>

        {/* Term slider */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs text-slate-400">Repayment Period</label>
            <span className="text-sm font-bold text-amber-400">{weeks} weeks</span>
          </div>
          <input type="range" min={1} max={24} step={1} value={weeks}
            onChange={e => setWeeks(+e.target.value)}
            className="w-full accent-amber-500 cursor-pointer h-1.5" />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>1 week</span><span>24 weeks</span>
          </div>
        </div>

        <button onClick={calculate} disabled={loading}
          className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: loading ? "rgba(245,166,35,0.3)" : "#F5A623", color: "#0f172a" }}>
          {loading ? <div className="w-4 h-4 border-2 border-slate-900/50 border-t-transparent rounded-full animate-spin" /> : <><Calculator size={14} /> Calculate</>}
        </button>

        {result && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)" }}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Principal",       value: K(result.principal) },
                { label: "Interest (20%)",  value: K(result.interest) },
                { label: "Total Repayable", value: K(result.totalDue) },
                { label: "Weekly Payment",  value: K(result.weeklyPayment) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] text-slate-500">{label}</div>
                  <div className="text-sm font-bold text-slate-200">{value}</div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t" style={{ borderColor: "rgba(245,166,35,0.15)" }}>
              <div className="text-[10px] text-slate-500 mb-1.5">Repayment Schedule (first 3 weeks)</div>
              <div className="space-y-1">
                {result.schedule.slice(0, 3).map(s => (
                  <div key={s.week} className="flex justify-between text-xs">
                    <span className="text-slate-400">Week {s.week} — {s.dueDate}</span>
                    <span className="text-slate-200 font-medium">{K(s.amount)}</span>
                  </div>
                ))}
                {result.weeks > 3 && (
                  <div className="text-[10px] text-slate-600 text-center pt-1">+ {result.weeks - 3} more weeks</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GetLoanIn15Page() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" style={{ fontFamily: "'Clash Grotesk', 'Inter', sans-serif" }}>

      {/* ── Top nav ── */}
      <nav className="border-b flex items-center justify-between px-5 py-3 sticky top-0 z-40"
        style={{ background: "rgba(2,8,23,0.92)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <PhilixLogo variant="full" size="sm" onDark />
        <div className="flex items-center gap-3">
          <Link to="/portal/login"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors">Sign In</Link>
          <Link to="/portal/register"
            className="text-sm font-semibold px-4 py-1.5 rounded-xl transition-all"
            style={{ background: "#F5A623", color: "#0f172a" }}>
            Apply Now
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="px-5 pt-16 pb-12 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
          style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", color: "#F5A623" }}>
          <Zap size={11} fill="#F5A623" /> Fast • Simple • Trusted
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
          Get Your Loan in{" "}
          <span style={{ color: "#F5A623" }}>15 Minutes</span>
        </h1>

        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
          From signup to funds in your account — five simple steps, no hidden fees, no long waits.
        </p>

        {/* 15-minute timer visual */}
        <div className="inline-flex items-center gap-6 px-8 py-4 rounded-2xl mb-8"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {[
            { val: "0", unit: "hrs" },
            { val: "15", unit: "min" },
            { val: "00", unit: "sec" },
          ].map(({ val, unit }, i) => (
            <div key={i} className="flex flex-col items-center">
              {i > 0 && <span className="absolute -translate-x-6 text-slate-600 text-xl font-bold">:</span>}
              <div className="text-3xl font-extrabold tabular-nums" style={{ color: i === 1 ? "#F5A623" : "#64748b" }}>
                {val}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-600">{unit}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/portal/register"
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:opacity-90"
            style={{ background: "#F5A623", color: "#0f172a" }}>
            <Sparkles size={16} /> Start My Application
          </Link>
          <Link to="/portal/calculator"
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all border border-slate-700 text-slate-300 hover:border-slate-500">
            <Calculator size={16} /> Calculate First
          </Link>
        </div>

        {/* Trust chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-xs text-slate-500">
          {["No application fee", "Funds same day", "Flexible repayments", "Secure & encrypted"].map(t => (
            <span key={t} className="flex items-center gap-1">
              <Check size={11} className="text-emerald-500" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="max-w-4xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">How It Works</h2>
          <p className="text-slate-500 text-sm">Five steps. One smooth experience.</p>
        </div>

        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={i} className="flex gap-5">
                {/* Left column — icon + connector */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: i === 4 ? "rgba(245,166,35,0.2)" : "rgba(99,102,241,0.15)", border: `1px solid ${i === 4 ? "rgba(245,166,35,0.4)" : "rgba(99,102,241,0.3)"}` }}>
                    <Icon size={20} style={{ color: i === 4 ? "#F5A623" : "#818cf8" }} />
                  </div>
                  {!isLast && <div className="w-px flex-1 my-2" style={{ background: "rgba(99,102,241,0.2)" }} />}
                </div>

                {/* Right column — content */}
                <div className={`pb-8 flex-1 ${isLast ? "" : ""}`}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-semibold text-slate-200">{step.label}</h3>
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(245,166,35,0.1)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.25)" }}>
                      <Clock size={9} /> {step.time}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                  {i === 2 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["National Registration Card (NRC)", "Payslip / Bank Statement"].map(doc => (
                        <span key={doc} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                          <BadgeCheck size={11} className="text-purple-400" /> {doc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total time pill */}
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", color: "#F5A623" }}>
            <Zap size={14} fill="#F5A623" /> Total: ~15 minutes from start to funded
          </div>
        </div>
      </section>

      {/* ── Products + Calculator (2-col) ── */}
      <section className="max-w-5xl mx-auto px-5 py-12 grid lg:grid-cols-2 gap-8">
        {/* Products */}
        <div>
          <h2 className="text-xl font-bold mb-2">Choose Your Loan Type</h2>
          <p className="text-slate-500 text-sm mb-6">Pick the product that fits your situation.</p>
          <div className="grid grid-cols-2 gap-3">
            {PRODUCTS.map(p => {
              const Icon = p.icon;
              return (
                <Link key={p.key} to="/portal/register"
                  className="group flex flex-col p-4 rounded-2xl transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}>
                    <Icon size={16} style={{ color: p.color }} />
                  </div>
                  <div className="font-semibold text-slate-200 text-sm mb-1">{p.label} Loan</div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>Up to <span className="text-slate-300 font-medium">{p.max}</span></div>
                    <div>Interest <span className="text-slate-300 font-medium">{p.rate}</span></div>
                    <div>{p.term}</div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold" style={{ color: p.color }}>
                    Apply Now <ChevronRight size={11} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Calculator */}
        <div>
          <h2 className="text-xl font-bold mb-2">Calculate Your Repayments</h2>
          <p className="text-slate-500 text-sm mb-6">See exactly what you'll pay before you apply.</p>
          <MiniCalc />
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="max-w-4xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold mb-6 text-center">What You Need to Qualify</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: "🪪", title: "Valid NRC",       desc: "Zambian National Registration Card — front and back photo." },
            { icon: "💼", title: "Proof of Income",  desc: "Recent payslip, bank statement, or business registration." },
            { icon: "📱", title: "Active Mobile",    desc: "A phone number and email address to receive your OTP and updates." },
          ].map(r => (
            <div key={r.title} className="p-5 rounded-2xl text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-3xl mb-3">{r.icon}</div>
              <div className="font-semibold text-slate-200 mb-1.5">{r.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-4xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold mb-6 text-center">What Our Clients Say</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { name: "Chisomo M.", loc: "Lusaka", text: "I applied in the morning and had the funds before lunch. The whole process was under 20 minutes." },
            { name: "Bridget K.", loc: "Kitwe",  text: "Needed money for stock urgently. Philix approved my business loan the same day. Absolutely amazing." },
            { name: "Moses P.",   loc: "Ndola",  text: "Easy application, no queues, no stress. My salary loan was sorted in minutes from my phone." },
          ].map(t => (
            <div key={t.name} className="p-5 rounded-2xl relative"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={11} fill="#F5A623" className="text-amber-400" />)}
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-300">{t.name}</div>
                  <div className="text-[10px] text-slate-600">{t.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-slate-200 hover:text-white transition-colors">
                {faq.q}
                <ChevronRight size={14} className={`text-slate-500 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-slate-500 leading-relaxed border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="pt-3">{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="max-w-3xl mx-auto px-5 py-16 text-center">
        <div className="rounded-3xl p-10"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(245,166,35,0.1) 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-4xl font-extrabold mb-3">
            Ready in <span style={{ color: "#F5A623" }}>15 min</span>?
          </div>
          <p className="text-slate-400 mb-8 text-lg">
            Join thousands of Zambians who got their loans fast with Philix Finance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/portal/register"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
              style={{ background: "#F5A623", color: "#0f172a" }}>
              <Zap size={16} fill="#0f172a" /> Create Free Account
            </Link>
            <a href="tel:+260211000000"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all border border-slate-700 text-slate-300 hover:border-slate-500">
              <Phone size={16} /> Call Us Instead
            </a>
          </div>
          <p className="text-xs text-slate-600 mt-6">
            By registering you agree to our Terms of Service and Privacy Policy.
            Loans subject to approval and credit assessment.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8 text-center text-xs text-slate-600" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="mb-3">
          <PhilixLogo variant="full" size="sm" onDark />
        </div>
        <p>© {new Date().getFullYear()} Philix Finance Ltd · Lusaka, Zambia</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link to="/portal/login" className="hover:text-slate-400 transition-colors">Sign In</Link>
          <Link to="/portal/register" className="hover:text-slate-400 transition-colors">Register</Link>
          <Link to="/portal/support" className="hover:text-slate-400 transition-colors">Support</Link>
        </div>
      </footer>
    </div>
  );
}
