import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet } from "lucide-react";

export default function TaxSummary() {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const salesTax = [
    { rate: "VAT 15%", taxableAmount: 100000, taxAmount: 15000, transactions: 45 },
    { rate: "VAT 8%", taxableAmount: 50000, taxAmount: 4000, transactions: 22 },
    { rate: "Zero Rated", taxableAmount: 25000, taxAmount: 0, transactions: 10 },
  ];

  const purchaseTax = [
    { rate: "VAT 15%", taxableAmount: 60000, taxAmount: 9000, transactions: 35 },
    { rate: "VAT 8%", taxableAmount: 30000, taxAmount: 2400, transactions: 18 },
  ];

  const totalSalesTax = salesTax.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalPurchaseTax = purchaseTax.reduce((sum, item) => sum + item.taxAmount, 0);
  const netTaxPayable = totalSalesTax - totalPurchaseTax;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.taxSummary')}</h1>
        <p className="text-muted-foreground mt-2">
          Summary of tax collected and paid for the period
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tax Collected (Output Tax)</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalSalesTax.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Tax Paid (Input Tax)</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPurchaseTax.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net Tax Payable</div>
            <div className="text-2xl font-bold text-primary">{netTaxPayable.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales Tax (Output Tax)</CardTitle>
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
                <TableHead>Tax Rate</TableHead>
                <TableHead className="text-right">Taxable Amount</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesTax.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.rate}</TableCell>
                  <TableCell className="text-right">{item.taxableAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.taxAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.transactions}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted">
                <TableCell>{t('common.total')}</TableCell>
                <TableCell className="text-right">
                  {salesTax.reduce((sum, item) => sum + item.taxableAmount, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{totalSalesTax.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {salesTax.reduce((sum, item) => sum + item.transactions, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Tax (Input Tax)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Rate</TableHead>
                <TableHead className="text-right">Taxable Amount</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseTax.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.rate}</TableCell>
                  <TableCell className="text-right">{item.taxableAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.taxAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.transactions}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted">
                <TableCell>{t('common.total')}</TableCell>
                <TableCell className="text-right">
                  {purchaseTax.reduce((sum, item) => sum + item.taxableAmount, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{totalPurchaseTax.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {purchaseTax.reduce((sum, item) => sum + item.transactions, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Net Tax Payable to Tax Authority</h3>
              <p className="text-sm text-muted-foreground">Output Tax - Input Tax</p>
            </div>
            <div className="text-3xl font-bold text-primary">{netTaxPayable.toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
