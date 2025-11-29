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

interface SupplierAging {
  supplierId: string;
  name: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
}

export default function APAging() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [suppliers, setSuppliers] = useState<SupplierAging[]>([]);
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

      // Get all bills with supplier details
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select(`
          id,
          bill_no,
          bill_date,
          due_date,
          grand_total,
          supplier_id,
          contacts!bills_supplier_id_fkey (
            id,
            name
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('posted', true)
        .is('deleted_at', null);

      if (billsError) throw billsError;

      // Get all payment allocations
      const { data: allocations, error: allocationsError } = await supabase
        .from('payment_allocations')
        .select('bill_id, amount');

      if (allocationsError) throw allocationsError;

      // Calculate paid amounts per bill
      const paidAmounts: Record<string, number> = {};
      allocations?.forEach(alloc => {
        paidAmounts[alloc.bill_id] = (paidAmounts[alloc.bill_id] || 0) + alloc.amount;
      });

      // Calculate aging per supplier
      const supplierMap: Record<string, SupplierAging> = {};
      const cutoffDate = new Date(asOfDate);

      bills?.forEach(bill => {
        const outstanding = (bill.grand_total || 0) - (paidAmounts[bill.id] || 0);
        
        if (outstanding <= 0) return; // Skip fully paid bills

        const supplierId = bill.supplier_id;
        const supplierName = bill.contacts?.name || 'Unknown';
        
        if (!supplierMap[supplierId]) {
          supplierMap[supplierId] = {
            supplierId,
            name: supplierName,
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            over90: 0
          };
        }

        const dueDate = new Date(bill.due_date || bill.bill_date);
        const daysOverdue = Math.floor((cutoffDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue < 0) {
          supplierMap[supplierId].current += outstanding;
        } else if (daysOverdue <= 30) {
          supplierMap[supplierId].days30 += outstanding;
        } else if (daysOverdue <= 60) {
          supplierMap[supplierId].days60 += outstanding;
        } else if (daysOverdue <= 90) {
          supplierMap[supplierId].days90 += outstanding;
        } else {
          supplierMap[supplierId].over90 += outstanding;
        }
      });

      setSuppliers(Object.values(supplierMap));
      toast.success('AP Aging report generated successfully');
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

  const totals = suppliers.reduce(
    (acc, supplier) => ({
      current: acc.current + supplier.current,
      days30: acc.days30 + supplier.days30,
      days60: acc.days60 + supplier.days60,
      days90: acc.days90 + supplier.days90,
      over90: acc.over90 + supplier.over90,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
  );

  const grandTotal = totals.current + totals.days30 + totals.days60 + totals.days90 + totals.over90;

  const handleExportCSV = () => {
    const data = suppliers.map(supplier => ({
      Supplier: supplier.name,
      Current: supplier.current,
      '1-30 Days': supplier.days30,
      '31-60 Days': supplier.days60,
      '61-90 Days': supplier.days90,
      'Over 90 Days': supplier.over90,
      Total: supplier.current + supplier.days30 + supplier.days60 + supplier.days90 + supplier.over90
    }));
    
    data.push({
      Supplier: 'TOTAL',
      Current: totals.current,
      '1-30 Days': totals.days30,
      '31-60 Days': totals.days60,
      '61-90 Days': totals.days90,
      'Over 90 Days': totals.over90,
      Total: grandTotal
    });

    exportToCSV('AP_Aging_Report', data);
    toast.success('Report exported to CSV successfully');
  };

  const handleExportExcel = () => {
    const data = suppliers.map(supplier => ({
      Supplier: supplier.name,
      Current: supplier.current,
      '1-30 Days': supplier.days30,
      '31-60 Days': supplier.days60,
      '61-90 Days': supplier.days90,
      'Over 90 Days': supplier.over90,
      Total: supplier.current + supplier.days30 + supplier.days60 + supplier.days90 + supplier.over90
    }));
    
    data.push({
      Supplier: 'TOTAL',
      Current: totals.current,
      '1-30 Days': totals.days30,
      '31-60 Days': totals.days60,
      '61-90 Days': totals.days90,
      'Over 90 Days': totals.over90,
      Total: grandTotal
    });

    exportToExcel('AP_Aging_Report', data);
    toast.success('Report exported to Excel successfully');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.apAging')}</h1>
        <p className="text-muted-foreground mt-2">
          Accounts payable aging analysis by supplier
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
          <CardTitle>AP Aging Report</CardTitle>
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
                  <TableHead>Supplier</TableHead>
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
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No outstanding bills found
                    </TableCell>
                  </TableRow>
                ) : suppliers.map((supplier, idx) => {
                  const supplierTotal = supplier.current + supplier.days30 + supplier.days60 + supplier.days90 + supplier.over90;
                  return (
                    <TableRow key={supplier.supplierId}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell className="text-right">{supplier.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{supplier.days30.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{supplier.days60.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{supplier.days90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {supplier.over90 > 0 ? supplier.over90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">{supplierTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  );
                })}
                {suppliers.length > 0 && (
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
                <div className="text-sm text-muted-foreground">Total Payable</div>
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
                <div className="text-sm text-muted-foreground">Current %</div>
                <div className="text-2xl font-bold">{grandTotal > 0 ? ((totals.current / grandTotal) * 100).toFixed(1) : '0.0'}%</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
