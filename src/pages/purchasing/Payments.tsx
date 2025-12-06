import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Edit, Trash2, Printer, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/payments/PaymentDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Payments() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const handlePrintList = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payments List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Supplier Payments List</h1>
          <p>Total: ${filteredPayments.length} payments</p>
          <table>
            <thead>
              <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Method</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments.map(p => `
                <tr>
                  <td>${p.payment_no || '-'}</td>
                  <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                  <td>${p.contacts?.name || '-'}</td>
                  <td>${p.reference || 'Cash'}</td>
                  <td style="text-align: right;">${p.amount?.toLocaleString() || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDownloadListPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Supplier Payments List", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${filteredPayments.length} payments`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    const tableData = filteredPayments.map(p => [
      p.payment_no || '-',
      new Date(p.payment_date).toLocaleDateString(),
      p.contacts?.name || '-',
      p.reference || 'Cash',
      p.amount?.toLocaleString() || '-'
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Payment #', 'Date', 'Supplier', 'Method', 'Amount']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save('supplier-payments-list.pdf');
    toast({ title: "Success", description: "PDF downloaded successfully" });
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bill_payments')
        .select(`
          *,
          contacts:supplier_id (name)
        `)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (payment: any) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const handlePrint = async (payment: any) => {
    try {
      const { data: allocations } = await supabase
        .from("payment_allocations")
        .select("*, bills(bill_no, bill_date)")
        .eq("payment_id", payment.id);

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment ${payment.payment_no}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .title { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
              .details { margin: 30px 0; }
              .detail-row { display: grid; grid-template-columns: 200px 1fr; padding: 12px 0; border-bottom: 1px solid #eee; }
              .detail-label { font-weight: 600; color: #666; }
              .detail-value { color: #000; }
              .allocations { margin: 30px 0; }
              .allocations-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background: #f5f5f5; padding: 12px; text-align: left; border: 1px solid #ddd; }
              td { padding: 10px; border: 1px solid #ddd; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">PAYMENT</div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Payment No:</span>
                <span class="detail-value">${payment.payment_no}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${new Date(payment.payment_date).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Supplier:</span>
                <span class="detail-value">${payment.contacts?.name || ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value" style="font-size: 20px; font-weight: bold;">${payment.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              ${payment.reference ? `
                <div class="detail-row">
                  <span class="detail-label">Reference:</span>
                  <span class="detail-value">${payment.reference}</span>
                </div>
              ` : ''}
              ${payment.notes ? `
                <div class="detail-row">
                  <span class="detail-label">Notes:</span>
                  <span class="detail-value">${payment.notes}</span>
                </div>
              ` : ''}
            </div>

            ${allocations && allocations.length > 0 ? `
              <div class="allocations">
                <div class="allocations-title">Bill Allocations</div>
                <table>
                  <thead>
                    <tr>
                      <th>Bill No</th>
                      <th>Bill Date</th>
                      <th style="text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${allocations.map((alloc: any) => `
                      <tr>
                        <td>${alloc.bills?.bill_no || ''}</td>
                        <td>${alloc.bills?.bill_date ? new Date(alloc.bills.bill_date).toLocaleDateString() : ''}</td>
                        <td style="text-align: right;">${alloc.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!paymentToDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('bill_payments')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .eq('id', paymentToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment moved to trash",
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleEdit = (payment: any) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const filteredPayments = payments.filter(payment =>
    payment.payment_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('purchasing.payments')}</h1>
          <p className="text-muted-foreground mt-2">Manage supplier payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewDialogOpen(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadListPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Payment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <PaymentDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onSuccess={fetchPayments}
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No payments found</TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono font-medium">{payment.payment_no}</TableCell>
                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.contacts?.name}</TableCell>
                    <TableCell>{payment.reference || '-'}</TableCell>
                    <TableCell className="text-right">{payment.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(payment)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRequest(payment)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete payment {paymentToDelete?.payment_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
