import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  description: string;
  amount: number;
  reference: string;
}

export default function ExpensesReport() {
  const { t } = useTranslation();
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

      const formatted = data?.map(txn => ({
        transaction_no: txn.transaction_no,
        transaction_date: txn.transaction_date,
        transaction_type: txn.transaction_type,
        description: txn.description,
        amount: txn.amount || 0,
        reference: txn.reference || ''
      })) || [];

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
    if (startDate && endDate) {
      generateReport();
    }
  }, []);

  const totals = expenseData.reduce(
    (acc, expense) => ({
      total: acc.total + expense.amount
    }),
    { total: 0 }
  );

  const handleExportCSV = () => {
    const data = expenseData.map(expense => ({
      'Transaction No': expense.transaction_no,
      'Date': expense.transaction_date,
      'Type': expense.transaction_type,
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

    autoTable(doc, {
      startY: 40,
      head: [['Txn No', 'Date', 'Type', 'Description', 'Amount', 'Reference']],
      body: expenseData.map(expense => [
        expense.transaction_no,
        expense.transaction_date,
        expense.transaction_type,
        expense.description,
        expense.amount.toFixed(2),
        expense.reference
      ]),
      foot: [['', '', '', 'TOTAL', totals.total.toFixed(2), '']],
      theme: 'striped',
      headStyles: { fillColor: [241, 196, 15] },
      footStyles: { fillColor: [243, 156, 18], fontStyle: 'bold' }
    });

    doc.save('Expenses_Report.pdf');
    toast.success('Report exported to PDF');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expenses Report</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive expenses and transactions report
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expense Transactions</CardTitle>
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
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : expenseData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No expense data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {expenseData.map((expense, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{expense.transaction_no}</TableCell>
                        <TableCell>{expense.transaction_date}</TableCell>
                        <TableCell>
                          <span className="capitalize">{expense.transaction_type.replace('_', ' ')}</span>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right font-medium">{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>{expense.reference}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={4}>TOTAL</TableCell>
                      <TableCell className="text-right">{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Expenses</div>
                <div className="text-2xl font-bold">{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Number of Transactions</div>
                <div className="text-2xl font-bold">{expenseData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Average Transaction</div>
                <div className="text-2xl font-bold">
                  {expenseData.length > 0 ? (totals.total / expenseData.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
