export interface CollateralInput {
  collateralType?: string;
  collateralValue?: number;
  collateralCondition?: string;
  collateralYear?: string;
  collateralSerial?: string;
  collateralOwner?: string;
  hasOwnershipDocs?: boolean;
  hasInsurance?: boolean;
  collateralPhotos?: string[] | File[];
  amountRequested: number;
  termMonths: number;
  interestRate: number;
  monthlyIncome?: number;
  netSalaryAvailable?: number;
  employmentType?: string;
  guarantorName?: string;
  ref1Name?: string;
  ref2Name?: string;
}

export interface AssessmentResult {
  ownershipScore: number;
  marketabilityScore: number;
  conditionScore: number;
  liquidityScore: number;
  assetAgeScore: number;
  documentationScore: number;
  overallScore: number;
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
  } = input;

  const currentYear = new Date().getFullYear();
  const assetAge = collateralYear ? Math.max(0, currentYear - parseInt(collateralYear)) : -1;
  const type = collateralType.toLowerCase();

  // ── Market Value ──────────────────────────────────────────────────────────
  const conditionMult: Record<string, number> = { excellent: 1.0, good: 0.85, fair: 0.65, poor: 0.40 };
  const cMult = conditionMult[collateralCondition.toLowerCase()] ?? 0.75;

  let deprRate = 0.15;
  if (type.includes("phone") || type.includes("smart")) deprRate = 0.25;
  else if (type.includes("laptop") || type.includes("computer") || type.includes("desktop") || type.includes("tablet")) deprRate = 0.22;
  else if (type.includes("tv") || type.includes("screen") || type.includes("television")) deprRate = 0.18;
  else if (type.includes("fridge") || type.includes("freezer")) deprRate = 0.15;
  else if (type.includes("vehicle") || type.includes("car") || type.includes("truck") || type.includes("motor") || type.includes("motorcycle")) deprRate = 0.12;
  else if (type.includes("property") || type.includes("land") || type.includes("house") || type.includes("farm")) deprRate = 0;
  else if (type.includes("equipment") || type.includes("machinery") || type.includes("generator")) deprRate = 0.20;
  else if (type.includes("fixed deposit") || type.includes("savings") || type.includes("shares")) deprRate = 0;

  const ageFactor = assetAge >= 0 ? Math.max(0.10, 1 - deprRate * assetAge) : 0.80;
  const marketValue = Math.round(collateralValue * ageFactor * cMult);

  let fsDiscount = 0.55;
  if (type.includes("vehicle") || type.includes("car") || type.includes("motor") || type.includes("motorcycle")) fsDiscount = 0.65;
  else if (type.includes("property") || type.includes("land") || type.includes("house")) fsDiscount = 0.60;
  else if (type.includes("fixed deposit") || type.includes("savings")) fsDiscount = 0.95;
  else if (type.includes("shares")) fsDiscount = 0.80;
  else if (type.includes("salary") || type.includes("payroll")) fsDiscount = 0.90;

  const forcedSaleValue = Math.round(marketValue * fsDiscount);
  const lendingValue = Math.round(Math.min(forcedSaleValue, collateralValue * 0.50));
  const coverageRatio = amountRequested > 0 ? Math.round((forcedSaleValue / amountRequested) * 100) / 100 : 0;

  // ── Income capacity ──────────────────────────────────────────────────────
  const effectiveIncome = netSalaryAvailable > 0 ? netSalaryAvailable : monthlyIncome * 0.33;
  const maxFromIncome = effectiveIncome > 0
    ? (effectiveIncome * termMonths) / (4.33 * (1 + interestRate / 100))
    : 0;
  const maxRecommendedLoan = Math.round(
    collateralValue > 0
      ? Math.min(lendingValue > 0 ? lendingValue : Infinity, maxFromIncome > 0 ? maxFromIncome : Infinity, amountRequested)
      : maxFromIncome > 0 ? Math.min(maxFromIncome, amountRequested) : amountRequested
  );

  // ── Scoring ──────────────────────────────────────────────────────────────
  const isSelfOwned = !collateralOwner || ["self", "applicant", "me", ""].includes(collateralOwner.toLowerCase());

  const ownershipScore = Math.min(20,
    (isSelfOwned ? 10 : 5) + (hasOwnershipDocs ? 7 : 0) + (collateralSerial ? 3 : 0)
  );

  let marketabilityScore = 8;
  if (type.includes("fixed deposit") || type.includes("savings")) marketabilityScore = 20;
  else if (type.includes("vehicle") || type.includes("car") || type.includes("motor") || type.includes("motorcycle")) marketabilityScore = 18;
  else if (type.includes("phone") || type.includes("smart")) marketabilityScore = 16;
  else if (type.includes("laptop") || type.includes("computer") || type.includes("tv") || type.includes("fridge")) marketabilityScore = 14;
  else if (type.includes("property") || type.includes("land") || type.includes("house")) marketabilityScore = 12;
  else if (type.includes("equipment") || type.includes("machinery")) marketabilityScore = 10;

  const conditionScoreMap: Record<string, number> = { excellent: 15, good: 12, fair: 8, poor: 4 };
  const conditionScore = conditionScoreMap[collateralCondition.toLowerCase()] ?? 6;

  let liquidityScore = 4;
  if (coverageRatio >= 1.5) liquidityScore = 20;
  else if (coverageRatio >= 1.2) liquidityScore = 16;
  else if (coverageRatio >= 1.0) liquidityScore = 12;
  else if (coverageRatio >= 0.8) liquidityScore = 8;

  let assetAgeScore = 5;
  if (assetAge < 0) assetAgeScore = 5;
  else if (assetAge === 0) assetAgeScore = 10;
  else if (assetAge <= 2) assetAgeScore = 8;
  else if (assetAge <= 4) assetAgeScore = 6;
  else if (assetAge <= 6) assetAgeScore = 4;
  else assetAgeScore = 2;

  const documentationScore = Math.min(15,
    (collateralPhotos.length > 0 ? 5 : 0) +
    (hasOwnershipDocs ? 5 : 0) +
    (collateralSerial ? 3 : 0) +
    (hasInsurance ? 2 : 0)
  );

  const overallScore = Math.min(100, Math.round(
    ownershipScore + marketabilityScore + conditionScore + liquidityScore + assetAgeScore + documentationScore
  ));

  let riskCategory: AssessmentResult["riskCategory"] = "REJECT";
  if (overallScore >= 90) riskCategory = "EXCELLENT";
  else if (overallScore >= 80) riskCategory = "GOOD";
  else if (overallScore >= 70) riskCategory = "MODERATE";

  let repossessionScore: AssessmentResult["repossessionScore"] = "RED";
  if (type.includes("fixed deposit") || type.includes("savings") || type.includes("salary")) repossessionScore = "GREEN";
  else if (type.includes("vehicle") || type.includes("car") || type.includes("motor")) repossessionScore = isSelfOwned && hasOwnershipDocs ? "GREEN" : "AMBER";
  else if (type.includes("laptop") || type.includes("phone") || type.includes("tv") || type.includes("fridge")) repossessionScore = "AMBER";
  else if (type.includes("property") || type.includes("land")) repossessionScore = hasOwnershipDocs ? "AMBER" : "RED";

  const warnings: string[] = [];
  const strengths: string[] = [];

  if (coverageRatio < 1.0 && collateralValue > 0) warnings.push(`Coverage ratio ${(coverageRatio * 100).toFixed(0)}% is below 100% minimum`);
  if (coverageRatio < 1.2 && collateralValue > 0) warnings.push("Coverage below 120% recommended — consider reducing loan or increasing collateral");
  if (!hasOwnershipDocs && collateralValue > 0) warnings.push("No ownership documents confirmed — required before disbursement");
  if (!collateralSerial && collateralValue > 0) warnings.push("Serial/registration number not provided");
  if (assetAge > 5) warnings.push(`Asset is ${assetAge} years old — significant depreciation applied`);
  if (!isSelfOwned) warnings.push("Asset owned by third party — written consent required");
  if (collateralPhotos.length === 0 && collateralValue > 0) warnings.push("No collateral photos uploaded — required for verification");
  if (!guarantorName && !ref1Name) warnings.push("No guarantor or references provided");

  if (coverageRatio >= 1.5) strengths.push(`Excellent coverage ratio: ${(coverageRatio * 100).toFixed(0)}%`);
  else if (coverageRatio >= 1.2) strengths.push(`Good coverage ratio: ${(coverageRatio * 100).toFixed(0)}%`);
  if (hasOwnershipDocs) strengths.push("Ownership documents provided");
  if (hasInsurance) strengths.push("Asset is insured");
  if (isSelfOwned && collateralValue > 0) strengths.push("Asset owned directly by applicant");
  if (employmentType === "PERMANENT") strengths.push("Permanent employment — stable income");
  if (guarantorName) strengths.push("Guarantor provided as additional security");
  if (collateralPhotos.length >= 3) strengths.push(`${collateralPhotos.length} collateral photos provided`);

  let recommendation: AssessmentResult["recommendation"] = "REJECT";
  if (riskCategory === "EXCELLENT" || riskCategory === "GOOD") recommendation = "APPROVE";
  else if (riskCategory === "MODERATE") recommendation = "APPROVE_WITH_CONDITIONS";

  return {
    ownershipScore, marketabilityScore, conditionScore, liquidityScore, assetAgeScore, documentationScore,
    overallScore, marketValue, forcedSaleValue, lendingValue, coverageRatio, maxRecommendedLoan,
    riskCategory, repossessionScore, warnings, strengths, recommendation,
  };
}

export const K = (n: number) =>
  `K${Math.round(n).toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const SCORE_LABEL: Record<string, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  MODERATE: "Moderate",
  REJECT: "Below Threshold",
};

export const SCORE_COLOR: Record<string, string> = {
  EXCELLENT: "text-emerald-400",
  GOOD: "text-blue-400",
  MODERATE: "text-amber-400",
  REJECT: "text-red-400",
};

export const REPOSSESSION_COLOR: Record<string, string> = {
  GREEN: "text-emerald-400",
  AMBER: "text-amber-400",
  RED: "text-red-400",
};

export const COVERAGE_LABEL = (r: number) =>
  r >= 1.5 ? "Excellent" : r >= 1.2 ? "Good" : r >= 1.0 ? "Moderate" : "Below Threshold";

export const COVERAGE_COLOR = (r: number) =>
  r >= 1.5 ? "text-emerald-400" : r >= 1.2 ? "text-blue-400" : r >= 1.0 ? "text-amber-400" : "text-red-400";
