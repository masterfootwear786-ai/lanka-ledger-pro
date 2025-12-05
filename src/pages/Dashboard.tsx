import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Receipt, 
  PackageX, 
  ShoppingCart,
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Create Invoice',
      description: 'Generate new sales invoice',
      icon: FileText,
      gradient: 'bg-gradient-primary',
      shadowColor: 'shadow-[0_10px_40px_-10px_hsl(239_84%_67%/0.5)]',
      path: '/sales/invoices',
    },
    {
      title: 'Create Order',
      description: 'Start a new sales order',
      icon: ShoppingCart,
      gradient: 'bg-gradient-success',
      shadowColor: 'shadow-[0_10px_40px_-10px_hsl(160_84%_39%/0.5)]',
      path: '/sales/orders',
    },
    {
      title: 'Add Receipt',
      description: 'Record customer payment',
      icon: Receipt,
      gradient: 'bg-gradient-secondary',
      shadowColor: 'shadow-[0_10px_40px_-10px_hsl(199_89%_48%/0.5)]',
      path: '/sales/receipts',
    },
    {
      title: 'Return Note',
      description: 'Process customer returns',
      icon: PackageX,
      gradient: 'bg-gradient-warning',
      shadowColor: 'shadow-[0_10px_40px_-10px_hsl(38_92%_50%/0.5)]',
      path: '/sales/return-notes',
    },
    {
      title: 'Add Customer',
      description: 'Register new customer',
      icon: Users,
      gradient: 'bg-gradient-danger',
      shadowColor: 'shadow-[0_10px_40px_-10px_hsl(0_84%_60%/0.5)]',
      path: '/sales/customers',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/10">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-info/10 rounded-full blur-3xl translate-y-24 -translate-x-24" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
                {t('app.dashboard')}
              </h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            System Online
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground/80">Quick Actions</h2>
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card 
                key={action.title}
                className={`group relative overflow-hidden border-0 ${action.gradient} text-primary-foreground ${action.shadowColor} hover:shadow-xl transition-all duration-500 cursor-pointer hover:scale-[1.02] hover:-translate-y-1 animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(action.path)}
              >
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10 group-hover:scale-150 transition-transform duration-500" />
                
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                
                <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[160px] relative z-10">
                  <div className="p-3 bg-white/20 rounded-xl mb-3 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display font-semibold text-base mb-1">{action.title}</h3>
                  <p className="text-xs text-white/70 mb-2">{action.description}</p>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
