import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet } from "lucide-react";

export default function ProfitLoss() {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const revenue: { name: string; amount: number }[] = [];
  const expenses: { name: string; amount: number }[] = [];

  const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.profitLoss')}</h1>
        <p className="text-muted-foreground mt-2">
          Income statement showing revenue, expenses, and net profit
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fromDate">{t('common.date')} From</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="toDate">{t('common.date')} To</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
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
          <CardTitle>Profit & Loss Statement</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.exportCSV')}
            </Button>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t('common.exportExcel')}
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              {t('common.print')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow className="bg-muted font-bold">
                <TableCell colSpan={2}>REVENUE</TableCell>
              </TableRow>
              {revenue.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="pl-8">{item.name}</TableCell>
                  <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total Revenue</TableCell>
                <TableCell className="text-right">{totalRevenue.toLocaleString()}</TableCell>
              </TableRow>
              
              <TableRow className="bg-muted font-bold">
                <TableCell colSpan={2} className="pt-6">EXPENSES</TableCell>
              </TableRow>
              {expenses.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="pl-8">{item.name}</TableCell>
                  <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total Expenses</TableCell>
                <TableCell className="text-right">{totalExpenses.toLocaleString()}</TableCell>
              </TableRow>
              
              <TableRow className={`font-bold text-lg ${netProfit >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                <TableCell className="pt-6">NET {netProfit >= 0 ? 'PROFIT' : 'LOSS'}</TableCell>
                <TableCell className="text-right pt-6">{netProfit.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
