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

interface SalesData {
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  subtotal: number;
  tax_total: number;
  discount: number;
  grand_total: number;
  status: string;
}

interface ReceiptData {
  receipt_no: string;
  receipt_date: string;
  customer_name: string;
  amount: number;
  reference: string;
}

interface ReturnData {
  return_note_no: string;
  return_date: string;
  customer_name: string;
  grand_total: number;
  reason: string;
}

export default function SalesReport() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [receiptsData, setReceiptsData] = useState<ReceiptData[]>([]);
  const [returnsData, setReturnsData] = useState<ReturnData[]>([]);
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

      // Fetch Invoices
      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          invoice_no,
          invoice_date,
          subtotal,
          tax_total,
          discount,
          grand_total,
          status,
          contacts!invoices_customer_id_fkey (name)
        `)
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('invoice_date', { ascending: false });

      if (startDate) invoiceQuery = invoiceQuery.gte('invoice_date', startDate);
      if (endDate) invoiceQuery = invoiceQuery.lte('invoice_date', endDate);

      // Fetch Receipts
      let receiptQuery = supabase
        .from('receipts')
        .select(`
          receipt_no,
          receipt_date,
          amount,
          reference,
          contacts!receipts_customer_id_fkey (name)
        `)
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('receipt_date', { ascending: false });

      if (startDate) receiptQuery = receiptQuery.gte('receipt_date', startDate);
      if (endDate) receiptQuery = receiptQuery.lte('receipt_date', endDate);

      // Fetch Return Notes
      let returnQuery = supabase
        .from('return_notes')
        .select(`
          return_note_no,
          return_date,
          grand_total,
          reason,
          contacts!return_notes_customer_id_fkey (name)
        `)
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('return_date', { ascending: false });

      if (startDate) returnQuery = returnQuery.gte('return_date', startDate);
      if (endDate) returnQuery = returnQuery.lte('return_date', endDate);

      const [invoicesRes, receiptsRes, returnsRes] = await Promise.all([
        invoiceQuery,
        receiptQuery,
        returnQuery
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (receiptsRes.error) throw receiptsRes.error;
      if (returnsRes.error) throw returnsRes.error;

      setSalesData(invoicesRes.data?.map(inv => ({
        invoice_no: inv.invoice_no,
        invoice_date: inv.invoice_date,
        customer_name: inv.contacts?.name || 'Unknown',
        subtotal: inv.subtotal || 0,
        tax_total: inv.tax_total || 0,
        discount: inv.discount || 0,
        grand_total: inv.grand_total || 0,
        status: inv.status || 'draft'
      })) || []);

      setReceiptsData(receiptsRes.data?.map(rec => ({
        receipt_no: rec.receipt_no,
        receipt_date: rec.receipt_date,
        customer_name: rec.contacts?.name || 'Unknown',
        amount: rec.amount || 0,
        reference: rec.reference || ''
      })) || []);

      setReturnsData(returnsRes.data?.map(ret => ({
        return_note_no: ret.return_note_no,
        return_date: ret.return_date,
        customer_name: ret.contacts?.name || 'Unknown',
        grand_total: ret.grand_total || 0,
        reason: ret.reason || ''
      })) || []);

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
    if (startDate && endDate && user) {
      generateReport();
    }
  }, [startDate, endDate, user]);

  const invoiceTotals = salesData.reduce(
    (acc, sale) => ({
      subtotal: acc.subtotal + sale.subtotal,
      tax: acc.tax + sale.tax_total,
      discount: acc.discount + sale.discount,
      total: acc.total + sale.grand_total
    }),
    { subtotal: 0, tax: 0, discount: 0, total: 0 }
  );

  const receiptTotal = receiptsData.reduce((acc, rec) => acc + rec.amount, 0);
  const returnTotal = returnsData.reduce((acc, ret) => acc + ret.grand_total, 0);

  const handleExportCSV = () => {
    const invoiceExport = salesData.map(sale => ({
      'Type': 'Invoice',
      'Document No': sale.invoice_no,
      'Date': sale.invoice_date,
      'Customer': sale.customer_name,
      'Subtotal': sale.subtotal,
      'Tax': sale.tax_total,
      'Discount': sale.discount,
      'Total': sale.grand_total,
      'Status': sale.status
    }));

    const receiptExport = receiptsData.map(rec => ({
      'Type': 'Receipt',
      'Document No': rec.receipt_no,
      'Date': rec.receipt_date,
      'Customer': rec.customer_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': rec.amount,
      'Status': rec.reference
    }));

    const returnExport = returnsData.map(ret => ({
      'Type': 'Return Note',
      'Document No': ret.return_note_no,
      'Date': ret.return_date,
      'Customer': ret.customer_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': ret.grand_total,
      'Status': ret.reason
    }));

    exportToCSV('Sales_Report', [...invoiceExport, ...receiptExport, ...returnExport]);
    toast.success('Report exported to CSV');
  };

  const handleExportExcel = () => {
    const invoiceExport = salesData.map(sale => ({
      'Type': 'Invoice',
      'Document No': sale.invoice_no,
      'Date': sale.invoice_date,
      'Customer': sale.customer_name,
      'Subtotal': sale.subtotal,
      'Tax': sale.tax_total,
      'Discount': sale.discount,
      'Total': sale.grand_total,
      'Status': sale.status
    }));

    const receiptExport = receiptsData.map(rec => ({
      'Type': 'Receipt',
      'Document No': rec.receipt_no,
      'Date': rec.receipt_date,
      'Customer': rec.customer_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': rec.amount,
      'Status': rec.reference
    }));

    const returnExport = returnsData.map(ret => ({
      'Type': 'Return Note',
      'Document No': ret.return_note_no,
      'Date': ret.return_date,
      'Customer': ret.customer_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': ret.grand_total,
      'Status': ret.reason
    }));

    exportToExcel('Sales_Report', [...invoiceExport, ...receiptExport, ...returnExport]);
    toast.success('Report exported to Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Sales Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 32);

    // Invoices Table
    doc.setFontSize(14);
    doc.text('Invoices', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Invoice No', 'Date', 'Customer', 'Subtotal', 'Tax', 'Discount', 'Total']],
      body: salesData.map(sale => [
        sale.invoice_no,
        sale.invoice_date,
        sale.customer_name,
        sale.subtotal.toFixed(2),
        sale.tax_total.toFixed(2),
        sale.discount.toFixed(2),
        sale.grand_total.toFixed(2)
      ]),
      foot: [['', '', 'TOTAL', invoiceTotals.subtotal.toFixed(2), invoiceTotals.tax.toFixed(2), invoiceTotals.discount.toFixed(2), invoiceTotals.total.toFixed(2)]],
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [52, 152, 219], fontStyle: 'bold' }
    });

    // Receipts Table
    const finalY1 = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Receipts', 14, finalY1);
    
    autoTable(doc, {
      startY: finalY1 + 5,
      head: [['Receipt No', 'Date', 'Customer', 'Amount', 'Reference']],
      body: receiptsData.map(rec => [
        rec.receipt_no,
        rec.receipt_date,
        rec.customer_name,
        rec.amount.toFixed(2),
        rec.reference
      ]),
      foot: [['', '', 'TOTAL', receiptTotal.toFixed(2), '']],
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96] },
      footStyles: { fillColor: [46, 204, 113], fontStyle: 'bold' }
    });

    // Return Notes Table
    const finalY2 = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Return Notes', 14, finalY2);
    
    autoTable(doc, {
      startY: finalY2 + 5,
      head: [['Return Note No', 'Date', 'Customer', 'Total', 'Reason']],
      body: returnsData.map(ret => [
        ret.return_note_no,
        ret.return_date,
        ret.customer_name,
        ret.grand_total.toFixed(2),
        ret.reason
      ]),
      foot: [['', '', 'TOTAL', returnTotal.toFixed(2), '']],
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
      footStyles: { fillColor: [142, 68, 173], fontStyle: 'bold' }
    });

    doc.save('Sales_Report.pdf');
    toast.success('Report exported to PDF');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Report</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive sales report including invoices, receipts, and return notes
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Invoiced</div>
            <div className="text-2xl font-bold text-blue-600">{invoiceTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{salesData.length} invoices</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Received</div>
            <div className="text-2xl font-bold text-green-600">{receiptTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{receiptsData.length} receipts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Returns</div>
            <div className="text-2xl font-bold text-purple-600">{returnTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{returnsData.length} returns</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Tax</div>
            <div className="text-2xl font-bold text-orange-600">{invoiceTotals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net Sales</div>
            <div className="text-2xl font-bold">{(invoiceTotals.total - returnTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices ({salesData.length})</CardTitle>
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
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : salesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {salesData.map((sale, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{sale.invoice_no}</TableCell>
                        <TableCell>{sale.invoice_date}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell className="text-right">{sale.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{sale.tax_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{sale.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-medium">{sale.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
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
                      <TableCell className="text-right">{invoiceTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{invoiceTotals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{invoiceTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{invoiceTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Receipts ({receiptsData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No receipts found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {receiptsData.map((rec, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{rec.receipt_no}</TableCell>
                        <TableCell>{rec.receipt_date}</TableCell>
                        <TableCell>{rec.customer_name}</TableCell>
                        <TableCell className="text-right font-medium">{rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{rec.reference}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{receiptTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Return Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Notes ({returnsData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return Note No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No return notes found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {returnsData.map((ret, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{ret.return_note_no}</TableCell>
                        <TableCell>{ret.return_date}</TableCell>
                        <TableCell>{ret.customer_name}</TableCell>
                        <TableCell className="text-right font-medium">{ret.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{ret.reason}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{returnTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
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