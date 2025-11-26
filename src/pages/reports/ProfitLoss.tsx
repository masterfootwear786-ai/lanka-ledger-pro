import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export default function ProfitLoss() {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Fetch revenue from invoices
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ["profit-loss-invoices", fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          id,
          invoice_no,
          invoice_date,
          grand_total,
          customer:contacts(name)
        `)
        .eq("posted", true);

      if (fromDate) query = query.gte("invoice_date", fromDate);
      if (toDate) query = query.lte("invoice_date", toDate);

      const { data, error } = await query.order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch expenses from transactions
  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ["profit-loss-expenses", fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(`
          id,
          transaction_no,
          transaction_date,
          transaction_type,
          amount,
          description,
          account:chart_of_accounts(name)
        `)
        .in("transaction_type", ["expense", "cash_out", "withdrawal"]);

      if (fromDate) query = query.gte("transaction_date", fromDate);
      if (toDate) query = query.lte("transaction_date", toDate);

      const { data, error } = await query.order("transaction_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch bills for cost of goods sold
  const { data: billsData, isLoading: loadingBills } = useQuery({
    queryKey: ["profit-loss-bills", fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from("bills")
        .select(`
          id,
          bill_no,
          bill_date,
          grand_total,
          supplier:contacts(name)
        `)
        .eq("posted", true);

      if (fromDate) query = query.gte("bill_date", fromDate);
      if (toDate) query = query.lte("bill_date", toDate);

      const { data, error } = await query.order("bill_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingInvoices || loadingExpenses || loadingBills;

  // Calculate revenue details
  const revenueDetails = invoicesData?.map(inv => ({
    name: `${inv.invoice_no} - ${inv.customer?.name || 'N/A'} (${format(new Date(inv.invoice_date), 'MMM dd, yyyy')})`,
    amount: inv.grand_total || 0,
    date: inv.invoice_date
  })) || [];

  // Calculate expense details
  const expenseDetails = expensesData?.map(exp => ({
    name: `${exp.transaction_no} - ${exp.description || exp.account?.name || 'N/A'} (${format(new Date(exp.transaction_date), 'MMM dd, yyyy')})`,
    amount: exp.amount || 0,
    date: exp.transaction_date,
    type: exp.transaction_type
  })) || [];

  // Calculate cost of goods sold from bills
  const cogsDetails = billsData?.map(bill => ({
    name: `${bill.bill_no} - ${bill.supplier?.name || 'N/A'} (${format(new Date(bill.bill_date), 'MMM dd, yyyy')})`,
    amount: bill.grand_total || 0,
    date: bill.bill_date
  })) || [];

  // Combine all expenses
  const allExpenses = [...expenseDetails, ...cogsDetails].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalRevenue = revenueDetails.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = allExpenses.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = totalRevenue;
  const netProfit = totalRevenue - totalExpenses;

  const handleExportCSV = () => {
    const dateRange = fromDate && toDate ? `${format(new Date(fromDate), 'MMM dd, yyyy')} to ${format(new Date(toDate), 'MMM dd, yyyy')}` : 'All Dates';
    const rows = [
      ["PROFIT & LOSS STATEMENT"],
      ["Period:", dateRange],
      [""],
      ["REVENUE"],
      ...revenueDetails.map(item => [item.name, item.amount]),
      ["Total Revenue", totalRevenue],
      [""],
      ["COST OF GOODS SOLD"],
      ...cogsDetails.map(item => [item.name, item.amount]),
      ["Total COGS", cogsDetails.reduce((sum, item) => sum + item.amount, 0)],
      [""],
      ["Gross Profit", totalRevenue - cogsDetails.reduce((sum, item) => sum + item.amount, 0)],
      [""],
      ["OPERATING EXPENSES"],
      ...expenseDetails.map(item => [item.name, item.amount]),
      ["Total Operating Expenses", expenseDetails.reduce((sum, item) => sum + item.amount, 0)],
      [""],
      ["Total Expenses", totalExpenses],
      [""],
      [`NET ${netProfit >= 0 ? 'PROFIT' : 'LOSS'}`, netProfit]
    ];

    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${fromDate || 'all'}-${toDate || 'all'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const handleExportExcel = () => {
    const dateRange = fromDate && toDate ? `${format(new Date(fromDate), 'MMM dd, yyyy')} to ${format(new Date(toDate), 'MMM dd, yyyy')}` : 'All Dates';
    const data = [
      ["PROFIT & LOSS STATEMENT"],
      ["Period:", dateRange],
      [""],
      ["REVENUE"],
      ...revenueDetails.map(item => [item.name, item.amount]),
      ["Total Revenue", totalRevenue],
      [""],
      ["COST OF GOODS SOLD"],
      ...cogsDetails.map(item => [item.name, item.amount]),
      ["Total COGS", cogsDetails.reduce((sum, item) => sum + item.amount, 0)],
      [""],
      ["Gross Profit", totalRevenue - cogsDetails.reduce((sum, item) => sum + item.amount, 0)],
      [""],
      ["OPERATING EXPENSES"],
      ...expenseDetails.map(item => [item.name, item.amount]),
      ["Total Operating Expenses", expenseDetails.reduce((sum, item) => sum + item.amount, 0)],
      [""],
      ["Total Expenses", totalExpenses],
      [""],
      [`NET ${netProfit >= 0 ? 'PROFIT' : 'LOSS'}`, netProfit]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
    XLSX.writeFile(wb, `profit-loss-${fromDate || 'all'}-${toDate || 'all'}.xlsx`);
    toast.success("Excel exported successfully");
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableBody>
                {/* Revenue Section */}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2}>REVENUE</TableCell>
                </TableRow>
                {revenueDetails.length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No revenue data</TableCell>
                  </TableRow>
                ) : (
                  revenueDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Total Revenue</TableCell>
                  <TableCell className="text-right">{totalRevenue.toLocaleString()}</TableCell>
                </TableRow>
                
                {/* Cost of Goods Sold Section */}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2} className="pt-6">COST OF GOODS SOLD</TableCell>
                </TableRow>
                {cogsDetails.length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No COGS data</TableCell>
                  </TableRow>
                ) : (
                  cogsDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Total COGS</TableCell>
                  <TableCell className="text-right">{cogsDetails.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</TableCell>
                </TableRow>
                
                {/* Gross Profit */}
                <TableRow className="font-bold bg-blue-50 dark:bg-blue-950">
                  <TableCell className="pt-4">Gross Profit</TableCell>
                  <TableCell className="text-right pt-4">{(totalRevenue - cogsDetails.reduce((sum, item) => sum + item.amount, 0)).toLocaleString()}</TableCell>
                </TableRow>
                
                {/* Operating Expenses Section */}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2} className="pt-6">OPERATING EXPENSES</TableCell>
                </TableRow>
                {expenseDetails.length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No operating expenses</TableCell>
                  </TableRow>
                ) : (
                  expenseDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell className="text-right">{item.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Total Operating Expenses</TableCell>
                  <TableCell className="text-right">{expenseDetails.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</TableCell>
                </TableRow>
                
                {/* Total Expenses */}
                <TableRow className="font-bold">
                  <TableCell className="pt-4">Total Expenses</TableCell>
                  <TableCell className="text-right pt-4">{totalExpenses.toLocaleString()}</TableCell>
                </TableRow>
                
                {/* Net Profit/Loss */}
                <TableRow className={`font-bold text-lg ${netProfit >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  <TableCell className="pt-6">NET {netProfit >= 0 ? 'PROFIT' : 'LOSS'}</TableCell>
                  <TableCell className="text-right pt-6">{netProfit.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
