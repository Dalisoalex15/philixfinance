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
// POST /api/ai/chat  — client portal chatbot (claude-sonnet-4-6)
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
      ref: l.reference, product: l.productType, principal: l.amountRequested,
      totalDue: l.totalDue, totalPaid: l.totalPaid ?? 0, outstanding,
      penalty: Math.round(penalty * 100) / 100, totalOwed: Math.round(totalOwed * 100) / 100,
      dueDate: maturity ? maturity.toLocaleDateString("en-ZM") : "Unknown",
      daysUntilDue, daysOverdue,
      status: isOverdue ? (daysOverdue > GRACE_DAYS ? `OVERDUE ${daysOverdue} days — PENALTY ACCRUING` : `GRACE PERIOD (${daysOverall}/${GRACE_DAYS} days)`) : `DUE IN ${daysUntilDue} DAYS`,
      termWeeks: l.termMonths,
    };
  });

  const totalPenalties = loanDetails.reduce((s: number, l: any) => s + l.penalty, 0);
  const totalOutstanding = loanDetails.reduce((s: number, l: any) => s + l.outstanding, 0);
  const totalOwed = loanDetails.reduce((s: number, l: any) => s + l.totalOwed, 0);

  const systemPrompt = `You are Philix AI — the intelligent personal finance assistant for Philix Finance clients in Lusaka, Zambia.

CLIENT PROFILE:
Name: ${account.firstName} ${account.lastName} | Client #: ${account.clientNumber}
KYC: ${account.kycStatus} | Status: ${account.status} | Member since: ${new Date(account.createdAt).toLocaleDateString("en-ZM")}
Trusted Client: ${account.isTrustedClient ? "YES — eligible for Express Loan (no collateral)" : "No"}
Trust Score: ${account.trustScore ?? "N/A"}/100 | Monthly Income: ${account.monthlyIncome ? `K${account.monthlyIncome.toLocaleString()}` : "Not provided"}
Employer: ${account.employer ?? "Not on file"}

LOAN PORTFOLIO:
Active: ${activeLoans.length} | Pending: ${pendingLoans.length} | Awaiting disbursement: ${approvedLoans.length} | Total ever: ${loans.length}
Outstanding: K${totalOutstanding.toLocaleString()} | Total owed: K${totalOwed.toFixed(2)}
${totalPenalties > 0 ? `⚠️ PENALTIES ACCRUING: K${totalPenalties.toFixed(2)}` : "No penalties"}

${loanDetails.length > 0 ? `ACTIVE LOANS:\n${loanDetails.map((l: any) =>
  `• ${l.ref} | ${l.product} | K${l.principal.toLocaleString()} | ${l.termWeeks} weeks
   Due: ${l.dueDate} | Status: ${l.status}
   Paid: K${l.totalPaid.toLocaleString()} / K${l.totalDue?.toLocaleString()} | Owed: K${l.outstanding.toLocaleString()}
   ${l.penalty > 0 ? `PENALTY: K${l.penalty.toFixed(2)} | TOTAL DUE: K${l.totalOwed.toFixed(2)}` : ""}`.trim()
).join("\n\n")}` : "No active loans."}

RECENT HISTORY:
${loans.slice(0, 8).map((l: any) => `• ${l.reference} | ${l.productType} | K${l.amountRequested.toLocaleString()} | ${l.status}`).join("\n") || "None"}

PHILIX PRODUCTS (flat interest, Zambian Kwacha):
• Quick Salary Loan: K100–K5,000 | 1–4 weeks | 10–35% flat
• Student Loan: K200–K3,000 | 1–4 weeks | Admission letter + guarantor
• Business Growth: K500–K10,000 | 1–4 weeks | Business docs + collateral
• Agricultural Input: K300–K8,000 | 1–4 weeks | Farmer registration
• Repeat Client Loyalty: K200–K5,000 | 1–4 weeks | 8–30% flat
• Premium Client: K300–K50,000 | 1–52 weeks | 7–28% flat
• Trusted Express: K1,000–K25,000 | 4–24 weeks | 8–38% flat | NO COLLATERAL

PENALTY POLICY: 3-day grace → 2% per day on outstanding balance after grace period.

Contact: +260 777 158 901 | support@philixfinance.com | Mon–Fri 08:00–17:00 CAT

RULES: Use real data only. Never reveal other clients' info. Use K (Zambian Kwacha). Be helpful, warm, professional. If overdue, emphasise payment urgency and contact number.`;

  const conversationMessages = messages ?? [{ role: "user" as const, content: message ?? "" }];
  const response = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ text, role: "assistant" });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/staff-chat  — Enterprise AI (standard, non-streaming)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/staff-chat", authenticate, wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { messages, message, context } = req.body;
  const portfolioContext = await buildPortfolioContext();

  const systemPrompt = buildStaffSystemPrompt(user, portfolioContext, context);
  const conversationMessages = messages ?? [{ role: "user" as const, content: message ?? "" }];

  const response = await ai.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ text, role: "assistant" });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/staff-chat/stream  — Enterprise AI with streaming (SSE)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/staff-chat/stream", authenticate, wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { messages, message, context } = req.body;
  const portfolioContext = await buildPortfolioContext();
  const systemPrompt = buildStaffSystemPrompt(user, portfolioContext, context);
  const conversationMessages = messages ?? [{ role: "user" as const, content: message ?? "" }];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const stream = ai.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: systemPrompt,
      messages: conversationMessages,
    });

    stream.on("text", (text: string) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    await stream.finalMessage();
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message ?? "AI error" })}\n\n`);
    res.end();
  }
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
    model: "claude-opus-4-8",
    max_tokens: 4000,
    system: `You are a professional legal document generator for Philix Finance, a licensed microfinance institution in Lusaka, Zambia. Generate formal, complete, legally-appropriate documents with proper formatting (headers, sections, numbered clauses, signature blocks). All currency in Zambian Kwacha (K/ZMW). Comply with Zambian financial regulations (Bank of Zambia guidelines, Microfinance Act).`,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ document: text, type, generatedBy: byLine, generatedAt: new Date().toISOString() });
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function buildPortfolioContext(): Promise<string> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const GRACE_DAYS = 3;

  const [
    totalAccounts, pendingApps, disbursedAgg, activeLoans,
    recentPayments, recentApps, kycPending, kycInReview,
    newClientsThisMonth, approvedThisMonth, expenses, topClients,
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
        totalDue: true, totalPaid: true, maturityDate: true, disbursedAt: true,
        portalAccount: { select: { firstName: true, lastName: true, phone: true, clientNumber: true, trustScore: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.paymentSubmission?.findMany?.({
      where: { createdAt: { gte: startOfDay } },
      select: { amount: true, createdAt: true, paymentMethod: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []),
    prisma.portalLoanApplication.findMany({
      where: { createdAt: { gte: startOfDay } },
      select: { reference: true, productType: true, amountRequested: true, status: true,
        portalAccount: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.clientPortalAccount.count({ where: { kycStatus: "PENDING" } }),
    prisma.clientPortalAccount.count({ where: { kycStatus: "IN_REVIEW" } }),
    prisma.clientPortalAccount.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.portalLoanApplication.count({ where: { status: "APPROVED", reviewedAt: { gte: startOfMonth } } }),
    prisma.portalLoanApplication.aggregate({
      _sum: { amountRequested: true },
      where: { status: "DISBURSED", disbursedAt: { gte: startOfMonth } },
    }).catch(() => ({ _sum: { amountRequested: 0 } })),
    prisma.clientPortalAccount.findMany({
      where: { trustScore: { gt: 70 } },
      select: { firstName: true, lastName: true, clientNumber: true, trustScore: true },
      orderBy: { trustScore: "desc" },
      take: 5,
    }).catch(() => []),
  ]);

  // Compute overdue loans
  const overdueLoans = activeLoans
    .filter((l: any) => {
      if (!l.maturityDate) return false;
      const days = Math.floor((new Date(l.maturityDate).getTime() - now.getTime()) / 86400000);
      return days < -GRACE_DAYS;
    })
    .map((l: any) => {
      const daysUntilDue = Math.floor((new Date(l.maturityDate).getTime() - now.getTime()) / 86400000);
      const daysOverdue = Math.abs(daysUntilDue) - GRACE_DAYS;
      const outstanding = (l.totalDue ?? 0) - (l.totalPaid ?? 0);
      const penalty = outstanding * 0.02 * daysOverdue;
      return {
        ref: l.reference, client: `${l.portalAccount.firstName} ${l.portalAccount.lastName}`,
        clientNum: l.portalAccount.clientNumber, phone: l.portalAccount.phone,
        product: l.productType, outstanding,
        penalty: Math.round(penalty * 100) / 100,
        totalOwed: Math.round((outstanding + penalty) * 100) / 100,
        daysOverdue,
      };
    })
    .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);

  // Loans due soon (next 7 days)
  const dueSoon = activeLoans
    .filter((l: any) => {
      if (!l.maturityDate) return false;
      const days = Math.floor((new Date(l.maturityDate).getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 7;
    })
    .map((l: any) => {
      const days = Math.floor((new Date(l.maturityDate).getTime() - now.getTime()) / 86400000);
      const outstanding = (l.totalDue ?? 0) - (l.totalPaid ?? 0);
      return { ref: l.reference, client: `${l.portalAccount.firstName} ${l.portalAccount.lastName}`,
        phone: l.portalAccount.phone, daysLeft: days, outstanding };
    });

  const totalPenalties = overdueLoans.reduce((s: number, l: any) => s + l.penalty, 0);
  const collectionsToday = (recentPayments as any[]).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
  const totalDisbursed = disbursedAgg._sum.amountRequested ?? 0;
  const totalRepayable = disbursedAgg._sum.totalDue ?? 0;
  const totalCollected = disbursedAgg._sum.totalPaid ?? 0;
  const outstandingPortfolio = totalRepayable - totalCollected;
  const PAR = activeLoans.length > 0 ? ((overdueLoans.length / activeLoans.length) * 100).toFixed(1) : "0.0";
  const collectionRate = totalRepayable > 0 ? ((totalCollected / totalRepayable) * 100).toFixed(1) : "0.0";
  const disbursedThisMonth = (expenses as any)?._sum?.amountRequested ?? 0;

  return `
