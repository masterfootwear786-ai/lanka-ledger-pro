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
import Accounting from "./pages/Accounting";
import Reports from "./pages/Reports";
import AllReportsDetails from "./pages/AllReportsDetails";
import ProfitLoss from "./pages/reports/ProfitLoss";
import ARAging from "./pages/reports/ARAging";
import APAging from "./pages/reports/APAging";
import SalesReport from "./pages/reports/SalesReport";
import PurchasingReport from "./pages/reports/PurchasingReport";
import InventoryReport from "./pages/reports/InventoryReport";
import ExpensesReport from "./pages/reports/ExpensesReport";
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
import Expenses from "./pages/accounting/Transactions";
import CreditorsDebtors from "./pages/accounting/CreditorsDebtors";
import Settings from "./pages/Settings";
import Company from "./pages/settings/Company";
import Security from "./pages/settings/Security";
import Trash from "./pages/settings/Trash";
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
              {/* Accounting routes */}
              <Route path="/accounting/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/accounting/creditors-debtors" element={<ProtectedRoute><CreditorsDebtors /></ProtectedRoute>} />
              {/* Reports routes */}
              <Route path="/reports/all" element={<ProtectedRoute><AllReportsDetails /></ProtectedRoute>} />
              <Route path="/reports/sales" element={<ProtectedRoute><SalesReport /></ProtectedRoute>} />
              <Route path="/reports/purchasing" element={<ProtectedRoute><PurchasingReport /></ProtectedRoute>} />
              <Route path="/reports/inventory" element={<ProtectedRoute><InventoryReport /></ProtectedRoute>} />
              <Route path="/reports/expenses" element={<ProtectedRoute><ExpensesReport /></ProtectedRoute>} />
              <Route path="/reports/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
              <Route path="/reports/ar-aging" element={<ProtectedRoute><ARAging /></ProtectedRoute>} />
              <Route path="/reports/ap-aging" element={<ProtectedRoute><APAging /></ProtectedRoute>} />
              {/* Settings */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
              <Route path="/settings/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
              <Route path="/settings/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
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
