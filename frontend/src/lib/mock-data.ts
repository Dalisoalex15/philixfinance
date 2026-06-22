// Philix Finance — Data
// Transactional arrays are empty — data comes from the live database.
// Only the product catalog and utility functions are defined here.

// ── Utility functions ───────────────────────────────────────────────────────

export const formatKwacha = (amount: number) =>
  `K${amount.toLocaleString("en-ZM", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Full currency label for headings and labels (e.g. "K 5,000 ZMW")
export const formatKwachaFull = (amount: number) =>
  `K${amount.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ZMW`;

export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-ZM", { day: "2-digit", month: "short", year: "numeric" });

export const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: "badge-green", CURRENT: "badge-green", PAID: "badge-green", COMPLETED: "badge-green", APPROVED: "badge-green",
    OVERDUE: "badge-yellow", AT_RISK: "badge-yellow", PENDING: "badge-yellow", IN_PROGRESS: "badge-blue",
    DEFAULTED: "badge-red", BLACKLISTED: "badge-red", CANCELLED: "badge-red", REJECTED: "badge-red",
    HELD: "badge-blue", AUCTIONED: "badge-red", RELEASED: "badge-gray",
    LOW: "badge-green", MEDIUM: "badge-yellow", HIGH: "badge-red", CRITICAL: "badge-red",
    SUPER_ADMIN: "badge-blue", MANAGER: "badge-blue", LOAN_OFFICER: "badge-gray",
    COLLECTIONS_OFFICER: "badge-yellow", ACCOUNTANT: "badge-gray",
  };
  return map[status] || "badge-gray";
};

// ── Stub exports (pages import these; will be replaced by real API data) ────

export const mockUser = {
  id: "", employeeId: "", firstName: "Daliso", lastName: "Phiri",
  email: "daliso@philixfinance.com", phone: "", role: "SUPER_ADMIN",
  branch: { id: "", name: "Lusaka Main", code: "LUS-MAIN" },
  mfaEnabled: false, avatarUrl: null,
};

export const mockKPIs = {
  activeLoans: 0, overdueLoans: 0, defaultedLoans: 0,
  todayLoans: 0, monthLoans: 0, pendingApprovals: 0,
  totalCollateral: 0, totalOutstanding: 0, totalDisbursed: 0,
  totalCollected: 0, next7DaysCollections: 0, upcomingCount: 0,
  defaultRate: 0, recoveryRate: 0,
};

// All transactional arrays — empty until real data is recorded
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
export const mockClients: Row[] = [];
export const mockLoans: Row[] = [];
export const mockCollateral: Row[] = [];
export const mockRepaymentTrend: Row[] = [];
export const mockMonthlyDisbursements: Row[] = [];
export const mockLoanStatusChart: Row[] = [];
export const mockPAR: Row[] = [];
export const mockTopOfficers: Row[] = [];
export const mockUpcomingCollections: Row[] = [];
export const mockAnnouncements: Row[] = [];
export const mockTasks: Row[] = [];
export const mockInvestors: Row[] = [];
export const mockExpenses: Row[] = [];
export const mockUsers: Row[] = [];
export const mockWikiPages: Row[] = [];
export const mockAuditLogs: Row[] = [];
export const mockPerformance: Row[] = [];
export const mockCampusPerformance: Row[] = [];
export const mockChartOfAccounts: Row[] = [];
export const mockJournalEntries: Row[] = [];
export const mockCashbook: Row[] = [];
export const mockBankReconciliation: Row[] = [];
export const mockLoanRestructures: Row[] = [];
export const mockWriteOffs: Row[] = [];
export const mockProvisionings: Row[] = [];
export const mockPenalties: Row[] = [];
export const mockAuctions: Row[] = [];
export const mockOnlineApplications: Row[] = [];
export const mockKYCRecords: Row[] = [];
export const mockClientTimeline: Row[] = [];
export const mockDocumentExpiry: Row[] = [];
export const mockPromises: Row[] = [];
export const mockBudgets: Row[] = [];
export const mockForecasts: Row[] = [];
export const mockAssets: Row[] = [];
export const mockLeaveRequests: Row[] = [];
export const mockMeetings: Row[] = [];
export const mockCompliance: Row[] = [];
export const mockProcurement: Row[] = [];
export const mockEmailLogs: Row[] = [];
export const mockBranchProfitability: Row[] = [];
export const mockPortfolioProfitability: Row[] = [];
export const mockImportLogs: Row[] = [];
export const mockInvestorStatements: Row[] = [];

export const mockCapitalUtilization = {
  totalCapital: 0, capitalLoaned: 0, availableCapital: 0, utilizationPct: 0,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockCollectionsDashboard: any = {
  totalOverdue: 0, totalAtRisk: 0, totalCollected: 0, overdueCount: 0,
  current: 0, atRisk: 0, days30: 0, days60: 0, days90: 0, defaulted: 0,
  totalOverdueAmount: 0, totalPenalties: 0,
};

// ── Loan product catalog (configuration, not transactional) ─────────────────

export interface LoanProductRate {
  id: string;
  durationValue: number;
  durationUnit: "weeks" | "months";
  interestRate: number;
  displayLabel: string;
  isActive: boolean;
  displayOrder: number;
}

export interface LoanProduct {
  id: string;
  slug: string;
  name: string;
  productType: string;
  targetBorrower: string;
  isActive: boolean;
  description: string;
  interestType: "flat" | "reducing";
  minAmount: number;
  maxAmount: number;
  processingFeeType: "percentage" | "fixed";
  processingFee: number;
  penaltyRate: number;
  penaltyPeriod: "per_day" | "per_week" | "per_month";
  gracePeriodDays: number;
  collateralRequired: boolean;
  ltvMode: "condition_based" | "product_override";
  ltvOverrideValue: number | null;
  eligibleCampuses: string[];
  requiredDocuments: string[];
  autoRenewal: boolean;
  displayOrder: number;
  eligibilityRules: { minRepaidLoans?: number; maxDefaultCount?: number; minCollateralCondition?: string; minTrustScore?: number; isTrustedClientRequired?: boolean } | null;
  rates: LoanProductRate[];
  auditLog: { action: string; field: string; oldValue: string; newValue: string; changedBy: string; changedAt: string; reason?: string }[];
  createdAt: string;
  updatedAt: string;
}

export const mockLtvConditionScale = [
  { condition: "excellent", label: "Excellent", maxLtvRatio: 70, description: "Like new, fully functional, no visible wear" },
  { condition: "good",      label: "Good",      maxLtvRatio: 60, description: "Lightly used, minor cosmetic wear, fully functional" },
  { condition: "fair",      label: "Fair",      maxLtvRatio: 50, description: "Visible wear, functioning with minor issues" },
  { condition: "poor",      label: "Poor",      maxLtvRatio: 40, description: "Heavy wear, significant issues, reduced functionality" },
];

export const mockLoanProducts: LoanProduct[] = [
  {
    id: "prod-001", slug: "student-emergency-loan", name: "Student Emergency Loan",
    productType: "STUDENT", targetBorrower: "Full-time students at UNZA, CBU, and UNILUS campuses",
    isActive: true, description: "Short-term collateral-backed emergency loans for enrolled university students. Core product representing the majority of Philix Finance's current loan book.",
    interestType: "flat", minAmount: 300, maxAmount: 10000,
    processingFeeType: "percentage", processingFee: 0, penaltyRate: 5, penaltyPeriod: "per_week", gracePeriodDays: 3,
    collateralRequired: true, ltvMode: "condition_based", ltvOverrideValue: null,
    eligibleCampuses: ["UNZA", "CBU", "UNILUS"], requiredDocuments: ["NRC", "Student ID"],
    autoRenewal: false, displayOrder: 1, eligibilityRules: null,
    rates: [
      { id: "r001-1", durationValue: 1, durationUnit: "weeks", interestRate: 10, displayLabel: "1 Week",  isActive: true, displayOrder: 1 },
      { id: "r001-2", durationValue: 2, durationUnit: "weeks", interestRate: 20, displayLabel: "2 Weeks", isActive: true, displayOrder: 2 },
      { id: "r001-3", durationValue: 3, durationUnit: "weeks", interestRate: 30, displayLabel: "3 Weeks", isActive: true, displayOrder: 3 },
      { id: "r001-4", durationValue: 4, durationUnit: "weeks", interestRate: 35, displayLabel: "4 Weeks", isActive: true, displayOrder: 4 },
    ],
    auditLog: [{ action: "created", field: "product", oldValue: "", newValue: "Student Emergency Loan", changedBy: "Daliso (CEO)", changedAt: "2024-01-15T09:00:00Z" }],
    createdAt: "2024-01-15", updatedAt: "2026-06-18",
  },
  {
    id: "prod-002", slug: "salary-advance-loan", name: "Salary Advance Loan",
    productType: "SALARY_ADVANCE", targetBorrower: "Employed individuals with verifiable monthly salary income",
    isActive: true, description: "Short-term advance against next salary for formally employed borrowers.",
    interestType: "flat", minAmount: 500, maxAmount: 20000,
    processingFeeType: "percentage", processingFee: 0, penaltyRate: 5, penaltyPeriod: "per_week", gracePeriodDays: 3,
    collateralRequired: true, ltvMode: "condition_based", ltvOverrideValue: null,
    eligibleCampuses: [], requiredDocuments: ["NRC", "Payslip", "Employment Letter"],
    autoRenewal: true, displayOrder: 2, eligibilityRules: null,
    rates: [
      { id: "r002-1", durationValue: 1, durationUnit: "weeks", interestRate: 10, displayLabel: "1 Week",  isActive: true, displayOrder: 1 },
      { id: "r002-2", durationValue: 2, durationUnit: "weeks", interestRate: 20, displayLabel: "2 Weeks", isActive: true, displayOrder: 2 },
      { id: "r002-3", durationValue: 3, durationUnit: "weeks", interestRate: 30, displayLabel: "3 Weeks", isActive: true, displayOrder: 3 },
      { id: "r002-4", durationValue: 4, durationUnit: "weeks", interestRate: 35, displayLabel: "4 Weeks", isActive: true, displayOrder: 4 },
    ],
    auditLog: [{ action: "created", field: "product", oldValue: "", newValue: "Salary Advance Loan", changedBy: "Daliso (CEO)", changedAt: "2024-01-15T09:00:00Z" }],
    createdAt: "2024-01-15", updatedAt: "2026-06-18",
  },
  {
    id: "prod-003", slug: "business-working-capital-loan", name: "Business Working Capital Loan",
    productType: "BUSINESS", targetBorrower: "Micro and small enterprise owners, market traders, self-employed individuals",
    isActive: true, description: "Short-term working capital loans for registered or witnessed informal businesses.",
    interestType: "flat", minAmount: 1000, maxAmount: 50000,
    processingFeeType: "percentage", processingFee: 0, penaltyRate: 5, penaltyPeriod: "per_week", gracePeriodDays: 3,
    collateralRequired: true, ltvMode: "condition_based", ltvOverrideValue: null,
    eligibleCampuses: [], requiredDocuments: ["NRC", "Trade Licence or Witness Letter"],
    autoRenewal: true, displayOrder: 3, eligibilityRules: null,
    rates: [
      { id: "r003-1", durationValue: 1, durationUnit: "weeks", interestRate: 10, displayLabel: "1 Week",  isActive: true, displayOrder: 1 },
      { id: "r003-2", durationValue: 2, durationUnit: "weeks", interestRate: 20, displayLabel: "2 Weeks", isActive: true, displayOrder: 2 },
      { id: "r003-3", durationValue: 3, durationUnit: "weeks", interestRate: 30, displayLabel: "3 Weeks", isActive: true, displayOrder: 3 },
      { id: "r003-4", durationValue: 4, durationUnit: "weeks", interestRate: 35, displayLabel: "4 Weeks", isActive: true, displayOrder: 4 },
    ],
    auditLog: [{ action: "created", field: "product", oldValue: "", newValue: "Business Working Capital Loan", changedBy: "Daliso (CEO)", changedAt: "2024-01-15T09:00:00Z" }],
    createdAt: "2024-01-15", updatedAt: "2026-06-18",
  },
  {
    id: "prod-004", slug: "electronics-equity-loan", name: "Electronics Equity Loan",
    productType: "ELECTRONICS_EQUITY", targetBorrower: "Any individual using a smartphone, laptop, or electronics as collateral",
    isActive: true, description: "Loans secured against electronics. LTV fixed at 60% of market value.",
    interestType: "flat", minAmount: 500, maxAmount: 100000,
    processingFeeType: "percentage", processingFee: 0, penaltyRate: 5, penaltyPeriod: "per_week", gracePeriodDays: 3,
    collateralRequired: true, ltvMode: "product_override", ltvOverrideValue: 60,
    eligibleCampuses: [], requiredDocuments: ["NRC", "Purchase Receipt or Proof of Ownership"],
    autoRenewal: true, displayOrder: 4, eligibilityRules: null,
    rates: [
      { id: "r004-1", durationValue: 1, durationUnit: "weeks", interestRate: 10, displayLabel: "1 Week",  isActive: true, displayOrder: 1 },
      { id: "r004-2", durationValue: 2, durationUnit: "weeks", interestRate: 20, displayLabel: "2 Weeks", isActive: true, displayOrder: 2 },
      { id: "r004-3", durationValue: 3, durationUnit: "weeks", interestRate: 30, displayLabel: "3 Weeks", isActive: true, displayOrder: 3 },
      { id: "r004-4", durationValue: 4, durationUnit: "weeks", interestRate: 35, displayLabel: "4 Weeks", isActive: true, displayOrder: 4 },
    ],
    auditLog: [{ action: "created", field: "product", oldValue: "", newValue: "Electronics Equity Loan", changedBy: "Daliso (CEO)", changedAt: "2024-01-15T09:00:00Z" }],
    createdAt: "2024-01-15", updatedAt: "2026-06-18",
  },
  {
    id: "prod-005", slug: "repeat-customer-loyalty-loan", name: "Repeat Customer Loyalty Loan",
    productType: "LOYALTY", targetBorrower: "Existing clients with 2+ fully repaid loans and zero defaults",
    isActive: true, description: "Preferential rate product for repeat customers who have demonstrated reliable repayment history.",
    interestType: "flat", minAmount: 300, maxAmount: 50000,
    processingFeeType: "percentage", processingFee: 0, penaltyRate: 5, penaltyPeriod: "per_week", gracePeriodDays: 3,
    collateralRequired: true, ltvMode: "condition_based", ltvOverrideValue: null,
    eligibleCampuses: [], requiredDocuments: ["NRC"],
    autoRenewal: true, displayOrder: 5, eligibilityRules: { minRepaidLoans: 2, maxDefaultCount: 0 },
    rates: [
      { id: "r005-1", durationValue: 1, durationUnit: "weeks", interestRate: 8,  displayLabel: "1 Week",  isActive: true, displayOrder: 1 },
      { id: "r005-2", durationValue: 2, durationUnit: "weeks", interestRate: 16, displayLabel: "2 Weeks", isActive: true, displayOrder: 2 },
      { id: "r005-3", durationValue: 3, durationUnit: "weeks", interestRate: 24, displayLabel: "3 Weeks", isActive: true, displayOrder: 3 },
      { id: "r005-4", durationValue: 4, durationUnit: "weeks", interestRate: 30, displayLabel: "4 Weeks", isActive: true, displayOrder: 4 },
    ],
    auditLog: [{ action: "created", field: "product", oldValue: "", newValue: "Repeat Customer Loyalty Loan", changedBy: "Daliso (CEO)", changedAt: "2024-01-15T09:00:00Z" }],
    createdAt: "2024-01-15", updatedAt: "2026-06-18",
  },
  {
    id: "prod-006", slug: "premium-client-loan", name: "Premium Client Loan",
    productType: "PREMIUM", targetBorrower: "Elite clients with 5+ repaid loans, zero defaults, and good/excellent collateral",
    isActive: true, description: "Best-in-portfolio rates for Philix Finance's most trusted clients.",
    interestType: "flat", minAmount: 300, maxAmount: 50000,
    processingFeeType: "percentage", processingFee: 0, penaltyRate: 5, penaltyPeriod: "per_week", gracePeriodDays: 3,
    collateralRequired: true, ltvMode: "condition_based", ltvOverrideValue: null,
    eligibleCampuses: [], requiredDocuments: ["NRC"],
    autoRenewal: true, displayOrder: 6, eligibilityRules: { minRepaidLoans: 5, maxDefaultCount: 0, minCollateralCondition: "good" },
    rates: [
      { id: "r006-1", durationValue: 1, durationUnit: "weeks", interestRate: 7,  displayLabel: "1 Week",  isActive: true, displayOrder: 1 },
      { id: "r006-2", durationValue: 2, durationUnit: "weeks", interestRate: 14, displayLabel: "2 Weeks", isActive: true, displayOrder: 2 },
      { id: "r006-3", durationValue: 3, durationUnit: "weeks", interestRate: 21, displayLabel: "3 Weeks", isActive: true, displayOrder: 3 },
      { id: "r006-4", durationValue: 4, durationUnit: "weeks", interestRate: 28, displayLabel: "4 Weeks", isActive: true, displayOrder: 4 },
    ],
    auditLog: [{ action: "created", field: "product", oldValue: "", newValue: "Premium Client Loan", changedBy: "Daliso (CEO)", changedAt: "2024-01-15T09:00:00Z" }],
    createdAt: "2024-01-15", updatedAt: "2026-06-18",
  },
  {
    id: "prod-007", slug: "trusted-client-express-loan", name: "Trusted Client Express Loan",
    productType: "TRUSTED",
    targetBorrower: "Existing clients with 2+ repaid loans, no defaults, and verified income — NO collateral required",
    isActive: true,
    description: "Trust Earned. Finance Simplified. No collateral needed — approval based on your repayment history, trust score, and income. Available exclusively to Trusted Client status holders.",
    interestType: "flat", minAmount: 1000, maxAmount: 25000,
    processingFeeType: "percentage", processingFee: 0, penaltyRate: 5, penaltyPeriod: "per_week", gracePeriodDays: 7,
    collateralRequired: false,
    ltvMode: "condition_based", ltvOverrideValue: null,
    eligibleCampuses: [], requiredDocuments: ["NRC", "Income Proof", "Guarantor Details"],
    autoRenewal: false, displayOrder: 7,
    eligibilityRules: { minRepaidLoans: 2, maxDefaultCount: 0, minTrustScore: 60, isTrustedClientRequired: true },
    rates: [
      { id: "r007-1", durationValue: 4,  durationUnit: "weeks", interestRate: 8,  displayLabel: "4 Weeks",  isActive: true, displayOrder: 1 },
      { id: "r007-2", durationValue: 8,  durationUnit: "weeks", interestRate: 15, displayLabel: "8 Weeks",  isActive: true, displayOrder: 2 },
      { id: "r007-3", durationValue: 12, durationUnit: "weeks", interestRate: 22, displayLabel: "12 Weeks", isActive: true, displayOrder: 3 },
      { id: "r007-4", durationValue: 16, durationUnit: "weeks", interestRate: 28, displayLabel: "16 Weeks", isActive: true, displayOrder: 4 },
      { id: "r007-5", durationValue: 20, durationUnit: "weeks", interestRate: 33, displayLabel: "20 Weeks", isActive: true, displayOrder: 5 },
      { id: "r007-6", durationValue: 24, durationUnit: "weeks", interestRate: 38, displayLabel: "24 Weeks", isActive: true, displayOrder: 6 },
    ],
    auditLog: [{ action: "created", field: "product", oldValue: "", newValue: "Trusted Client Express Loan", changedBy: "Daliso (CEO)", changedAt: "2026-06-21T09:00:00Z" }],
    createdAt: "2026-06-21", updatedAt: "2026-06-21",
  },
];
