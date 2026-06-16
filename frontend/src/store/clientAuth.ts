import { create } from "zustand";
import { persist } from "zustand/middleware";
import { portalApi, savePortalTokens, clearPortalTokens } from "../lib/api";
import type { ClientAccount } from "../lib/api";

export interface ClientUser {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nrcNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  status: "ACTIVE" | "PENDING_KYC" | "SUSPENDED" | "BLACKLISTED";
  kycStatus: "NOT_STARTED" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  avatarInitials: string;
  joinedAt: string;
}

// No demo clients — all clients come from the real database
export const demoClients: ClientUser[] = [];

// Staff interface kept for compatibility with other UI components
export interface StaffUser {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "CEO" | "MANAGER" | "LOAN_OFFICER" | "COLLECTIONS_OFFICER" | "ACCOUNTANT";
  department: string;
  status: "ACTIVE" | "INACTIVE";
  joinedAt: string;
  avatarInitials: string;
}

export const demoStaff: StaffUser[] = [];

function toClientUser(account: ClientAccount): ClientUser {
  return {
    id: account.id,
    clientNumber: account.clientNumber,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    phone: account.phone,
    nrcNumber: account.nrcNumber,
    dateOfBirth: account.dateOfBirth,
    gender: account.gender,
    address: account.address,
    city: account.city,
    occupation: account.occupation,
    employer: account.employer,
    monthlyIncome: account.monthlyIncome,
    status: account.status as ClientUser["status"],
    kycStatus: account.kycStatus as ClientUser["kycStatus"],
    avatarInitials: `${account.firstName[0]}${account.lastName[0]}`.toUpperCase(),
    joinedAt: account.createdAt,
  };
}

interface ClientAuthState {
  client: ClientUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (client: ClientUser, password?: string) => void;
  loginWithApi: (email: string, password: string) => Promise<void>;
  registerWithApi: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<ClientUser>) => void;
}

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set) => ({
      client: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (client) => set({ client, isAuthenticated: true }),

      loginWithApi: async (email, password) => {
        const res = await portalApi.login(email, password);
        savePortalTokens(res.accessToken, res.refreshToken);
        set({
          client: toClientUser(res.account),
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          isAuthenticated: true,
        });
      },

      registerWithApi: async (data) => {
        const res = await portalApi.register(data);
        savePortalTokens(res.accessToken, res.refreshToken);
        set({
          client: toClientUser(res.account),
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        clearPortalTokens();
        set({ client: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      updateProfile: (data) =>
        set((state) => ({
          client: state.client ? { ...state.client, ...data } : null,
        })),
    }),
    {
      name: "philix-client-auth-v2",
      partialize: (state) => ({
        client: state.client,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Keep for backward compatibility — empty store since we use real API now
interface RegisteredClientsState {
  clients: ClientUser[];
  passwords: Record<string, string>;
  register: (client: ClientUser, password: string) => void;
}

export const useRegisteredClientsStore = create<RegisteredClientsState>()(
  persist(
    (set) => ({
      clients: [],
      passwords: {},
      register: (client, password) =>
        set(state => ({
          clients: [...state.clients, client],
          passwords: { ...state.passwords, [client.id]: password },
        })),
    }),
    { name: "philix-registered-clients" }
  )
);
