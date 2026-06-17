import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
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
import EmailComposerPage from "./pages/EmailComposerPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CEODashboardPage from "./pages/CEODashboardPage";
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
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
        <Route path="/portal" element={<ClientPortalLayout />}>
          <Route index element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="dashboard" element={<ClientDashboardPage />} />
          <Route path="apply" element={<LoanApplicationPage />} />
          <Route path="loans" element={<MyLoansPage />} />
          <Route path="collateral" element={<CollateralSubmissionPage />} />
          <Route path="kyc" element={<KYCSubmissionPage />} />
          <Route path="notifications" element={<ClientNotificationsPage />} />
          <Route path="profile" element={<ClientProfilePage />} />
          <Route path="calculator" element={<ClientLoanCalculatorPage />} />
        </Route>
        <Route
          path="/"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="ceo" element={<CEODashboardPage />} />
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
          <Route path="email-logs" element={<EmailLogsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="export" element={<ExportCenterPage />} />
          <Route path="search" element={<GlobalSearchPage />} />
          <Route path="portfolio-profitability" element={<PortfolioProfitabilityPage />} />
          <Route path="investor-statements" element={<InvestorStatementsPage />} />
          <Route path="email-composer" element={<EmailComposerPage />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
