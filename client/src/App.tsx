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
import Roles from "./pages/Roles";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import FinancialReports from "./pages/reports/FinancialReports";
import PayrollReport from "./pages/PayrollReport";
import LocalLogin from "./pages/LocalLogin";
import OperationalFlags from "./pages/OperationalFlags";
import PendingFlags from "./pages/PendingFlags";
import UserScopedPermissions from "./pages/UserScopedPermissions";
import PermissionsManagement from "./pages/PermissionsManagement";
import RolePermissions from "./pages/RolePermissions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/home" component={Home} />
      <Route path="/local-login" component={LocalLogin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/executive" component={ExecutiveDashboard} />
      <Route path="/users" component={Users} />

      <Route path="/permissions" component={PermissionsManagement} />
      <Route path="/role-permissions" component={RolePermissions} />
      <Route path="/scoped-permissions" component={UserScopedPermissions} />
      <Route path="/roles" component={Roles} />
      <Route path="/cost-centers" component={CostCenters} />
      <Route path="/profile" component={Profile} />
      <Route path="/groups" component={Groups} />
      <Route path="/workers" component={Workers} />
      <Route path="/workers/:id" component={WorkerDetails} />
      <Route path="/workers/:id/card" component={WorkerCard} />
      {/* Attendance System Routes */}
      <Route path="/attendance" component={AttendanceScanner} />
      <Route path="/attendance/log" component={AttendanceLog} />
      <Route path="/attendance/reports" component={AttendanceReports} />


      <Route path="/work-days" component={WorkDays} />
      <Route path="/operational-flags" component={OperationalFlags} />
      <Route path="/pending-flags" component={PendingFlags} />
      {/* Finance System Routes */}
      <Route path="/finance/overrides" component={PayOverrides} />
      <Route path="/finance/payroll" component={PayrollBatches} />
      <Route path="/payroll/batches" component={PayrollBatchList} />
      <Route path="/payroll/batches/create" component={PayrollBatchCreate} />
      <Route path="/payroll/batches/:id" component={PayrollBatchDetails} />
      <Route path="/payroll/batches/:id/accountant-review" component={AccountantReview} />
      <Route path="/payroll/batches/:id/financial-review" component={FinancialReview} />
      <Route path="/payroll/batches/:id/manager-review" component={AccountsManagerReview} />
      <Route path="/finance/reports" component={FinancialReports} />
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
