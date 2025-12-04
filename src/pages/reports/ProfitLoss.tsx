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
        .eq("posted", true)
        .is('deleted_at', null);

      if (fromDate) query = query.gte("invoice_date", fromDate);
      if (toDate) query = query.lte("invoice_date", toDate);

      const { data, error } = await query.order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch ALL transactions from Expenses module
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ["profit-loss-transactions", fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(`
          id,
          transaction_no,
          transaction_date,
          transaction_type,
          amount,
          description
        `);

      if (fromDate) query = query.gte("transaction_date", fromDate);
      if (toDate) query = query.lte("transaction_date", toDate);

      const { data, error } = await query.order("transaction_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingInvoices || loadingTransactions;

  // Calculate revenue details from invoices
  const revenueDetails = invoicesData?.map(inv => ({
    name: `${inv.invoice_no} - ${inv.customer?.name || 'N/A'} (${format(new Date(inv.invoice_date), 'MMM dd, yyyy')})`,
    amount: inv.grand_total || 0,
    date: inv.invoice_date
  })) || [];

  // Separate COGS, regular expenses, and creditor/debtor from transactions
  const cogsTransactions = transactionsData?.filter(t => t.transaction_type === 'COGS') || [];
  const creditTransactions = transactionsData?.filter(t => t.transaction_type === 'credit') || [];
  const debitTransactions = transactionsData?.filter(t => t.transaction_type === 'debit') || [];
  const regularExpenseTransactions = transactionsData?.filter(t => 
    t.transaction_type !== 'COGS' && 
    t.transaction_type !== 'credit' && 
    t.transaction_type !== 'debit'
  ) || [];

  // COGS details from transactions
  const cogsDetails = cogsTransactions.map(txn => ({
    name: `${txn.transaction_no} - ${txn.description || 'COGS'} (${format(new Date(txn.transaction_date), 'MMM dd, yyyy')})`,
    amount: txn.amount || 0,
    date: txn.transaction_date
  }));

  // Operating expense details (non-COGS, non-creditor/debtor)
  const expenseDetails = regularExpenseTransactions.map(exp => ({
    name: `${exp.transaction_no} - ${exp.description || exp.transaction_type} (${format(new Date(exp.transaction_date), 'MMM dd, yyyy')})`,
    amount: exp.amount || 0,
    date: exp.transaction_date,
    type: exp.transaction_type
  }));

  // Creditor details (reduces expenses)
  const creditorDetails = creditTransactions.map(t => ({
    name: `${t.transaction_no} - ${t.description || 'Creditor'} (${format(new Date(t.transaction_date), 'MMM dd, yyyy')})`,
    amount: t.amount || 0,
    date: t.transaction_date
  }));

  // Debtor details (adds to expenses)
  const debtorDetails = debitTransactions.map(t => ({
    name: `${t.transaction_no} - ${t.description || 'Debtor'} (${format(new Date(t.transaction_date), 'MMM dd, yyyy')})`,
    amount: t.amount || 0,
    date: t.transaction_date
  }));

  // Group expenses by category
  const expensesByCategory: Record<string, { items: typeof expenseDetails; total: number }> = {};
  expenseDetails.forEach(exp => {
    const category = exp.type || 'Other';
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = { items: [], total: 0 };
    }
    expensesByCategory[category].items.push(exp);
    expensesByCategory[category].total += exp.amount;
  });

  const totalRevenue = revenueDetails.reduce((sum, item) => sum + item.amount, 0);
  const totalCOGS = cogsDetails.reduce((sum, item) => sum + item.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  
  // Calculate totals for creditors and debtors
  const totalCreditors = creditorDetails.reduce((sum, item) => sum + item.amount, 0);
  const totalDebtors = debtorDetails.reduce((sum, item) => sum + item.amount, 0);
  const regularOperatingExpenses = expenseDetails.reduce((sum, item) => sum + item.amount, 0);
  
  // Net Operating Expenses = Regular Expenses + Debtors - Creditors
  const totalOperatingExpenses = regularOperatingExpenses + totalDebtors - totalCreditors;
  const totalExpenses = totalCOGS + totalOperatingExpenses;
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
      ["COST OF GOODS SOLD (from Expenses & Other)"],
      ...cogsDetails.map(item => [item.name, item.amount]),
      ["Total COGS", totalCOGS],
      [""],
      ["Gross Profit", grossProfit],
      [""],
      ["OPERATING EXPENSES (from Expenses & Other)"],
      ...expenseDetails.map(item => [`${item.type}: ${item.name}`, item.amount]),
      ["Subtotal Expenses", regularOperatingExpenses],
      [""],
      ["DEBTORS (+) - Adds to Expenses"],
      ...debtorDetails.map(item => [item.name, item.amount]),
      ["Total Debtors", totalDebtors],
      [""],
      ["CREDITORS (-) - Reduces from Expenses"],
      ...creditorDetails.map(item => [item.name, `-${item.amount}`]),
      ["Total Creditors", `-${totalCreditors}`],
      [""],
      ["Net Operating Expenses (Expenses + Debtors - Creditors)", totalOperatingExpenses],
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
      ["COST OF GOODS SOLD (from Expenses & Other)"],
      ...cogsDetails.map(item => [item.name, item.amount]),
      ["Total COGS", totalCOGS],
      [""],
      ["Gross Profit", grossProfit],
      [""],
      ["OPERATING EXPENSES (from Expenses & Other)"],
      ...expenseDetails.map(item => [`${item.type}: ${item.name}`, item.amount]),
      ["Subtotal Expenses", regularOperatingExpenses],
      [""],
      ["DEBTORS (+) - Adds to Expenses"],
      ...debtorDetails.map(item => [item.name, item.amount]),
      ["Total Debtors", totalDebtors],
      [""],
      ["CREDITORS (-) - Reduces from Expenses"],
      ...creditorDetails.map(item => [item.name, -item.amount]),
      ["Total Creditors", -totalCreditors],
      [""],
      ["Net Operating Expenses (Expenses + Debtors - Creditors)", totalOperatingExpenses],
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.profitLoss')}</h1>
        <p className="text-muted-foreground mt-2">
          Income statement showing revenue, COGS, expenses, and net profit (data from Expenses & Other module)
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">COGS</div>
            <div className="text-2xl font-bold text-orange-600">{totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Gross Profit</div>
            <div className="text-2xl font-bold text-blue-600">{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Expenses</div>
            <div className="text-2xl font-bold text-red-600">{regularOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card className="border-sky-200">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Debtors (+)</div>
            <div className="text-2xl font-bold text-sky-600">+{totalDebtors.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card className="border-rose-200">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Creditors (-)</div>
            <div className="text-2xl font-bold text-rose-600">-{totalCreditors.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</div>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <TableCell colSpan={2}>REVENUE (from Invoices)</TableCell>
                </TableRow>
                {revenueDetails.length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No revenue data</TableCell>
                  </TableRow>
                ) : (
                  revenueDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell className="text-right">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Total Revenue</TableCell>
                  <TableCell className="text-right">{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                
                {/* Cost of Goods Sold Section */}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2} className="pt-6">COST OF GOODS SOLD (from Expenses & Other - COGS category)</TableCell>
                </TableRow>
                {cogsDetails.length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No COGS data - Add COGS entries in Expenses & Other</TableCell>
                  </TableRow>
                ) : (
                  cogsDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell className="text-right">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Total COGS</TableCell>
                  <TableCell className="text-right">{totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                
                {/* Gross Profit */}
                <TableRow className="font-bold bg-blue-50 dark:bg-blue-950">
                  <TableCell className="pt-4">Gross Profit</TableCell>
                  <TableCell className="text-right pt-4">{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                
                {/* Operating Expenses Section - Grouped by Category */}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={2} className="pt-6">OPERATING EXPENSES (from Expenses & Other)</TableCell>
                </TableRow>
                {Object.keys(expensesByCategory).length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No operating expenses</TableCell>
                  </TableRow>
                ) : (
                  Object.entries(expensesByCategory).map(([category, data]) => (
                    <>
                      <TableRow key={category} className="bg-gray-50 dark:bg-gray-900">
                        <TableCell className="pl-4 font-medium">{category}</TableCell>
                        <TableCell className="text-right font-medium">{data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                      {data.items.map((item, idx) => (
                        <TableRow key={`${category}-${idx}`}>
                          <TableCell className="pl-12 text-sm">{item.name}</TableCell>
                          <TableCell className="text-right text-sm">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Subtotal Expenses</TableCell>
                  <TableCell className="text-right">{regularOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>

                {/* Debtors Section - Adds to Expenses */}
                <TableRow className="bg-sky-50 dark:bg-sky-950 font-bold">
                  <TableCell colSpan={2} className="pt-4">DEBTORS (+) - Money Owed to Us (Adds to Expenses)</TableCell>
                </TableRow>
                {debtorDetails.length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No debtors</TableCell>
                  </TableRow>
                ) : (
                  debtorDetails.map((item, idx) => (
                    <TableRow key={`debtor-${idx}`}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell className="text-right text-sky-600">+{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Total Debtors</TableCell>
                  <TableCell className="text-right text-sky-600">+{totalDebtors.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>

                {/* Creditors Section - Reduces from Expenses */}
                <TableRow className="bg-rose-50 dark:bg-rose-950 font-bold">
                  <TableCell colSpan={2} className="pt-4">CREDITORS (-) - Money We Owe (Reduces from Expenses)</TableCell>
                </TableRow>
                {creditorDetails.length === 0 ? (
                  <TableRow>
                    <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No creditors</TableCell>
                  </TableRow>
                ) : (
                  creditorDetails.map((item, idx) => (
                    <TableRow key={`creditor-${idx}`}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell className="text-right text-rose-600">-{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell>Total Creditors</TableCell>
                  <TableCell className="text-right text-rose-600">-{totalCreditors.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>

                {/* Net Operating Expenses */}
                <TableRow className="font-bold">
                  <TableCell>Net Operating Expenses (Subtotal + Debtors - Creditors)</TableCell>
                  <TableCell className="text-right">{totalOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                
                {/* Total Expenses */}
                <TableRow className="font-bold">
                  <TableCell className="pt-4">Total Expenses (COGS + Operating)</TableCell>
                  <TableCell className="text-right pt-4">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
                
                {/* Net Profit/Loss */}
                <TableRow className={`font-bold text-lg ${netProfit >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  <TableCell className="pt-6">NET {netProfit >= 0 ? 'PROFIT' : 'LOSS'}</TableCell>
                  <TableCell className="text-right pt-6">{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}