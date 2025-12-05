import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Receipt, 
  PackageX, 
  ShoppingCart,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

      {/* Quick Actions */}
      <Card className="max-w-md shadow-lg border-0 bg-gradient-to-br from-slate-700 to-slate-800 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-white/90">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={() => navigate('/sales/invoices')}
          >
            <FileText className="h-5 w-5 mr-3" /> Create Invoice
          </Button>
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={() => navigate('/sales/orders')}
          >
            <ShoppingCart className="h-5 w-5 mr-3" /> Create Order
          </Button>
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={() => navigate('/sales/receipts')}
          >
            <Receipt className="h-5 w-5 mr-3" /> Add Receipt
          </Button>
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={() => navigate('/sales/return-notes')}
          >
            <PackageX className="h-5 w-5 mr-3" /> Add Return Note
          </Button>
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={() => navigate('/sales/customers')}
          >
            <Users className="h-5 w-5 mr-3" /> Add Customer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
