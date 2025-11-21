import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer } from "lucide-react";

export default function GeneralLedger() {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const transactions = [
    { date: "2024-01-15", reference: "INV-001", description: "Sales Invoice", debit: 125000, credit: 0, balance: 125000 },
    { date: "2024-01-16", reference: "REC-001", description: "Customer Receipt", debit: 0, credit: 120000, balance: 5000 },
    { date: "2024-01-18", reference: "BILL-001", description: "Supplier Bill", debit: 0, credit: 75000, balance: -70000 },
    { date: "2024-01-20", reference: "PAY-001", description: "Supplier Payment", debit: 72000, credit: 0, balance: 2000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.generalLedger')}</h1>
        <p className="text-muted-foreground mt-2">View general ledger entries</p>
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
          <CardTitle>General Ledger Entries</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
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
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.reference')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, idx) => (
                <TableRow key={idx}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell className="font-mono">{transaction.reference}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">
                    {transaction.debit > 0 ? transaction.debit.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.credit > 0 ? transaction.credit.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {transaction.balance.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
