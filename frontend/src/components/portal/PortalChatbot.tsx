import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, ChevronDown } from "lucide-react";
import { useClientAuthStore } from "../../store/clientAuth";
import { useLoanApplicationStore, type LoanApplication } from "../../store/loanApplicationStore";
import { mockLoanProducts } from "../../lib/mock-data";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: Date;
}

const K = (n: number) => `K${Math.round(n).toLocaleString()}`;

// ── Smart response engine ─────────────────────────────────────────────────────
function respond(input: string, client: { firstName: string; id: string }, apps: LoanApplication[]): string {
  const q = input.toLowerCase().trim();
  const myApps = apps.filter(a => a.clientId === client.id);
  const activeLoans = myApps.filter(a => a.status === "DISBURSED");
  const pendingApps = myApps.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const approvedApps = myApps.filter(a => a.status === "APPROVED");
  const rejectedApps = myApps.filter(a => a.status === "REJECTED");
  const completedLoans = myApps.filter(a => a.status === "DISBURSED");
  const allProducts = mockLoanProducts.filter(p => p.isActive);

  const getDueDate = (app: LoanApplication) =>
    new Date(new Date(app.submittedAt).getTime() + (app.termMonths ?? 1) * 7 * 86400000);
  const getDaysLeft = (app: LoanApplication) =>
    Math.ceil((getDueDate(app).getTime() - Date.now()) / 86400000);

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (/^(hi|hey|hello|good morning|good afternoon|morning|afternoon|yo|sup)[\s!?.]*$/.test(q) || q === "start") {
    return `Hello ${client.firstName}! 👋 I'm Philix AI — your personal loan advisor.\n\nI can help you with:\n• ⚡ How to pay your loan off faster\n• 🏆 Which loan product suits you best\n• 📊 Your application & loan status\n• 💰 Interest & repayment calculations\n• 📋 Collateral requirements\n• ✅ How to improve your approval chances\n\nWhat would you like to know?`;
  }

  // ── Pay faster / early repayment ─────────────────────────────────────────
  if ((q.includes("pay") || q.includes("repay") || q.includes("clear") || q.includes("settle")) &&
      (q.includes("fast") || q.includes("quick") || q.includes("early") || q.includes("off") || q.includes("soon"))) {
    if (activeLoans.length === 0) {
      return `You don't have any active loans right now.\n\nWhen you do take a loan, here's how to pay it off as fast as possible:\n\n1️⃣ **Choose the shortest term** — 1 week costs only 10% interest vs 35% for 4 weeks. If you can afford the single payment, always go 1 week.\n\n2️⃣ **Pay on the exact day** — late payments add a 5% penalty per week, which adds up fast.\n\n3️⃣ **Set phone reminders** — schedule an alarm for your repayment day so you never miss it.\n\n4️⃣ **Early settlement** — you can come to the Philix office before the due date to pay the full balance and close the loan early.`;
    }
    const loan = activeLoans[0];
    const daysLeft = getDaysLeft(loan);
    const totalDue = loan.totalRepayable || loan.amount * (1 + loan.interestRate / 100);
    const weekly = loan.weeklyPayment || totalDue / (loan.termMonths ?? 1);
    return `Here's your repayment plan for ${loan.productName}:\n\n**Loan:** ${K(loan.amount)} | **Total due:** ${K(totalDue)}\n**Weekly payment:** ${K(weekly)}\n**Due in:** ${daysLeft > 0 ? `${daysLeft} days` : "⚠️ OVERDUE"}\n\n**To pay it off faster:**\n\n1️⃣ **Pay more than the minimum** — if you have extra cash, make an advance payment at the Philix office. Any extra goes directly off your principal.\n\n2️⃣ **Never miss a payment** — one missed week adds a 5% late penalty on top of what you owe.\n\n3️⃣ **Lump-sum settlement** — you can come in anytime and pay the full ${K(totalDue)} to close the loan immediately.\n\n4️⃣ **Avoid new loans** while this one is open — it keeps your debt low and your credit score clean.\n\nNeed help calculating a specific payment? Just ask!`;
  }

  // ── Best loan / recommend ────────────────────────────────────────────────
  if ((q.includes("best") || q.includes("recommend") || q.includes("suit") || q.includes("good") || q.includes("which")) &&
      (q.includes("loan") || q.includes("product") || q.includes("borrow"))) {
    const completedCount = completedLoans.length;
    if (completedCount >= 5 || (completedCount >= 3 && !rejectedApps.length)) {
      return `With your excellent repayment history (${completedCount} completed loans), you qualify for our **premium tier**:\n\n🏆 **Premium Client Loan** (prod-006)\n• Amount: ${K(10000)} – ${K(50000)}\n• Rate: 7–28% flat (our lowest)\n• Term: 1–4 weeks\n• Perfect for: large purchases, business expansion\n\n⭐ **Repeat Customer Loyalty Loan** (prod-005)\n• Amount: ${K(5000)} – ${K(20000)}\n• Rate: 8–30% flat\n• Term: 1–4 weeks\n\n👉 To apply, go to **Apply for Loan** and select either product. Your history makes approval very likely!`;
    }
    if (completedCount >= 1) {
      return `Based on your profile, here are the best options for you:\n\n💼 **Business Working Capital Loan**\n• Amount: ${K(2000)} – ${K(15000)}\n• Rate: 10–35% flat · Term: 1–4 weeks\n• Best for: buying stock, business expenses\n\n📱 **Electronics Equity Loan**\n• Amount: ${K(1000)} – ${K(10000)}\n• Rate: 10–35% flat · Term: 1–4 weeks\n• Best for: quick cash using your phone/laptop as collateral\n\n💡 **Tip:** The more collateral you provide (with ownership docs + photos), the higher the amount you'll be approved for.`;
    }
    return `As a new client, I recommend starting with:\n\n🎓 **Student Emergency Loan**\n• Amount: ${K(500)} – ${K(2000)} · Rate: 10–35%\n• Best for: students who need quick funds\n• Collateral: phone, laptop, tablet accepted\n\n💰 **Salary Advance Loan**\n• Amount: ${K(1000)} – ${K(5000)} · Rate: 10–35%\n• Best for: employed clients with payslips\n• Faster approval with employer letter\n\n**To improve your chances:**\n• Complete KYC verification ✅\n• Bring ownership docs for your collateral\n• Have 2 references ready\n• Provide a payslip or employer letter`;
  }

  // ── Interest / rates / cost ───────────────────────────────────────────────
  if (q.includes("interest") || q.includes("rate") || q.includes("how much") && q.includes("cost") || q.includes("charge")) {
    return `Philix Finance charges a **flat interest rate** on the original amount borrowed:\n\n| Term | Rate | Example on ${K(1000)} | Weekly Payment |\n|------|------|--------------------|----------------|\n| 1 week | 10% | Repay ${K(1100)} | ${K(1100)} once |\n| 2 weeks | 20% | Repay ${K(1200)} | ${K(600)}/week |\n| 3 weeks | 30% | Repay ${K(1300)} | ${K(433)}/week |\n| 4 weeks | 35% | Repay ${K(1350)} | ${K(338)}/week |\n\n**Pro tip:** The 1-week term costs the least total (10% vs 35%). Choose it if you can afford to repay in one go.\n\nLoyalty and Premium clients get rates starting at 7–8%.\n\n**Late payment penalty:** 5% of weekly payment per week overdue.`;
  }

  // ── Calculate repayment ──────────────────────────────────────────────────
  if (q.includes("calculat") || (q.includes("how much") && (q.includes("repay") || q.includes("pay back") || q.includes("owe")))) {
    if (activeLoans.length > 0) {
      const loan = activeLoans[0];
      const total = loan.totalRepayable || loan.amount * (1 + loan.interestRate / 100);
      return `For your current loan:\n\n**${loan.productName}**\n• Principal: ${K(loan.amount)}\n• Interest (${loan.interestRate}%): ${K(loan.amount * loan.interestRate / 100)}\n• **Total to repay: ${K(total)}**\n• Per week: ${K(loan.weeklyPayment || total / (loan.termMonths ?? 1))}\n• Due: ${getDueDate(loan).toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long" })}\n\nNeed to calculate a different amount? Try: *"Calculate K2000 for 3 weeks"*`;
    }
    // Try to extract amount and weeks from query
    const amtMatch = q.match(/k?(\d[\d,]*)/);
    const weekMatch = q.match(/(\d)\s*week/);
    if (amtMatch) {
      const amt = parseInt(amtMatch[1].replace(/,/g, ""));
      const weeks = weekMatch ? parseInt(weekMatch[1]) : 2;
      const rates: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 35 };
      const rate = rates[weeks] ?? 20;
      const total = amt * (1 + rate / 100);
      return `**Loan Calculation**\n\n• Principal: ${K(amt)}\n• Term: ${weeks} week${weeks > 1 ? "s" : ""}\n• Interest (${rate}% flat): ${K(amt * rate / 100)}\n• **Total to repay: ${K(total)}**\n• Weekly payment: ${K(total / weeks)}\n\nWant to compare with a different term? Try "calculate ${K(amt)} for 1 week" or "for 4 weeks".`;
    }
    return `I can calculate your repayment! Just tell me the amount and term.\n\nExample: *"Calculate K3000 for 2 weeks"*\n\nOr use our **Loan Calculator** in the menu for a full breakdown.`;
  }

  // ── Status check ─────────────────────────────────────────────────────────
  if (q.includes("status") || q.includes("application") || q.includes("pending") || q.includes("approved") || q.includes("rejected")) {
    if (myApps.length === 0) {
      return `You haven't submitted any loan applications yet, ${client.firstName}.\n\nTo apply, tap **Apply for Loan** in the menu. The process takes about 5 minutes and you'll get a decision within 24–48 hours.`;
    }
    const lines = [];
    if (approvedApps.length > 0) {
      lines.push(`🎉 **APPROVED** (${approvedApps.length}): ${approvedApps.map(a => `${a.ref} — ${K(a.amount)}`).join(", ")}\n   → Contact Philix now to arrange disbursement: +260 777 158 901`);
    }
    if (pendingApps.length > 0) {
      lines.push(`⏳ **UNDER REVIEW** (${pendingApps.length}): ${pendingApps.map(a => `${a.ref} — ${K(a.amount)}`).join(", ")}\n   → Expect a decision within 24–48 hours`);
    }
    if (activeLoans.length > 0) {
      activeLoans.forEach(a => {
        const dLeft = getDaysLeft(a);
        lines.push(`💳 **ACTIVE LOAN**: ${a.ref} — ${K(a.amount)} | Due in ${dLeft > 0 ? `${dLeft} days` : "⚠️ OVERDUE"}`);
      });
    }
    if (rejectedApps.length > 0) {
      lines.push(`❌ **REJECTED** (${rejectedApps.length}): ${rejectedApps.map(a => a.ref).join(", ")}\n   → ${rejectedApps[0].rejectedReason ?? "Contact a loan officer to understand why"}`);
    }
    return lines.join("\n\n") || `No recent activity found.`;
  }

  // ── Collateral advice ─────────────────────────────────────────────────────
  if (q.includes("collateral") || q.includes("security") || q.includes("pledge") || q.includes("guarantee")) {
    return `**Collateral accepted at Philix Finance:**\n\n📱 **Electronics** (most popular)\n   Smartphone, Laptop, Tablet, TV, Fridge\n   ↳ Must be <5 years old for best value\n   ↳ Bring original receipt or box\n\n🚗 **Vehicles**\n   Car, Motorcycle, Truck\n   ↳ Bring title/registration + insurance\n   ↳ Vehicle must be owned by you\n\n🏠 **Property**\n   Land title, Residential property\n   ↳ Original title documents required\n\n💰 **Financial Assets**\n   Fixed deposit, Savings account\n   ↳ Easiest to approve, highest loan value\n\n🏢 **Business Assets**\n   Stock, Machinery, Equipment\n   ↳ Need proof of business ownership\n\n**Tips to maximise your collateral score:**\n✅ Bring ownership documents\n✅ Item should be in Excellent or Good condition\n✅ Upload 4+ photos (front, back, sides, serial number)\n✅ Insurance on the item adds bonus points`;
  }

  // ── KYC ──────────────────────────────────────────────────────────────────
  if (q.includes("kyc") || q.includes("verif") || q.includes("identity") || q.includes("document") || q.includes("nrc")) {
    return `**KYC (Know Your Customer) Verification:**\n\nTo verify your identity at Philix:\n\n1. Go to **Identity Verification** in the menu\n2. Enter your NRC number\n3. Upload a clear photo of your NRC (both sides)\n4. Upload a recent utility bill or proof of address\n\n**Why it matters:**\n✅ Verified clients get faster decisions\n✅ Access to higher loan amounts\n✅ Better interest rates\n✅ Required for loans above ${K(2000)}\n\nVerification usually takes **1–2 business days**. Our team will notify you by SMS when complete.`;
  }

  // ── Improve chances / tips ────────────────────────────────────────────────
  if (q.includes("improve") || q.includes("chance") || q.includes("approv") || q.includes("tip") || q.includes("help me get") || q.includes("how to get")) {
    return `**Top tips to get approved faster at Philix:**\n\n1️⃣ **Complete your KYC** — verified clients get priority processing\n\n2️⃣ **Choose quality collateral** — electronics with original receipt, vehicles with title deed\n\n3️⃣ **Upload clear photos** — at least 4 photos of your collateral item including the serial number\n\n4️⃣ **Provide income proof** — payslip, bank statement, or employer letter\n\n5️⃣ **Add a guarantor** — someone employed or with assets to back you up\n\n6️⃣ **Pick the right amount** — don't over-borrow. The loan should be covered 120%+ by your collateral value\n\n7️⃣ **Good references** — provide references who can be easily contacted\n\n8️⃣ **Repay on time** — every on-time payment improves your credit score for larger future loans`;
  }

  // ── Credit score ──────────────────────────────────────────────────────────
  if (q.includes("credit") || q.includes("score") || q.includes("rating")) {
    const disbursedCount = myApps.filter(a => a.status === "DISBURSED").length;
    const rejectedCount = rejectedApps.length;
    return `**Your Credit Profile at Philix:**\n\n📈 Completed loans: ${disbursedCount}\n❌ Rejected applications: ${rejectedCount}\n📋 Total applications: ${myApps.length}\n\n**How to improve your score:**\n• Every on-time repayment adds +10 points\n• Every rejection costs -10 points (avoid applying for amounts you can't repay)\n• Completing KYC adds +25 points\n• Account age adds up to +15 points\n• Providing employer + income adds +10 points\n\nView your full credit score breakdown in the **Credit Score** section of the menu.`;
  }

  // ── Contact / support ─────────────────────────────────────────────────────
  if (q.includes("contact") || q.includes("phone") || q.includes("call") || q.includes("office") || q.includes("reach") || q.includes("speak") || q.includes("human") || q.includes("agent") || q.includes("officer")) {
    return `**Reach Philix Finance:**\n\n📞 **Phone / WhatsApp:** +260 777 158 901\n📧 **Email:** support@philixfinance.com\n📍 **Office:** Lusaka, Zambia\n🕐 **Hours:** Mon–Fri 08:00–17:00 CAT\n\nYou can also use our **Support Center** in the menu for FAQs and to submit a support request.\n\nA loan officer will respond to WhatsApp messages within a few hours during business hours.`;
  }

  // ── How long / processing time ────────────────────────────────────────────
  if (q.includes("how long") || q.includes("when") && (q.includes("approv") || q.includes("disburse") || q.includes("get the money") || q.includes("hear"))) {
    return `**Philix Finance processing times:**\n\n⏱ **Application review:** 24–48 hours\n✅ **Approval notification:** By phone/SMS\n💵 **Disbursement after approval:** Same day or next business day (come in person)\n🏦 **Mobile Money option:** Available for approved amounts\n\n**To speed things up:**\n• Make sure your phone is reachable\n• Have your collateral ready for officer inspection\n• Complete KYC beforehand\n• Apply in the morning for same-day processing`;
  }

  // ── Overdue / late ────────────────────────────────────────────────────────
  if (q.includes("overdue") || q.includes("late") || q.includes("miss") || q.includes("penalty") || q.includes("behind")) {
    if (activeLoans.length > 0) {
      const overdue = activeLoans.filter(a => getDaysLeft(a) < 0);
      if (overdue.length > 0) {
        const loan = overdue[0];
        const daysLate = Math.abs(getDaysLeft(loan));
        const penalty = (loan.weeklyPayment || 0) * 0.05 * Math.ceil(daysLate / 7);
        return `⚠️ **Overdue Alert!**\n\nLoan ${loan.ref} is **${daysLate} day${daysLate > 1 ? "s" : ""} overdue**.\n\n• Original amount: ${K(loan.amount)}\n• Total due: ${K(loan.totalRepayable || loan.amount)}\n• Late penalty accrued: ~${K(penalty)}\n\n**What to do:**\n1. Call us immediately: **+260 777 158 901**\n2. Arrange a payment plan with your loan officer\n3. Every extra week adds a 5% late penalty\n\n**Don't ignore it** — early communication always results in better outcomes. Our officers can work with you on a restructuring plan if needed.`;
      }
    }
    return `Late payments at Philix Finance attract a **5% penalty per week** on the outstanding balance.\n\n**If you're struggling to repay:**\n1. Contact us immediately: +260 777 158 901\n2. Our officers can arrange a loan restructuring or rollover\n3. Early communication always helps — we work with clients who reach out proactively\n\n**Avoid these consequences of prolonged default:**\n• Increasing penalties\n• Credit score damage\n• Collateral repossession\n• Legal action`;
  }

  // ── Savings / investment tips ─────────────────────────────────────────────
  if (q.includes("save") || q.includes("saving") || q.includes("invest")) {
    return `At Philix Finance, we believe in responsible borrowing. Here are some tips:\n\n**Borrow to grow, not just to spend:**\n• Use loans for income-generating activities (business, stock, equipment)\n• Avoid borrowing for consumption unless it's an emergency\n\n**The 3x rule:**\nOnly borrow if your planned use will generate at least 3× the interest cost\n• K1000 at 20% interest = K200 cost → your use should generate K600+ extra income\n\n**Build a repayment buffer:**\n• Set aside your weekly payment the moment you receive your salary\n• Treat loan repayment like rent — non-negotiable\n\n**Grow your credit limit over time:**\nStart small → repay on time → qualify for bigger amounts at lower rates (Loyalty Loan, Premium Loan)`;
  }

  // ── What can you do / help ────────────────────────────────────────────────
  if (q.includes("what can you") || q.includes("help") || q.includes("what do you") || q.includes("capabilities")) {
    return `I'm Philix AI — here's everything I can help you with:\n\n💬 **Loan Questions**\n• "What's the best loan for me?"\n• "How can I pay my loan off faster?"\n• "Calculate K3000 for 2 weeks"\n• "What are the interest rates?"\n\n📊 **Your Account**\n• "What's my application status?"\n• "What's my credit score?"\n• "Am I overdue?"\n\n📋 **Information**\n• "What collateral do you accept?"\n• "How long does approval take?"\n• "How do I verify my KYC?"\n• "How do I improve my approval chances?"\n\nJust type your question naturally — I'll understand!`;
  }

  // ── Default ───────────────────────────────────────────────────────────────
  return `I'm not sure I understood that, but I can help with:\n\n• **"How do I pay my loan faster?"**\n• **"What's the best loan for me?"**\n• **"What's my loan status?"**\n• **"Calculate K2000 for 3 weeks"**\n• **"What collateral do you accept?"**\n• **"How long does approval take?"**\n• **"How do I improve my credit score?"**\n\nTry one of these or ask in your own words — I'll do my best!`;
}

