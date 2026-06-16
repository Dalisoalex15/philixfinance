import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ClientUser {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nrcNumber: string;
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

interface ClientAuthState {
  client: ClientUser | null;
  isAuthenticated: boolean;
  login: (client: ClientUser, password?: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<ClientUser>) => void;
}

// Pre-registered demo clients
export const demoClients: ClientUser[] = [
  {
    id: "clt-001",
    clientNumber: "PHX-C-0001",
    firstName: "Mwansa",
    lastName: "Tembo",
    email: "mwansa.tembo@email.com",
    phone: "+260 97 456 7890",
    nrcNumber: "123456/78/1",
    dateOfBirth: "1998-03-15",
    gender: "MALE",
    address: "House 12, Plot 45, Kabwata",
    city: "Lusaka",
    occupation: "Student",
    employer: "University of Zambia",
    monthlyIncome: 2500,
    status: "ACTIVE",
    kycStatus: "VERIFIED",
    avatarInitials: "MT",
    joinedAt: "2024-02-15T10:30:00Z",
  },
  {
    id: "clt-002",
    clientNumber: "PHX-C-0002",
    firstName: "Grace",
    lastName: "Mwale",
    email: "grace.mwale@email.com",
    phone: "+260 96 789 0123",
    nrcNumber: "234567/89/2",
    dateOfBirth: "1990-07-22",
    gender: "FEMALE",
    address: "Flat 3, Lusaka Housing, Roma",
    city: "Lusaka",
    occupation: "Civil Servant",
    employer: "Ministry of Health",
    monthlyIncome: 8500,
    status: "ACTIVE",
    kycStatus: "VERIFIED",
    avatarInitials: "GM",
    joinedAt: "2024-03-01T09:00:00Z",
  },
];

// Demo staff accounts for the staff portal
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

export const demoStaff: StaffUser[] = [
  { id: "staff-001", employeeNumber: "EMP-001", firstName: "Daliso", lastName: "Phiri", email: "daliso@philixfinance.com", phone: "+260 97 100 0001", role: "CEO", department: "Executive", status: "ACTIVE", joinedAt: "2022-01-01T00:00:00Z", avatarInitials: "DP" },
  { id: "staff-002", employeeNumber: "EMP-002", firstName: "Chileshe", lastName: "Mutale", email: "chileshe@philixfinance.com", phone: "+260 97 100 0002", role: "MANAGER", department: "Operations", status: "ACTIVE", joinedAt: "2022-03-01T00:00:00Z", avatarInitials: "CM" },
  { id: "staff-003", employeeNumber: "EMP-003", firstName: "Patricia", lastName: "Mwanza", email: "patricia@philixfinance.com", phone: "+260 97 100 0003", role: "LOAN_OFFICER", department: "Credit", status: "ACTIVE", joinedAt: "2022-06-01T00:00:00Z", avatarInitials: "PM" },
  { id: "staff-004", employeeNumber: "EMP-004", firstName: "Inonge", lastName: "Nkole", email: "inonge@philixfinance.com", phone: "+260 97 100 0004", role: "COLLECTIONS_OFFICER", department: "Collections", status: "ACTIVE", joinedAt: "2022-06-01T00:00:00Z", avatarInitials: "IN" },
  { id: "staff-005", employeeNumber: "EMP-005", firstName: "Chanda", lastName: "Mwila", email: "chanda@philixfinance.com", phone: "+260 97 100 0005", role: "ACCOUNTANT", department: "Finance", status: "ACTIVE", joinedAt: "2023-01-01T00:00:00Z", avatarInitials: "CM" },
];

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set) => ({
      client: null,
      isAuthenticated: false,
      login: (client) => set({ client, isAuthenticated: true }),
      logout: () => set({ client: null, isAuthenticated: false }),
      updateProfile: (data) =>
        set((state) => ({
          client: state.client ? { ...state.client, ...data } : null,
        })),
    }),
    { name: "philix-client-auth" }
  )
);

// Persisted store for self-registered clients + their passwords
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
