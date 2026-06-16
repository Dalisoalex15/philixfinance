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
  productId: string;
  productName: string;
  rateDuration: string;
  interestRate: number;
  amount: number;
  totalRepayable: number;
  weeklyPayment: number;
  purpose: string;
  occupation: string;
  employer: string;
  monthlyIncome: number;
  collateralType: string;
  collateralDescription: string;
  collateralValue: number;
  collateralCondition: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "DISBURSED";
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
    productId: a.productType,
    productName: a.productType.replace(/_/g, " "),
    rateDuration: `${a.termMonths} months`,
    interestRate: 0,
    amount: a.amountRequested,
    totalRepayable: a.amountRequested,
    weeklyPayment: 0,
    purpose: a.purpose,
    occupation: a.occupation ?? "",
    employer: a.employer ?? "",
    monthlyIncome: a.monthlyIncome ?? 0,
    collateralType: a.collateralType ?? "",
    collateralDescription: a.collateralDesc ?? "",
    collateralValue: a.collateralValue ?? 0,
    collateralCondition: "",
    status: (a.status === "SUBMITTED" ? "PENDING" : a.status) as LoanApplication["status"],
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
