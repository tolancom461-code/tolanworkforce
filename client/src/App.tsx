import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Workers from "./pages/Workers";
import Attendance from "./pages/Attendance";

function HomePage() {
  return <DashboardLayout><Home /></DashboardLayout>;
}

function WorkersPage() {
  return <DashboardLayout><Workers /></DashboardLayout>;
}

function AttendancePage() {
  return <DashboardLayout><Attendance /></DashboardLayout>;
}

function PayrollPage() {
  return <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الرواتب</h1>
        <p className="text-gray-600 mt-1">إدارة الرواتب والتعويضات</p>
      </div>
      <div className="text-center py-12 text-gray-500">
        <p>قريباً...</p>
      </div>
    </div>
  </DashboardLayout>;
}

function SettingsPage() {
  return <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الإعدادات</h1>
        <p className="text-gray-600 mt-1">إعدادات النظام</p>
      </div>
      <div className="text-center py-12 text-gray-500">
        <p>قريباً...</p>
      </div>
    </div>
  </DashboardLayout>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={HomePage} />
      <Route path="/home" component={HomePage} />
      <Route path="/workers" component={WorkersPage} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/payroll" component={PayrollPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Theme Configuration
 * - First choose a default theme according to your design style (dark or light bg)
 * - Then change color palette in index.css to keep consistent foreground/background color across components
 * - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook
 */

/**
 * Main App Component
 * - Wraps the entire application with providers and theme
 * - Handles routing and error boundaries
 */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable={true} // Uncomment to enable theme switching
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
