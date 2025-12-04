import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExpenseData {
  transaction_no: string;
  transaction_date: string;
  transaction_type: string;
  category: string;
  description: string;
  amount: number;
  reference: string;
}

interface CategorySummary {
  category: string;
  count: number;
  total: number;
}

const EXPENSE_CATEGORIES = ['Salary', 'Rent', 'Fuel', 'Food', 'Accommodation', 'Other'];

export default function ExpensesReport() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
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

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('transaction_date', { ascending: false });

      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = data?.map(txn => {
        // Extract category from description or transaction_type
        let category = 'Other';
        const desc = (txn.description || '').toLowerCase();
        if (desc.includes('salary') || desc.includes('wage')) category = 'Salary';
        else if (desc.includes('rent')) category = 'Rent';
        else if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('diesel')) category = 'Fuel';
        else if (desc.includes('food') || desc.includes('meal') || desc.includes('lunch') || desc.includes('dinner')) category = 'Food';
        else if (desc.includes('accommodation') || desc.includes('hotel') || desc.includes('lodging')) category = 'Accommodation';

        return {
          transaction_no: txn.transaction_no,
          transaction_date: txn.transaction_date,
          transaction_type: txn.transaction_type,
          category,
          description: txn.description || '',
          amount: txn.amount || 0,
          reference: txn.reference || ''
        };
      }) || [];

      setExpenseData(formatted);
      toast.success('Expenses report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate && user) {
      generateReport();
    }
  }, [startDate, endDate, user]);

  // Calculate totals
  const totalAmount = expenseData.reduce((acc, exp) => acc + exp.amount, 0);

  // Calculate by transaction type
  const expenseOnly = expenseData.filter(e => e.transaction_type === 'expense');
  const cashIn = expenseData.filter(e => e.transaction_type === 'cash_in');
  const cashOut = expenseData.filter(e => e.transaction_type === 'cash_out');
  const withdrawals = expenseData.filter(e => e.transaction_type === 'withdrawal');
  const credits = expenseData.filter(e => e.transaction_type === 'credit');
  const debits = expenseData.filter(e => e.transaction_type === 'debit');

  const expenseTotal = expenseOnly.reduce((acc, e) => acc + e.amount, 0);
  const cashInTotal = cashIn.reduce((acc, e) => acc + e.amount, 0);
  const cashOutTotal = cashOut.reduce((acc, e) => acc + e.amount, 0);
  const withdrawalTotal = withdrawals.reduce((acc, e) => acc + e.amount, 0);
  const creditTotal = credits.reduce((acc, e) => acc + e.amount, 0);
  const debitTotal = debits.reduce((acc, e) => acc + e.amount, 0);

  // Category breakdown for expenses only
  const categorySummary: CategorySummary[] = EXPENSE_CATEGORIES.map(cat => {
    const catExpenses = expenseOnly.filter(e => e.category === cat);
    return {
      category: cat,
      count: catExpenses.length,
      total: catExpenses.reduce((acc, e) => acc + e.amount, 0)
    };
  }).filter(c => c.count > 0);

  const handleExportCSV = () => {
    const data = expenseData.map(expense => ({
      'Transaction No': expense.transaction_no,
      'Date': expense.transaction_date,
      'Type': expense.transaction_type,
      'Category': expense.category,
      'Description': expense.description,
      'Amount': expense.amount,
      'Reference': expense.reference
    }));

    exportToCSV('Expenses_Report', data);
    toast.success('Report exported to CSV');
  };

  const handleExportExcel = () => {
    const data = expenseData.map(expense => ({
      'Transaction No': expense.transaction_no,
      'Date': expense.transaction_date,
      'Type': expense.transaction_type,
      'Category': expense.category,
      'Description': expense.description,
      'Amount': expense.amount,
      'Reference': expense.reference
    }));

    exportToExcel('Expenses_Report', data);
    toast.success('Report exported to Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Expenses Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 32);

    // Summary by Type
    doc.setFontSize(14);
    doc.text('Summary by Type', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Type', 'Count', 'Total']],
      body: [
        ['Expenses', expenseOnly.length.toString(), expenseTotal.toFixed(2)],
        ['Cash In', cashIn.length.toString(), cashInTotal.toFixed(2)],
        ['Cash Out', cashOut.length.toString(), cashOutTotal.toFixed(2)],
        ['Withdrawals', withdrawals.length.toString(), withdrawalTotal.toFixed(2)],
        ['Credits', credits.length.toString(), creditTotal.toFixed(2)],
        ['Debits', debits.length.toString(), debitTotal.toFixed(2)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [241, 196, 15] }
    });

    // Category Breakdown
    if (categorySummary.length > 0) {
      const finalY1 = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Expense Category Breakdown', 14, finalY1);
      
      autoTable(doc, {
        startY: finalY1 + 5,
        head: [['Category', 'Count', 'Total']],
        body: categorySummary.map(cat => [
          cat.category,
          cat.count.toString(),
          cat.total.toFixed(2)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [155, 89, 182] }
      });
    }

    // All Transactions
    const finalY2 = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('All Transactions', 14, finalY2);
    
    autoTable(doc, {
      startY: finalY2 + 5,
      head: [['Txn No', 'Date', 'Type', 'Category', 'Description', 'Amount']],
      body: expenseData.map(expense => [
        expense.transaction_no,
        expense.transaction_date,
        expense.transaction_type,
        expense.category,
        expense.description.substring(0, 30),
        expense.amount.toFixed(2)
      ]),
      foot: [['', '', '', '', 'TOTAL', totalAmount.toFixed(2)]],
      theme: 'striped',
      headStyles: { fillColor: [52, 73, 94] },
      footStyles: { fillColor: [44, 62, 80], fontStyle: 'bold' }
    });

    doc.save('Expenses_Report.pdf');
    toast.success('Report exported to PDF');
  };

  const handlePrint = () => {
    window.print();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'expense': return 'bg-red-100 text-red-800';
      case 'cash_in': return 'bg-green-100 text-green-800';
      case 'cash_out': return 'bg-orange-100 text-orange-800';
      case 'withdrawal': return 'bg-blue-100 text-blue-800';
      case 'credit': return 'bg-purple-100 text-purple-800';
      case 'debit': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expenses Report</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive expenses and transactions report with category breakdown
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={generateReport} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards by Type */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Expenses</div>
            <div className="text-xl font-bold text-red-600">{expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{expenseOnly.length} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Cash In</div>
            <div className="text-xl font-bold text-green-600">{cashInTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{cashIn.length} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Cash Out</div>
            <div className="text-xl font-bold text-orange-600">{cashOutTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{cashOut.length} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Withdrawals</div>
            <div className="text-xl font-bold text-blue-600">{withdrawalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{withdrawals.length} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Credits</div>
            <div className="text-xl font-bold text-purple-600">{creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{credits.length} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Debits</div>
            <div className="text-xl font-bold text-pink-600">{debitTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{debits.length} transactions</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categorySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {categorySummary.map((cat, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="text-sm font-medium">{cat.category}</div>
                  <div className="text-xl font-bold">{cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-muted-foreground">{cat.count} transactions</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Transactions ({expenseData.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : expenseData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {expenseData.map((expense, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{expense.transaction_no}</TableCell>
                        <TableCell>{expense.transaction_date}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs capitalize ${getTypeColor(expense.transaction_type)}`}>
                            {expense.transaction_type.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right font-medium">{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{expense.reference}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={5}>TOTAL</TableCell>
                      <TableCell className="text-right">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}