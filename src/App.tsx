import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { VoiceCallProvider } from "@/contexts/VoiceCallContext";
import { ThemeProvider } from "next-themes";
import "./i18n/config";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import SendDocuments from "./pages/SendDocuments";
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
import CreateInvoice from "./pages/sales/CreateInvoice";
import Customers from "./pages/sales/Customers";
import CustomerDetails from "./pages/sales/CustomerDetails";
import CustomerProfiles from "./pages/sales/CustomerProfiles";
import CustomerOutstanding from "./pages/sales/CustomerOutstanding";
import ReturnNotes from "./pages/sales/ReturnNotes";
import Orders from "./pages/sales/Orders";

import Receipts from "./pages/sales/Receipts";
import Cheques from "./pages/sales/Cheques";
import Bills from "./pages/purchasing/Bills";
import Suppliers from "./pages/purchasing/Suppliers";
import SupplierDetails from "./pages/purchasing/SupplierDetails";
import DebitNotes from "./pages/purchasing/DebitNotes";
import Payments from "./pages/purchasing/Payments";
import SupplierCheques from "./pages/purchasing/SupplierCheques";
import GoodsReOrderForm from "./pages/purchasing/GoodsReOrderForm";
import HotSelling from "./pages/purchasing/HotSelling";
import Items from "./pages/inventory/Items";
import Stock from "./pages/inventory/Stock";
import MainStock from "./pages/inventory/MainStock";
import LorryStock from "./pages/inventory/LorryStock";
import WarehouseStock from "./pages/inventory/WarehouseStock";
import Expenses from "./pages/accounting/Transactions";
import CreditorsDebtors from "./pages/accounting/CreditorsDebtors";
import Turns from "./pages/accounting/Turns";
import Settings from "./pages/Settings";
import Company from "./pages/settings/Company";
import Security from "./pages/settings/Security";
import TaxRates from "./pages/settings/TaxRates";
import Users from "./pages/settings/Users";
import Currencies from "./pages/settings/Currencies";
import CustomFields from "./pages/settings/CustomFields";
import Trash from "./pages/settings/Trash";
import Backup from "./pages/settings/Backup";
import RoutesSettings from "./pages/settings/Routes";
import SalesRepActivity from "./pages/settings/SalesRepActivity";
import AppUpdate from "./pages/settings/AppUpdate";
import Profile from "./pages/Profile";
import Communications from "./pages/Communications";
import { Layout } from "./components/Layout";
import { UpdateNotification } from "./components/UpdateNotification";
import { useOfflineSync } from "./hooks/useOfflineSync";
import { WaitingPermissions } from "./components/WaitingPermissions";
import { useUserRole } from "./hooks/useUserRole";
import { PermissionGuard } from "./components/PermissionGuard";
import { IncomingCallDialog } from "./components/IncomingCallDialog";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRole();
  const location = useLocation();
  
  // Always call hooks in consistent order
  useOfflineSync();
  
  // Handle loading states
  if (authLoading || rolesLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  
  // Check authentication
  if (!user) {
    return <Navigate to={`/auth${location.search}${location.hash}`} replace />;
  }

  // Check if user has any assigned role
  if (roles.length === 0) {
    return <WaitingPermissions />;
  }
  
  return <Layout>{children}</Layout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdateNotification />
        <BrowserRouter>
          <AuthProvider>
            <VoiceCallProvider>
              <IncomingCallDialog />
              <Routes>
                <Route path="/install" element={<Install />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/send-documents" element={<ProtectedRoute><SendDocuments /></ProtectedRoute>} />
                <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
                {/* Main module routes */}
                <Route path="/sales" element={<ProtectedRoute><PermissionGuard module="sales"><Sales /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing" element={<ProtectedRoute><PermissionGuard module="purchasing"><Purchasing /></PermissionGuard></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute><PermissionGuard module="inventory"><Inventory /></PermissionGuard></ProtectedRoute>} />
                <Route path="/accounting" element={<ProtectedRoute><PermissionGuard module="accounting"><Accounting /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><PermissionGuard module="reports"><Reports /></PermissionGuard></ProtectedRoute>} />
                {/* Sales routes */}
                <Route path="/sales/orders" element={<ProtectedRoute><PermissionGuard module="sales" subModule="orders"><Orders /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/orders/create" element={<ProtectedRoute><PermissionGuard module="sales" subModule="orders" permission="create"><CreateInvoice /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/orders/edit/:id" element={<ProtectedRoute><PermissionGuard module="sales" subModule="orders" permission="edit"><CreateInvoice /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/invoices" element={<ProtectedRoute><PermissionGuard module="sales" subModule="invoices"><Invoices /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/invoices/create" element={<ProtectedRoute><PermissionGuard module="sales" subModule="invoices" permission="create"><CreateInvoice /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/invoices/edit/:id" element={<ProtectedRoute><PermissionGuard module="sales" subModule="invoices" permission="edit"><CreateInvoice /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/receipts" element={<ProtectedRoute><PermissionGuard module="sales" subModule="receipts"><Receipts /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/cheques" element={<ProtectedRoute><PermissionGuard module="sales" subModule="cheques"><Cheques /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/customers" element={<ProtectedRoute><PermissionGuard module="customers" subModule="customers"><Customers /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/customers/:id" element={<ProtectedRoute><PermissionGuard module="customers" subModule="customers"><CustomerDetails /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/customer-profiles" element={<ProtectedRoute><PermissionGuard module="customers" subModule="customer_profiles"><CustomerProfiles /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/customer-outstanding" element={<ProtectedRoute><PermissionGuard module="customers" subModule="outstanding"><CustomerOutstanding /></PermissionGuard></ProtectedRoute>} />
                <Route path="/sales/return-notes" element={<ProtectedRoute><PermissionGuard module="sales" subModule="return_notes"><ReturnNotes /></PermissionGuard></ProtectedRoute>} />
                {/* Purchasing routes */}
                <Route path="/purchasing/bills" element={<ProtectedRoute><PermissionGuard module="purchasing"><Bills /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing/debit-notes" element={<ProtectedRoute><PermissionGuard module="purchasing"><DebitNotes /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing/payments" element={<ProtectedRoute><PermissionGuard module="purchasing"><Payments /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing/cheques" element={<ProtectedRoute><PermissionGuard module="purchasing"><SupplierCheques /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing/suppliers" element={<ProtectedRoute><PermissionGuard module="purchasing"><Suppliers /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing/suppliers/:id" element={<ProtectedRoute><PermissionGuard module="purchasing"><SupplierDetails /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing/reorder-form" element={<ProtectedRoute><PermissionGuard module="purchasing"><GoodsReOrderForm /></PermissionGuard></ProtectedRoute>} />
                <Route path="/purchasing/hot-selling" element={<ProtectedRoute><PermissionGuard module="purchasing"><HotSelling /></PermissionGuard></ProtectedRoute>} />
                {/* Inventory routes */}
                <Route path="/inventory/items" element={<ProtectedRoute><PermissionGuard module="inventory"><Items /></PermissionGuard></ProtectedRoute>} />
                <Route path="/inventory/stock" element={<ProtectedRoute><PermissionGuard module="inventory"><Stock /></PermissionGuard></ProtectedRoute>} />
                <Route path="/inventory/main-stock" element={<ProtectedRoute><PermissionGuard module="inventory"><MainStock /></PermissionGuard></ProtectedRoute>} />
                <Route path="/inventory/lorry-stock" element={<ProtectedRoute><PermissionGuard module="inventory"><LorryStock /></PermissionGuard></ProtectedRoute>} />
                <Route path="/inventory/warehouse" element={<ProtectedRoute><PermissionGuard module="inventory"><WarehouseStock /></PermissionGuard></ProtectedRoute>} />
                {/* Accounting routes */}
                <Route path="/accounting/expenses" element={<ProtectedRoute><PermissionGuard module="accounting"><Expenses /></PermissionGuard></ProtectedRoute>} />
                <Route path="/accounting/creditors-debtors" element={<ProtectedRoute><PermissionGuard module="accounting"><CreditorsDebtors /></PermissionGuard></ProtectedRoute>} />
                <Route path="/accounting/turns" element={<ProtectedRoute><PermissionGuard module="accounting"><Turns /></PermissionGuard></ProtectedRoute>} />
                {/* Reports routes */}
                <Route path="/reports/all" element={<ProtectedRoute><PermissionGuard module="reports"><AllReportsDetails /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports/sales" element={<ProtectedRoute><PermissionGuard module="reports"><SalesReport /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports/purchasing" element={<ProtectedRoute><PermissionGuard module="reports"><PurchasingReport /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports/inventory" element={<ProtectedRoute><PermissionGuard module="reports"><InventoryReport /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports/expenses" element={<ProtectedRoute><PermissionGuard module="reports"><ExpensesReport /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports/profit-loss" element={<ProtectedRoute><PermissionGuard module="reports"><ProfitLoss /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports/ar-aging" element={<ProtectedRoute><PermissionGuard module="reports"><ARAging /></PermissionGuard></ProtectedRoute>} />
                <Route path="/reports/ap-aging" element={<ProtectedRoute><PermissionGuard module="reports"><APAging /></PermissionGuard></ProtectedRoute>} />
                {/* Settings */}
                <Route path="/settings" element={<ProtectedRoute><PermissionGuard module="settings"><Settings /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/company" element={<ProtectedRoute><PermissionGuard module="settings"><Company /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/security" element={<ProtectedRoute><PermissionGuard module="settings"><Security /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/users" element={<ProtectedRoute><PermissionGuard module="settings"><Users /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/tax-rates" element={<ProtectedRoute><PermissionGuard module="settings"><TaxRates /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/currencies" element={<ProtectedRoute><PermissionGuard module="settings"><Currencies /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/custom-fields" element={<ProtectedRoute><PermissionGuard module="settings"><CustomFields /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/trash" element={<ProtectedRoute><PermissionGuard module="settings"><Trash /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/backup" element={<ProtectedRoute><PermissionGuard module="settings"><Backup /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/routes" element={<ProtectedRoute><PermissionGuard module="settings"><RoutesSettings /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/sales-rep-activity" element={<ProtectedRoute><PermissionGuard module="settings"><SalesRepActivity /></PermissionGuard></ProtectedRoute>} />
                <Route path="/settings/app-update" element={<ProtectedRoute><PermissionGuard module="settings"><AppUpdate /></PermissionGuard></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </VoiceCallProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
