import { create } from "zustand";
import { persist } from "zustand/middleware";

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

interface LoanApplicationState {
  applications: LoanApplication[];
  submit: (app: Omit<LoanApplication, "id" | "submittedAt">) => string;
  updateStatus: (id: string, status: LoanApplication["status"]) => void;
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
        return id;
      },
      updateStatus: (id, status) =>
        set(state => ({
          applications: state.applications.map(a =>
            a.id === id ? { ...a, status } : a
          ),
        })),
    }),
    { name: "philix-loan-applications" }
  )
);
