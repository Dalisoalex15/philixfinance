export interface CollateralInput {
  collateralType?: string;
  collateralValue?: number;      // declared value by client
  collateralCondition?: string;  // excellent|good|fair|poor
  collateralYear?: string;       // year purchased e.g. "2021"
  collateralSerial?: string;
  collateralOwner?: string;
  hasOwnershipDocs?: boolean;
  hasInsurance?: boolean;
  collateralPhotos?: string[];
  amountRequested: number;
  termMonths: number;   // number of weeks
  interestRate: number; // flat rate %
  monthlyIncome?: number;
  netSalaryAvailable?: number;
  employmentType?: string;
  guarantorName?: string;
  ref1Name?: string;
  ref2Name?: string;
}

export interface AssessmentResult {
  ownershipScore: number;      // max 20
  marketabilityScore: number;  // max 20
  conditionScore: number;      // max 15
  liquidityScore: number;      // max 20
  assetAgeScore: number;       // max 10
  documentationScore: number;  // max 15
  overallScore: number;        // 0-100
  marketValue: number;
  forcedSaleValue: number;
  lendingValue: number;
  coverageRatio: number;
  maxRecommendedLoan: number;
  riskCategory: "EXCELLENT" | "GOOD" | "MODERATE" | "REJECT";
  repossessionScore: "GREEN" | "AMBER" | "RED";
  warnings: string[];
  strengths: string[];
  recommendation: "APPROVE" | "APPROVE_WITH_CONDITIONS" | "REJECT";
}

