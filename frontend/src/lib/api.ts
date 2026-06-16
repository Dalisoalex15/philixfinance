const BASE = "/api";

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("philix_portal_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> ?? {}),
    },
    ...opts,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed ${res.status}`);
  return data as T;
}

// ── Staff helper (uses staff JWT stored separately) ──────────────────────────
async function staffRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("philix_staff_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> ?? {}),
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Request failed ${res.status}`);
  return data as T;
}

// ── Staff auth ────────────────────────────────────────────────────────────────
export interface StaffAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string; employeeId: string; firstName: string; lastName: string;
    email: string; phone: string; role: string; branch: null;
    mfaEnabled: boolean; avatarUrl: string | null;
  };
}

export const staffApi = {
  login: (email: string, password: string) =>
    staffRequest<StaffAuthResponse>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),

  logout: (refreshToken: string) =>
    staffRequest("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),

  getAllPortalApplications: () =>
    staffRequest<StaffPortalApplication[]>("/portal/applications/staff/all"),

  updateApplicationStatus: (id: string, status: string, rejectedReason?: string) =>
    staffRequest(`/portal/applications/staff/${id}`, {
      method: "PATCH", body: JSON.stringify({ status, rejectedReason }),
    }),
};

export function saveStaffTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("philix_staff_token", accessToken);
  localStorage.setItem("philix_staff_refresh", refreshToken);
}

export function clearStaffTokens() {
  localStorage.removeItem("philix_staff_token");
  localStorage.removeItem("philix_staff_refresh");
}

export interface StaffPortalApplication {
  id: string;
  reference: string;
  accountId: string;
  productType: string;
  amountRequested: number;
  termMonths: number;
  purpose: string;
  collateralType?: string;
  collateralDesc?: string;
  collateralValue?: number;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  account?: {
    firstName: string; lastName: string; email: string; phone: string; clientNumber: string;
  };
}

// ── Portal auth ──────────────────────────────────────────────────────────────
export const portalApi = {
  register: (body: Record<string, unknown>) =>
    request<{ accessToken: string; refreshToken: string; account: ClientAccount }>("/portal/auth/register", {
      method: "POST", body: JSON.stringify(body),
    }),

  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; account: ClientAccount }>("/portal/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),

  logout: (refreshToken: string) =>
    request("/portal/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),

  me: () => request<ClientAccount>("/portal/me"),

  updateProfile: (data: Partial<ClientAccount>) =>
    request<ClientAccount>("/portal/me", { method: "PATCH", body: JSON.stringify(data) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request("/portal/me/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  // Loan applications
  submitApplication: (data: Record<string, unknown>) =>
    request<PortalApplication>("/portal/applications", { method: "POST", body: JSON.stringify(data) }),

  getApplications: () => request<PortalApplication[]>("/portal/applications"),

  // KYC
  submitKyc: (data: { nrcNumber: string; documents: KycDoc[] }) =>
    request("/portal/kyc", { method: "POST", body: JSON.stringify(data) }),

  getKycStatus: () => request<KycStatus>("/portal/kyc"),

  // Notifications
  getNotifications: (page = 1) =>
    request<{ notifications: ClientNotification[]; total: number; unread: number }>(`/portal/notifications?page=${page}`),

  markNotificationsRead: (ids: string[] | "all") =>
    request("/portal/notifications/mark-read", { method: "POST", body: JSON.stringify({ ids }) }),
};

export function savePortalTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("philix_portal_token", accessToken);
  localStorage.setItem("philix_portal_refresh", refreshToken);
}

export function clearPortalTokens() {
  localStorage.removeItem("philix_portal_token");
  localStorage.removeItem("philix_portal_refresh");
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface ClientAccount {
  id: string;
  clientNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  nrcNumber?: string;
  kycStatus: "NOT_STARTED" | "SUBMITTED" | "IN_REVIEW" | "VERIFIED" | "REJECTED";
  status: "ACTIVE" | "PENDING_KYC" | "SUSPENDED" | "BLACKLISTED";
  lastLoginAt?: string;
  createdAt: string;
  notifications?: { id: string }[];
  portalLoans?: PortalApplication[];
  kycDocuments?: KycDoc[];
}

export interface PortalApplication {
  id: string;
  reference: string;
  productType: string;
  amountRequested: number;
  termMonths: number;
  purpose: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  rejectedReason?: string;
}

export interface KycDoc {
  id?: string;
  docType: string;
  fileUrl?: string;
  fileName: string;
  mimeType?: string;
}

export interface KycStatus {
  kycStatus: ClientAccount["kycStatus"];
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycRejectedReason?: string;
  nrcNumber?: string;
  documents: KycDoc[];
}

export interface ClientNotification {
  id: string;
  subject: string;
  body: string;
  category: string;
  isRead: boolean;
  sentViaEmail: boolean;
  createdAt: string;
}
