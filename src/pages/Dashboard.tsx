import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Receipt, 
  PackageX, 
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        return {
          invoices: { total: 0, thisMonth: 0, amount: 0 },
          orders: { total: 0, thisMonth: 0, pending: 0 },
          returnNotes: { total: 0, thisMonth: 0, amount: 0 },
          receipts: { total: 0, thisMonth: 0, amount: 0 },
          customers: { total: 0, active: 0 },
          recentInvoices: [],
          recentOrders: [],
          recentReceipts: [],
        };
      }

      const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
      const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];

      const [
        invoicesRes,
        invoicesMonthRes,
        ordersRes,
        ordersMonthRes,
        returnNotesRes,
        returnNotesMonthRes,
        receiptsRes,
        receiptsMonthRes,
        customersRes,
        recentInvoicesRes,
        recentOrdersRes,
        recentReceiptsRes
      ] = await Promise.all([
        // Total invoices
        supabase
          .from('invoices')
          .select('id, grand_total')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null),
        // This month invoices
        supabase
          .from('invoices')
          .select('id, grand_total')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .gte('invoice_date', monthStart)
          .lte('invoice_date', monthEnd),
        // Total orders
        supabase
          .from('sales_orders')
          .select('id, status')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null),
        // This month orders
        supabase
          .from('sales_orders')
          .select('id')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .gte('order_date', monthStart)
          .lte('order_date', monthEnd),
        // Total return notes
        supabase
          .from('return_notes')
          .select('id, grand_total')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null),
        // This month return notes
        supabase
          .from('return_notes')
          .select('id, grand_total')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .gte('return_date', monthStart)
          .lte('return_date', monthEnd),
        // Total receipts
        supabase
          .from('receipts')
          .select('id, amount')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null),
        // This month receipts
        supabase
          .from('receipts')
          .select('id, amount')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .gte('receipt_date', monthStart)
          .lte('receipt_date', monthEnd),
        // Customers
        supabase
          .from('contacts')
          .select('id, active')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .in('contact_type', ['customer', 'both']),
        // Recent invoices
        supabase
          .from('invoices')
          .select('invoice_no, grand_total, invoice_date, customer_id')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
        // Recent orders
        supabase
          .from('sales_orders')
          .select('order_no, grand_total, order_date, status')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
        // Recent receipts
        supabase
          .from('receipts')
          .select('receipt_no, amount, receipt_date')
          .eq('company_id', profile.company_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const invoiceAmount = invoicesRes.data?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) || 0;
      const returnAmount = returnNotesRes.data?.reduce((sum, rn) => sum + (rn.grand_total || 0), 0) || 0;
      const receiptAmount = receiptsRes.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending' || o.status === 'draft').length || 0;

      return {
        invoices: { 
          total: invoicesRes.data?.length || 0, 
          thisMonth: invoicesMonthRes.data?.length || 0,
          amount: invoiceAmount
        },
        orders: { 
          total: ordersRes.data?.length || 0, 
          thisMonth: ordersMonthRes.data?.length || 0,
          pending: pendingOrders
        },
        returnNotes: { 
          total: returnNotesRes.data?.length || 0, 
          thisMonth: returnNotesMonthRes.data?.length || 0,
          amount: returnAmount
        },
        receipts: { 
          total: receiptsRes.data?.length || 0, 
          thisMonth: receiptsMonthRes.data?.length || 0,
          amount: receiptAmount
        },
        customers: { 
          total: customersRes.data?.length || 0, 
          active: customersRes.data?.filter(c => c.active).length || 0
        },
        recentInvoices: recentInvoicesRes.data || [],
        recentOrders: recentOrdersRes.data || [],
        recentReceipts: recentReceiptsRes.data || [],
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('app.dashboard')}</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Invoices Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-white/90">Invoices</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">Rs {stats?.invoices.amount.toLocaleString()}</div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{stats?.invoices.total} Total</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {stats?.invoices.thisMonth} this month
              </span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => navigate('/sales/invoices')}
            >
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-white/90">Orders</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">{stats?.orders.total}</div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{stats?.orders.pending} Pending</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {stats?.orders.thisMonth} this month
              </span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => navigate('/sales/orders')}
            >
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Receipts Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-white/90">Receipts</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">Rs {stats?.receipts.amount.toLocaleString()}</div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{stats?.receipts.total} Total</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {stats?.receipts.thisMonth} this month
              </span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => navigate('/sales/receipts')}
            >
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Return Notes Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-white/90">Return Notes</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <PackageX className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">Rs {stats?.returnNotes.amount.toLocaleString()}</div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{stats?.returnNotes.total} Total</span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                {stats?.returnNotes.thisMonth} this month
              </span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => navigate('/sales/return-notes')}
            >
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium text-white/90">Customers</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">{stats?.customers.total}</div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{stats?.customers.active} Active</span>
              <span className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add New
              </span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => navigate('/sales/customers')}
            >
              Manage Customers <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-white/90">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => navigate('/sales/invoices')}
            >
              <FileText className="h-4 w-4 mr-2" /> Create Invoice
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => navigate('/sales/orders')}
            >
              <ShoppingCart className="h-4 w-4 mr-2" /> Create Order
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => navigate('/sales/receipts')}
            >
              <Receipt className="h-4 w-4 mr-2" /> Add Receipt
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => navigate('/sales/return-notes')}
            >
              <PackageX className="h-4 w-4 mr-2" /> Add Return Note
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Invoices */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Recent Invoices
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sales/invoices')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              stats.recentInvoices.map((invoice: any) => (
                <div key={invoice.invoice_no} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{invoice.invoice_no}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="font-semibold text-sm text-blue-600">Rs {invoice.grand_total?.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent invoices</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-500" />
                Recent Orders
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sales/orders')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order: any) => (
                <div key={order.order_no} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{order.order_no}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(order.order_date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status || 'draft'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent orders</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Receipts */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-violet-500" />
                Recent Receipts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sales/receipts')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentReceipts && stats.recentReceipts.length > 0 ? (
              stats.recentReceipts.map((receipt: any) => (
                <div key={receipt.receipt_no} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{receipt.receipt_no}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(receipt.receipt_date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="font-semibold text-sm text-violet-600">Rs {receipt.amount?.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent receipts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
