import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  BookOpen,
  FileText,
  Settings,
  ChevronDown,
  Send,
  Users,
  Sparkles,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const isActiveRoute = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  const mainMenuItems = [
    { title: t('app.dashboard'), url: '/', icon: LayoutDashboard },
    { title: 'Send Documents', url: '/send-documents', icon: Send },
  ];

  const salesItems = [
    { title: 'Orders', url: '/sales/orders' },
    { title: t('sales.invoices'), url: '/sales/invoices' },
    { title: 'Return Notes', url: '/sales/return-notes' },
    { title: t('sales.receipts'), url: '/sales/receipts' },
    { title: 'Cheques', url: '/sales/cheques' },
  ];

  const customerItems = [
    { title: t('sales.customers'), url: '/sales/customers' },
    { title: 'Customer Profiles', url: '/sales/customer-profiles' },
    { title: 'Outstanding', url: '/sales/customer-outstanding' },
  ];

  const purchasingItems = [
    { title: t('purchasing.bills'), url: '/purchasing/bills' },
    { title: t('purchasing.debitNotes'), url: '/purchasing/debit-notes' },
    { title: t('purchasing.payments'), url: '/purchasing/payments' },
    { title: 'Supplier Cheques', url: '/purchasing/cheques' },
    { title: t('purchasing.suppliers'), url: '/purchasing/suppliers' },
  ];

  const inventoryItems = [
    { title: t('inventory.items'), url: '/inventory/items' },
    { title: 'Stock', url: '/inventory/stock' },
  ];

  const accountingItems = [
    { title: 'Expenses and Other', url: '/accounting/expenses' },
    { title: 'Turns', url: '/accounting/turns' },
  ];

  const reportItems = [
    { title: 'All Reports Details', url: '/reports/all' },
    { title: t('reports.profitLoss'), url: '/reports/profit-loss' },
    { title: t('reports.arAging'), url: '/reports/ar-aging' },
    { title: t('reports.apAging'), url: '/reports/ap-aging' },
  ];

  const menuSections = [
    { title: t('app.sales'), icon: ShoppingCart, items: salesItems, defaultOpen: true },
    { title: 'Customers', icon: Users, items: customerItems, defaultOpen: true },
    { title: t('app.purchasing'), icon: ShoppingBag, items: purchasingItems, defaultOpen: true },
    { title: t('app.inventory'), icon: Package, items: inventoryItems, defaultOpen: true },
    { title: 'Expenses and Other', icon: BookOpen, items: accountingItems, defaultOpen: true },
    { title: t('app.reports'), icon: FileText, items: reportItems, defaultOpen: true },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar scrollbar-thin">
        {/* Logo Section */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border/50",
          collapsed && "justify-center px-2"
        )}>
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg animate-pulse-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-sidebar-foreground text-lg tracking-tight">
                Master
              </h2>
              <p className="text-xs text-sidebar-foreground/60">Footwear PVT LTD</p>
            </div>
          )}
        </div>

        {/* Main Menu Items */}
        <SidebarGroup className="py-2">
          <SidebarMenu>
            {mainMenuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to={item.url} 
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" 
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="font-medium">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Collapsible Sections */}
        {menuSections.map((section) => (
          <Collapsible key={section.title} defaultOpen={section.defaultOpen} className="group/collapsible">
            <SidebarGroup className="py-0">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors">
                  <div className="flex items-center gap-2">
                    <section.icon className="h-4 w-4" />
                    {!collapsed && <span>{section.title}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent className="pt-1 pb-2">
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.url} 
                            className={({ isActive }) => cn(
                              "flex items-center gap-3 px-3 py-2 ml-2 rounded-lg text-sm transition-all duration-200",
                              isActive 
                                ? "bg-sidebar-primary/90 text-sidebar-primary-foreground shadow-md" 
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full transition-colors",
                              isActiveRoute(item.url) ? "bg-sidebar-primary-foreground" : "bg-sidebar-foreground/30"
                            )} />
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
        ))}

        {/* Settings */}
        <SidebarGroup className="mt-auto py-3 border-t border-sidebar-border/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/settings" 
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" 
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="font-medium">{t('app.settings')}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
