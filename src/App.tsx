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
import Invoices from "./pages/sales/Invoices";
import Customers from "./pages/sales/Customers";
import CreditNotes from "./pages/sales/CreditNotes";
import Receipts from "./pages/sales/Receipts";
import Bills from "./pages/purchasing/Bills";
import Suppliers from "./pages/purchasing/Suppliers";
import DebitNotes from "./pages/purchasing/DebitNotes";
import Payments from "./pages/purchasing/Payments";
import Items from "./pages/inventory/Items";
import Locations from "./pages/inventory/Locations";
import Movements from "./pages/inventory/Movements";
import Stock from "./pages/inventory/Stock";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import Journals from "./pages/accounting/Journals";
import GeneralLedger from "./pages/accounting/GeneralLedger";
import Settings from "./pages/Settings";
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
              {/* Sales routes */}
              <Route path="/sales/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/sales/credit-notes" element={<ProtectedRoute><CreditNotes /></ProtectedRoute>} />
              <Route path="/sales/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
              <Route path="/sales/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              {/* Purchasing routes */}
              <Route path="/purchasing/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
              <Route path="/purchasing/debit-notes" element={<ProtectedRoute><DebitNotes /></ProtectedRoute>} />
              <Route path="/purchasing/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/purchasing/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              {/* Inventory routes */}
              <Route path="/inventory/items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
              <Route path="/inventory/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
              <Route path="/inventory/movements" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
              <Route path="/inventory/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
              {/* Cashbook & Bank routes - to be implemented */}
              <Route path="/cashbook" element={<ProtectedRoute><div>Cashbook - Coming Soon</div></ProtectedRoute>} />
              <Route path="/bank-reconciliation" element={<ProtectedRoute><div>Bank Reconciliation - Coming Soon</div></ProtectedRoute>} />
              {/* Accounting routes */}
              <Route path="/accounting/coa" element={<ProtectedRoute><ChartOfAccounts /></ProtectedRoute>} />
              <Route path="/accounting/journals" element={<ProtectedRoute><Journals /></ProtectedRoute>} />
              <Route path="/accounting/general-ledger" element={<ProtectedRoute><GeneralLedger /></ProtectedRoute>} />
              {/* Reports routes */}
              <Route path="/reports/trial-balance" element={<ProtectedRoute><TrialBalance /></ProtectedRoute>} />
              <Route path="/reports/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
              <Route path="/reports/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
              <Route path="/reports/ar-aging" element={<ProtectedRoute><ARAging /></ProtectedRoute>} />
              <Route path="/reports/ap-aging" element={<ProtectedRoute><APAging /></ProtectedRoute>} />
              <Route path="/reports/tax-summary" element={<ProtectedRoute><TaxSummary /></ProtectedRoute>} />
              {/* Settings */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
