import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet } from "lucide-react";

export default function TrialBalance() {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Sample data - would come from Supabase in production
  const accounts = [
    { code: "1000", name: "Cash", debit: 50000, credit: 0 },
    { code: "1100", name: "Accounts Receivable", debit: 75000, credit: 0 },
    { code: "1200", name: "Inventory", debit: 100000, credit: 0 },
    { code: "2000", name: "Accounts Payable", debit: 0, credit: 45000 },
    { code: "3000", name: "Capital", debit: 0, credit: 100000 },
    { code: "4000", name: "Sales Revenue", debit: 0, credit: 150000 },
    { code: "5000", name: "Cost of Goods Sold", debit: 50000, credit: 0 },
    { code: "6000", name: "Operating Expenses", debit: 20000, credit: 0 },
  ];

  const totalDebit = accounts.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredit = accounts.reduce((sum, acc) => sum + acc.credit, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.trialBalance')}</h1>
        <p className="text-muted-foreground mt-2">
          View account balances and verify debit-credit equality
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
          <CardTitle>Trial Balance Report</CardTitle>
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
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.code}>
                  <TableCell className="font-mono">{account.code}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell className="text-right">
                    {account.debit > 0 ? account.debit.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {account.credit > 0 ? account.credit.toLocaleString() : "-"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted">
                <TableCell colSpan={2}>{t('common.total')}</TableCell>
                <TableCell className="text-right">{totalDebit.toLocaleString()}</TableCell>
                <TableCell className="text-right">{totalCredit.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          {totalDebit === totalCredit ? (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-md">
              ✓ Trial Balance is balanced (Debit = Credit)
            </div>
          ) : (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded-md">
              ✗ Trial Balance is not balanced. Difference: {Math.abs(totalDebit - totalCredit).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
