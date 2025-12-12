import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  
  // Track which section is currently open (only one at a time)
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [company, setCompany] = useState<{ name: string; logo_url: string | null } | null>(null);

  // Fetch company data
  useEffect(() => {
    const fetchCompany = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name, logo_url')
          .eq('id', profile.company_id)
          .single();
        setCompany(companyData);
      }
    };
    fetchCompany();
  }, []);

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
    { title: 'Re-Order Form', url: '/purchasing/reorder-form' },
    { title: t('purchasing.bills'), url: '/purchasing/bills' },
    { title: t('purchasing.debitNotes'), url: '/purchasing/debit-notes' },
    { title: t('purchasing.payments'), url: '/purchasing/payments' },
    { title: 'Supplier Cheques', url: '/purchasing/cheques' },
    { title: t('purchasing.suppliers'), url: '/purchasing/suppliers' },
  ];

  const inventoryItems = [
    { title: t('inventory.items'), url: '/inventory/items' },
    { title: 'Main Stock', url: '/inventory/main-stock' },
    { title: 'Lorry Stock', url: '/inventory/lorry-stock' },
    { title: 'Warehouse', url: '/inventory/warehouse' },
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
    { id: 'sales', title: t('app.sales'), icon: ShoppingCart, items: salesItems },
    { id: 'customers', title: 'Customers', icon: Users, items: customerItems },
    { id: 'purchasing', title: t('app.purchasing'), icon: ShoppingBag, items: purchasingItems },
    { id: 'inventory', title: t('app.inventory'), icon: Package, items: inventoryItems },
    { id: 'accounting', title: 'Expenses and Other', icon: BookOpen, items: accountingItems },
    { id: 'reports', title: t('app.reports'), icon: FileText, items: reportItems },
  ];

  // Auto-open section based on current route
  useEffect(() => {
    const activeSection = menuSections.find(section => 
      section.items.some(item => isActiveRoute(item.url))
    );
    if (activeSection) {
      setOpenSection(activeSection.id);
    }
  }, [location.pathname]);

  const handleSectionToggle = (sectionId: string) => {
    setOpenSection(prev => prev === sectionId ? null : sectionId);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      <SidebarContent className="bg-sidebar scrollbar-thin">
        {/* Logo Section */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border/50",
          collapsed && "justify-center px-2"
        )}>
          {company?.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={company.name || 'Logo'} 
              className="h-11 w-11 rounded-xl object-contain shadow-lg ring-2 ring-primary/20 bg-white"
            />
          ) : (
            <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg ring-2 ring-primary/20">
              <span className="text-xl font-display font-black text-primary-foreground tracking-tighter">M</span>
            </div>
          )}
          {!collapsed && (
            <div className="animate-fade-in">
              <h2 className="font-display font-bold text-sidebar-foreground text-lg tracking-tight leading-tight">
                {company?.name?.split(' ')[0] || 'Master'}
              </h2>
              <p className="text-[10px] text-sidebar-foreground/60 font-medium tracking-wide">
                {company?.name?.split(' ').slice(1).join(' ').toUpperCase() || 'FOOTWEAR PVT LTD'}
              </p>
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
                      "water-ripple flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" 
                        : "text-sidebar-foreground/80 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0 z-10" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Collapsible Sections - Only one open at a time */}
        {menuSections.map((section) => (
          <Collapsible 
            key={section.id} 
            open={openSection === section.id}
            onOpenChange={() => handleSectionToggle(section.id)}
            className="group/collapsible"
          >
            <SidebarGroup className="py-0">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="sidebar-section-trigger water-ripple flex w-full items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200">
                  <div className="flex items-center gap-2.5 z-10">
                    <section.icon className="h-4 w-4" />
                    {!collapsed && <span>{section.title}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown className="h-4 w-4 transition-transform duration-300 ease-out group-data-[state=open]/collapsible:rotate-180 z-10" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent className="sidebar-collapse-content">
                <SidebarGroupContent className="pt-1 pb-2 pl-2">
                  <SidebarMenu className="space-y-0.5">
                    {section.items.map((item, index) => (
                      <SidebarMenuItem 
                        key={item.title}
                        className="sidebar-sub-item"
                        style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}
                      >
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.url} 
                            className={({ isActive }) => cn(
                              "water-ripple-sub flex items-center gap-3 px-3 py-2 ml-2 rounded-lg text-sm",
                              isActive 
                                ? "selected-popup text-white" 
                                : "text-sidebar-foreground/70"
                            )}
                          >
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full z-10 shrink-0 transition-all duration-200",
                              isActiveRoute(item.url) ? "bg-white scale-125" : "bg-sidebar-foreground/40"
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
                    "water-ripple flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg" 
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0 z-10" />
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