export function assessCollateral(input: CollateralInput): AssessmentResult {
  const {
    collateralType = "",
    collateralValue = 0,
    collateralCondition = "",
    collateralYear,
    collateralSerial,
    collateralOwner,
    hasOwnershipDocs = false,
    hasInsurance = false,
    collateralPhotos = [],
    amountRequested,
    termMonths,
    interestRate,
    monthlyIncome = 0,
    netSalaryAvailable = 0,
    employmentType = "",
    guarantorName,
    ref1Name,
    ref2Name,
  } = input;

  const currentYear = new Date().getFullYear();
  const assetAge = collateralYear ? Math.max(0, currentYear - parseInt(collateralYear)) : -1;
  const type = collateralType.toLowerCase();

  // ── Market Value Calculation ─────────────────────────
  const conditionMult: Record<string, number> = {
    excellent: 1.0, good: 0.85, fair: 0.65, poor: 0.40,
  };
  const cMult = conditionMult[collateralCondition.toLowerCase()] ?? 0.75;

  // Age depreciation rate per year
  let deprRate = 0.15;
  if (type.includes("phone") || type.includes("mobile") || type.includes("smartphone")) deprRate = 0.25;
  else if (type.includes("laptop") || type.includes("computer") || type.includes("desktop")) deprRate = 0.22;
  else if (type.includes("tv") || type.includes("screen") || type.includes("television")) deprRate = 0.18;
  else if (type.includes("fridge") || type.includes("freezer")) deprRate = 0.15;
  else if (type.includes("vehicle") || type.includes("car") || type.includes("truck") || type.includes("motor")) deprRate = 0.12;
  else if (type.includes("property") || type.includes("land") || type.includes("house") || type.includes("farm")) deprRate = 0;
  else if (type.includes("equipment") || type.includes("machinery") || type.includes("generator")) deprRate = 0.20;
  else if (type.includes("fixed deposit") || type.includes("savings") || type.includes("shares")) deprRate = 0;

  const ageFactor = assetAge >= 0 ? Math.max(0.10, 1 - deprRate * assetAge) : 0.80;
  const marketValue = collateralValue * ageFactor * cMult;

  // Forced sale value (liquidation discount)
  let fsDiscount = 0.55;
  if (type.includes("vehicle") || type.includes("car") || type.includes("motor")) fsDiscount = 0.65;
  else if (type.includes("property") || type.includes("land") || type.includes("house")) fsDiscount = 0.60;
  else if (type.includes("fixed deposit") || type.includes("savings")) fsDiscount = 0.95;
  else if (type.includes("shares")) fsDiscount = 0.80;
  else if (type.includes("salary") || type.includes("payroll")) fsDiscount = 0.90;
  const forcedSaleValue = marketValue * fsDiscount;

  const lendingValue = Math.min(forcedSaleValue, collateralValue * 0.50);
  const coverageRatio = amountRequested > 0 ? forcedSaleValue / amountRequested : 0;

  // ── Income-based max loan ───────────────────────────
  const effectiveIncome = netSalaryAvailable > 0 ? netSalaryAvailable : monthlyIncome * 0.33;
  const totalRepayable = amountRequested * (1 + interestRate / 100);
  const weeklyPayment = termMonths > 0 ? totalRepayable / termMonths : totalRepayable;
  const monthlyPayment = weeklyPayment * 4.33;
  const capacityOk = effectiveIncome > 0 ? monthlyPayment <= effectiveIncome : true;

  // Max income-based: effective income pays for the loan
  const maxFromIncome = effectiveIncome > 0
    ? (effectiveIncome * termMonths) / (4.33 * (1 + interestRate / 100))
    : 0;
  const maxRecommendedLoan = Math.round(
    Math.min(
      lendingValue > 0 ? lendingValue : Infinity,
      maxFromIncome > 0 ? maxFromIncome : Infinity,
      amountRequested,
    ),
  );

  // ── Scoring ──────────────────────────────────────────
  // 1. Ownership (max 20)
  const isSelfOwned =
    !collateralOwner ||
    collateralOwner.toLowerCase() === "self" ||
    collateralOwner.toLowerCase() === "applicant" ||
    collateralOwner === "";
  const ownershipScore = Math.min(
    20,
    (isSelfOwned ? 10 : 5) +
    (hasOwnershipDocs ? 7 : 0) +
    (collateralSerial ? 3 : 0),
  );

  // 2. Marketability (max 20)
  let marketabilityScore = 8;
  if (type.includes("fixed deposit") || type.includes("savings")) marketabilityScore = 20;
  else if (type.includes("vehicle") || type.includes("car") || type.includes("motor") || type.includes("motorcycle")) marketabilityScore = 18;
  else if (type.includes("phone") || type.includes("smartphone")) marketabilityScore = 16;
  else if (type.includes("laptop") || type.includes("computer") || type.includes("tv") || type.includes("fridge")) marketabilityScore = 14;
  else if (type.includes("property") || type.includes("land") || type.includes("house")) marketabilityScore = 12;
  else if (type.includes("equipment") || type.includes("machinery")) marketabilityScore = 10;

  // 3. Condition (max 15)
  const conditionScoreMap: Record<string, number> = { excellent: 15, good: 12, fair: 8, poor: 4 };
  const conditionScore = conditionScoreMap[collateralCondition.toLowerCase()] ?? 6;

  // 4. Liquidity (max 20) — based on coverage ratio
  let liquidityScore = 4;
  if (coverageRatio >= 1.5) liquidityScore = 20;
  else if (coverageRatio >= 1.2) liquidityScore = 16;
  else if (coverageRatio >= 1.0) liquidityScore = 12;
  else if (coverageRatio >= 0.8) liquidityScore = 8;

  // 5. Asset Age (max 10)
  let assetAgeScore = 5;
  if (assetAge < 0) assetAgeScore = 5; // unknown
  else if (assetAge === 0) assetAgeScore = 10;
  else if (assetAge <= 2) assetAgeScore = 8;
  else if (assetAge <= 4) assetAgeScore = 6;
  else if (assetAge <= 6) assetAgeScore = 4;
  else assetAgeScore = 2;

  // 6. Documentation (max 15)
  const documentationScore = Math.min(
    15,
    (collateralPhotos.length > 0 ? 5 : 0) +
    (hasOwnershipDocs ? 5 : 0) +
    (collateralSerial ? 3 : 0) +
    (hasInsurance ? 2 : 0),
  );

  const overallScore = Math.round(
    ownershipScore + marketabilityScore + conditionScore + liquidityScore + assetAgeScore + documentationScore,
  );

  // ── Risk Category ────────────────────────────────────
  let riskCategory: AssessmentResult["riskCategory"] = "REJECT";
  if (overallScore >= 90) riskCategory = "EXCELLENT";
  else if (overallScore >= 80) riskCategory = "GOOD";
  else if (overallScore >= 70) riskCategory = "MODERATE";

  // ── Repossession Score ───────────────────────────────
  let repossessionScore: AssessmentResult["repossessionScore"] = "RED";
  if (
    type.includes("fixed deposit") ||
    type.includes("savings") ||
    type.includes("salary") ||
    type.includes("payroll")
  ) {
    repossessionScore = "GREEN";
  } else if (type.includes("vehicle") || type.includes("car") || type.includes("motor")) {
    repossessionScore = isSelfOwned && hasOwnershipDocs ? "GREEN" : "AMBER";
  } else if (
    type.includes("laptop") ||
    type.includes("phone") ||
    type.includes("tv") ||
    type.includes("fridge")
  ) {
    repossessionScore = "AMBER";
  } else if (type.includes("property") || type.includes("land")) {
    repossessionScore = hasOwnershipDocs ? "AMBER" : "RED";
  }

  // ── Warnings & Strengths ─────────────────────────────
  const warnings: string[] = [];
  const strengths: string[] = [];

  if (coverageRatio < 1.0) warnings.push(`Coverage ratio ${(coverageRatio * 100).toFixed(0)}% is below 100% minimum`);
  if (coverageRatio < 1.2) warnings.push("Coverage ratio below 120% recommended threshold");
  if (!hasOwnershipDocs) warnings.push("No ownership documents on file — required before disbursement");
  if (!collateralSerial) warnings.push("Serial/registration number not provided — harder to identify asset");
  if (assetAge > 5) warnings.push(`Asset is ${assetAge} years old — higher depreciation risk`);
  if (!isSelfOwned) warnings.push("Asset owned by third party — additional consent required");
  if (!capacityOk && monthlyIncome > 0) warnings.push("Monthly repayment exceeds client's available income capacity");
  if (collateralPhotos.length === 0) warnings.push("No collateral photos uploaded — required for verification");
  if (!guarantorName && !ref1Name) warnings.push("No guarantor or references provided");

  if (coverageRatio >= 1.5) strengths.push(`Strong coverage ratio: ${(coverageRatio * 100).toFixed(0)}%`);
  if (hasOwnershipDocs) strengths.push("Ownership documents provided");
  if (hasInsurance) strengths.push("Asset is insured — additional protection");
  if (isSelfOwned) strengths.push("Asset owned directly by applicant");
  if (employmentType === "PERMANENT") strengths.push("Permanent employment — stable income");
  if (guarantorName) strengths.push("Guarantor provided as additional security");
  if (overallScore >= 80) strengths.push("High collateral quality score");
  if (collateralPhotos.length >= 4) strengths.push(`${collateralPhotos.length} photos provided for verification`);

  // ── Recommendation ───────────────────────────────────
  let recommendation: AssessmentResult["recommendation"] = "REJECT";
  if (riskCategory === "EXCELLENT" || riskCategory === "GOOD") recommendation = "APPROVE";
  else if (riskCategory === "MODERATE") recommendation = "APPROVE_WITH_CONDITIONS";

  return {
    ownershipScore,
    marketabilityScore,
    conditionScore,
    liquidityScore,
    assetAgeScore,
    documentationScore,
    overallScore,
    marketValue: Math.round(marketValue),
    forcedSaleValue: Math.round(forcedSaleValue),
    lendingValue: Math.round(lendingValue),
    coverageRatio: Math.round(coverageRatio * 100) / 100,
    maxRecommendedLoan: Math.round(maxRecommendedLoan),
    riskCategory,
    repossessionScore,
    warnings,
    strengths,
    recommendation,
  };
}