// ── Quick replies ──────────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  "Best loan for me",
  "Pay faster",
  "My loan status",
  "Interest rates",
  "Collateral tips",
  "Improve my chances",
];

// ── Render message with basic markdown ────────────────────────────────────────
function RenderMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-[13px] leading-relaxed space-y-0.5">
      {lines.map((line, i) => {
        const bold = line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
        return (
          <p key={i} className={line === "" ? "h-1.5" : ""}
            dangerouslySetInnerHTML={{ __html: bold }} />
        );
      })}
    </div>
  );
}

// ── Main chatbot ──────────────────────────────────────────────────────────────
export default function PortalChatbot() {
  const client = useClientAuthStore(s => s.client);
  const applications = useLoanApplicationStore(s => s.applications);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial greeting when opened for first time
  useEffect(() => {
    if (open && messages.length === 0 && client) {
      const greeting: Message = {
        id: "init",
        role: "bot",
        text: `Hello ${client.firstName}! 👋 I'm Philix AI — your personal loan advisor.\n\nI can help you with:\n• ⚡ How to pay your loan faster\n• 🏆 Best loan product for you\n• 📊 Application & loan status\n• 💰 Interest & repayment calculations\n• 📋 Collateral requirements\n• ✅ How to improve approval chances\n\nWhat would you like to know?`,
        time: new Date(),
      };
      setMessages([greeting]);
    }
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !client) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: trimmed, time: new Date() };
    setMessages(p => [...p, userMsg]);
    setTyping(true);

    // Simulate thinking delay (300-900ms, varies by response length)
    const delay = 300 + Math.random() * 600;
    await new Promise(r => setTimeout(r, delay));

    const responseText = respond(trimmed, client, applications);
    setTyping(false);
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: "bot", text: responseText, time: new Date() };
    setMessages(p => [...p, botMsg]);

    if (!open) setUnread(n => n + 1);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  if (!client) return null;

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-4 lg:right-6 z-50 w-[340px] lg:w-[380px] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700"
          style={{ height: "min(520px, calc(100vh - 120px))" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-700 to-indigo-600 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🤖</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Philix AI</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-indigo-200">Online — ask me anything</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-950 px-3 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-800/50 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">🤖</div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-800 border border-slate-700/50 text-slate-200 rounded-tl-sm"
                }`}>
                  {msg.role === "bot" ? <RenderMessage text={msg.text} /> : <p className="text-[13px]">{msg.text}</p>}
                  <div className={`text-[9px] mt-1 ${msg.role === "user" ? "text-indigo-300" : "text-slate-600"} text-right`}>
                    {msg.time.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-800/50 flex items-center justify-center flex-shrink-0 text-sm">🤖</div>
                <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="flex-shrink-0 bg-slate-900 px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto">
              {QUICK_REPLIES.map(qr => (
                <button key={qr} onClick={() => send(qr)}
                  className="flex-shrink-0 text-[11px] bg-slate-800 hover:bg-indigo-700 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-600 px-2.5 py-1.5 rounded-xl transition-all">
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-3 py-2.5 flex gap-2 items-center">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask me anything…"
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <button onClick={() => send(input)} disabled={!input.trim() || typing}
              className="w-9 h-9 flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-all">
              {typing ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button onClick={() => setOpen(v => !v)}
        className={`fixed bottom-[88px] right-4 lg:right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          open ? "bg-slate-700 hover:bg-slate-600" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50"
        }`}>
        {open ? <ChevronDown size={20} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
        {!open && (
          <span className="absolute -top-8 right-0 bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap border border-slate-700 pointer-events-none">
            Ask Philix AI
          </span>
        )}
      </button>
    </>
  );
}
