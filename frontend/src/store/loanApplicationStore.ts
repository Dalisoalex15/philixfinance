import { create } from "zustand";
import { persist } from "zustand/middleware";
import { portalApi, staffApi, type StaffPortalApplication } from "../lib/api";

export interface LoanApplication {
  id: string;
  ref: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientNumber?: string;
  productId: string;
  productName: string;
  rateDuration: string;
  termMonths?: number;
  interestRate: number;
  amount: number;
  totalRepayable: number;
  weeklyPayment: number;
  purpose: string;
  description?: string;
  occupation: string;
  employer: string;
  employerPhone?: string;
  monthlyIncome: number;
  payDate?: string;
  collateralType: string;
  collateralDescription: string;
  collateralValue: number;
  collateralCondition: string;
  collateralPhotos?: string[];
  ref1Name?: string;
  ref1Phone?: string;
  ref1Relation?: string;
  ref2Name?: string;
  ref2Phone?: string;
  ref2Relation?: string;
  // Extended borrower info
  nrcNumber?: string;
  physicalAddress?: string;
  employmentType?: string;
  payrollNumber?: string;
  department?: string;
  yearsInService?: string;
  netSalaryAvailable?: number;
  existingLoanDeductions?: number;
  // Enhanced collateral
  collateralYear?: string;
  collateralSerial?: string;
  collateralOwner?: string;
  hasOwnershipDocs?: boolean;
  hasInsurance?: boolean;
  // Guarantor
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorEmployer?: string;
  guarantorRelation?: string;
  // Student
  studentInstitution?: string;
  studentSponsor?: string;
  studentGradYear?: string;
  // Auto-computed risk assessment (populated after backend sync)
  riskScore?: number;
  riskCategory?: string;
  coverageRatio?: number;
  marketValue?: number;
  forcedSaleValue?: number;
  lendingValue?: number;
  maxRecommendedLoan?: number;
  repossessionScore?: string;
  assessmentJson?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "DISBURSED";
  rejectedReason?: string;
  reviewedAt?: string;
  submittedAt: string;
}

// Flat interest rates per product ID + term weeks — must match backend PRODUCT_RATES
const PRODUCT_RATES: Record<string, Record<number, number>> = {
  "prod-001": { 1: 10, 2: 20, 3: 30, 4: 35 },
  "prod-002": { 1: 10, 2: 20, 3: 30, 4: 35 },
  "prod-003": { 1: 10, 2: 20, 3: 30, 4: 35 },
  "prod-004": { 1: 10, 2: 20, 3: 30, 4: 35 },
  "prod-005": { 1:  8, 2: 16, 3: 24, 4: 30 },
  "prod-006": { 1:  7, 2: 14, 3: 21, 4: 28 },
};

const PRODUCT_NAMES: Record<string, string> = {
  "prod-001": "Student Emergency Loan",
  "prod-002": "Salary Advance Loan",
  "prod-003": "Business Working Capital Loan",
  "prod-004": "Electronics Equity Loan",
  "prod-005": "Repeat Customer Loyalty Loan",
  "prod-006": "Premium Client Loan",
};