════════════════════════════════════════════
LIVE PORTFOLIO INTELLIGENCE — ${now.toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" })} (CAT)
════════════════════════════════════════════

📊 PORTFOLIO OVERVIEW:
• Total portal clients: ${totalAccounts} (${newClientsThisMonth} new this month)
• Active disbursed loans: ${activeLoans.length}
• Applications pending review: ${pendingApps}
• KYC pending: ${kycPending} | In review: ${kycInReview}
• Approved awaiting disbursement: ${approvedThisMonth}

💰 FINANCIAL SUMMARY:
• Total disbursed (all time): K${totalDisbursed.toLocaleString()}
• Total repayable: K${totalRepayable.toLocaleString()}
• Total collected: K${totalCollected.toLocaleString()}
• Outstanding portfolio: K${outstandingPortfolio.toLocaleString()}
• Collection rate: ${collectionRate}%
• Portfolio at Risk (PAR): ${PAR}%
• Total penalties accruing: K${totalPenalties.toFixed(2)}

📅 TODAY'S ACTIVITY:
• Collections today: K${collectionsToday.toLocaleString()} (${(recentPayments as any[]).length} payment${(recentPayments as any[]).length !== 1 ? "s" : ""})
${(recentPayments as any[]).slice(0, 5).map((p: any) => `  - K${p.amount?.toLocaleString()} at ${new Date(p.createdAt).toLocaleTimeString("en-ZM", { hour: "2-digit", minute: "2-digit" })}`).join("\n") || "  No payments yet today"}
• New applications today: ${recentApps.length}
${recentApps.slice(0, 5).map((a: any) => `  - ${a.reference} | ${a.portalAccount?.firstName} ${a.portalAccount?.lastName} | ${a.productType} | K${a.amountRequested?.toLocaleString()} | ${a.status}`).join("\n") || "  None today"}

🚨 OVERDUE LOANS — ${overdueLoans.length} total (>${GRACE_DAYS}-day grace):
${overdueLoans.slice(0, 15).map((l: any) =>
  `  • ${l.ref} | ${l.client} (${l.clientNum}) | ${l.phone ?? "No phone"}
    ${l.product} | ${l.daysOverdue}d overdue | Outstanding: K${l.outstanding.toLocaleString()} | Penalty: K${l.penalty} | TOTAL: K${l.totalOwed.toLocaleString()}`
).join("\n") || "  ✅ No overdue loans — excellent!"}

⏰ DUE IN NEXT 7 DAYS — ${dueSoon.length} loans:
${dueSoon.slice(0, 10).map((l: any) =>
  `  • ${l.ref} | ${l.client} | ${l.phone ?? "No phone"} | Due in ${l.daysLeft} day${l.daysLeft !== 1 ? "s" : ""} | K${l.outstanding.toLocaleString()} outstanding`
).join("\n") || "  None due in next 7 days"}

⭐ TOP TRUST SCORE CLIENTS:
${(topClients as any[]).slice(0, 5).map((c: any) =>
  `  • ${c.firstName} ${c.lastName} (${c.clientNumber}) | Trust Score: ${c.trustScore}/100`
).join("\n") || "  No high-trust clients yet"}
════════════════════════════════════════════`;
}

function buildStaffSystemPrompt(user: any, portfolioContext: string, context?: any): string {
  return `You are PHILIX ENTERPRISE AI — the most advanced financial intelligence system for Philix Finance, a licensed microfinance institution in Lusaka, Zambia. You operate at the level of a Chief Risk Officer, CFO, and Senior Credit Analyst combined.

CURRENT OPERATOR: ${user.firstName} ${user.lastName} | Role: ${user.role.replace(/_/g, " ")} | ID: ${user.employeeId ?? "N/A"} | ${user.email}
${portfolioContext}
${context ? `\nADDITIONAL CONTEXT: ${JSON.stringify(context, null, 2)}` : ""}

═══════════════════════════════════════════════════
INTELLIGENCE CAPABILITIES
═══════════════════════════════════════════════════

🎯 CREDIT SCORING ENGINE (8-Factor Model):
Score each factor 0–100, apply weights:
1. Identity & NRC Verification (15%) — Validity, consistency, blacklist check
2. Income Stability & Employment (20%) — Payslip authenticity, employer verification, tenure
3. Debt-to-Income Ratio (15%) — Monthly repayment ≤ 30% of monthly income
4. Repayment History (20%) — On-time rate, # of completed loans, defaults
5. Business Viability (10%, business loans only) — Revenue, trading time, market assessment
6. Collateral Quality & LTV (15%) — FSV calculation, LTV ratio, asset liquidity
7. Reference Verification (5%) — Guarantor stability, contact reachability
8. Behavioural Factors (0% explicit, modifies score) — Application patterns, inconsistencies

RISK TIERS: LOW (75–100) | MEDIUM (55–74) | HIGH (35–54) | VERY HIGH (0–34)
APPROVAL GUIDELINES: LOW → Approve up to K50,000 | MEDIUM → Approve K5,000 with conditions | HIGH → Decline or K2,000 max with extra collateral | VERY HIGH → Decline

🔍 FRAUD DETECTION FRAMEWORK:
Red flags to identify: NRC format inconsistencies (ZM format: XXXXXXXX/XX/X), duplicate phone numbers across accounts, salary-to-loan ratio mismatches, inflated employer claims, rushed multi-applications, inconsistent addresses, suspicious collateral valuations, guarantors refusing verification.
Severity: LOW/MEDIUM/HIGH/CRITICAL. Give specific investigation steps for each finding.

📦 COLLATERAL ASSESSMENT (FSV Calculator):
| Asset Class | Market → FSV | Notes |
|---|---|---|
| Electronics | 50–70% | Depreciation, authenticity |
| Mobile phones | 40–60% | Rapid depreciation |
| Vehicles (≤5yr) | 70–85% | Roadworthiness, papers |
| Vehicles (>5yr) | 50–70% | Higher depreciation |
| Residential property | 75–90% | Title deed, location |
| Commercial property | 70–85% | Zoning, occupancy |
| Livestock (cattle) | 55–65% | Health, market prices |
| Agricultural equipment | 50–70% | Working condition |

LTV = Loan Amount / FSV × 100. Accept ≤ 80% LTV.
Always provide: Estimated Market Value, FSV, LTV%, Recommendation, Conditions.

💵 FINANCIAL CALCULATIONS (always show full working):
• Flat interest: Total Repayable = Principal × (1 + Rate/100)
• Weekly payment = Total Repayable / Number of Weeks
• Monthly equivalent = Total Repayable / (Weeks / 4.33)
• Penalty = Outstanding Balance × 0.02 × Days Overdue (after 3-day grace period)
• Max affordable loan: (Monthly Income × 0.30 / 4.33) × Loan Term Weeks = Max Weekly Payment → solve for Principal
• Effective APR = (Rate × 52 / Weeks) × 100 %
• IRR / yield on portfolio = use standard financial formulas

📝 DOCUMENT GENERATION (professional, formal, legally appropriate):
Generate complete documents: demand letters, loan agreements, approval/rejection letters, collateral reports, recovery notices, compliance certificates, board reports, investor reports.
Always include: Philix Finance letterhead, today's date, document reference number, proper sections, signature blocks.
Comply with: Zambian Microfinance Act, Bank of Zambia Directive (Microfinance), ZICB regulations.

📞 DELINQUENCY MANAGEMENT (tier-based escalation):
• Day 1–3: Grace period (no action, monitor)
• Day 4–7: WhatsApp/SMS reminder with exact amount owed
• Day 8–14: Outbound call + firm SMS + letter to client
• Day 15–30: Field visit + formal demand letter + guarantor contact
• Day 31–60: Formal demand letter + collateral inspection + pre-legal notice
• Day 60+: Legal proceedings + collateral seizure + credit bureau reporting (ZICB)
Always provide: specific call scripts, exact message templates, escalation timelines

📈 EXECUTIVE INTELLIGENCE (CEO/MANAGER level):
Perform advanced financial analysis:
• Portfolio health scoring: PAR 0–5% (healthy) | 5–10% (moderate risk) | >10% (high risk)
• Cash flow forecasting: expected collections = outstanding × collection rate
• Risk concentration analysis: by product type, geography, employer sector
• Growth vs. risk balance: new disbursements vs. recovery rate
• Officer performance analysis: disbursements per officer, collection rate per officer
• Profitability: interest revenue − operating costs − provisions = net profit
• Provision requirements: Zambian IFRS 9 expected credit loss model

🇿🇲 ZAMBIAN REGULATORY KNOWLEDGE:
• Bank of Zambia (BOZ) licensing requirements for microfinance
• Zambia Institute of Chartered Accountants (ZICA) reporting standards
• Zambia Credit Reference Bureau (ZICB) — reporting obligations, credit checks
• Zambian Employment Code Act 2019 — staff management compliance
• Anti-Money Laundering (AML) / Know Your Customer (KYC) requirements
• Financial Intelligence Centre (FIC) — suspicious transaction reporting
• Consumer Protection Act — fair lending practices
• Data Protection Act 2021 — client data handling

🧠 ADVANCED ANALYTICAL CAPABILITIES:
• Vintage analysis: cohort tracking of loan performance by origination month
• Roll rate analysis: migration of loans between delinquency buckets
• Concentration risk: % portfolio in any single employer/sector (max 25% recommended)
• Liquidity stress test: can Philix meet obligations if 20% of portfolio defaults?
• Break-even analysis: minimum portfolio size to cover operating costs
• Optimal product mix: which products generate highest risk-adjusted returns
• Client lifetime value: estimated revenue per client over lending relationship

═══════════════════════════════════════════════════
RESPONSE STANDARDS
═══════════════════════════════════════════════════

FORMAT:
- Use the LIVE PORTFOLIO DATA above for all operational questions — never guess figures
- Show ALL calculation steps with formulas (never just give a result)
- Use clear headers (##, ###) and bullet points for complex responses
- Quantify everything: percentages, Kwacha amounts, days, ratios
- For credit decisions: always give Score/Risk/Recommendation/Max Amount/Conditions
- Every response ends with: **📋 Recommended Action:** [specific, measurable, time-bound action]
- For overdue loans: always include client phone number from live data above
- For documents: generate complete, ready-to-use documents, not outlines

INTELLIGENCE LEVEL:
- Think 10 steps ahead — what are the second-order consequences?
- Challenge assumptions — if a client's numbers don't add up, say so
- Benchmark against Zambian microfinance industry standards
- Proactively identify risks the operator may not have considered
- Provide alternative scenarios (best case / base case / worst case)

ETHICAL GUARDRAILS:
- Never recommend illegal practices or BOZ regulation violations
- Be factual about risk — don't minimise dangers to please the operator
- Client privacy: only share info with authorised staff
- Flag potential conflicts of interest
- Recommend legal counsel for complex regulatory matters`;
}

export default router;
