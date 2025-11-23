import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  Wallet,
  Building2,
  BookOpen,
  FileText,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const mainMenuItems = [
    { title: t('app.dashboard'), url: '/', icon: LayoutDashboard },
  ];

  const salesItems = [
    { title: 'Orders', url: '/sales/orders' },
    { title: t('sales.invoices'), url: '/sales/invoices' },
    { title: t('sales.creditNotes'), url: '/sales/credit-notes' },
    { title: t('sales.receipts'), url: '/sales/receipts' },
    { title: t('sales.customers'), url: '/sales/customers' },
  ];

  const purchasingItems = [
    { title: t('purchasing.bills'), url: '/purchasing/bills' },
    { title: t('purchasing.debitNotes'), url: '/purchasing/debit-notes' },
    { title: t('purchasing.payments'), url: '/purchasing/payments' },
    { title: t('purchasing.suppliers'), url: '/purchasing/suppliers' },
  ];

  const inventoryItems = [
    { title: t('inventory.items'), url: '/inventory/items' },
    { title: t('inventory.locations'), url: '/inventory/locations' },
    { title: t('inventory.movements'), url: '/inventory/movements' },
    { title: t('inventory.stockOnHand'), url: '/inventory/stock' },
  ];

  const accountingItems = [
    { title: t('accounting.chartOfAccounts'), url: '/accounting/coa' },
    { title: t('accounting.journals'), url: '/accounting/journals' },
    { title: t('accounting.generalLedger'), url: '/accounting/general-ledger' },
  ];

  const reportItems = [
    { title: t('reports.trialBalance'), url: '/reports/trial-balance' },
    { title: t('reports.profitLoss'), url: '/reports/profit-loss' },
    { title: t('reports.balanceSheet'), url: '/reports/balance-sheet' },
    { title: t('reports.arAging'), url: '/reports/ar-aging' },
    { title: t('reports.apAging'), url: '/reports/ap-aging' },
    { title: t('reports.taxSummary'), url: '/reports/tax-summary' },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {mainMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink to={item.url} className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  {!collapsed && <span>{t('app.sales')}</span>}
                </div>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {salesItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  {!collapsed && <span>{t('app.purchasing')}</span>}
                </div>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {purchasingItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {!collapsed && <span>{t('app.inventory')}</span>}
                </div>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {inventoryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {!collapsed && <span>{t('app.cashbook')}</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/cashbook" className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                    {!collapsed && <span>{t('app.cashbook')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/bank-reconciliation" className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                    {!collapsed && <span>{t('app.bankReco')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {!collapsed && <span>{t('app.accounting')}</span>}
                </div>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountingItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {!collapsed && <span>{t('app.reports')}</span>}
                </div>
                {!collapsed && <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {reportItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/settings" className={({ isActive }) => isActive ? 'bg-accent' : ''}>
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span>{t('app.settings')}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
