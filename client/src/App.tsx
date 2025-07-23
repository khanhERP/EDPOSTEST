import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import POSPage from "@/pages/pos";
import TablesPage from "@/pages/tables";
import EmployeesPage from "@/pages/employees";
import InventoryPage from "@/pages/inventory";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import SuppliersPage from "@/pages/suppliers";
import AttendancePage from "@/pages/attendance";
import AttendanceQRPage from "./pages/attendance-qr";
import NotFoundPage from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={POSPage} />
      <Route path="/pos" component={POSPage} />
      <Route path="/tables" component={TablesPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/employees" component={EmployeesPage} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/attendance-qr" component={AttendanceQRPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;