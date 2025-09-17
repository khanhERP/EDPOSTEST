import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PinAuth } from "@/components/auth/pin-auth";
import POSPage from "@/pages/pos";
import TablesPage from "@/pages/tables";
import EmployeesPage from "@/pages/employees";
import InventoryPage from "@/pages/inventory";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import SuppliersPage from "@/pages/suppliers";
import AttendancePage from "@/pages/attendance";
import AttendanceQRPage from "./pages/attendance-qr";
import CustomerDisplay from "@/pages/customer-display";
import SalesOrders from "@/pages/sales-orders";
import NotFoundPage from "./pages/not-found";

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Switch>
      <Route path="/" component={() => <TablesPage onLogout={onLogout} />} />
      <Route path="/pos" component={() => <POSPage onLogout={onLogout} />} />
      <Route
        path="/tables"
        component={() => <TablesPage onLogout={onLogout} />}
      />
      <Route
        path="/inventory"
        component={() => <InventoryPage onLogout={onLogout} />}
      />
      <Route
        path="/reports"
        component={() => <ReportsPage onLogout={onLogout} />}
      />
      <Route
        path="/employees"
        component={() => <EmployeesPage onLogout={onLogout} />}
      />
      <Route
        path="/settings"
        component={() => <SettingsPage onLogout={onLogout} />}
      />
      <Route
        path="/suppliers"
        component={() => <SuppliersPage onLogout={onLogout} />}
      />
      <Route
        path="/attendance"
        component={() => <AttendancePage onLogout={onLogout} />}
      />
      <Route path="/attendance-qr" component={AttendanceQRPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/customer-display" component={CustomerDisplay} />
      <Route path="/sales-orders" component={SalesOrders} />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Check if current path is customer display to bypass authentication
  const isCustomerDisplay = window.location.pathname === "/customer-display";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {!isAuthenticated && !isCustomerDisplay ? (
          <PinAuth onAuthSuccess={handleAuthSuccess} />
        ) : (
          <Router onLogout={handleLogout} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
