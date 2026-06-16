import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoStaff, type StaffUser } from "./clientAuth";

const INITIAL_PASSWORDS: Record<string, string> = {
  "staff-001": "philix@CEO2025",
  "staff-002": "philix@Mgr2025",
  "staff-003": "philix@LO2025",
  "staff-004": "philix@Col2025",
  "staff-005": "philix@Acc2025",
};

interface StaffStoreState {
  staff: StaffUser[];
  passwords: Record<string, string>;
  addStaff: (member: Omit<StaffUser, "id" | "employeeNumber" | "joinedAt" | "avatarInitials">, password: string) => StaffUser;
  removeStaff: (id: string) => void;
  updateStaff: (id: string, data: Partial<StaffUser>) => void;
}

export const useStaffStore = create<StaffStoreState>()(
  persist(
    (set, get) => ({
      staff: [...demoStaff],
      passwords: { ...INITIAL_PASSWORDS },

      addStaff: (data, password) => {
        const existing = get().staff;
        const nextNum = existing.length + 1;
        const id = `staff-${Date.now()}`;
        const employeeNumber = `EMP-${String(nextNum).padStart(3, "0")}`;
        const avatarInitials = `${data.firstName[0]}${data.lastName[0]}`.toUpperCase();
        const member: StaffUser = {
          ...data,
          id,
          employeeNumber,
          joinedAt: new Date().toISOString(),
          avatarInitials,
          status: "ACTIVE",
        };
        set(state => ({
          staff: [...state.staff, member],
          passwords: { ...state.passwords, [id]: password },
        }));
        return member;
      },

      removeStaff: (id) =>
        set(state => ({
          staff: state.staff.filter(s => s.id !== id),
        })),

      updateStaff: (id, data) =>
        set(state => ({
          staff: state.staff.map(s => s.id === id ? { ...s, ...data } : s),
        })),
    }),
    { name: "philix-staff-store" }
  )
);
