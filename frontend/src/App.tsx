import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useClientAuthStore } from "./store/clientAuth";
import { clearPortalTokens } from "./lib/api";
import MainLayout from "./components/layout/MainLayout";
import UnifiedLoginPage from "./pages/UnifiedLoginPage";
// Staff portal
import StaffRegisterPage from "./pages/staff/StaffRegisterPage";
// Client portal
import ClientPortalLayout from "./components/portal/ClientPortalLayout";
import ClientRegisterPage from "./pages/portal/ClientRegisterPage";
import ClientDashboardPage from "./pages/portal/ClientDashboardPage";
import LoanApplicationPage from "./pages/portal/LoanApplicationPage";
import CollateralSubmissionPage from "./pages/portal/CollateralSubmissionPage";
import KYCSubmissionPage from "./pages/portal/KYCSubmissionPage";
import MyLoansPage from "./pages/portal/MyLoansPage";
import ClientProfilePage from "./pages/portal/ClientProfilePage";
import ClientNotificationsPage from "./pages/portal/ClientNotificationsPage";
import ClientLoanCalculatorPage from "./pages/portal/ClientLoanCalculatorPage";
import StatementPage from "./pages/portal/StatementPage";
import ReferralPage from "./pages/portal/ReferralPage";
import SupportPage from "./pages/portal/SupportPage";
import EligibilityPage from "./pages/portal/EligibilityPage";
import CreditScorePage from "./pages/portal/CreditScorePage";
import EmailComposerPage from "./pages/EmailComposerPage";
import EmailManagementPage from "./pages/EmailManagementPage";
import EmailCentrePage from "./pages/EmailCentrePage";
import OtpVerificationPage from "./pages/portal/OtpVerificationPage";
import DashboardPage from "./pages/DashboardPage";
import CEODashboardPage from "./pages/CEODashboardPage";
import PhilixAIPage from "./pages/PhilixAIPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import NewClientPage from "./pages/NewClientPage";
import LoansPage from "./pages/LoansPage";
import LoanDetailPage from "./pages/LoanDetailPage";
import NewLoanPage from "./pages/NewLoanPage";
import CollateralPage from "./pages/CollateralPage";
import CollateralDetailPage from "./pages/CollateralDetailPage";
import RepaymentsPage from "./pages/RepaymentsPage";
import CollectionsPage from "./pages/CollectionsPage";
import ReportsPage from "./pages/ReportsPage";
import ExpensesPage from "./pages/ExpensesPage";
import InvestorsPage from "./pages/InvestorsPage";
import TasksPage from "./pages/TasksPage";
import UsersPage from "./pages/UsersPage";
import PerformancePage from "./pages/PerformancePage";
import AuditPage from "./pages/AuditPage";
import WikiPage from "./pages/WikiPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import RecoveryPage from "./pages/RecoveryPage";
import BranchesPage from "./pages/BranchesPage";
import SettingsPage from "./pages/SettingsPage";
import LoanCalculatorPage from "./pages/LoanCalculatorPage";
// Phase 3 imports
import AccountingPage from "./pages/AccountingPage";
import CashbookPage from "./pages/CashbookPage";
import BankReconciliationPage from "./pages/BankReconciliationPage";
import ProvisioningPage from "./pages/ProvisioningPage";
import BranchProfitabilityPage from "./pages/BranchProfitabilityPage";
import LoanProductsPage from "./pages/LoanProductsPage";
import LoanRestructurePage from "./pages/LoanRestructurePage";
import WriteOffsPage from "./pages/WriteOffsPage";
import CollateralAuctionPage from "./pages/CollateralAuctionPage";
import OnlineApplicationsPage from "./pages/OnlineApplicationsPage";
import KYCPage from "./pages/KYCPage";
import ClientTimelinePage from "./pages/ClientTimelinePage";
import DocumentExpiryPage from "./pages/DocumentExpiryPage";
import BudgetingPage from "./pages/BudgetingPage";
import ForecastingPage from "./pages/ForecastingPage";
import AssetRegisterPage from "./pages/AssetRegisterPage";
import LeaveManagementPage from "./pages/LeaveManagementPage";
import MeetingMinutesPage from "./pages/MeetingMinutesPage";
import CompliancePage from "./pages/CompliancePage";
import ProcurementPage from "./pages/ProcurementPage";
import EmailLogsPage from "./pages/EmailLogsPage";
import ImportPage from "./pages/ImportPage";
import ExportCenterPage from "./pages/ExportCenterPage";
import GlobalSearchPage from "./pages/GlobalSearchPage";
import PortfolioProfitabilityPage from "./pages/PortfolioProfitabilityPage";
import InvestorStatementsPage from "./pages/InvestorStatementsPage";
// Addendum v2.1 — 10 new feature pages
import SMSNotificationsPage from "./pages/SMSNotificationsPage";
import MobileMoneyPage from "./pages/MobileMoneyPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import LoanAgreementPage from "./pages/LoanAgreementPage";
import QRReceiptPage from "./pages/QRReceiptPage";
import CreditScoringPage from "./pages/CreditScoringPage";
import FraudAlertsPage from "./pages/FraudAlertsPage";
import ReferralProgrammePage from "./pages/ReferralProgrammePage";
import GroupLendingPage from "./pages/GroupLendingPage";
import APIManagementPage from "./pages/APIManagementPage";
import DefaultRiskPage from "./pages/DefaultRiskPage";
import PortalClientsPage from "./pages/PortalClientsPage";
import ClientBroadcastPage from "./pages/ClientBroadcastPage";
import CapitalPage from "./pages/CapitalPage";
import PaymentSubmissionsPage from "./pages/PaymentSubmissionsPage";
import CollateralCommandPage from "./pages/CollateralCommandPage";
import InvestmentManagementPage from "./pages/InvestmentManagementPage";
import InvestPage from "./pages/portal/InvestPage";
import LoanProductsPortalPage from "./pages/portal/LoanProductsPage";
import FinancialStatementsPage from "./pages/FinancialStatementsPage";
import TargetsPage from "./pages/TargetsPage";
import GetLoanIn15Page from "./pages/portal/GetLoanIn15Page";
import RepaymentAccountsPage from "./pages/RepaymentAccountsPage";
import AccountsManagementPage from "./pages/AccountsManagementPage";
import FinancialControlsPage from "./pages/FinancialControlsPage";
import LoanProductRatesPage from "./pages/LoanProductRatesPage";
import ClientCreditScoresPage from "./pages/ClientCreditScoresPage";
// New staff feature pages
import LoanAgingReportPage from "./pages/LoanAgingReportPage";
import DailyCollectionSheetPage from "./pages/DailyCollectionSheetPage";
import LoanPipelinePage from "./pages/LoanPipelinePage";
import CollectionPerformancePage from "./pages/CollectionPerformancePage";
import BulkPaymentImportPage from "./pages/BulkPaymentImportPage";
import ClientVisitSchedulerPage from "./pages/ClientVisitSchedulerPage";
import DisbursementChecklistPage from "./pages/DisbursementChecklistPage";
import DocumentExpiryAlertsPage from "./pages/DocumentExpiryAlertsPage";
import QuickLoanLookupPage from "./pages/QuickLoanLookupPage";
import StaffPerformanceDashboardPage from "./pages/StaffPerformanceDashboardPage";
// New client portal pages
import PaymentCalendarPage from "./pages/portal/PaymentCalendarPage";
import AccountStatementPage from "./pages/portal/AccountStatementPage";
import LoanRenewalPage from "./pages/portal/LoanRenewalPage";
import DocumentCenterPage from "./pages/portal/DocumentCenterPage";
import ClientSupportPage from "./pages/portal/ClientSupportPage";
import AboutPage from "./pages/portal/AboutPage";

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#020617",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "16px", padding: "32px",
          fontFamily: "system-ui, sans-serif",
        }}>
          <div style={{ color: "#f59e0b", fontSize: "32px" }}>⚠</div>
          <div style={{ color: "#e2e8f0", fontSize: "16px", fontWeight: 600 }}>Page failed to load</div>
          <div style={{ color: "#475569", fontSize: "13px", maxWidth: "400px", textAlign: "center" }}>
            {this.state.error.message}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => window.location.reload()}
              style={{ background: "#4f46e5", color: "white", border: "none", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
              Reload
            </button>
            <button onClick={() => { this.setState({ error: null }); window.history.back(); }}
              style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
              Go Back
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Guards the portal — redirects unauthenticated clients to login
function RequireClientAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, client } = useClientAuthStore(s => ({ isAuthenticated: s.isAuthenticated, client: s.client }));
  const logout = useClientAuthStore(s => s.logout);
  const [hydrated, setHydrated] = useState(() => useClientAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useClientAuthStore.persist.hasHydrated()) { setHydrated(true); return; }
    const unsub = useClientAuthStore.persist.onFinishHydration(() => setHydrated(true));
    const t = setTimeout(() => setHydrated(true), 300);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  // Global listener: if any portal API call returns 401/403 (suspended/blacklisted), log out
  useEffect(() => {
    function handleUnauthorized(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.code === "ACCOUNT_SUSPENDED" || detail?.code === "ACCOUNT_BLACKLISTED") {
        clearPortalTokens();
        logout();
      }
    }
    window.addEventListener("philix:portal-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("philix:portal-unauthorized", handleUnauthorized);
  }, [logout]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !client) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) { setHydrated(true); return; }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    const t = setTimeout(() => setHydrated(true), 300);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* All login routes → single unified login */}
        <Route path="/login" element={<UnifiedLoginPage />} />
        <Route path="/staff/login" element={<UnifiedLoginPage />} />
        <Route path="/portal/login" element={<UnifiedLoginPage />} />
        <Route path="/staff/register" element={<StaffRegisterPage />} />
        <Route path="/staff" element={<Navigate to="/login" replace />} />
        <Route path="/portal/register" element={<ClientRegisterPage />} />
        <Route path="/portal/verify-email" element={<OtpVerificationPage />} />
        <Route path="/portal/get-a-loan" element={<GetLoanIn15Page />} />
        <Route path="/portal" element={
          <RouteErrorBoundary>
            <RequireClientAuth>
              <ClientPortalLayout />
            </RequireClientAuth>
          </RouteErrorBoundary>
        }>
          <Route index element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="dashboard"    element={<RouteErrorBoundary><ClientDashboardPage /></RouteErrorBoundary>} />
          <Route path="apply"        element={<RouteErrorBoundary><LoanApplicationPage /></RouteErrorBoundary>} />
          <Route path="loans"        element={<RouteErrorBoundary><MyLoansPage /></RouteErrorBoundary>} />
          <Route path="collateral"   element={<RouteErrorBoundary><CollateralSubmissionPage /></RouteErrorBoundary>} />
          <Route path="kyc"          element={<RouteErrorBoundary><KYCSubmissionPage /></RouteErrorBoundary>} />
          <Route path="notifications"element={<RouteErrorBoundary><ClientNotificationsPage /></RouteErrorBoundary>} />
          <Route path="profile"      element={<RouteErrorBoundary><ClientProfilePage /></RouteErrorBoundary>} />
          <Route path="calculator"   element={<RouteErrorBoundary><ClientLoanCalculatorPage /></RouteErrorBoundary>} />
          <Route path="statement"    element={<RouteErrorBoundary><StatementPage /></RouteErrorBoundary>} />
          <Route path="referral"     element={<RouteErrorBoundary><ReferralPage /></RouteErrorBoundary>} />
          <Route path="support"      element={<RouteErrorBoundary><SupportPage /></RouteErrorBoundary>} />
          <Route path="eligibility"  element={<RouteErrorBoundary><EligibilityPage /></RouteErrorBoundary>} />
          <Route path="credit-score" element={<RouteErrorBoundary><CreditScorePage /></RouteErrorBoundary>} />
          <Route path="invest"            element={<RouteErrorBoundary><InvestPage /></RouteErrorBoundary>} />
          <Route path="products"          element={<RouteErrorBoundary><LoanProductsPortalPage /></RouteErrorBoundary>} />
          <Route path="payment-calendar"  element={<RouteErrorBoundary><PaymentCalendarPage /></RouteErrorBoundary>} />
          <Route path="account-statement" element={<RouteErrorBoundary><AccountStatementPage /></RouteErrorBoundary>} />
          <Route path="renew"             element={<RouteErrorBoundary><LoanRenewalPage /></RouteErrorBoundary>} />
          <Route path="documents"         element={<RouteErrorBoundary><DocumentCenterPage /></RouteErrorBoundary>} />
          <Route path="help"              element={<RouteErrorBoundary><ClientSupportPage /></RouteErrorBoundary>} />
          <Route path="about"             element={<RouteErrorBoundary><AboutPage /></RouteErrorBoundary>} />
        </Route>
        <Route
          path="/"
          element={
            <RouteErrorBoundary>
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            </RouteErrorBoundary>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="ceo" element={<CEODashboardPage />} />
          <Route path="philix-ai" element={<PhilixAIPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/new" element={<NewClientPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="loans/new" element={<NewLoanPage />} />
          <Route path="loans/:id" element={<LoanDetailPage />} />
          <Route path="collateral" element={<CollateralPage />} />
          <Route path="collateral/:id" element={<CollateralDetailPage />} />
          <Route path="repayments" element={<RepaymentsPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="calculator" element={<LoanCalculatorPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="investors" element={<InvestorsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="wiki" element={<WikiPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="recovery" element={<RecoveryPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Phase 3 Routes */}
          <Route path="accounting" element={<AccountingPage />} />
          <Route path="cashbook" element={<CashbookPage />} />
          <Route path="bank-reconciliation" element={<BankReconciliationPage />} />
          <Route path="provisioning" element={<ProvisioningPage />} />
          <Route path="branch-profitability" element={<BranchProfitabilityPage />} />
          <Route path="loan-products" element={<LoanProductsPage />} />
          <Route path="loan-restructure" element={<LoanRestructurePage />} />
          <Route path="write-offs" element={<WriteOffsPage />} />
          <Route path="collateral-auction" element={<CollateralAuctionPage />} />
          <Route path="online-applications" element={<OnlineApplicationsPage />} />
          <Route path="kyc" element={<KYCPage />} />
          <Route path="client-timeline" element={<ClientTimelinePage />} />
          <Route path="document-expiry" element={<DocumentExpiryPage />} />
          <Route path="budgeting" element={<BudgetingPage />} />
          <Route path="forecasting" element={<ForecastingPage />} />
          <Route path="assets" element={<AssetRegisterPage />} />
          <Route path="leave" element={<LeaveManagementPage />} />
          <Route path="meetings" element={<MeetingMinutesPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="procurement" element={<ProcurementPage />} />
          <Route path="email-logs" element={<EmailManagementPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="export" element={<ExportCenterPage />} />
          <Route path="search" element={<GlobalSearchPage />} />
          <Route path="portfolio-profitability" element={<PortfolioProfitabilityPage />} />
          <Route path="investor-statements" element={<InvestorStatementsPage />} />
          <Route path="email-composer" element={<EmailComposerPage />} />
          <Route path="email-centre" element={<EmailCentrePage />} />
          {/* Addendum v2.1 routes */}
          <Route path="sms-notifications" element={<SMSNotificationsPage />} />
          <Route path="mobile-money" element={<MobileMoneyPage />} />
          <Route path="whatsapp" element={<WhatsAppPage />} />
          <Route path="loan-agreement" element={<LoanAgreementPage />} />
          <Route path="qr-receipts" element={<QRReceiptPage />} />
          <Route path="credit-scoring" element={<CreditScoringPage />} />
          <Route path="fraud-alerts" element={<FraudAlertsPage />} />
          <Route path="referrals" element={<ReferralProgrammePage />} />
          <Route path="group-lending" element={<GroupLendingPage />} />
          <Route path="api-management" element={<APIManagementPage />} />
          <Route path="default-risk" element={<DefaultRiskPage />} />
          <Route path="portal-clients" element={<PortalClientsPage />} />
          <Route path="repayment-accounts" element={<RepaymentAccountsPage />} />
          <Route path="accounts-management" element={<AccountsManagementPage />} />
          <Route path="capital" element={<CapitalPage />} />
          <Route path="payment-submissions" element={<PaymentSubmissionsPage />} />
          <Route path="client-broadcasts" element={<ClientBroadcastPage />} />
          <Route path="collateral-command" element={<CollateralCommandPage />} />
          <Route path="investments" element={<InvestmentManagementPage />} />
          <Route path="financial-statements" element={<FinancialStatementsPage />} />
          <Route path="targets" element={<TargetsPage />} />
          <Route path="financial-controls" element={<FinancialControlsPage />} />
          <Route path="loan-product-rates" element={<LoanProductRatesPage />} />
          <Route path="client-credit-scores" element={<ClientCreditScoresPage />} />
          {/* New staff feature pages */}
          <Route path="loan-aging" element={<RouteErrorBoundary><LoanAgingReportPage /></RouteErrorBoundary>} />
          <Route path="daily-collection" element={<RouteErrorBoundary><DailyCollectionSheetPage /></RouteErrorBoundary>} />
          <Route path="loan-pipeline" element={<RouteErrorBoundary><LoanPipelinePage /></RouteErrorBoundary>} />
          <Route path="collection-performance" element={<RouteErrorBoundary><CollectionPerformancePage /></RouteErrorBoundary>} />
          <Route path="bulk-payment-import" element={<RouteErrorBoundary><BulkPaymentImportPage /></RouteErrorBoundary>} />
          <Route path="client-visits" element={<RouteErrorBoundary><ClientVisitSchedulerPage /></RouteErrorBoundary>} />
          <Route path="disbursement-checklist" element={<RouteErrorBoundary><DisbursementChecklistPage /></RouteErrorBoundary>} />
          <Route path="document-expiry-alerts" element={<RouteErrorBoundary><DocumentExpiryAlertsPage /></RouteErrorBoundary>} />
          <Route path="quick-lookup" element={<RouteErrorBoundary><QuickLoanLookupPage /></RouteErrorBoundary>} />
          <Route path="staff-performance" element={<RouteErrorBoundary><StaffPerformanceDashboardPage /></RouteErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
