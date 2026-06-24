// On Vercel: /api/* routes to the serverless function (same domain, no env var needed)
// In local dev: Vite proxy forwards /api → localhost:4000
const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let token = localStorage.getItem("philix_portal_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string> ?? {}),
    },
    ...opts,
  });

  const data = await res.json().catch(() => ({}));

  // Token expired — attempt refresh once, then log out
  if (res.status === 401 && data.code === "TOKEN_EXPIRED") {
    const refreshToken = localStorage.getItem("philix_portal_refresh");
    if (refreshToken) {
      const rr = await fetch(`${BASE}/portal/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const rd = await rr.json().catch(() => ({}));
      if (rr.ok && rd.accessToken) {
        localStorage.setItem("philix_portal_token", rd.accessToken);
        token = rd.accessToken;
        const retry = await fetch(`${BASE}${path}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          ...opts,
        });
        const retryData = await retry.json().catch(() => ({}));
        if (!retry.ok) throw new Error(retryData.message || retryData.error || `Request failed ${retry.status}`);
        return retryData as T;
      }
    }
    // Refresh failed — force logout via event
    localStorage.removeItem("philix_portal_token");
    localStorage.removeItem("philix_portal_refresh");
    window.dispatchEvent(new CustomEvent("philix:portal-unauthorized", { detail: { code: "TOKEN_EXPIRED" } }));
    throw new Error("Session expired. Please log in again.");
  }

  // Suspended / blacklisted
  if (res.status === 403 && (data.code === "ACCOUNT_SUSPENDED" || data.code === "ACCOUNT_BLACKLISTED")) {
    localStorage.removeItem("philix_portal_token");
    localStorage.removeItem("philix_portal_refresh");
    window.dispatchEvent(new CustomEvent("philix:portal-unauthorized", { detail: { code: data.code } }));
    throw new Error(data.message || data.error || "Access denied");
  }

  if (!res.ok) throw new Error(data.message || data.error || `Request failed ${res.status}`);
  return data as T;
}

// ── Staff helper (uses staff JWT stored separately, auto-refreshes on expiry) ──
async function staffRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const makeHeaders = (token: string | null) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> ?? {}),
  });

  let token = localStorage.getItem("philix_staff_token");
  const res = await fetch(`${BASE}${path}`, { headers: makeHeaders(token), ...opts });
  const data = await res.json().catch(() => ({}));

  // Auto-refresh on token expiry then retry once
  if (res.status === 401 && data.code === "TOKEN_EXPIRED") {
    const refreshToken = localStorage.getItem("philix_staff_refresh");
    if (refreshToken) {
      const rr = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const rd = await rr.json().catch(() => ({}));
      if (rr.ok && rd.accessToken) {
        localStorage.setItem("philix_staff_token", rd.accessToken);
        token = rd.accessToken;
        const retry = await fetch(`${BASE}${path}`, { headers: makeHeaders(token), ...opts });
        const retryData = await retry.json().catch(() => ({}));
        if (!retry.ok) throw new Error(retryData.message || retryData.error || `Request failed ${retry.status}`);
        return retryData as T;
      }
    }
  }

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

  // Admin endpoints
  getActivity: () =>
    staffRequest<ActivityEvent[]>("/admin/activity"),

  getAdminSummary: () =>
    staffRequest<AdminSummary>("/admin/summary"),

  fraudScan: () =>
    staffRequest<{ alerts: FraudAlert[]; scannedAt: string; totalAccounts: number }>("/admin/fraud-scan"),

  wipeDemoData: () =>
    staffRequest("/admin/wipe-demo-data", {
      method: "POST", body: JSON.stringify({ confirm: "WIPE_ALL_DEMO_DATA" }),
    }),

  getPortalAccounts: () =>
    staffRequest<PortalAccount[]>("/admin/portal-accounts"),

  getPortalAccount: (id: string) =>
    staffRequest<PortalAccount & { portalLoans: unknown[] }>(`/admin/portal-accounts/${id}`),

  updatePortalAccountStatus: (id: string, status: string) =>
    staffRequest(`/admin/portal-accounts/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  updatePortalAccountKyc: (id: string, kycStatus: string) =>
    staffRequest(`/admin/portal-accounts/${id}/kyc`, { method: "PATCH", body: JSON.stringify({ kycStatus }) }),
};

export interface ActivityEvent {
  id: string;
  type: string;
  client: string;
  clientNo?: string;
  ref: string;
  amount: number;
  description: string;
  timestamp: string;
}

export interface AdminSummary {
  totalPortalAccounts: number;
  pendingApplications: number;
  approvedToday: number;
  submittedToday: number;
  totalApplications: number;
  totalDisbursedAmount?: number;
  totalInterestEarned?: number;
  totalRepayable?: number;
  totalLoanedOut?: number;
}

export interface PortalAccount {
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
  emailVerified: boolean;
  lastLoginAt?: string;
  failedLoginCount?: number;
  createdAt: string;
  _count: { loanApplications: number };
}

export interface FraudAlert {
  id: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  value: string;
  description: string;
  accounts: { id: string; name: string; clientNo: string; email: string }[];
  detectedAt: string;
}

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
  interestRate: number;
  purpose: string;
  description?: string;
  occupation?: string;
  employer?: string;
  employerPhone?: string;
  monthlyIncome?: number;
  payDate?: string;
  collateralType?: string;
  collateralDesc?: string;
  collateralValue?: number;
  collateralCondition?: string;
  collateralPhotos?: string[];
  ref1Name?: string;
  ref1Phone?: string;
  ref1Relation?: string;
  ref2Name?: string;
  ref2Phone?: string;
  ref2Relation?: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectedReason?: string;
  linkedLoanId?: string;
  createdAt: string;
  updatedAt?: string;
  account?: {
    firstName: string; lastName: string; email: string; phone: string; clientNumber: string;
  };
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
  // Auto-computed risk assessment
  riskScore?: number;
  riskCategory?: string;
  coverageRatio?: number;
  marketValue?: number;
  forcedSaleValue?: number;
  lendingValue?: number;
  maxRecommendedLoan?: number;
  repossessionScore?: string;
  assessmentJson?: string;
}

// ── Portal auth ──────────────────────────────────────────────────────────────
export const portalApi = {
  sendEmailCode: (email: string) =>
    request<{ sent: boolean; message: string }>("/portal/auth/send-email-code", {
      method: "POST", body: JSON.stringify({ email }),
    }),

  confirmEmailCode: (email: string, otp: string) =>
    request<{ verified: boolean; emailProofToken: string; message: string }>("/portal/auth/confirm-email-code", {
      method: "POST", body: JSON.stringify({ email, otp }),
    }),

  register: (body: Record<string, unknown>) =>
    request<{ accessToken: string; refreshToken: string; account: ClientAccount }>("/portal/auth/register", {
      method: "POST", body: JSON.stringify(body),
    }),

  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; account: ClientAccount; requiresVerification?: boolean; email?: string }>("/portal/auth/login", {
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
  isTrustedClient?: boolean;
  trustScore?: number;
  trustGrantedAt?: string;
  trustGrantedBy?: string;
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
