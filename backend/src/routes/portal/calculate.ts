import { Router, Request, Response } from "express";

const router = Router();

// POST /api/portal/calculate — loan repayment calculator (no auth required)
router.post("/", (req: Request, res: Response) => {
  const { amountRequested, termMonths, interestRate = 20, productType } = req.body as {
    amountRequested: number;
    termMonths: number;
    interestRate?: number;
    productType?: string;
  };

  if (!amountRequested || !termMonths) {
    return res.status(400).json({ error: "amountRequested and termMonths are required" });
  }
  if (amountRequested < 100 || amountRequested > 500000) {
    return res.status(400).json({ error: "Amount must be between K100 and K500,000" });
  }
  if (termMonths < 1 || termMonths > 52) {
    return res.status(400).json({ error: "Term must be between 1 and 52 weeks" });
  }

  const rate       = Math.min(Math.max(interestRate, 0), 100);
  const principal  = Math.round(amountRequested);
  const interest   = Math.round(principal * (rate / 100));
  const totalDue   = principal + interest;
  const weeks      = Math.round(termMonths);
  const weeklyAmt  = Math.ceil(totalDue / weeks);
  // Last payment absorbs rounding remainder
  const lastAmt    = totalDue - weeklyAmt * (weeks - 1);

  const startDate  = new Date();
  const schedule   = Array.from({ length: weeks }, (_, i) => {
    const dueDate = new Date(startDate.getTime() + (i + 1) * 7 * 86400000);
    const amount  = i === weeks - 1 ? lastAmt : weeklyAmt;
    return {
      week: i + 1,
      dueDate: dueDate.toISOString().split("T")[0],
      amount,
      balance: Math.max(0, totalDue - weeklyAmt * (i + 1)),
    };
  });

  res.json({
    principal,
    interestRate: rate,
    interest,
    totalDue,
    weeks,
    weeklyPayment: weeklyAmt,
    effectiveApr: parseFloat(((rate / (termMonths / 52)) * 100).toFixed(1)),
    productType: productType ?? null,
    schedule,
  });
});

export default router;
