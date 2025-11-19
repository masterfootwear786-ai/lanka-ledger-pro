import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Package, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      // Get user's profile to find company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        return {
          totalRevenue: 0,
          activeCustomers: 0,
          totalItems: 0,
          pendingInvoices: 0,
          recentInvoices: [],
        };
      }

      // Fetch statistics
      const [invoicesRes, customersRes, itemsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('grand_total, status, invoice_no, invoice_date, customer_id')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('contacts')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('active', true)
          .in('contact_type', ['customer', 'both']),
        supabase
          .from('items')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('active', true),
      ]);

      const totalRevenue = invoicesRes.data?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) || 0;
      const pendingCount = invoicesRes.data?.filter(inv => inv.status === 'draft').length || 0;

      return {
        totalRevenue,
        activeCustomers: customersRes.data?.length || 0,
        totalItems: itemsRes.data?.length || 0,
        pendingInvoices: pendingCount,
        recentInvoices: invoicesRes.data || [],
      };
    },
    enabled: !!user,
  });

  const statCards = [
    {
      title: t('common.totalRevenue'),
      value: stats ? `Rs ${stats.totalRevenue.toLocaleString()}` : 'Rs 0',
      icon: DollarSign,
      trend: null,
    },
    {
      title: t('common.activeCustomers'),
      value: stats?.activeCustomers.toString() || '0',
      icon: Users,
      trend: null,
    },
    {
      title: t('inventory.items'),
      value: stats?.totalItems.toString() || '0',
      icon: Package,
      trend: null,
    },
    {
      title: t('sales.pendingInvoices'),
      value: stats?.pendingInvoices.toString() || '0',
      icon: FileText,
      trend: null,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('app.dashboard')}</h2>
        <p className="text-muted-foreground">{t('auth.welcomeBack')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('common.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {stats.recentInvoices.slice(0, 3).map((invoice) => (
                  <div key={invoice.invoice_no} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{invoice.invoice_no}</span>
                    <span className="font-medium">Rs {invoice.grand_total?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('common.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/sales/invoices')}>
              <FileText className="mr-2 h-4 w-4" />
              {t('sales.createInvoice')}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/sales/customers')}>
              <Users className="mr-2 h-4 w-4" />
              {t('sales.addCustomer')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('common.alerts')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.pendingInvoices && stats.pendingInvoices > 0 ? (
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {stats.pendingInvoices} {t('sales.pendingInvoices').toLowerCase()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.noAlerts')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
