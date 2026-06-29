// @ts-nocheck
import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Wrap = (req: Request, res: Response, next: (e?: unknown) => void) => Promise<unknown>;
const wrap = (fn: Wrap) => (req: Request, res: Response, next: (e?: unknown) => void) =>
  fn(req, res, next).catch(next);

// ── Portal auth middleware ─────────────────────────────────────────────────────
async function portalAuth(req: Request, res: Response, next: (e?: unknown) => void) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as { id: string };
    const account = await prisma.clientPortalAccount.findUnique({
      where: { id: payload.id },
      include: { portalLoans: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!account) return res.status(401).json({ error: "Account not found" });
    (req as any).portalAccount = account;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat  — intelligent client portal chatbot
// ─────────────────────────────────────────────────────────────────────────────
router.post("/chat", portalAuth, wrap(async (req: Request, res: Response) => {
  const account = (req as any).portalAccount;
  const { messages, message } = req.body as {
    messages?: { role: "user" | "assistant"; content: string }[];
    message?: string;
  };

  const loans = account.portalLoans ?? [];
  const activeLoans = loans.filter((l: any) => l.status === "DISBURSED");
  const pendingLoans = loans.filter((l: any) => ["SUBMITTED", "UNDER_REVIEW"].includes(l.status));
  const approvedLoans = loans.filter((l: any) => l.status === "APPROVED");

  // Compute penalties for active loans
  const now = new Date();
  const GRACE_DAYS = 3;
  const loanDetails = activeLoans.map((l: any) => {
    const maturity = l.maturityDate ? new Date(l.maturityDate) : null;
    const daysUntilDue = maturity ? Math.floor((maturity.getTime() - now.getTime()) / 86400000) : null;
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
    const daysOverall = isOverdue ? Math.abs(daysUntilDue) : 0;
    const daysOverdue = Math.max(0, daysOverall - GRACE_DAYS);
    const outstanding = (l.totalDue ?? 0) - (l.totalPaid ?? 0);
    const penalty = daysOverdue > 0 ? outstanding * 0.02 * daysOverdue : 0;
    const totalOwed = outstanding + penalty;

    return {
      ref: l.reference,
      product: l.productType,
      principal: l.amountRequested,
      totalDue: l.totalDue,
      totalPaid: l.totalPaid ?? 0,
      outstanding,
      penalty: Math.round(penalty * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      dueDate: maturity ? maturity.toLocaleDateString("en-ZM") : "Unknown",
      daysUntilDue,
      daysOverdue,
      status: isOverdue ? (daysOverdue > GRACE_DAYS ? `OVERDUE ${daysOverdue} days — PENALTY ACCRUING` : `GRACE PERIOD (${daysOverall}/${GRACE_DAYS} days)`) : `DUE IN ${daysUntilDue} DAYS`,
      termWeeks: l.termMonths,
      disbursedDate: l.disbursedAt ? new Date(l.disbursedAt).toLocaleDateString("en-ZM") : "Unknown",
    };
  });

  const totalPenalties = loanDetails.reduce((s: number, l: any) => s + l.penalty, 0);
  const totalOutstanding = loanDetails.reduce((s: number, l: any) => s + l.outstanding, 0);
  const totalOwed = loanDetails.reduce((s: number, l: any) => s + l.totalOwed, 0);

  const systemPrompt = `You are Philix AI — the intelligent assistant for Philix Finance, a microfinance company in Lusaka, Zambia.

CLIENT PROFILE:
Name: ${account.firstName} ${account.lastName}
Client Number: ${account.clientNumber}
KYC Status: ${account.kycStatus}
Account Status: ${account.status}
Trusted Client: ${account.isTrustedClient ? "YES — eligible for Trusted Client Express Loan (no collateral required)" : "No"}
Trust Score: ${account.trustScore ?? "N/A"}/100
Monthly Income on file: ${account.monthlyIncome ? `K${account.monthlyIncome.toLocaleString()}` : "Not provided"}
Employer: ${account.employer ?? "Not on file"}
Member since: ${new Date(account.createdAt).toLocaleDateString("en-ZM")}

LOAN PORTFOLIO SUMMARY:
Active loans: ${activeLoans.length}
Pending review: ${pendingLoans.length}
Awaiting disbursement: ${approvedLoans.length}
Total loans ever: ${loans.length}
Total outstanding: K${totalOutstanding.toLocaleString()}
${totalPenalties > 0 ? `⚠️ PENALTIES ACCRUING: K${totalPenalties.toFixed(2)}` : "No active penalties"}
Total amount currently owed: K${totalOwed.toFixed(2)}

ACTIVE LOAN DETAILS:
${loanDetails.length > 0 ? loanDetails.map((l: any) =>
  `• Ref: ${l.ref} | ${l.product}
   Principal: K${l.principal.toLocaleString()} | Term: ${l.termWeeks} weeks
   Total Due: K${l.totalDue.toLocaleString()} | Paid: K${l.totalPaid.toLocaleString()} | Outstanding: K${l.outstanding.toLocaleString()}
   Due Date: ${l.dueDate} | Status: ${l.status}
   ${l.penalty > 0 ? `PENALTY: K${l.penalty.toFixed(2)} (${l.daysOverdue} days × 2% × K${l.outstanding.toLocaleString()}) | TOTAL OWED: K${l.totalOwed.toFixed(2)}` : "No penalty"}`
).join("\n\n") : "No active loans"}

RECENT LOAN HISTORY:
${loans.slice(0, 8).map((l: any) =>
  `• ${l.reference} | ${l.productType} | K${l.amountRequested.toLocaleString()} | ${l.status} | Applied: ${new Date(l.createdAt).toLocaleDateString("en-ZM")}`
).join("\n") || "No loan history"}

PHILIX FINANCE DETAILS:
Products & Rates (all flat interest):
• Quick Salary Loan: K100–K5,000 | 1–4 weeks | 10–35% flat | Payslip + collateral required
• Student Loan: K200–K3,000 | 1–4 weeks | Admission letter + guarantor required
• Business Growth Loan: K500–K10,000 | 1–4 weeks | Business docs + collateral required
• Agricultural Input Loan: K300–K8,000 | 1–4 weeks | Farmer registration required
• Repeat Customer Loyalty Loan: K200–K5,000 | 1–4 weeks | 8–30% flat | For existing clients with good history
• Premium Client Loan: K300–K50,000 | 1–52 weeks | 7–28% flat | Full KYC + strong collateral
• Trusted Client Express Loan: K1,000–K25,000 | 4–24 weeks | 8–38% flat | NO COLLATERAL — for trusted clients only

PENALTY POLICY:
- 3-day grace period after maturity date
- After grace period: 2% per day on outstanding balance
- Formula: Penalty = Outstanding × 0.02 × Days Overdue (after grace)
- To avoid penalties, always pay on or before the due date

Contact: +260 777 158 901 | support@philixfinance.com | Mon–Fri 08:00–17:00 CAT

YOUR ROLE:
1. Answer any question about this client's loans, balances, exact amounts owed, due dates, and penalties — use the real data above
2. Generate precise repayment schedules (flat interest: Total = Principal × (1 + Rate/100), Weekly = Total ÷ Weeks)
3. Explain loan eligibility, requirements, and what the client needs to bring to the office
4. Give credit improvement advice based on their specific trust score and history
5. Explain the penalty calculation with exact numbers when asked
6. Always prioritise — if overdue, focus on getting them to pay or call the office immediately
7. Be encouraging, professional, warm, and focused on helping the client succeed financially

RULES:
- Always use real data from the client profile above — never guess or make up amounts
- Use Zambian Kwacha (K / ZMW) for all amounts
- Never reveal another client's information
- If they ask about a loan ref not in the data, tell them it's not on file
- Format responses with markdown (bold, bullets) for clarity
- Keep responses helpful but concise — no unnecessary filler
- If overdue: always mention the support number +260 777 158 901`;

  const conversationMessages = messages ?? [{ role: "user" as const, content: message ?? "" }];

  const response = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ text, role: "assistant" });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/staff-chat  — Enterprise AI with live portfolio intelligence
// ─────────────────────────────────────────────────────────────────────────────
router.post("/staff-chat", authenticate, wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { messages, message, context } = req.body as {
    messages?: { role: "user" | "assistant"; content: string }[];
    message?: string;
    context?: Record<string, unknown>;
  };

  // Pull rich live portfolio data
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const GRACE_DAYS = 3;

  const [
    totalAccounts, pendingApps, disbursedAgg, activeLoans,
    recentPayments, recentApps, kycPending,
  ] = await Promise.all([
    prisma.clientPortalAccount.count(),
    prisma.portalLoanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.portalLoanApplication.aggregate({
      _sum: { amountRequested: true, totalDue: true, totalPaid: true },
      where: { status: "DISBURSED" },
    }),
    prisma.portalLoanApplication.findMany({
      where: { status: "DISBURSED" },
      select: {
        reference: true, productType: true, amountRequested: true,
        totalDue: true, totalPaid: true, maturityDate: true,
        portalAccount: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.paymentSubmission?.findMany?.({
      where: { createdAt: { gte: startOfDay } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).catch(() => []),
    prisma.portalLoanApplication.findMany({
      where: { createdAt: { gte: startOfDay } },
      select: { reference: true, productType: true, amountRequested: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.clientPortalAccount.count({ where: { kycStatus: "PENDING" } }),
  ]);

  // Compute overdue loans from active
  const overdueLoans = activeLoans
    .filter((l: any) => {
      if (!l.maturityDate) return false;
      const daysUntilDue = Math.floor((new Date(l.maturityDate).getTime() - now.getTime()) / 86400000);
      return daysUntilDue < -GRACE_DAYS;
    })
    .map((l: any) => {
      const daysUntilDue = Math.floor((new Date(l.maturityDate).getTime() - now.getTime()) / 86400000);
      const daysOverdue = Math.abs(daysUntilDue) - GRACE_DAYS;
      const outstanding = (l.totalDue ?? 0) - (l.totalPaid ?? 0);
      const penalty = outstanding * 0.02 * daysOverdue;
      return {
        ref: l.reference, client: `${l.portalAccount.firstName} ${l.portalAccount.lastName}`,
        phone: l.portalAccount.phone, product: l.productType,
        outstanding, penalty: Math.round(penalty * 100) / 100,
        totalOwed: Math.round((outstanding + penalty) * 100) / 100,
        daysOverdue,
      };
    })
    .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);

  const totalPenalties = overdueLoans.reduce((s: number, l: any) => s + l.penalty, 0);
  const collectionsToday = (recentPayments as any[]).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
  const totalDisbursed = disbursedAgg._sum.amountRequested ?? 0;
  const totalRepayable = disbursedAgg._sum.totalDue ?? 0;
  const totalCollected = disbursedAgg._sum.totalPaid ?? 0;
  const outstandingPortfolio = totalRepayable - totalCollected;
  const PAR = activeLoans.length > 0 ? Math.round((overdueLoans.length / activeLoans.length) * 100) : 0;

  const portfolioContext = `
LIVE PORTFOLIO INTELLIGENCE (as of ${now.toLocaleString("en-ZM")}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Portfolio Overview:
• Total portal clients: ${totalAccounts}
• Active loans: ${activeLoans.length}
• Applications pending review: ${pendingApps}
• KYC pending: ${kycPending}
• Total disbursed (all time): K${totalDisbursed.toLocaleString()}
• Total repayable: K${totalRepayable.toLocaleString()}
• Total collected: K${totalCollected.toLocaleString()}
• Outstanding portfolio: K${outstandingPortfolio.toLocaleString()}
• Collections today: K${collectionsToday.toLocaleString()} (${(recentPayments as any[]).length} payments)
• Portfolio at Risk (PAR): ${PAR}%
• Total penalties accruing: K${totalPenalties.toFixed(2)}

Overdue Loans (>${GRACE_DAYS}-day grace, ${overdueLoans.length} total):
${overdueLoans.slice(0, 10).map((l: any) =>
  `• ${l.ref} | ${l.client} | ${l.phone ?? "No phone"} | ${l.product} | ${l.daysOverdue} days overdue | Owed: K${l.totalOwed.toLocaleString()} (incl. K${l.penalty} penalty)`
).join("\n") || "  None — all loans current"}

New Applications Today (${recentApps.length}):
${recentApps.map((a: any) => `• ${a.reference} | ${a.productType} | K${a.amountRequested.toLocaleString()} | ${a.status}`).join("\n") || "  None today"}

Recent Payments Today:
${(recentPayments as any[]).slice(0, 5).map((p: any) => `• K${p.amount?.toLocaleString()} at ${new Date(p.createdAt).toLocaleTimeString("en-ZM")}`).join("\n") || "  No payments recorded today"}`;

  const systemPrompt = `You are the Philix Finance Enterprise AI Operating System — Version 35.0.
You are the digital operating intelligence of Philix Finance, a microfinance company in Lusaka, Zambia.

CURRENT USER: ${user.firstName} ${user.lastName} (${user.role.replace(/_/g, " ")}) | ID: ${user.employeeId ?? "N/A"} | ${user.email}
${portfolioContext}

ADDITIONAL CONTEXT: ${context ? JSON.stringify(context, null, 2) : "None provided"}

YOUR CAPABILITIES:

CREDIT SCORING ENGINE:
Evaluate applications using 8 factors:
1. Identity & NRC Verification (15%)
2. Income Stability & Employment (20%)
3. Debt-to-Income Ratio (15%)
4. Repayment History (20%)
5. Business Viability (10% — business loans only)
6. Collateral Quality & LTV (15%)
7. Reference Verification (5%)
Total score 0–100 → LOW RISK (75+) / MEDIUM (55–74) / HIGH (35–54) / VERY HIGH (<35)
Always: give score, risk tier, approval recommendation, conditions, max loan amount.

FRAUD DETECTION:
Detect: fake NRCs, duplicate applications, inflated income, suspicious collateral, address inconsistencies.
Rate severity: LOW/MEDIUM/HIGH/CRITICAL. Give recommended immediate actions.

COLLATERAL ASSESSMENT:
FSV: Electronics 50–70% | Vehicles 60–80% | Property 70–90% | Livestock 50–60%
LTV = Loan Amount / FSV × 100. Accept if LTV ≤ 80%. Always give: Market Value, FSV, LTV, Recommendation.

FINANCIAL CALCULATIONS (always show formulas):
Flat interest: Total = Principal × (1 + Rate/100)
Weekly payment = Total / Weeks
Penalty = Outstanding × 0.02 × Days Overdue (after 3-day grace)
Max loan based on income: weekly repayment ≤ 30% of monthly income / 4.33

DOCUMENT GENERATION: Loan agreements, demand letters, approval/rejection letters, collateral reports, recovery notices.
All documents: use today's date, Philix Finance letterhead, professional tone, generated by ${user.firstName} ${user.lastName}.

DELINQUENCY MANAGEMENT (tier-based):
1–3 days → Grace period reminder (WhatsApp/SMS)
4–7 days → Firm reminder call + SMS (use live penalty amount from portfolio above)
8–14 days → Field visit + formal letter
15–30 days → Demand letter + guarantor contact
31–60 days → Pre-legal notice + collateral inspection
60+ days → Legal action initiation

EXECUTIVE INTELLIGENCE (CEO/MANAGER priority):
Use the LIVE PORTFOLIO DATA above for real-time analysis.
Think like a Chief Risk Officer: portfolio health, cash flow, collection efficiency, risk concentration.
Always quantify recommendations with data from the live portfolio.

PRODUCTS (Zambian Kwacha):
• Quick Salary Loan: K100–K5,000 | 1–4 weeks | 10–35% flat
• Student Loan: K200–K3,000 | 1–4 weeks
• Business Growth Loan: K500–K10,000 | 1–4 weeks
• Agricultural Input Loan: K300–K8,000 | 1–4 weeks
• Repeat Customer Loyalty: K200–K5,000 | 1–4 weeks | 8–30% flat
• Premium Client: K300–K50,000 | 1–52 weeks | 7–28% flat
• Trusted Client Express: K1,000–K25,000 | 4–24 weeks | 8–38% flat | NO COLLATERAL

RESPONSE RULES:
- Use real live data from the portfolio above when answering operational questions
- Never hallucinate numbers — use the data provided, or ask for missing info
- Always show calculation formulas (never just give a result)
- Be direct, data-driven, and actionable
- Every response ends with: **Recommended Next Action:** [specific, measurable action]
- For overdue collections: always include the client's phone number from the live data above`;

  const conversationMessages = messages ?? [{ role: "user" as const, content: message ?? "" }];

  const response = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ text, role: "assistant" });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/document  — formal document generation
// ─────────────────────────────────────────────────────────────────────────────
router.post("/document", authenticate, wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { type, data } = req.body as {
    type: "demand_letter" | "loan_agreement" | "approval_letter" | "rejection_letter" | "recovery_notice" | "collateral_report";
    data: Record<string, unknown>;
  };

  const today = new Date().toLocaleDateString("en-ZM", { day: "numeric", month: "long", year: "numeric" });
  const byLine = `${user.firstName} ${user.lastName} (${user.role.replace(/_/g, " ")})`;

  const docPrompts: Record<string, string> = {
    demand_letter: `Generate a professional formal demand letter for Philix Finance (Lusaka, Zambia). Date: ${today}. Prepared by: ${byLine}. Client details: ${JSON.stringify(data)}. Include: Philix Finance header, ref number, outstanding amount with penalties breakdown, firm 7-day deadline, legal recourse warning, payment methods, contact information (+260 777 158 901). Tone: firm but professional.`,
    loan_agreement: `Generate a complete, legally-formatted loan agreement for Philix Finance (Lusaka, Zambia). Date: ${today}. Prepared by: ${byLine}. Details: ${JSON.stringify(data)}. Include: parties, loan amount, interest (flat rate clearly stated), repayment schedule (week by week), penalty clause (2% per day after 3-day grace), collateral clause, early repayment terms, default clause, signatures section. Format: formal legal document.`,
    approval_letter: `Generate a formal loan approval letter from Philix Finance. Date: ${today}. Prepared by: ${byLine}. Details: ${JSON.stringify(data)}. Be congratulatory, include all conditions, disbursement instructions, repayment obligations, and next steps.`,
    rejection_letter: `Generate a professional, empathetic loan rejection letter from Philix Finance. Date: ${today}. Prepared by: ${byLine}. Details: ${JSON.stringify(data)}. Be respectful, give general reasons, encourage re-application after 30 days with specific tips to improve eligibility.`,
    recovery_notice: `Generate a formal debt recovery notice from Philix Finance. Date: ${today}. Prepared by: ${byLine}. Details: ${JSON.stringify(data)}. Include: escalation timeline, exact amounts owed, payment options, legal recourse warning within 14 days.`,
    collateral_report: `Generate a professional collateral inspection and assessment report for Philix Finance. Date: ${today}. Prepared by: ${byLine}. Item: ${JSON.stringify(data)}. Include: item description, condition assessment, market value estimate, Forced Sale Value (FSV), LTV ratio calculation, recommendation (Accept/Conditionally Accept/Reject with reasons).`,
  };

  const prompt = docPrompts[type];
  if (!prompt) return res.status(400).json({ error: "Invalid document type" });

  const response = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: `You are a professional document generator for Philix Finance, a microfinance company in Lusaka, Zambia. Generate formal, complete, legally-appropriate documents with proper formatting (headers, sections, signature blocks). All currency in Zambian Kwacha (K/ZMW).`,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ document: text, type, generatedBy: byLine, generatedAt: new Date().toISOString() });
}));

export default router;
