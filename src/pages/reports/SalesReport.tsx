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

interface SalesData {
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  status: string;
}

export default function SalesReport() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salesData, setSalesData] = useState<SalesData[]>([]);
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
        .from('invoices')
        .select(`
          invoice_no,
          invoice_date,
          subtotal,
          tax_total,
          grand_total,
          status,
          contacts!invoices_customer_id_fkey (
            name
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('posted', true)
        .order('invoice_date', { ascending: false });

      if (startDate) {
        query = query.gte('invoice_date', startDate);
      }
      if (endDate) {
        query = query.lte('invoice_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = data?.map(inv => ({
        invoice_no: inv.invoice_no,
        invoice_date: inv.invoice_date,
        customer_name: inv.contacts?.name || 'Unknown',
        subtotal: inv.subtotal || 0,
        tax_total: inv.tax_total || 0,
        grand_total: inv.grand_total || 0,
        status: inv.status || 'draft'
      })) || [];

      setSalesData(formatted);
      toast.success('Sales report generated successfully');
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

  const totals = salesData.reduce(
    (acc, sale) => ({
      subtotal: acc.subtotal + sale.subtotal,
      tax: acc.tax + sale.tax_total,
      total: acc.total + sale.grand_total
    }),
    { subtotal: 0, tax: 0, total: 0 }
  );

  const handleExportCSV = () => {
    const data = salesData.map(sale => ({
      'Invoice No': sale.invoice_no,
      'Date': sale.invoice_date,
      'Customer': sale.customer_name,
      'Subtotal': sale.subtotal,
      'Tax': sale.tax_total,
      'Total': sale.grand_total,
      'Status': sale.status
    }));

    exportToCSV('Sales_Report', data);
    toast.success('Report exported to CSV');
  };

  const handleExportExcel = () => {
    const data = salesData.map(sale => ({
      'Invoice No': sale.invoice_no,
      'Date': sale.invoice_date,
      'Customer': sale.customer_name,
      'Subtotal': sale.subtotal,
      'Tax': sale.tax_total,
      'Total': sale.grand_total,
      'Status': sale.status
    }));

    exportToExcel('Sales_Report', data);
    toast.success('Report exported to Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Sales Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [['Invoice No', 'Date', 'Customer', 'Subtotal', 'Tax', 'Total', 'Status']],
      body: salesData.map(sale => [
        sale.invoice_no,
        sale.invoice_date,
        sale.customer_name,
        sale.subtotal.toFixed(2),
        sale.tax_total.toFixed(2),
        sale.grand_total.toFixed(2),
        sale.status
      ]),
      foot: [['', '', 'TOTAL', totals.subtotal.toFixed(2), totals.tax.toFixed(2), totals.total.toFixed(2), '']],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [52, 152, 219], fontStyle: 'bold' }
    });

    doc.save('Sales_Report.pdf');
    toast.success('Report exported to PDF');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Report</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive sales transactions report
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
          <CardTitle>Sales Transactions</CardTitle>
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
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : salesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {salesData.map((sale, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{sale.invoice_no}</TableCell>
                        <TableCell>{sale.invoice_date}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell className="text-right">{sale.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{sale.tax_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-medium">{sale.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {sale.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                <div className="text-sm text-muted-foreground">Total Sales</div>
                <div className="text-2xl font-bold">{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Tax</div>
                <div className="text-2xl font-bold">{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Number of Invoices</div>
                <div className="text-2xl font-bold">{salesData.length}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
