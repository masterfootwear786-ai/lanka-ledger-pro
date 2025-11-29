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

interface PurchaseData {
  bill_no: string;
  bill_date: string;
  supplier_name: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  status: string;
}

export default function PurchasingReport() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purchaseData, setPurchaseData] = useState<PurchaseData[]>([]);
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
        .from('bills')
        .select(`
          bill_no,
          bill_date,
          subtotal,
          tax_total,
          grand_total,
          status,
          contacts!bills_supplier_id_fkey (
            name
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('posted', true)
        .is('deleted_at', null)
        .order('bill_date', { ascending: false });

      if (startDate) {
        query = query.gte('bill_date', startDate);
      }
      if (endDate) {
        query = query.lte('bill_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = data?.map(bill => ({
        bill_no: bill.bill_no,
        bill_date: bill.bill_date,
        supplier_name: bill.contacts?.name || 'Unknown',
        subtotal: bill.subtotal || 0,
        tax_total: bill.tax_total || 0,
        grand_total: bill.grand_total || 0,
        status: bill.status || 'draft'
      })) || [];

      setPurchaseData(formatted);
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
    if (startDate && endDate) {
      generateReport();
    }
  }, []);

  const totals = purchaseData.reduce(
    (acc, purchase) => ({
      subtotal: acc.subtotal + purchase.subtotal,
      tax: acc.tax + purchase.tax_total,
      total: acc.total + purchase.grand_total
    }),
    { subtotal: 0, tax: 0, total: 0 }
  );

  const handleExportCSV = () => {
    const data = purchaseData.map(purchase => ({
      'Bill No': purchase.bill_no,
      'Date': purchase.bill_date,
      'Supplier': purchase.supplier_name,
      'Subtotal': purchase.subtotal,
      'Tax': purchase.tax_total,
      'Total': purchase.grand_total,
      'Status': purchase.status
    }));

    exportToCSV('Purchasing_Report', data);
    toast.success('Report exported to CSV');
  };

  const handleExportExcel = () => {
    const data = purchaseData.map(purchase => ({
      'Bill No': purchase.bill_no,
      'Date': purchase.bill_date,
      'Supplier': purchase.supplier_name,
      'Subtotal': purchase.subtotal,
      'Tax': purchase.tax_total,
      'Total': purchase.grand_total,
      'Status': purchase.status
    }));

    exportToExcel('Purchasing_Report', data);
    toast.success('Report exported to Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Purchasing Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [['Bill No', 'Date', 'Supplier', 'Subtotal', 'Tax', 'Total', 'Status']],
      body: purchaseData.map(purchase => [
        purchase.bill_no,
        purchase.bill_date,
        purchase.supplier_name,
        purchase.subtotal.toFixed(2),
        purchase.tax_total.toFixed(2),
        purchase.grand_total.toFixed(2),
        purchase.status
      ]),
      foot: [['', '', 'TOTAL', totals.subtotal.toFixed(2), totals.tax.toFixed(2), totals.total.toFixed(2), '']],
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] },
      footStyles: { fillColor: [192, 57, 43], fontStyle: 'bold' }
    });

    doc.save('Purchasing_Report.pdf');
    toast.success('Report exported to PDF');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Purchasing Report</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive purchasing transactions report
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
          <CardTitle>Purchase Transactions</CardTitle>
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
                ) : purchaseData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {purchaseData.map((purchase, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{purchase.bill_no}</TableCell>
                        <TableCell>{purchase.bill_date}</TableCell>
                        <TableCell>{purchase.supplier_name}</TableCell>
                        <TableCell className="text-right">{purchase.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{purchase.tax_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-medium">{purchase.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            purchase.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {purchase.status}
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
                <div className="text-sm text-muted-foreground">Total Purchases</div>
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
                <div className="text-sm text-muted-foreground">Number of Bills</div>
                <div className="text-2xl font-bold">{purchaseData.length}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
