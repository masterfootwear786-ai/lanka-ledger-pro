import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import "./i18n/config";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Sales from "./pages/Sales";
import Purchasing from "./pages/Purchasing";
import Inventory from "./pages/Inventory";
import Cashbook from "./pages/Cashbook";
import Accounting from "./pages/Accounting";
import Reports from "./pages/Reports";
import TrialBalance from "./pages/reports/TrialBalance";
import ProfitLoss from "./pages/reports/ProfitLoss";
import BalanceSheet from "./pages/reports/BalanceSheet";
import ARAging from "./pages/reports/ARAging";
import APAging from "./pages/reports/APAging";
import TaxSummary from "./pages/reports/TaxSummary";
import { Layout } from "./components/Layout";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              {/* Main module routes */}
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/purchasing" element={<ProtectedRoute><Purchasing /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/cashbook" element={<ProtectedRoute><Cashbook /></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              {/* Sales routes - to be implemented */}
              <Route path="/sales/invoices" element={<ProtectedRoute><div>Invoices - Coming Soon</div></ProtectedRoute>} />
              <Route path="/sales/credit-notes" element={<ProtectedRoute><div>Credit Notes - Coming Soon</div></ProtectedRoute>} />
              <Route path="/sales/receipts" element={<ProtectedRoute><div>Receipts - Coming Soon</div></ProtectedRoute>} />
              <Route path="/sales/customers" element={<ProtectedRoute><div>Customers - Coming Soon</div></ProtectedRoute>} />
              {/* Purchasing routes - to be implemented */}
              <Route path="/purchasing/bills" element={<ProtectedRoute><div>Bills - Coming Soon</div></ProtectedRoute>} />
              <Route path="/purchasing/debit-notes" element={<ProtectedRoute><div>Debit Notes - Coming Soon</div></ProtectedRoute>} />
              <Route path="/purchasing/payments" element={<ProtectedRoute><div>Payments - Coming Soon</div></ProtectedRoute>} />
              <Route path="/purchasing/suppliers" element={<ProtectedRoute><div>Suppliers - Coming Soon</div></ProtectedRoute>} />
              {/* Inventory routes - to be implemented */}
              <Route path="/inventory/items" element={<ProtectedRoute><div>Items - Coming Soon</div></ProtectedRoute>} />
              <Route path="/inventory/locations" element={<ProtectedRoute><div>Locations - Coming Soon</div></ProtectedRoute>} />
              <Route path="/inventory/movements" element={<ProtectedRoute><div>Movements - Coming Soon</div></ProtectedRoute>} />
              <Route path="/inventory/stock" element={<ProtectedRoute><div>Stock - Coming Soon</div></ProtectedRoute>} />
              {/* Cashbook & Bank routes - to be implemented */}
              <Route path="/cashbook" element={<ProtectedRoute><div>Cashbook - Coming Soon</div></ProtectedRoute>} />
              <Route path="/bank-reconciliation" element={<ProtectedRoute><div>Bank Reconciliation - Coming Soon</div></ProtectedRoute>} />
              {/* Accounting routes - to be implemented */}
              <Route path="/accounting/coa" element={<ProtectedRoute><div>Chart of Accounts - Coming Soon</div></ProtectedRoute>} />
              <Route path="/accounting/journals" element={<ProtectedRoute><div>Journals - Coming Soon</div></ProtectedRoute>} />
              <Route path="/accounting/general-ledger" element={<ProtectedRoute><div>General Ledger - Coming Soon</div></ProtectedRoute>} />
              {/* Reports routes */}
              <Route path="/reports/trial-balance" element={<ProtectedRoute><TrialBalance /></ProtectedRoute>} />
              <Route path="/reports/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
              <Route path="/reports/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
              <Route path="/reports/ar-aging" element={<ProtectedRoute><ARAging /></ProtectedRoute>} />
              <Route path="/reports/ap-aging" element={<ProtectedRoute><APAging /></ProtectedRoute>} />
              <Route path="/reports/tax-summary" element={<ProtectedRoute><TaxSummary /></ProtectedRoute>} />
              {/* Settings - to be implemented */}
              <Route path="/settings" element={<ProtectedRoute><div>Settings - Coming Soon</div></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
