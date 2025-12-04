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

interface BillData {
  bill_no: string;
  bill_date: string;
  supplier_name: string;
  subtotal: number;
  tax_total: number;
  discount: number;
  grand_total: number;
  status: string;
}

interface PaymentData {
  payment_no: string;
  payment_date: string;
  supplier_name: string;
  amount: number;
  reference: string;
}

interface DebitNoteData {
  debit_note_no: string;
  debit_date: string;
  supplier_name: string;
  grand_total: number;
  reason: string;
}

export default function PurchasingReport() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [billsData, setBillsData] = useState<BillData[]>([]);
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);
  const [debitNotesData, setDebitNotesData] = useState<DebitNoteData[]>([]);
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

      // Fetch Bills
      let billQuery = supabase
        .from('bills')
        .select(`
          bill_no,
          bill_date,
          subtotal,
          tax_total,
          discount,
          grand_total,
          status,
          contacts!bills_supplier_id_fkey (name)
        `)
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('bill_date', { ascending: false });

      if (startDate) billQuery = billQuery.gte('bill_date', startDate);
      if (endDate) billQuery = billQuery.lte('bill_date', endDate);

      // Fetch Payments
      let paymentQuery = supabase
        .from('bill_payments')
        .select(`
          payment_no,
          payment_date,
          amount,
          reference,
          contacts!bill_payments_supplier_id_fkey (name)
        `)
        .eq('company_id', profile.company_id)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false });

      if (startDate) paymentQuery = paymentQuery.gte('payment_date', startDate);
      if (endDate) paymentQuery = paymentQuery.lte('payment_date', endDate);

      // Fetch Debit Notes
      let debitNoteQuery = supabase
        .from('debit_notes')
        .select(`
          debit_note_no,
          debit_date,
          grand_total,
          reason,
          contacts!debit_notes_supplier_id_fkey (name)
        `)
        .eq('company_id', profile.company_id)
        .order('debit_date', { ascending: false });

      if (startDate) debitNoteQuery = debitNoteQuery.gte('debit_date', startDate);
      if (endDate) debitNoteQuery = debitNoteQuery.lte('debit_date', endDate);

      const [billsRes, paymentsRes, debitNotesRes] = await Promise.all([
        billQuery,
        paymentQuery,
        debitNoteQuery
      ]);

      if (billsRes.error) throw billsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (debitNotesRes.error) throw debitNotesRes.error;

      setBillsData(billsRes.data?.map(bill => ({
        bill_no: bill.bill_no,
        bill_date: bill.bill_date,
        supplier_name: bill.contacts?.name || 'Unknown',
        subtotal: bill.subtotal || 0,
        tax_total: bill.tax_total || 0,
        discount: bill.discount || 0,
        grand_total: bill.grand_total || 0,
        status: bill.status || 'draft'
      })) || []);

      setPaymentsData(paymentsRes.data?.map(pay => ({
        payment_no: pay.payment_no,
        payment_date: pay.payment_date,
        supplier_name: pay.contacts?.name || 'Unknown',
        amount: pay.amount || 0,
        reference: pay.reference || ''
      })) || []);

      setDebitNotesData(debitNotesRes.data?.map(dn => ({
        debit_note_no: dn.debit_note_no,
        debit_date: dn.debit_date,
        supplier_name: dn.contacts?.name || 'Unknown',
        grand_total: dn.grand_total || 0,
        reason: dn.reason || ''
      })) || []);

      toast.success('Purchasing report generated successfully');
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

  const billTotals = billsData.reduce(
    (acc, bill) => ({
      subtotal: acc.subtotal + bill.subtotal,
      tax: acc.tax + bill.tax_total,
      discount: acc.discount + bill.discount,
      total: acc.total + bill.grand_total
    }),
    { subtotal: 0, tax: 0, discount: 0, total: 0 }
  );

  const paymentTotal = paymentsData.reduce((acc, pay) => acc + pay.amount, 0);
  const debitNoteTotal = debitNotesData.reduce((acc, dn) => acc + dn.grand_total, 0);

  const handleExportCSV = () => {
    const billExport = billsData.map(bill => ({
      'Type': 'Bill',
      'Document No': bill.bill_no,
      'Date': bill.bill_date,
      'Supplier': bill.supplier_name,
      'Subtotal': bill.subtotal,
      'Tax': bill.tax_total,
      'Discount': bill.discount,
      'Total': bill.grand_total,
      'Status': bill.status
    }));

    const paymentExport = paymentsData.map(pay => ({
      'Type': 'Payment',
      'Document No': pay.payment_no,
      'Date': pay.payment_date,
      'Supplier': pay.supplier_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': pay.amount,
      'Status': pay.reference
    }));

    const debitNoteExport = debitNotesData.map(dn => ({
      'Type': 'Debit Note',
      'Document No': dn.debit_note_no,
      'Date': dn.debit_date,
      'Supplier': dn.supplier_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': dn.grand_total,
      'Status': dn.reason
    }));

    exportToCSV('Purchasing_Report', [...billExport, ...paymentExport, ...debitNoteExport]);
    toast.success('Report exported to CSV');
  };

  const handleExportExcel = () => {
    const billExport = billsData.map(bill => ({
      'Type': 'Bill',
      'Document No': bill.bill_no,
      'Date': bill.bill_date,
      'Supplier': bill.supplier_name,
      'Subtotal': bill.subtotal,
      'Tax': bill.tax_total,
      'Discount': bill.discount,
      'Total': bill.grand_total,
      'Status': bill.status
    }));

    const paymentExport = paymentsData.map(pay => ({
      'Type': 'Payment',
      'Document No': pay.payment_no,
      'Date': pay.payment_date,
      'Supplier': pay.supplier_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': pay.amount,
      'Status': pay.reference
    }));

    const debitNoteExport = debitNotesData.map(dn => ({
      'Type': 'Debit Note',
      'Document No': dn.debit_note_no,
      'Date': dn.debit_date,
      'Supplier': dn.supplier_name,
      'Subtotal': '',
      'Tax': '',
      'Discount': '',
      'Total': dn.grand_total,
      'Status': dn.reason
    }));

    exportToExcel('Purchasing_Report', [...billExport, ...paymentExport, ...debitNoteExport]);
    toast.success('Report exported to Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Purchasing Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 32);

    // Bills Table
    doc.setFontSize(14);
    doc.text('Bills', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Bill No', 'Date', 'Supplier', 'Subtotal', 'Tax', 'Discount', 'Total']],
      body: billsData.map(bill => [
        bill.bill_no,
        bill.bill_date,
        bill.supplier_name,
        bill.subtotal.toFixed(2),
        bill.tax_total.toFixed(2),
        bill.discount.toFixed(2),
        bill.grand_total.toFixed(2)
      ]),
      foot: [['', '', 'TOTAL', billTotals.subtotal.toFixed(2), billTotals.tax.toFixed(2), billTotals.discount.toFixed(2), billTotals.total.toFixed(2)]],
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] },
      footStyles: { fillColor: [192, 57, 43], fontStyle: 'bold' }
    });

    // Payments Table
    const finalY1 = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Payments', 14, finalY1);
    
    autoTable(doc, {
      startY: finalY1 + 5,
      head: [['Payment No', 'Date', 'Supplier', 'Amount', 'Reference']],
      body: paymentsData.map(pay => [
        pay.payment_no,
        pay.payment_date,
        pay.supplier_name,
        pay.amount.toFixed(2),
        pay.reference
      ]),
      foot: [['', '', 'TOTAL', paymentTotal.toFixed(2), '']],
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96] },
      footStyles: { fillColor: [46, 204, 113], fontStyle: 'bold' }
    });

    // Debit Notes Table
    const finalY2 = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Debit Notes', 14, finalY2);
    
    autoTable(doc, {
      startY: finalY2 + 5,
      head: [['Debit Note No', 'Date', 'Supplier', 'Total', 'Reason']],
      body: debitNotesData.map(dn => [
        dn.debit_note_no,
        dn.debit_date,
        dn.supplier_name,
        dn.grand_total.toFixed(2),
        dn.reason
      ]),
      foot: [['', '', 'TOTAL', debitNoteTotal.toFixed(2), '']],
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
      footStyles: { fillColor: [142, 68, 173], fontStyle: 'bold' }
    });

    doc.save('Purchasing_Report.pdf');
    toast.success('Report exported to PDF');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Purchasing Report</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive purchasing report including bills, payments, and debit notes
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
            <div className="text-sm text-muted-foreground">Total Bills</div>
            <div className="text-2xl font-bold text-red-600">{billTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{billsData.length} bills</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">{paymentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{paymentsData.length} payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Debit Notes</div>
            <div className="text-2xl font-bold text-purple-600">{debitNoteTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">{debitNotesData.length} notes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Tax</div>
            <div className="text-2xl font-bold text-orange-600">{billTotals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Outstanding</div>
            <div className="text-2xl font-bold">{(billTotals.total - paymentTotal - debitNoteTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bills Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bills ({billsData.length})</CardTitle>
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
                  <TableHead>Bill No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
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
                ) : billsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {billsData.map((bill, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{bill.bill_no}</TableCell>
                        <TableCell>{bill.bill_date}</TableCell>
                        <TableCell>{bill.supplier_name}</TableCell>
                        <TableCell className="text-right">{bill.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{bill.tax_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{bill.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-medium">{bill.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            bill.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{billTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{billTotals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{billTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{billTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payments ({paymentsData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {paymentsData.map((pay, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{pay.payment_no}</TableCell>
                        <TableCell>{pay.payment_date}</TableCell>
                        <TableCell>{pay.supplier_name}</TableCell>
                        <TableCell className="text-right font-medium">{pay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{pay.reference}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{paymentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Debit Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Debit Notes ({debitNotesData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debit Note No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debitNotesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No debit notes found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {debitNotesData.map((dn, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{dn.debit_note_no}</TableCell>
                        <TableCell>{dn.debit_date}</TableCell>
                        <TableCell>{dn.supplier_name}</TableCell>
                        <TableCell className="text-right font-medium">{dn.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{dn.reason}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{debitNoteTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
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