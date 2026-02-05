import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./components/DashboardLayout";
import Page1 from "./pages/Page1";
import Page2 from "./pages/Page2";

function DashboardPage() {
  return <DashboardLayout><Page1 /></DashboardLayout>;
}

function Page2Page() {
  return <DashboardLayout><Page2 /></DashboardLayout>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"\u002f"} component={LandingPage} />
      <Route path={"\u002fdashboard"} component={DashboardPage} />
      <Route path={"\u002fdashboard\u002fpage2"} component={Page2Page} />
      <Route path={"\u002f404"} component={NotFound} />
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
