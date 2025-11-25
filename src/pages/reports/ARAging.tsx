import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { toast } from "sonner";

export default function ARAging() {
  const { t } = useTranslation();
  const [asOfDate, setAsOfDate] = useState("");

  const customers = [
    { name: "ABC Company", current: 25000, days30: 15000, days60: 5000, days90: 2000, over90: 0 },
    { name: "XYZ Corporation", current: 30000, days30: 0, days60: 10000, days90: 0, over90: 5000 },
    { name: "Smith & Sons", current: 20000, days30: 8000, days60: 0, days90: 3000, over90: 0 },
    { name: "Global Trading", current: 15000, days30: 12000, days60: 7000, days90: 0, over90: 8000 },
  ];

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
              <Button className="w-full">Generate Report</Button>
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
                {customers.map((customer, idx) => {
                  const customerTotal = customer.current + customer.days30 + customer.days60 + customer.days90 + customer.over90;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-right">{customer.current.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{customer.days30.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{customer.days60.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{customer.days90.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {customer.over90 > 0 ? customer.over90.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">{customerTotal.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold bg-muted">
                  <TableCell>{t('common.total')}</TableCell>
                  <TableCell className="text-right">{totals.current.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{totals.days30.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{totals.days60.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{totals.days90.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400">{totals.over90.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{grandTotal.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Outstanding</div>
                <div className="text-2xl font-bold">{grandTotal.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Overdue (Over 90 Days)</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.over90.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Collection Rate</div>
                <div className="text-2xl font-bold">{((totals.current / grandTotal) * 100).toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
