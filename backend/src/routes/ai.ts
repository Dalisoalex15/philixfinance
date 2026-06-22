import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type AsyncHandler = (req: Request, res: Response, next: (err?: unknown) => void) => Promise<unknown>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: (err?: unknown) => void) =>
  fn(req, res, next).catch(next);

// ── Portal middleware (token from Authorization header) ─────────────────────
import jwt from "jsonwebtoken";

async function portalAuth(req: Request, res: Response, next: (err?: unknown) => void) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as { id: string };
    const account = await prisma.clientPortalAccount.findUnique({
      where: { id: payload.id },
      include: {
        portalLoans: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!account) return res.status(401).json({ error: "Account not found" });
    (req as any).portalAccount = account;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat  — client portal chatbot (Claude-powered)
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
  const completedLoans = loans.filter((l: any) => l.status === "DISBURSED").length;

  const systemPrompt = `You are Philix AI — the intelligent assistant for Philix Finance, a microfinance company in Zambia.

You are speaking to CLIENT: ${account.firstName} ${account.lastName}
Client Number: ${account.clientNumber}
KYC Status: ${account.kycStatus}
Account Status: ${account.status}
Trusted Client: ${account.isTrustedClient ? "YES — eligible for Trusted Client Express Loan (no collateral)" : "No"}
Trust Score: ${account.trustScore ?? "N/A"}/100
Monthly Income on file: ${account.monthlyIncome ? `K${account.monthlyIncome.toLocaleString()}` : "Not provided"}
Employer: ${account.employer ?? "Not on file"}

LOAN HISTORY (${loans.length} total):
${loans.slice(0, 5).map((l: any) =>
  `• Ref: ${l.reference} | Product: ${l.productType} | Amount: K${l.amountRequested.toLocaleString()} | Status: ${l.status} | Term: ${l.termMonths} weeks | Applied: ${new Date(l.createdAt).toLocaleDateString("en-ZM")}`
).join("\n") || "No loan history"}

Active loans: ${activeLoans.length}
Pending review: ${pendingLoans.length}
Completed loans: ${completedLoans}

PHILIX FINANCE DETAILS:
- Products: Quick Salary Loan (K100–K5,000, 1–4 weeks), Student Loan, Business Growth Loan, Agri Loan, Repeat Loyalty Loan, Premium Client Loan (K300–K50,000), Trusted Client Express Loan (K1,000–K25,000, 4–24 weeks, NO collateral)
- All interest rates are FLAT. Rates range from 7–35% depending on product and term.
- Company phone: +260 777 158 901
- Company email: support@philixfinance.com
- Office: Lusaka, Zambia. Hours: Mon–Fri 08:00–17:00 CAT
- Currency: Zambian Kwacha (ZMW / K)

YOUR ROLE:
1. Answer any question about this client's loans, balances, due dates, penalties, eligibility
2. Calculate loan repayments exactly when asked (flat interest: total = principal × (1 + rate/100))
3. Give financial advice and credit improvement tips
4. Explain Philix products and requirements
5. Generate repayment schedules when asked
6. Advise on collateral requirements and how to improve approval chances
7. Always be encouraging, professional, and focused on helping the client succeed

RULES:
- Never reveal another client's information
- Never show or discuss passwords
- Use Zambian Kwacha (K / ZMW) for all amounts
- Keep responses concise but complete
- If the client is overdue, always prioritise getting them to call +260 777 158 901
- Format responses with markdown (bold, bullets) for clarity`;

  const conversationMessages = messages ?? [{ role: "user" as const, content: message ?? "" }];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ text, role: "assistant" });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/staff-chat  — staff Enterprise AI OS (Claude-powered)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/staff-chat", authenticate, wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { messages, message, context } = req.body as {
    messages?: { role: "user" | "assistant"; content: string }[];
    message?: string;
    context?: Record<string, unknown>;
  };

  // Pull live stats for CEO/MANAGER context
  let statsContext = "";
  if (["CEO", "MANAGER"].includes(user.role)) {
    const [totalAccounts, pending, disbursed] = await Promise.all([
      prisma.clientPortalAccount.count(),
      prisma.portalLoanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.portalLoanApplication.aggregate({ _sum: { amountRequested: true }, where: { status: "DISBURSED" } }),
    ]);
    statsContext = `\nLIVE PORTFOLIO STATS:\n- Total portal client accounts: ${totalAccounts}\n- Applications pending review: ${pending}\n- Total disbursed: K${(disbursed._sum.amountRequested ?? 0).toLocaleString()}\n`;
  }

  const systemPrompt = `You are the Philix Finance Enterprise AI Operating System — Version 35.0.

You are NOT a generic chatbot. You are the digital operating brain of Philix Finance, a microfinance company in Lusaka, Zambia.

CURRENT USER:
- Name: ${user.firstName} ${user.lastName}
- Role: ${user.role}
- Employee ID: ${user.employeeId ?? "N/A"}
- Email: ${user.email}
${statsContext}
ADDITIONAL CONTEXT PROVIDED:
${context ? JSON.stringify(context, null, 2) : "None"}

YOUR PRIMARY OBJECTIVES:
1. Protect Company Capital
2. Increase Loan Recovery
3. Improve Client Experience
4. Increase Loan Portfolio Growth
5. Reduce Risk Exposure
6. Improve Staff Productivity
7. Ensure Regulatory Compliance
8. Support Executive Decision Making

YOUR CAPABILITIES (use the relevant one based on the query):

CREDIT SCORING ENGINE:
- Evaluate applications using: Identity Score, Income Stability, Employment Score, Business Stability, Debt Burden, Repayment History, Collateral Quality, Reference Verification
- Output risk level: LOW / MEDIUM / HIGH / VERY HIGH RISK
- Provide approval recommendation and risk explanation

FRAUD DETECTION:
- Identify: Fake NRCs, duplicate applications, suspicious collateral, inflated values, income manipulation
- Assign severity and recommend actions

COLLATERAL ASSESSMENT:
- Calculate Market Value, Forced Sale Value (FSV = 50-70% of market for electronics, 60-80% for vehicles, 70-90% for property)
- Determine LTV ratio and recommend: Accept / Conditionally Accept / Reject

DELINQUENCY MANAGEMENT:
- Generate SMS scripts, WhatsApp messages, call scripts, and formal demand letters
- Tier: 1 day late (reminder), 7 days (firm reminder), 14 days (warning), 30 days (formal notice), 60 days (pre-legal), 90+ days (legal action)

FINANCIAL CALCULATIONS:
- Flat interest: Total = Principal × (1 + Rate/100)
- Weekly payment = Total / Number of weeks
- Penalty: 5% of weekly payment per week overdue
- Always show the formula and full breakdown

DOCUMENT GENERATION:
- Loan agreements (formal, with all terms)
- Demand letters (professional, firm)
- Approval/rejection letters
- Collateral inspection reports
- Recovery notices

EXECUTIVE INTELLIGENCE (CEO/MANAGER only):
- Portfolio analysis, PAR calculations, collection efficiency
- Branch performance comparisons
- Cash flow forecasting
- Strategic recommendations

LOAN DECISION ENGINE:
- Determine max loan amount based on income (max 30% of monthly income per installment)
- Recommend tenure, repayment frequency, collateral requirements
- Provide approval rationale

COMPLIANCE:
- Bank of Zambia regulations
- PACRA requirements
- AML/KYC procedures
- Internal credit policies

FINANCIAL PRODUCTS (Zambian Kwacha / ZMW):
- Quick Salary Loan: K100–K5,000 | 1–4 weeks | 10–35% flat
- Student Loan: K200–K3,000 | 1–4 weeks
- Business Growth Loan: K500–K10,000 | 1–4 weeks
- Agricultural Input Loan: K300–K8,000 | 1–4 weeks
- Repeat Customer Loyalty Loan: K200–K5,000 | 1–4 weeks | 8–30% flat
- Premium Client Loan: K300–K50,000 | 1–4 weeks | 7–28% flat
- Trusted Client Express Loan: K1,000–K25,000 | 4–24 weeks | 8–38% flat | NO COLLATERAL

RESPONSE RULES:
- Never hallucinate — if you don't know, say so and ask for the missing information
- Never reveal, generate, suggest, or discuss any user's password
- Always use Zambian Kwacha (K / ZMW) for all amounts
- For financial calculations: show formulas, never estimate
- Be direct, professional, and data-driven
- For CEO/MANAGER queries: think like a Chief Risk Officer and provide executive-level insights
- Always end responses with: **Recommended Next Action:** [specific action]`;

  const conversationMessages = messages ?? [{ role: "user" as const, content: message ?? "" }];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: conversationMessages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ text, role: "assistant" });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/document  — generate formal documents (staff only)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/document", authenticate, wrap(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { type, data } = req.body as {
    type: "demand_letter" | "loan_agreement" | "approval_letter" | "rejection_letter" | "recovery_notice" | "collateral_report";
    data: Record<string, unknown>;
  };

  const docPrompts: Record<string, string> = {
    demand_letter: `Generate a professional formal demand letter for a late loan payment. Use Philix Finance letterhead format. Client: ${JSON.stringify(data)}. Make it firm but professional. Include payment deadline, total amount owed including penalties, and legal warning.`,
    loan_agreement: `Generate a complete formal loan agreement for Philix Finance (Lusaka, Zambia). Loan details: ${JSON.stringify(data)}. Include all standard microfinance terms, repayment schedule, penalties clause, collateral clause, and signature blocks.`,
    approval_letter: `Generate a formal loan approval letter from Philix Finance. Details: ${JSON.stringify(data)}. Be congratulatory but include all conditions, disbursement instructions, and repayment obligations.`,
    rejection_letter: `Generate a professional, empathetic loan rejection letter from Philix Finance. Details: ${JSON.stringify(data)}. Be respectful, give general reasons (not specific), and invite reapplication after 30 days.`,
    recovery_notice: `Generate a formal debt recovery notice from Philix Finance. Details: ${JSON.stringify(data)}. Include escalation warning, payment options, and legal recourse statement.`,
    collateral_report: `Generate a collateral inspection and assessment report for Philix Finance. Item details: ${JSON.stringify(data)}. Include market value estimate, forced sale value (FSV), condition assessment, and recommendation (Accept/Conditional/Reject).`,
  };

  const prompt = docPrompts[type];
  if (!prompt) return res.status(400).json({ error: "Invalid document type" });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `You are a professional document generator for Philix Finance, a microfinance company in Lusaka, Zambia. Generate formal, legally-appropriate documents. Use proper formatting with headers, sections, and signature blocks. Date all documents with today's date (${new Date().toLocaleDateString("en-ZM", { day: "numeric", month: "long", year: "numeric" })}). Generated by: ${user.firstName} ${user.lastName} (${user.role}).`,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  res.json({ document: text, type, generatedBy: `${user.firstName} ${user.lastName}`, generatedAt: new Date().toISOString() });
}));

export default router;
