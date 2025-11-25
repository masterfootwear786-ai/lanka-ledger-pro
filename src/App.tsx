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
import CustomerDetails from "./pages/sales/CustomerDetails";
import Orders from "./pages/sales/Orders";
import Receipts from "./pages/sales/Receipts";
import Cheques from "./pages/sales/Cheques";
import Bills from "./pages/purchasing/Bills";
import Suppliers from "./pages/purchasing/Suppliers";
import SupplierDetails from "./pages/purchasing/SupplierDetails";
import DebitNotes from "./pages/purchasing/DebitNotes";
import Payments from "./pages/purchasing/Payments";
import SupplierCheques from "./pages/purchasing/SupplierCheques";
import Items from "./pages/inventory/Items";
import Stock from "./pages/inventory/Stock";
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts";
import Journals from "./pages/accounting/Journals";
import GeneralLedger from "./pages/accounting/GeneralLedger";
import Settings from "./pages/Settings";
import Company from "./pages/settings/Company";
import Security from "./pages/settings/Security";
import TaxRates from "./pages/settings/TaxRates";
import Users from "./pages/settings/Users";
import Currencies from "./pages/settings/Currencies";
import CustomFields from "./pages/settings/CustomFields";
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
              <Route path="/sales/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/sales/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/sales/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
              <Route path="/sales/cheques" element={<ProtectedRoute><Cheques /></ProtectedRoute>} />
              <Route path="/sales/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/sales/customers/:id" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />
              {/* Purchasing routes */}
              <Route path="/purchasing/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
              <Route path="/purchasing/debit-notes" element={<ProtectedRoute><DebitNotes /></ProtectedRoute>} />
              <Route path="/purchasing/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/purchasing/cheques" element={<ProtectedRoute><SupplierCheques /></ProtectedRoute>} />
              <Route path="/purchasing/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/purchasing/suppliers/:id" element={<ProtectedRoute><SupplierDetails /></ProtectedRoute>} />
              {/* Inventory routes */}
              <Route path="/inventory/items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
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
              <Route path="/settings/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
              <Route path="/settings/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
              <Route path="/settings/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
              <Route path="/settings/tax-rates" element={<ProtectedRoute><TaxRates /></ProtectedRoute>} />
              <Route path="/settings/currencies" element={<ProtectedRoute><Currencies /></ProtectedRoute>} />
              <Route path="/settings/custom-fields" element={<ProtectedRoute><CustomFields /></ProtectedRoute>} />
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
