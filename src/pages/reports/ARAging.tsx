import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet, Loader2 } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CustomerAging {
  customerId: string;
  name: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
}

export default function ARAging() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [customers, setCustomers] = useState<CustomerAging[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateAging = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast.error('Company not found');
        return;
      }

      // Get all invoices with customer details
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_no,
          invoice_date,
          due_date,
          grand_total,
          customer_id,
          contacts!invoices_customer_id_fkey (
            id,
            name
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('posted', true);

      if (invoicesError) throw invoicesError;

      // Get all receipt allocations
      const { data: allocations, error: allocationsError } = await supabase
        .from('receipt_allocations')
        .select('invoice_id, amount');

      if (allocationsError) throw allocationsError;

      // Calculate paid amounts per invoice
      const paidAmounts: Record<string, number> = {};
      allocations?.forEach(alloc => {
        paidAmounts[alloc.invoice_id] = (paidAmounts[alloc.invoice_id] || 0) + alloc.amount;
      });

      // Calculate aging per customer
      const customerMap: Record<string, CustomerAging> = {};
      const cutoffDate = new Date(asOfDate);

      invoices?.forEach(invoice => {
        const outstanding = (invoice.grand_total || 0) - (paidAmounts[invoice.id] || 0);
        
        if (outstanding <= 0) return; // Skip fully paid invoices

        const customerId = invoice.customer_id;
        const customerName = invoice.contacts?.name || 'Unknown';
        
        if (!customerMap[customerId]) {
          customerMap[customerId] = {
            customerId,
            name: customerName,
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            over90: 0
          };
        }

        const dueDate = new Date(invoice.due_date || invoice.invoice_date);
        const daysOverdue = Math.floor((cutoffDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue < 0) {
          customerMap[customerId].current += outstanding;
        } else if (daysOverdue <= 30) {
          customerMap[customerId].days30 += outstanding;
        } else if (daysOverdue <= 60) {
          customerMap[customerId].days60 += outstanding;
        } else if (daysOverdue <= 90) {
          customerMap[customerId].days90 += outstanding;
        } else {
          customerMap[customerId].over90 += outstanding;
        }
      });

      setCustomers(Object.values(customerMap));
      toast.success('AR Aging report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateAging();
  }, []);

  const totals = customers.reduce(
    (acc, customer) => ({
      current: acc.current + customer.current,
      days30: acc.days30 + customer.days30,
      days60: acc.days60 + customer.days60,
      days90: acc.days90 + customer.days90,
      over90: acc.over90 + customer.over90,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
  );

  const grandTotal = totals.current + totals.days30 + totals.days60 + totals.days90 + totals.over90;

  const handleExportCSV = () => {
    const data = customers.map(customer => ({
      Customer: customer.name,
      Current: customer.current,
      '1-30 Days': customer.days30,
      '31-60 Days': customer.days60,
      '61-90 Days': customer.days90,
      'Over 90 Days': customer.over90,
      Total: customer.current + customer.days30 + customer.days60 + customer.days90 + customer.over90
    }));
    
    data.push({
      Customer: 'TOTAL',
      Current: totals.current,
      '1-30 Days': totals.days30,
      '31-60 Days': totals.days60,
      '61-90 Days': totals.days90,
      'Over 90 Days': totals.over90,
      Total: grandTotal
    });

    exportToCSV('AR_Aging_Report', data);
    toast.success('Report exported to CSV successfully');
  };

  const handleExportExcel = () => {
    const data = customers.map(customer => ({
      Customer: customer.name,
      Current: customer.current,
      '1-30 Days': customer.days30,
      '31-60 Days': customer.days60,
      '61-90 Days': customer.days90,
      'Over 90 Days': customer.over90,
      Total: customer.current + customer.days30 + customer.days60 + customer.days90 + customer.over90
    }));
    
    data.push({
      Customer: 'TOTAL',
      Current: totals.current,
      '1-30 Days': totals.days30,
      '31-60 Days': totals.days60,
      '61-90 Days': totals.days90,
      'Over 90 Days': totals.over90,
      Total: grandTotal
    });

    exportToExcel('AR_Aging_Report', data);
    toast.success('Report exported to Excel successfully');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.arAging')}</h1>
        <p className="text-muted-foreground mt-2">
          Accounts receivable aging analysis by customer
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asOfDate">As of Date</Label>
              <Input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={calculateAging} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AR Aging Report</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              {t('common.exportCSV')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t('common.exportExcel')}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {t('common.print')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">1-30 Days</TableHead>
                  <TableHead className="text-right">31-60 Days</TableHead>
                  <TableHead className="text-right">61-90 Days</TableHead>
                  <TableHead className="text-right">Over 90 Days</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No outstanding invoices found
                    </TableCell>
                  </TableRow>
                ) : customers.map((customer, idx) => {
                  const customerTotal = customer.current + customer.days30 + customer.days60 + customer.days90 + customer.over90;
                  return (
                    <TableRow key={customer.customerId}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-right">{customer.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{customer.days30.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{customer.days60.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{customer.days90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {customer.over90 > 0 ? customer.over90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">{customerTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  );
                })}
                {customers.length > 0 && (
                <TableRow className="font-bold bg-muted">
                  <TableCell>{t('common.total')}</TableCell>
                  <TableCell className="text-right">{totals.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{totals.days30.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{totals.days60.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{totals.days90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400">{totals.over90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Outstanding</div>
                <div className="text-2xl font-bold">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Overdue (Over 90 Days)</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.over90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Collection Rate</div>
                <div className="text-2xl font-bold">{grandTotal > 0 ? ((totals.current / grandTotal) * 100).toFixed(1) : '0.0'}%</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
