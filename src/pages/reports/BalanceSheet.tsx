import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function BalanceSheet() {
  const { t } = useTranslation();
  const [asOfDate, setAsOfDate] = useState("");

  const assets = {
    current: [] as { name: string; amount: number }[],
    fixed: [] as { name: string; amount: number }[],
  };

  const liabilities = {
    current: [] as { name: string; amount: number }[],
    longTerm: [] as { name: string; amount: number }[],
  };

  const equity: { name: string; amount: number }[] = [];

  const totalCurrentAssets = assets.current.reduce((sum, item) => sum + item.amount, 0);
  const totalFixedAssets = assets.fixed.reduce((sum, item) => sum + item.amount, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiabilities = liabilities.current.reduce((sum, item) => sum + item.amount, 0);
  const totalLongTermLiabilities = liabilities.longTerm.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const handleExportCSV = () => {
    const rows = [
      ["BALANCE SHEET"],
      [""],
      ["ASSETS"],
      ["CURRENT ASSETS"],
      ...assets.current.map(item => [item.name, item.amount]),
      ["Total Current Assets", totalCurrentAssets],
      [""],
      ["FIXED ASSETS"],
      ...assets.fixed.map(item => [item.name, item.amount]),
      ["Total Fixed Assets", totalFixedAssets],
      ["TOTAL ASSETS", totalAssets],
      [""],
      ["LIABILITIES & EQUITY"],
      ["CURRENT LIABILITIES"],
      ...liabilities.current.map(item => [item.name, item.amount]),
      ["Total Current Liabilities", totalCurrentLiabilities],
      [""],
      ["LONG-TERM LIABILITIES"],
      ...liabilities.longTerm.map(item => [item.name, item.amount]),
      ["Total Liabilities", totalLiabilities],
      [""],
      ["EQUITY"],
      ...equity.map(item => [item.name, item.amount]),
      ["Total Equity", totalEquity],
      ["TOTAL LIABILITIES & EQUITY", totalLiabilitiesAndEquity]
    ];

    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "balance-sheet.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const handleExportExcel = () => {
    const data = [
      ["BALANCE SHEET"],
      [""],
      ["ASSETS"],
      ["CURRENT ASSETS"],
      ...assets.current.map(item => [item.name, item.amount]),
      ["Total Current Assets", totalCurrentAssets],
      [""],
      ["FIXED ASSETS"],
      ...assets.fixed.map(item => [item.name, item.amount]),
      ["Total Fixed Assets", totalFixedAssets],
      ["TOTAL ASSETS", totalAssets],
      [""],
      ["LIABILITIES & EQUITY"],
      ["CURRENT LIABILITIES"],
      ...liabilities.current.map(item => [item.name, item.amount]),
      ["Total Current Liabilities", totalCurrentLiabilities],
      [""],
      ["LONG-TERM LIABILITIES"],
      ...liabilities.longTerm.map(item => [item.name, item.amount]),
      ["Total Liabilities", totalLiabilities],
      [""],
      ["EQUITY"],
      ...equity.map(item => [item.name, item.amount]),
      ["Total Equity", totalEquity],
      ["TOTAL LIABILITIES & EQUITY", totalLiabilitiesAndEquity]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, "balance-sheet.xlsx");
    toast.success("Excel exported successfully");
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.balanceSheet')}</h1>
        <p className="text-muted-foreground mt-2">
          Statement of financial position showing assets, liabilities, and equity
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Assets</CardTitle>
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
            <Table>
              <TableBody>
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2}>CURRENT ASSETS</TableCell>
                </TableRow>
                {assets.current.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total Current Assets</TableCell>
                  <TableCell className="text-right">{totalCurrentAssets.toLocaleString()}</TableCell>
                </TableRow>
                
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2} className="pt-4">FIXED ASSETS</TableCell>
                </TableRow>
                {assets.fixed.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total Fixed Assets</TableCell>
                  <TableCell className="text-right">{totalFixedAssets.toLocaleString()}</TableCell>
                </TableRow>
                
                <TableRow className="font-bold text-lg bg-primary/10">
                  <TableCell className="pt-4">TOTAL ASSETS</TableCell>
                  <TableCell className="text-right pt-4">{totalAssets.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <Card>
          <CardHeader>
            <CardTitle>Liabilities & Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2}>CURRENT LIABILITIES</TableCell>
                </TableRow>
                {liabilities.current.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total Current Liabilities</TableCell>
                  <TableCell className="text-right">{totalCurrentLiabilities.toLocaleString()}</TableCell>
                </TableRow>
                
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2} className="pt-4">LONG-TERM LIABILITIES</TableCell>
                </TableRow>
                {liabilities.longTerm.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total Liabilities</TableCell>
                  <TableCell className="text-right">{totalLiabilities.toLocaleString()}</TableCell>
                </TableRow>
                
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2} className="pt-4">EQUITY</TableCell>
                </TableRow>
                {equity.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="pl-8">{item.name}</TableCell>
                    <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total Equity</TableCell>
                  <TableCell className="text-right">{totalEquity.toLocaleString()}</TableCell>
                </TableRow>
                
                <TableRow className="font-bold text-lg bg-primary/10">
                  <TableCell className="pt-4">TOTAL LIABILITIES & EQUITY</TableCell>
                  <TableCell className="text-right pt-4">{totalLiabilitiesAndEquity.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {totalAssets === totalLiabilitiesAndEquity ? (
        <div className="p-4 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-md">
          ✓ Balance Sheet is balanced (Assets = Liabilities + Equity)
        </div>
      ) : (
        <div className="p-4 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded-md">
          ✗ Balance Sheet is not balanced
        </div>
      )}
    </div>
  );
}
