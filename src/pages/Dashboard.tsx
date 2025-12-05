import { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            {/* Company Logo & Name */}
            <div className="flex items-center gap-4">
              {company?.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name || 'Company Logo'} 
                  className="h-16 w-16 rounded-2xl object-contain shadow-xl shadow-primary/30 ring-4 ring-primary/20 bg-white"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-xl shadow-primary/30 ring-4 ring-primary/20">
                  <span className="text-2xl font-display font-black text-primary-foreground tracking-tighter">M</span>
                </div>
              )}
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                  {company?.name || 'Master Footwear'}
                </h1>
                <p className="text-lg text-primary font-semibold tracking-wide">PVT LTD</p>
              </div>
            </div>
            
            {/* Date Display */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
            </div>
          </div>
          
          {/* Time & Status */}
          <div className="flex flex-col items-end gap-3">
            {/* Live Clock */}
            <div className="flex items-center gap-3 bg-background/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-border/50 shadow-lg">
              <Clock className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-3xl font-display font-bold tracking-tight tabular-nums">
                  {format(currentTime, 'hh:mm:ss')}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {format(currentTime, 'a')}
                </span>
              </div>
            </div>
            
            {/* System Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              System Online
            </div>
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
