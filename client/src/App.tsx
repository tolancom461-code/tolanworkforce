import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";

import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import Workers from "./pages/Workers";
import WorkerCard from "./pages/WorkerCard";
import WorkerDetails from "./pages/WorkerDetails";
import AttendanceScanner from "./pages/AttendanceScanner";
import AttendanceLog from "./pages/AttendanceLog";
import AttendanceReports from "./pages/AttendanceReports";
import WorkDays from "./pages/WorkDays";


import PayOverrides from "./pages/PayOverrides";
import PayrollBatches from "./pages/PayrollBatches";
import PayrollBatchList from "./pages/payroll/PayrollBatchList";
import PayrollBatchCreate from "./pages/payroll/PayrollBatchCreate";
import PayrollBatchDetails from "./pages/payroll/PayrollBatchDetails";
import AccountantReview from "./pages/payroll/AccountantReview";
import FinancialReview from "./pages/payroll/FinancialReview";
import AccountsManagerReview from "./pages/payroll/AccountsManagerReview";
import CostCenters from "./pages/CostCenters";

import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import FinancialReports from "./pages/reports/FinancialReports";
import PayrollReport from "./pages/PayrollReport";
import LocalLogin from "./pages/LocalLogin";
import OperationalFlags from "./pages/OperationalFlags";
import PendingFlags from "./pages/PendingFlags";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { PERMISSIONS } from "../../shared/permissions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/home" component={Home} />
      <Route path="/local-login" component={LocalLogin} />
      <Route path="/dashboard">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.DASHBOARD_VIEW]}>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/executive" component={ExecutiveDashboard} />
      <Route path="/users">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.USER_VIEW]}>
          <Users />
        </ProtectedRoute>
      </Route>


      <Route path="/cost-centers" component={CostCenters} />
      <Route path="/profile" component={Profile} />
      <Route path="/groups" component={Groups} />
      <Route path="/workers">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.WORKER_VIEW]}>
          <Workers />
        </ProtectedRoute>
      </Route>
      <Route path="/workers/:id">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.WORKER_VIEW]}>
          <WorkerDetails />
        </ProtectedRoute>
      </Route>
      <Route path="/workers/:id/card" component={WorkerCard} />
      {/* Attendance System Routes */}
      <Route path="/attendance">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.ATTENDANCE_RECORD]}>
          <AttendanceScanner />
        </ProtectedRoute>
      </Route>
      <Route path="/attendance/log">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.ATTENDANCE_VIEW]}>
          <AttendanceLog />
        </ProtectedRoute>
      </Route>
      <Route path="/attendance/reports" component={AttendanceReports} />


      <Route path="/work-days" component={WorkDays} />
      <Route path="/operational-flags">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.OPERATIONAL_FLAGS_VIEW]}>
          <OperationalFlags />
        </ProtectedRoute>
      </Route>
      <Route path="/pending-flags" component={PendingFlags} />
      {/* Finance System Routes */}
      <Route path="/finance/overrides" component={PayOverrides} />
      <Route path="/finance/payroll" component={PayrollBatches} />
      <Route path="/payroll/batches">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.PAYROLL_VIEW]}>
          <PayrollBatchList />
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/batches/create">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.PAYROLL_CREATE]}>
          <PayrollBatchCreate />
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/batches/:id">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.PAYROLL_VIEW]}>
          <PayrollBatchDetails />
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/batches/:id/accountant-review" component={AccountantReview} />
      <Route path="/payroll/batches/:id/financial-review" component={FinancialReview} />
      <Route path="/payroll/batches/:id/manager-review" component={AccountsManagerReview} />
      <Route path="/finance/reports">
        <ProtectedRoute requiredPermissions={[PERMISSIONS.FINANCIAL_REPORTS_VIEW]}>
          <FinancialReports />
        </ProtectedRoute>
      </Route>
      <Route path="/payroll-report" component={PayrollReport} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