function fromApiApp(a: StaffPortalApplication): LoanApplication {
  const ratePct = a.interestRate > 0
    ? a.interestRate
    : (PRODUCT_RATES[a.productType]?.[a.termMonths] ?? 35);
  const interest = a.amountRequested * (ratePct / 100);
  const totalRepayable = a.amountRequested + interest;
  return {
    id: a.id,
    ref: a.reference,
    clientId: a.accountId,
    clientName: a.account ? `${a.account.firstName} ${a.account.lastName}` : "Unknown",
    clientEmail: a.account?.email ?? "",
    clientPhone: a.account?.phone ?? "",
    clientNumber: a.account?.clientNumber,
    productId: a.productType,
    productName: PRODUCT_NAMES[a.productType] ?? a.productType.replace(/_/g, " "),
    rateDuration: `${a.termMonths} week${a.termMonths !== 1 ? "s" : ""}`,
    termMonths: a.termMonths,
    interestRate: ratePct,
    amount: a.amountRequested,
    totalRepayable,
    weeklyPayment: totalRepayable / (a.termMonths || 1),
    purpose: a.purpose,
    description: a.description,
    occupation: a.occupation ?? "",
    employer: a.employer ?? "",
    employerPhone: a.employerPhone,
    monthlyIncome: a.monthlyIncome ?? 0,
    payDate: a.payDate,
    collateralType: a.collateralType ?? "",
    collateralDescription: a.collateralDesc ?? "",
    collateralValue: a.collateralValue ?? 0,
    collateralCondition: a.collateralCondition ?? "",
    collateralPhotos: a.collateralPhotos ?? [],
    ref1Name: a.ref1Name,
    ref1Phone: a.ref1Phone,
    ref1Relation: a.ref1Relation,
    ref2Name: a.ref2Name,
    ref2Phone: a.ref2Phone,
    ref2Relation: a.ref2Relation,
    nrcNumber: a.nrcNumber,
    physicalAddress: a.physicalAddress,
    employmentType: a.employmentType,
    payrollNumber: a.payrollNumber,
    department: a.department,
    yearsInService: a.yearsInService,
    netSalaryAvailable: a.netSalaryAvailable,
    existingLoanDeductions: a.existingLoanDeductions,
    collateralYear: a.collateralYear,
    collateralSerial: a.collateralSerial,
    collateralOwner: a.collateralOwner,
    hasOwnershipDocs: a.hasOwnershipDocs,
    hasInsurance: a.hasInsurance,
    guarantorName: a.guarantorName,
    guarantorPhone: a.guarantorPhone,
    guarantorEmployer: a.guarantorEmployer,
    guarantorRelation: a.guarantorRelation,
    studentInstitution: a.studentInstitution,
    studentSponsor: a.studentSponsor,
    studentGradYear: a.studentGradYear,
    riskScore: a.riskScore,
    riskCategory: a.riskCategory,
    coverageRatio: a.coverageRatio,
    marketValue: a.marketValue,
    forcedSaleValue: a.forcedSaleValue,
    lendingValue: a.lendingValue,
    maxRecommendedLoan: a.maxRecommendedLoan,
    repossessionScore: a.repossessionScore,
    assessmentJson: a.assessmentJson,
    status: (a.status === "SUBMITTED" ? "PENDING" : a.status) as LoanApplication["status"],
    rejectedReason: a.rejectedReason,
    reviewedAt: a.reviewedAt,
    submittedAt: a.createdAt,
  };
}

interface LoanApplicationState {
  applications: LoanApplication[];
  submit: (app: Omit<LoanApplication, "id" | "submittedAt">) => string;
  updateStatus: (id: string, status: LoanApplication["status"]) => void;
  syncFromApi: () => Promise<void>;
}

export const useLoanApplicationStore = create<LoanApplicationState>()(
  persist(
    (set) => ({
      applications: [],

      submit: (app) => {
        const id = `loan-app-${Date.now()}`;
        const submittedAt = new Date().toISOString();
        set(state => ({
          applications: [{ ...app, id, submittedAt }, ...state.applications],
        }));
        // Also post to real API (fire and forget)
        portalApi.submitApplication({
          productType: app.productId || app.productName,
          amountRequested: app.amount,
          termMonths: 1,
          purpose: app.purpose,
          occupation: app.occupation,
          employer: app.employer,
          monthlyIncome: app.monthlyIncome,
          collateralType: app.collateralType,
          collateralDesc: app.collateralDescription,
          collateralValue: app.collateralValue,
        }).catch(() => {/* non-critical */});
        return id;
      },

      updateStatus: (id, status) =>
        set(state => ({
          applications: state.applications.map(a =>
            a.id === id ? { ...a, status } : a
          ),
        })),

      syncFromApi: async () => {
        try {
          const apiApps = await staffApi.getAllPortalApplications();
          set({ applications: apiApps.map(fromApiApp) });
        } catch {
          // Backend might be down; keep using local state
        }
      },
    }),
    { name: "philix-loan-applications" }
  )
);
