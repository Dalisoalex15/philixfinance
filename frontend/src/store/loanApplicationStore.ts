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
  ref1Name?: string;
  ref1Phone?: string;
  ref1Relation?: string;
  ref2Name?: string;
  ref2Phone?: string;
  ref2Relation?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "DISBURSED";
  rejectedReason?: string;
  reviewedAt?: string;
  submittedAt: string;
}

function fromApiApp(a: StaffPortalApplication): LoanApplication {
  return {
    id: a.id,
    ref: a.reference,
    clientId: a.accountId,
    clientName: a.account ? `${a.account.firstName} ${a.account.lastName}` : "Unknown",
    clientEmail: a.account?.email ?? "",
    clientPhone: a.account?.phone ?? "",
    clientNumber: a.account?.clientNumber,
    productId: a.productType,
    productName: a.productType.replace(/_/g, " "),
    rateDuration: `${a.termMonths} months`,
    termMonths: a.termMonths,
    interestRate: 0,
    amount: a.amountRequested,
    totalRepayable: a.amountRequested,
    weeklyPayment: 0,
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
    collateralCondition: "",
    ref1Name: a.ref1Name,
    ref1Phone: a.ref1Phone,
    ref1Relation: a.ref1Relation,
    ref2Name: a.ref2Name,
    ref2Phone: a.ref2Phone,
    ref2Relation: a.ref2Relation,
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
          const mapped = apiApps.map(fromApiApp);
          set(state => {
            // Merge: API apps take precedence for status; local-only apps kept too
            const apiIds = new Set(mapped.map(a => a.id));
            const localOnly = state.applications.filter(a => !apiIds.has(a.id));
            return { applications: [...mapped, ...localOnly] };
          });
        } catch {
          // Backend might be down; keep using local state
        }
      },
    }),
    { name: "philix-loan-applications" }
  )
);
