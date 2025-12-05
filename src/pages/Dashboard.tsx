import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Receipt, 
  PackageX, 
  ShoppingCart,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Create Invoice',
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
      path: '/sales/invoices',
    },
    {
      title: 'Create Order',
      icon: ShoppingCart,
      gradient: 'from-emerald-500 to-emerald-600',
      path: '/sales/orders',
    },
    {
      title: 'Add Receipt',
      icon: Receipt,
      gradient: 'from-violet-500 to-violet-600',
      path: '/sales/receipts',
    },
    {
      title: 'Add Return Note',
      icon: PackageX,
      gradient: 'from-orange-500 to-orange-600',
      path: '/sales/return-notes',
    },
    {
      title: 'Add Customer',
      icon: Users,
      gradient: 'from-pink-500 to-pink-600',
      path: '/sales/customers',
    },
  ];

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

      {/* Quick Actions Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card 
              key={action.title}
              className={`group relative overflow-hidden border-0 bg-gradient-to-br ${action.gradient} text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105`}
              onClick={() => navigate(action.path)}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
              
              <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[140px] relative z-10">
                <div className="p-3 bg-white/20 rounded-xl mb-3 group-hover:bg-white/30 transition-colors">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-sm">{action.title}</h3>
                <ArrowRight className="h-4 w-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
