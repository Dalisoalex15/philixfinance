import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, ChevronDown } from "lucide-react";
import { useClientAuthStore, type ClientUser } from "../../store/clientAuth";
import { useLoanApplicationStore, type LoanApplication } from "../../store/loanApplicationStore";
import { mockLoanProducts } from "../../lib/mock-data";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: Date;
}

const Kw = (n: number) => `K${Math.round(n).toLocaleString()}`;
const fmtDate = (d: Date) => d.toLocaleDateString("en-ZM", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtShort = (d: Date) => d.toLocaleDateString("en-ZM", { day: "numeric", month: "short" });

// ── Loan helpers ──────────────────────────────────────────────────────────────
function dueDate(app: LoanApplication) {
  return new Date(new Date(app.submittedAt).getTime() + (app.termMonths ?? 1) * 7 * 86_400_000);
}
function daysLeft(app: LoanApplication) {
  return Math.ceil((dueDate(app).getTime() - Date.now()) / 86_400_000);
}
function totalDue(app: LoanApplication) {
  return app.totalRepayable || app.amount * (1 + (app.interestRate ?? 0) / 100);
}
function weeklyPay(app: LoanApplication) {
  return app.weeklyPayment || totalDue(app) / (app.termMonths ?? 1);
}

// ── Account health summary ────────────────────────────────────────────────────
function buildContext(client: ClientUser, myApps: LoanApplication[]) {
  const active    = myApps.filter(a => a.status === "DISBURSED");
  const pending   = myApps.filter(a => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const approved  = myApps.filter(a => a.status === "APPROVED");
  const rejected  = myApps.filter(a => a.status === "REJECTED");
  const overdue   = active.filter(a => daysLeft(a) < 0);
  const dueSoon   = active.filter(a => { const d = daysLeft(a); return d >= 0 && d <= 3; });
  const totalOwed = active.reduce((s, a) => s + totalDue(a), 0);
  const completed = myApps.filter(a => a.status === "DISBURSED").length;
  const kycOk     = client.kycStatus === "VERIFIED";
  return { active, pending, approved, rejected, overdue, dueSoon, totalOwed, completed, kycOk };
}

// ── Proactive greeting based on client situation ──────────────────────────────
function buildGreeting(client: ClientUser, ctx: ReturnType<typeof buildContext>): string {
  const name = client.firstName;
  const lines: string[] = [];

  // Urgent: overdue loans come first
  if (ctx.overdue.length > 0) {
    const loan = ctx.overdue[0];
    const late  = Math.abs(daysLeft(loan));
    lines.push(`⚠️ **Urgent, ${name}!** Your loan **${loan.ref}** (${Kw(loan.amount)}) is **${late} day${late > 1 ? "s" : ""} overdue**. Please call us NOW on **+260 777 158 901** before penalties grow further.`);
  }

  // Approved but not yet collected
  if (ctx.approved.length > 0) {
    const a = ctx.approved[0];
    lines.push(`🎉 **Great news!** Your loan **${a.ref}** (${Kw(a.amount)}) has been **APPROVED**! Come to the Philix office to collect your money. Call +260 777 158 901 to confirm your visit.`);
  }

  // Active loan due soon
  if (ctx.dueSoon.length > 0 && ctx.overdue.length === 0) {
    const loan = ctx.dueSoon[0];
    const d = daysLeft(loan);
    lines.push(`⏰ **Reminder, ${name}:** Your loan **${loan.ref}** is due in **${d === 0 ? "today!" : `${d} day${d > 1 ? "s" : ""}`}** — ${Kw(totalDue(loan))} on ${fmtShort(dueDate(loan))}.`);
  }

  // Pending review
  if (ctx.pending.length > 0 && ctx.overdue.length === 0 && ctx.approved.length === 0) {
    const p = ctx.pending[0];
    lines.push(`⏳ **Your application ${p.ref}** (${Kw(p.amount)}) is under review. Expect a decision within 24–48 hours.`);
  }

  // Normal greeting with snapshot
  const intro = lines.length > 0
    ? `Hello ${name}! I'm Philix AI. Here's your account snapshot:\n\n${lines.join("\n\n")}`
    : `Hello ${name}! 👋 I'm Philix AI — your personal loan advisor.`;

  const snapshot: string[] = [];
  if (ctx.active.length > 0)    snapshot.push(`💳 ${ctx.active.length} active loan${ctx.active.length > 1 ? "s" : ""} · Total owed: ${Kw(ctx.totalOwed)}`);
  if (ctx.pending.length > 0)   snapshot.push(`⏳ ${ctx.pending.length} application${ctx.pending.length > 1 ? "s" : ""} under review`);
  if (ctx.completed > 0)        snapshot.push(`✅ ${ctx.completed} loan${ctx.completed > 1 ? "s" : ""} completed`);
  if (!ctx.kycOk)               snapshot.push(`📋 KYC not verified — complete it for higher limits`);

  const help = `\n\nI can help you with:\n• "How much do I owe?" · "When is my loan due?"\n• "Am I overdue?" · "My account details"\n• "Best loan for me" · "Calculate K3000 for 2 weeks"\n• "Pay faster" · "Improve my chances"\n\nJust ask naturally — I know your account!`;

  if (snapshot.length > 0 && lines.length === 0) {
    return `${intro}\n\n${snapshot.join("\n")}${help}`;
  }
  return `${intro}${help}`;
}

// ── Core response engine ──────────────────────────────────────────────────────
function respond(input: string, client: ClientUser, myApps: LoanApplication[]): string {
  const q   = input.toLowerCase().trim();
  const ctx = buildContext(client, myApps);
  const { active, pending, approved, rejected, overdue } = ctx;

  // ── Identity / greeting ────────────────────────────────────────────────────
  if (/^(hi|hey|hello|good\s*(morning|afternoon|evening)|morning|afternoon|yo|sup|start)[\s!?.]*$/.test(q)) {
    return buildGreeting(client, ctx);
  }

  // ── "Who am I" / "my account" / "my details" ──────────────────────────────
  if (q.includes("who am i") || q.includes("my account") || q.includes("my details") || q.includes("my profile") ||
      q.includes("my name") || q.includes("my number") || q.includes("client number") || q.includes("account number")) {
    const kycLabel = { NOT_STARTED: "Not started", SUBMITTED: "Submitted — under review", VERIFIED: "✅ Verified", REJECTED: "❌ Rejected" }[client.kycStatus] ?? client.kycStatus;
    const joined = new Date(client.joinedAt).toLocaleDateString("en-ZM", { month: "long", year: "numeric" });
    return `**Your Philix Account:**\n\n👤 **Name:** ${client.firstName} ${client.lastName}\n🆔 **Client Number:** ${client.clientNumber}\n📧 **Email:** ${client.email}\n📞 **Phone:** ${client.phone}${client.nrcNumber ? `\n🪪 **NRC:** ${client.nrcNumber}` : ""}${client.occupation ? `\n💼 **Occupation:** ${client.occupation}` : ""}${client.employer ? `\n🏢 **Employer:** ${client.employer}` : ""}${client.monthlyIncome ? `\n💰 **Monthly Income:** ${Kw(client.monthlyIncome)}` : ""}\n📋 **KYC Status:** ${kycLabel}\n🗓 **Member since:** ${joined}\n\n**Loan Summary:**\n• Active loans: ${active.length}\n• Under review: ${pending.length}\n• Total completed: ${ctx.completed}\n• Total owed now: ${ctx.totalOwed > 0 ? Kw(ctx.totalOwed) : "Nothing due"}`;
  }

  // ── "How much do I owe" / "what do I owe" ─────────────────────────────────
  if ((q.includes("how much") || q.includes("what") || q.includes("total")) &&
      (q.includes("owe") || q.includes("due") || q.includes("outstanding") || q.includes("balance") || q.includes("left to pay"))) {
    if (active.length === 0) {
      return `You have no active loans right now, ${client.firstName} — you owe nothing! 🎉\n\n${pending.length > 0 ? `You do have ${pending.length} application${pending.length > 1 ? "s" : ""} under review (${pending.map(a => a.ref).join(", ")}).` : "Ready to apply? Tap **Apply for Loan** in the menu."}`;
    }
    const lines = active.map(a => {
      const d = daysLeft(a);
      const status = d < 0 ? `⚠️ ${Math.abs(d)} days OVERDUE` : d === 0 ? "Due TODAY" : `Due in ${d} day${d > 1 ? "s" : ""} (${fmtShort(dueDate(a))})`;
      return `• **${a.ref}** — ${a.productName}\n  Principal: ${Kw(a.amount)} | Total to repay: ${Kw(totalDue(a))}\n  Weekly: ${Kw(weeklyPay(a))} | ${status}`;
    });
    return `**What you owe, ${client.firstName}:**\n\n${lines.join("\n\n")}\n\n**Grand total outstanding: ${Kw(ctx.totalOwed)}**\n\nPay at the Philix office or call +260 777 158 901 to arrange mobile money payment.`;
  }

  // ── "When is my loan due" / "due date" ────────────────────────────────────
  if (q.includes("when") && (q.includes("due") || q.includes("repay") || q.includes("pay") || q.includes("deadline") || q.includes("expire"))) {
    if (active.length === 0) {
      return `You have no active loans right now, ${client.firstName}. Nothing is due!\n\nReady to borrow? Tap **Apply for Loan** in the menu.`;
    }
    const lines = active.map(a => {
      const d = daysLeft(a);
      const urgency = d < 0 ? `⚠️ **OVERDUE by ${Math.abs(d)} days!**` : d === 0 ? "⏰ **Due TODAY**" : d <= 3 ? `⚡ **Due in ${d} day${d > 1 ? "s" : ""} — very soon!**` : `✅ Due in ${d} days`;
      return `**${a.ref}** (${a.productName})\n• Amount: ${Kw(a.amount)} | Total: ${Kw(totalDue(a))}\n• Due date: **${fmtDate(dueDate(a))}**\n• Status: ${urgency}`;
    });
    return `**Your repayment schedule, ${client.firstName}:**\n\n${lines.join("\n\n")}\n\n📞 Can't pay on time? Call us immediately: **+260 777 158 901** — we can discuss options before it becomes overdue.`;
  }

  // ── "Am I overdue" / "am I late" / overdue check ──────────────────────────
  if (q.includes("overdue") || q.includes("late") || q.includes("am i behind") || q.includes("missed") ||
      (q.includes("am i") && (q.includes("overdue") || q.includes("late") || q.includes("behind")))) {
    if (overdue.length === 0 && active.length === 0) {
      return `No active loans, no overdue — you're all clear, ${client.firstName}! ✅\n\n${pending.length > 0 ? `Your application ${pending[0].ref} is currently under review.` : ""}`;
    }
    if (overdue.length === 0) {
      const next = active.sort((a, b) => daysLeft(a) - daysLeft(b))[0];
      const d = daysLeft(next);
      return `You're not overdue, ${client.firstName}! ✅\n\nYour next payment is **${d === 0 ? "TODAY" : `in ${d} day${d > 1 ? "s" : ""}`}**:\n• ${next.ref} — ${Kw(totalDue(next))} due ${fmtDate(dueDate(next))}\n\nSet a phone reminder so you don't miss it!`;
    }
    const loan = overdue[0];
    const late  = Math.abs(daysLeft(loan));
    const weeks = Math.ceil(late / 7);
    const penalty = weeklyPay(loan) * 0.05 * weeks;
    return `⚠️ **Yes, ${client.firstName} — you are overdue!**\n\n**${loan.ref}** (${loan.productName}) was due on **${fmtDate(dueDate(loan))}**\n\n• Days overdue: **${late} day${late > 1 ? "s" : ""}**\n• Original amount: ${Kw(loan.amount)}\n• Total balance: ${Kw(totalDue(loan))}\n• Late penalties so far: ~${Kw(penalty)}\n• **Amount to pay NOW: ~${Kw(totalDue(loan) + penalty)}**\n\n🚨 **Call us immediately:** +260 777 158 901\n\nThe sooner you contact us, the better — we can arrange a payment plan before it escalates further.`;
  }

  // ── "My loans" / "what loans do I have" ───────────────────────────────────
  if ((q.includes("my loan") || q.includes("my application") || q.includes("what loan") || q.includes("which loan") ||
       q.includes("show my") || q.includes("list my") || q.includes("all my")) &&
      (q.includes("loan") || q.includes("application") || q.includes("borrow"))) {
    if (myApps.length === 0) {
      return `You haven't applied for any loans yet, ${client.firstName}.\n\nTap **Apply for Loan** in the menu to get started. The process takes about 5 minutes!`;
    }
    const sections: string[] = [];
    if (approved.length > 0) sections.push(`🎉 **APPROVED — ready for collection:**\n${approved.map(a => `• ${a.ref} — ${Kw(a.amount)} (${a.productName})\n  Call +260 777 158 901 to arrange disbursement`).join("\n")}`);
    if (active.length > 0)   sections.push(`💳 **ACTIVE LOANS:**\n${active.map(a => { const d = daysLeft(a); return `• ${a.ref} — ${Kw(a.amount)} | Owe: ${Kw(totalDue(a))} | Due: ${fmtShort(dueDate(a))} (${d < 0 ? `⚠️ ${Math.abs(d)}d overdue` : `${d}d left`})`; }).join("\n")}`);
    if (pending.length > 0)  sections.push(`⏳ **UNDER REVIEW:**\n${pending.map(a => `• ${a.ref} — ${Kw(a.amount)} (${a.productName}) · Submitted ${new Date(a.submittedAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}`).join("\n")}`);
    if (rejected.length > 0) sections.push(`❌ **REJECTED (${rejected.length}):**\n${rejected.map(a => `• ${a.ref} — ${Kw(a.amount)} · ${a.rejectedReason ?? "Contact officer for reason"}`).join("\n")}`);
    return `**Your loan history, ${client.firstName}:**\n\n${sections.join("\n\n")}`;
  }

  // ── "My status" / "application status" ────────────────────────────────────
  if (q.includes("status") || q.includes("application status") || q.includes("what happened") || q.includes("any update") || q.includes("any news")) {
    if (myApps.length === 0) return `No applications on file yet, ${client.firstName}. Tap **Apply for Loan** to get started!`;
    const sections: string[] = [];
    if (overdue.length > 0)  sections.push(`🚨 **OVERDUE** — call us immediately: +260 777 158 901`);
    if (approved.length > 0) sections.push(`🎉 **APPROVED**: ${approved.map(a => `${a.ref} (${Kw(a.amount)})`).join(", ")} — collect at Philix office`);
    if (active.length > 0) {
      active.forEach(a => {
        const d = daysLeft(a);
        sections.push(`💳 **ACTIVE**: ${a.ref} — ${Kw(a.amount)} | Due ${d < 0 ? `⚠️ ${Math.abs(d)} days ago` : `in ${d} days (${fmtShort(dueDate(a))})`}`);
      });
    }
    if (pending.length > 0)  sections.push(`⏳ **UNDER REVIEW**: ${pending.map(a => `${a.ref} (${Kw(a.amount)})`).join(", ")} — decision within 24–48 hrs`);
    if (rejected.length > 0) sections.push(`❌ **REJECTED**: ${rejected.map(a => a.ref).join(", ")} — ${rejected[0].rejectedReason ?? "see officer for details"}`);
    return sections.join("\n\n");
  }

  // ── "My collateral" ────────────────────────────────────────────────────────
  if (q.includes("my collateral") || q.includes("collateral i") || q.includes("what did i pledge") || q.includes("what collateral")) {
    const withCollateral = myApps.filter(a => a.collateralType || a.collateralValue);
    if (withCollateral.length === 0) return `No collateral on file yet, ${client.firstName}. When you apply for a loan, you'll be able to add collateral (phone, laptop, vehicle, etc.) which increases your approval chances and loan limit.`;
    const lines = withCollateral.map(a =>
      `• **${a.ref}** — ${a.collateralType || "Not specified"}${a.collateralValue ? ` (Declared: ${Kw(a.collateralValue)})` : ""}${a.collateralDescription ? `\n  "${a.collateralDescription}"` : ""}${a.riskScore ? `\n  Risk Score: ${a.riskScore.toFixed(0)}/100 · ${a.riskCategory ?? ""}` : ""}`
    );
    return `**Your collateral history, ${client.firstName}:**\n\n${lines.join("\n\n")}\n\n**Tips to improve your collateral score:**\n✅ Bring ownership documents\n✅ Upload 4+ clear photos\n✅ Ensure item is in Excellent condition\n✅ Insurance on the item earns bonus points`;
  }

  // ── "My employer" / income ─────────────────────────────────────────────────
  if (q.includes("my employer") || q.includes("my job") || q.includes("my work") || q.includes("my salary") || q.includes("my income") || q.includes("my occupation")) {
    const empApp = myApps.find(a => a.employer || a.occupation);
    const emp = client.employer || empApp?.employer;
    const occ = client.occupation || empApp?.occupation;
    const income = client.monthlyIncome || empApp?.monthlyIncome;
    if (!emp && !occ) return `I don't have your employment details on file yet, ${client.firstName}. When you next apply, make sure to fill in your employer and income details — it significantly improves your approval chances!`;
    return `**Your employment on file, ${client.firstName}:**\n\n${occ ? `💼 Occupation: **${occ}**\n` : ""}${emp ? `🏢 Employer: **${emp}**\n` : ""}${income ? `💰 Monthly income: **${Kw(income)}**\n` : ""}\nKeeping this information up to date in your profile helps us approve higher loan amounts.`;
  }

  // ── Pay faster ─────────────────────────────────────────────────────────────
  if ((q.includes("pay") || q.includes("repay") || q.includes("clear") || q.includes("settle")) &&
      (q.includes("fast") || q.includes("quick") || q.includes("early") || q.includes("off") || q.includes("soon") || q.includes("faster"))) {
    if (active.length === 0) {
      return `You have no active loans right now, ${client.firstName}.\n\nWhen you do, here's how to pay it off fastest:\n\n1️⃣ **Choose 1-week term** — 10% interest vs 35% for 4 weeks\n2️⃣ **Pay on time, every time** — avoids 5% weekly late penalties\n3️⃣ **Lump-sum early** — pay the full balance anytime before the due date\n4️⃣ **No new loans while one is open** — clears your slate faster`;
    }
    const loan = active[0];
    const d    = daysLeft(loan);
    const due  = totalDue(loan);
    const wkly = weeklyPay(loan);
    return `**Fastest way to pay off your ${loan.productName}, ${client.firstName}:**\n\n📊 **Your current loan:**\n• ${loan.ref} · ${Kw(loan.amount)} borrowed\n• Total to repay: **${Kw(due)}**\n• Weekly payment: **${Kw(wkly)}**\n• Due: **${d < 0 ? `⚠️ OVERDUE (${Math.abs(d)} days ago)` : `${fmtDate(dueDate(loan))} (${d} day${d > 1 ? "s" : ""})`}**\n\n**To pay it off faster:**\n\n1️⃣ **Pay more than ${Kw(wkly)}/week** — any extra reduces your balance immediately\n2️⃣ **Lump-sum settlement** — come in and pay the full ${Kw(due)} to close it today\n3️⃣ **Never miss a week** — one missed payment adds a 5% penalty to ${Kw(wkly)}\n4️⃣ **Come in early** — office hours: Mon–Fri 08:00–17:00\n\n📞 Call to arrange payment: **+260 777 158 901**`;
  }

  // ── Best loan recommendation ───────────────────────────────────────────────
  if ((q.includes("best") || q.includes("recommend") || q.includes("which loan") || q.includes("what loan") || q.includes("suit")) &&
      (q.includes("loan") || q.includes("product") || q.includes("borrow") || q.includes("apply"))) {
    const { completed, kycOk } = ctx;
    const hasIncome = !!(client.monthlyIncome || myApps.some(a => a.monthlyIncome));
    const hasCollateral = myApps.some(a => a.collateralValue > 0);

    if (completed >= 5) {
      return `**You're a Philix VIP, ${client.firstName}!** With ${completed} completed loans, you qualify for our top tier:\n\n🏆 **Premium Client Loan**\n• Amount: ${Kw(10000)} – ${Kw(50000)}\n• Rate: 7–28% (our lowest rate)\n• Fastest approval — your history speaks for itself\n\n⭐ **Repeat Customer Loyalty Loan**\n• Amount: ${Kw(5000)} – ${Kw(20000)}\n• Rate: 8–30% · 1–4 weeks\n\n👉 Tap **Apply for Loan** — you'll likely be approved within hours!`;
    }
    if (completed >= 2) {
      return `**Based on your profile, ${client.firstName}:**\n\n${hasCollateral ? "✅ You have collateral history — great for Electronics or Business loans\n\n" : ""}💼 **Business Working Capital Loan**\n• Up to ${Kw(15000)} · Rate: 10–35%\n• Best for: stock, equipment, business growth\n\n📱 **Electronics Equity Loan**\n• Up to ${Kw(10000)} · Rate: 10–35%\n• Uses phone, laptop, tablet as collateral\n\n${kycOk ? "✅ Your KYC is verified — you'll get priority processing!" : "⚠️ Complete your KYC to unlock higher amounts!"}`;
    }
    if (hasIncome) {
      return `**Recommended for you, ${client.firstName}:**\n\n💰 **Salary Advance Loan** — great fit since you have income on file!\n• Amount: ${Kw(1000)} – ${Kw(5000)}\n• Rate: 10–35% flat · 1–4 weeks\n• Bring: payslip + employer letter for fastest approval\n\n📱 **Electronics Equity Loan**\n• Amount: ${Kw(1000)} – ${Kw(10000)}\n• Use your phone or laptop as collateral\n\n**To maximise your approval:**\n${kycOk ? "✅ KYC verified!" : "⚠️ Complete KYC first — it unlocks higher limits"}\n• Upload 4+ collateral photos\n• Add a guarantor with stable income`;
    }
    return `**Starting recommendation for ${client.firstName}:**\n\n🎓 **Student Emergency Loan**\n• ${Kw(500)} – ${Kw(2000)} · 10–35% flat\n• Perfect entry-level loan · Phone/laptop accepted as collateral\n\n💰 **Salary Advance Loan**\n• ${Kw(1000)} – ${Kw(5000)} · Fastest for employed clients\n\n**Build your profile first:**\n${kycOk ? "✅ KYC done!" : "1️⃣ Verify KYC → unlocks higher limits"}\n2️⃣ Add your employer + income\n3️⃣ Bring collateral ownership docs\n4️⃣ Have 2 contactable references ready`;
  }

  // ── Calculate repayment ────────────────────────────────────────────────────
  if (q.includes("calculat") || q.includes("how much would") ||
      (q.includes("how much") && (q.includes("repay") || q.includes("pay back") || q.includes("owe") || q.includes("cost")))) {
    // Try to extract amount and weeks
    const amtMatch = q.match(/k?(\d[\d,]*)/i);
    const wkMatch  = q.match(/(\d)\s*week/);
    if (amtMatch) {
      const amt   = parseInt(amtMatch[1].replace(/,/g, ""));
      const weeks = wkMatch ? parseInt(wkMatch[1]) : 2;
      const rates: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 35 };
      const rate  = rates[Math.min(Math.max(weeks, 1), 4)] ?? 20;
      const tot   = amt * (1 + rate / 100);
      return `**Loan Calculation for ${client.firstName}:**\n\n• Amount borrowed: **${Kw(amt)}**\n• Term: **${weeks} week${weeks > 1 ? "s" : ""}**\n• Interest (${rate}% flat): **${Kw(amt * rate / 100)}**\n• **Total to repay: ${Kw(tot)}**\n• Weekly payment: **${Kw(tot / weeks)}**\n\n💡 **Compare terms:**\n• 1 week: Repay ${Kw(amt * 1.10)} (saves you ${Kw(tot - amt * 1.10)} vs ${weeks} weeks)\n• 2 weeks: Repay ${Kw(amt * 1.20)}\n• 3 weeks: Repay ${Kw(amt * 1.30)}\n• 4 weeks: Repay ${Kw(amt * 1.35)}\n\nReady to apply? Tap **Apply for Loan** in the menu!`;
    }
    if (active.length > 0) {
      const loan = active[0];
      const due  = totalDue(loan);
      return `**Your current loan balance, ${client.firstName}:**\n\n• Loan: ${loan.ref} (${loan.productName})\n• Borrowed: ${Kw(loan.amount)}\n• Interest (${loan.interestRate ?? 0}%): ${Kw(loan.amount * (loan.interestRate ?? 0) / 100)}\n• **Total to repay: ${Kw(due)}**\n• Weekly: ${Kw(weeklyPay(loan))}\n• Due: ${fmtDate(dueDate(loan))}\n\nWant to calculate a different amount? Try: *"Calculate K3000 for 1 week"*`;
    }
    return `Tell me the amount and term and I'll calculate it for you!\n\nExample: **"Calculate K2500 for 2 weeks"**\n\nOr use the **Loan Calculator** in the menu for a full breakdown.`;
  }

  // ── Interest rates ────────────────────────────────────────────────────────
  if (q.includes("interest") || q.includes("rate") || (q.includes("how much") && q.includes("charg"))) {
    return `**Philix Finance interest rates (flat on principal):**\n\n| Term | Rate | On ${Kw(1000)} | Weekly |\n|------|------|---------|--------|\n| 1 week | 10% | Repay ${Kw(1100)} | ${Kw(1100)} once |\n| 2 weeks | 20% | Repay ${Kw(1200)} | ${Kw(600)}/wk |\n| 3 weeks | 30% | Repay ${Kw(1300)} | ${Kw(433)}/wk |\n| 4 weeks | 35% | Repay ${Kw(1350)} | ${Kw(338)}/wk |\n\n**💡 Pro tip:** The 1-week term costs LEAST total (10% vs 35%). Always choose it if you can repay in one payment.\n\n${ctx.completed >= 3 ? `⭐ As a loyal client with ${ctx.completed} completed loans, you qualify for reduced rates starting at 7–8%!` : "Complete 3+ loans on time → earn loyalty rates from 7%!"}\n\n**Late penalty:** 5% of weekly payment per week overdue.`;
  }

  // ── KYC ──────────────────────────────────────────────────────────────────
  if (q.includes("kyc") || q.includes("verif") || q.includes("identity") || (q.includes("nrc") && !q.includes("number"))) {
    const kycStatus = { NOT_STARTED: "❌ Not started", SUBMITTED: "⏳ Submitted — under review", VERIFIED: "✅ Verified!", REJECTED: "❌ Rejected — resubmit required" }[client.kycStatus] ?? client.kycStatus;
    return `**Your KYC Status: ${kycStatus}**\n\n${client.kycStatus === "VERIFIED" ? `You're fully verified, ${client.firstName}! This gives you:\n✅ Priority loan processing\n✅ Access to higher loan amounts\n✅ Better interest rates` : `**How to complete KYC:**\n1. Tap **Identity Verification** in the menu\n2. Enter your NRC number\n3. Upload a clear photo of your NRC (both sides)\n4. Upload a utility bill or proof of address\n\n**Benefits of KYC verification:**\n✅ Faster decisions (same day possible)\n✅ Higher loan limits\n✅ Required for loans above ${Kw(2000)}\n✅ Better interest rates\n\nVerification takes **1–2 business days**. We'll notify you by SMS.`}`;
  }

  // ── Improve approval chances ──────────────────────────────────────────────
  if (q.includes("improve") || q.includes("chance") || (q.includes("how") && q.includes("approv")) || q.includes("get approved") || q.includes("tip")) {
    const missing: string[] = [];
    if (!ctx.kycOk)                                         missing.push("❌ KYC not verified — complete it for highest priority");
    if (!client.employer && !myApps.some(a => a.employer)) missing.push("❌ No employer on file — add it when applying");
    if (!client.monthlyIncome)                              missing.push("❌ Income not provided — add it to unlock higher amounts");
    if (!myApps.some(a => a.collateralValue > 0))          missing.push("❌ No collateral history — bring a phone, laptop, or vehicle");

    return `**How to maximise your approval, ${client.firstName}:**\n\n${missing.length > 0 ? `**Your profile gaps:**\n${missing.join("\n")}\n\n` : "Your profile looks solid! Here's what to maintain:\n\n"}**Universal tips:**\n1️⃣ **Complete KYC** — verified clients get priority processing & higher limits\n2️⃣ **Quality collateral** — Excellent condition + ownership docs + insurance\n3️⃣ **Upload 4+ photos** — front, back, sides, serial number\n4️⃣ **Income proof** — payslip, bank statement, or employer letter\n5️⃣ **Add a guarantor** — someone employed with stable income\n6️⃣ **Right amount** — loan should be <80% of your collateral's forced-sale value\n7️⃣ **Contactable references** — 2 people who answer their phones\n8️⃣ **Repay on time** — every clean repayment builds your credit history`;
  }

  // ── Overdue / late penalty ─────────────────────────────────────────────────
  if (q.includes("penalty") || q.includes("fine") || q.includes("fee") || q.includes("extra charge")) {
    if (overdue.length > 0) {
      const loan = overdue[0];
      const late  = Math.abs(daysLeft(loan));
      const weeks = Math.ceil(late / 7);
      const pen   = weeklyPay(loan) * 0.05 * weeks;
      return `⚠️ **Your penalty summary, ${client.firstName}:**\n\n• Loan ${loan.ref} is ${late} days overdue\n• Weekly payment: ${Kw(weeklyPay(loan))}\n• Penalty rate: 5% per week overdue\n• Weeks overdue: ~${weeks}\n• **Estimated penalty: ~${Kw(pen)}**\n• **Total now owed: ~${Kw(totalDue(loan) + pen)}**\n\n**Stop the clock — call NOW:** +260 777 158 901\n\nOur officers can arrange a structured repayment plan if you're struggling.`;
    }
    return `**Late payment penalties at Philix:**\n\n• Rate: **5% of your weekly payment per week overdue**\n• Example: If weekly payment = ${Kw(500)}, penalty = ${Kw(25)}/week late\n• After 4 weeks: ${Kw(100)} in penalties added\n\n${active.length > 0 ? `✅ Good news — your current loan (${active[0].ref}) is not yet overdue. Pay on **${fmtDate(dueDate(active[0]))}** to avoid any penalties!` : "You have no active loans right now — nothing to worry about!"}\n\nAlways call us before you miss a payment: +260 777 158 901`;
  }

  // ── Collateral info ───────────────────────────────────────────────────────
  if (q.includes("collateral") || q.includes("security") || q.includes("pledge") || q.includes("what can i use")) {
    return `**Collateral Philix accepts:**\n\n📱 **Electronics** (most common)\n   Smartphone, Laptop, Tablet, TV, Fridge\n   ↳ <5 years old gets best value | Bring original receipt\n\n🚗 **Vehicles**\n   Car, Motorcycle, Truck\n   ↳ Bring title/registration + insurance cert\n\n🏠 **Property**\n   Land title, Residential property (highest loan amounts)\n\n💰 **Financial Assets**\n   Fixed deposit, Savings account (easiest approval)\n\n🏢 **Business Assets**\n   Stock, Equipment, Machinery\n\n**Score boosters:**\n✅ Ownership documents → +20 pts\n✅ Excellent condition → +15 pts\n✅ Insurance → bonus points\n✅ 4+ clear photos\n✅ Serial number photo`;
  }

  // ── Contact / office ──────────────────────────────────────────────────────
  if (q.includes("contact") || q.includes("phone") || q.includes("call") || q.includes("office") || q.includes("speak") || q.includes("human") || q.includes("agent") || q.includes("reach")) {
    return `**Reach Philix Finance:**\n\n📞 **Phone / WhatsApp:** +260 777 158 901\n📧 **Email:** support@philixfinance.com\n📍 **Office:** Lusaka, Zambia\n🕐 **Hours:** Mon–Fri 08:00–17:00 CAT\n\n${overdue.length > 0 ? "⚠️ **You have an overdue loan — please call immediately!**\n\n" : ""}For account issues, you can also use **Support Center** in the menu.\n\nWhatsApp messages are typically responded to within a few hours during business hours.`;
  }

  // ── How long / processing ─────────────────────────────────────────────────
  if (q.includes("how long") || (q.includes("when") && (q.includes("approv") || q.includes("hear") || q.includes("get the money") || q.includes("disburse")))) {
    return `**Philix Finance timelines:**\n\n⏱ Application review: **24–48 hours**\n✅ Approval notification: **By phone/SMS**\n💵 Disbursement (after approval): **Same day** if you come in early\n🏦 Mobile Money transfers: Available for approved clients\n\n**Speed up your approval:**\n• Apply in the morning (8am–10am gets same-day decisions)\n• Make sure your phone is ON and reachable\n• Complete KYC beforehand${ctx.kycOk ? " ✅" : " (tap Identity Verification)"}\n• Have collateral ready for officer inspection\n\n${pending.length > 0 ? `📋 **Your application ${pending[0].ref} is currently under review.** Expected decision within 24–48 hrs from submission.` : ""}`;
  }

  // ── Credit score ──────────────────────────────────────────────────────────
  if (q.includes("credit") || q.includes("score") || q.includes("rating") || q.includes("history")) {
    const completedLoans  = myApps.filter(a => a.status === "DISBURSED").length;
    const rejectedCount   = rejected.length;
    const accountAgeDays  = Math.floor((Date.now() - new Date(client.joinedAt).getTime()) / 86_400_000);
    const estimatedScore  = Math.min(100, 30 + completedLoans * 10 + (ctx.kycOk ? 25 : 0) - rejectedCount * 10 + (client.employer ? 10 : 0) + Math.min(15, Math.floor(accountAgeDays / 30)));
    return `**Your Philix Credit Profile, ${client.firstName}:**\n\n📊 **Estimated score: ${estimatedScore}/100**\n\n📈 Completed loans: ${completedLoans} (+${completedLoans * 10} pts)\n🪪 KYC verified: ${ctx.kycOk ? "Yes (+25 pts)" : "No (+0 pts)"}\n❌ Rejected apps: ${rejectedCount} (-${rejectedCount * 10} pts)\n🏢 Employer on file: ${client.employer ? "Yes (+10 pts)" : "No"}\n📅 Account age: ${Math.floor(accountAgeDays / 30)} months (+${Math.min(15, Math.floor(accountAgeDays / 30))} pts)\n\n**To improve your score:**\n${!ctx.kycOk ? "• ✅ Complete KYC → +25 pts (biggest single boost!)\n" : ""}• Repay every loan on time → +10 pts each\n• Add employer + income → +10 pts\n• Avoid rejections — only apply for what you qualify for\n\nView full breakdown in **Credit Score** in the menu.`;
  }

  // ── Savings / financial advice ────────────────────────────────────────────
  if (q.includes("save") || q.includes("saving") || q.includes("invest") || q.includes("advice") || q.includes("financial")) {
    return `**Financial tips from Philix AI, ${client.firstName}:**\n\n💡 **Borrow to GROW, not just to spend:**\nOnly take a loan if the money will generate income ≥ 3× the interest cost\nExample: ${Kw(1000)} at 20% = ${Kw(200)} cost → your business should earn ${Kw(600)}+ extra\n\n📅 **The "Pay Day" Rule:**\nThe moment your salary hits, set aside the repayment amount FIRST. Treat it like rent — non-negotiable.\n\n📈 **Build your credit ladder:**\nK500 → repay → K1000 → repay → K2000 → repay → qualify for ${Kw(10000)}+ at 7% rate\n\n⚠️ **Avoid the debt trap:**\n• Never take a new loan to repay an old one\n• Never borrow more than 30% of your monthly income\n• Always read the total repayment amount — not just the weekly payment`;
  }

  // ── What can you do ───────────────────────────────────────────────────────
  if (q.includes("what can you") || q.includes("what do you") || q.includes("capabilities") || q.includes("help me") || q.includes("what do")) {
    return `**I'm Philix AI — here's what I know about you and can help with:**\n\n👤 **Your Account**\n• "How much do I owe?" · "When is my loan due?"\n• "Am I overdue?" · "My account details" · "My loans"\n• "My collateral" · "My employer"\n\n💰 **Loan Help**\n• "Calculate K3000 for 2 weeks"\n• "Best loan for me" · "Pay faster"\n• "What are the rates?" · "When will I get approved?"\n\n📈 **Guidance**\n• "Improve my chances" · "My credit score"\n• "Collateral tips" · "KYC status"\n• "Contact Philix" · "Financial advice"\n\nJust talk to me naturally — I know your account!`;
  }

  // ── Proactive suggestions based on situation ───────────────────────────────
  if (overdue.length > 0) {
    return `I didn't quite catch that, but I noticed you have an overdue loan!\n\n⚠️ **${overdue[0].ref}** is overdue — please call **+260 777 158 901** immediately.\n\nOr ask me: "How much do I owe?" or "What are my options?"`;
  }

  // ── Default ───────────────────────────────────────────────────────────────
  const suggestions = [
    `"How much do I owe?"`,
    `"When is my loan due?"`,
    `"Best loan for me"`,
    `"Calculate K2000 for 2 weeks"`,
    `"My account details"`,
  ];
  return `I didn't quite understand that, ${client.firstName}. Try:\n\n${suggestions.map(s => `• ${s}`).join("\n")}\n\nOr just describe what you need in your own words — I'll do my best!`;
}

// ── Dynamic quick replies based on client situation ────────────────────────────
function getQuickReplies(client: ClientUser, myApps: LoanApplication[]): string[] {
  const ctx = buildContext(client, myApps);
  if (ctx.overdue.length > 0)       return ["How much do I owe?", "Am I overdue?", "My loan status", "Contact Philix"];
  if (ctx.approved.length > 0)      return ["My loan status", "Contact Philix", "How much do I owe?", "Pay faster"];
  if (ctx.active.length > 0)        return ["How much do I owe?", "When is my loan due?", "Pay faster", "My account details"];
  if (ctx.pending.length > 0)       return ["My loan status", "How long does approval take?", "Improve my chances", "My account details"];
  return ["Best loan for me", "Interest rates", "Calculate K2000 for 2 weeks", "My account details", "Collateral tips"];
}

// ── Render message with basic markdown ────────────────────────────────────────
function RenderMessage({ text }: { text: string }) {
  return (
    <div className="text-[13px] leading-relaxed space-y-0.5">
      {text.split("\n").map((line, i) => {
        const html = line
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/__(.*?)__/g, "<u>$1</u>");
        return <p key={i} className={line === "" ? "h-1.5" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PortalChatbot() {
  const client       = useClientAuthStore(s => s.client);
  const syncFromApi  = useLoanApplicationStore(s => s.syncFromApi);
  const applications = useLoanApplicationStore(s => s.applications);
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [unread, setUnread]   = useState(0);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const myApps = client ? applications.filter(a => a.clientId === client.id) : [];

  // Sync data on first open
  useEffect(() => {
    if (open && messages.length === 0 && client) {
      syncFromApi().then(() => {
        const freshApps = useLoanApplicationStore.getState().applications.filter(a => a.clientId === client.id);
        const ctx       = buildContext(client, freshApps);
        setMessages([{
          id: "init", role: "bot", time: new Date(),
          text: buildGreeting(client, ctx),
        }]);
      });
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !client) return;
    setInput("");
    setMessages(p => [...p, { id: Date.now().toString(), role: "user", text: trimmed, time: new Date() }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 350 + Math.random() * 500));
    const freshApps = useLoanApplicationStore.getState().applications.filter(a => a.clientId === client.id);
    const reply = respond(trimmed, client, freshApps);
    setTyping(false);
    setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "bot", text: reply, time: new Date() }]);
    if (!open) setUnread(n => n + 1);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  if (!client) return null;

  const quickReplies = getQuickReplies(client, myApps);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 lg:right-6 z-50 w-[340px] lg:w-[380px] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700"
          style={{ height: "min(560px, calc(100vh - 120px))" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-700 to-indigo-600 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">🤖</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Philix AI</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-indigo-200">Knows your account · Ask anything</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1"><X size={16} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-950 px-3 py-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-800/50 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">🤖</div>
                )}
                <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-800 border border-slate-700/50 text-slate-200 rounded-tl-sm"
                }`}>
                  {msg.role === "bot" ? <RenderMessage text={msg.text} /> : <p className="text-[13px]">{msg.text}</p>}
                  <div className={`text-[9px] mt-1 text-right ${msg.role === "user" ? "text-indigo-300" : "text-slate-600"}`}>
                    {msg.time.toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-800/50 flex items-center justify-center flex-shrink-0 text-sm">🤖</div>
                <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Dynamic quick replies */}
          {messages.length <= 2 && (
            <div className="flex-shrink-0 bg-slate-900 px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-none">
              {quickReplies.map(qr => (
                <button key={qr} onClick={() => send(qr)}
                  className="flex-shrink-0 text-[11px] bg-slate-800 hover:bg-indigo-700 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-600 px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap">
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-3 py-2.5 flex gap-2 items-center">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask about your loans, account, rates…"
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <button onClick={() => send(input)} disabled={!input.trim() || typing}
              className="w-9 h-9 flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-all">
              {typing ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button onClick={() => setOpen(v => !v)}
        className={`fixed bottom-[88px] right-4 lg:right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          open ? "bg-slate-700 hover:bg-slate-600" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50"
        }`}>
        {open ? <ChevronDown size={20} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unread}</span>
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
