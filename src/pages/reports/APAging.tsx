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

export default function APAging() {
  const { t } = useTranslation();
  const [asOfDate, setAsOfDate] = useState("");

  const suppliers = [
    { name: "Tech Supplies Ltd", current: 18000, days30: 12000, days60: 3000, days90: 0, over90: 0 },
    { name: "Office Equipment Co", current: 22000, days30: 0, days60: 8000, days90: 2000, over90: 0 },
    { name: "Manufacturing Parts", current: 15000, days30: 10000, days60: 0, days90: 5000, over90: 3000 },
    { name: "Raw Materials Inc", current: 25000, days30: 5000, days60: 4000, days90: 0, over90: 0 },
  ];

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
              <Button className="w-full">Generate Report</Button>
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
                {suppliers.map((supplier, idx) => {
                  const supplierTotal = supplier.current + supplier.days30 + supplier.days60 + supplier.days90 + supplier.over90;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell className="text-right">{supplier.current.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{supplier.days30.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{supplier.days60.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{supplier.days90.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">
                        {supplier.over90 > 0 ? supplier.over90.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">{supplierTotal.toLocaleString()}</TableCell>
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
                <div className="text-sm text-muted-foreground">Total Payable</div>
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
                <div className="text-sm text-muted-foreground">Current %</div>
                <div className="text-2xl font-bold">{((totals.current / grandTotal) * 100).toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
