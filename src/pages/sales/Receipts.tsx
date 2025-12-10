import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, CreditCard, Printer, Eye, Download, FileText, Send } from "lucide-react";
import { SendDocumentDropdown } from "@/components/documents/SendDocumentDropdown";
import { supabase } from "@/integrations/supabase/client";
import { ReceiptDialog } from "@/components/receipts/ReceiptDialog";
import { ReceiptPreviewDialog } from "@/components/receipts/ReceiptPreviewDialog";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Receipts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [receipts, setReceipts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<any>(null);
  const [chequeDetailsOpen, setChequeDetailsOpen] = useState(false);
  const [selectedCheques, setSelectedCheques] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const [companyData, setCompanyData] = useState<any>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          customer:contacts(name, area, email, whatsapp, phone)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);

      // Fetch company data for SendDocumentDropdown
      if (data && data.length > 0) {
        const { data: company } = await supabase
          .from("companies")
          .select("*")
          .eq("id", data[0].company_id)
          .single();
        setCompanyData(company);
      }
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

  const handleEdit = (receipt: any) => {
    setSelectedReceipt(receipt);
    setDialogOpen(true);
  };

  const handleDeleteRequest = (receipt: any) => {
    setReceiptToDelete(receipt);
    setDeleteDialogOpen(true);
  };

  const handlePrint = async (receipt: any) => {
    try {
      const { data: allocations } = await supabase
        .from("receipt_allocations")
        .select("*, invoices(invoice_no, invoice_date)")
        .eq("receipt_id", receipt.id);

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt ${receipt.receipt_no}</title>
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
              <div class="title">RECEIPT</div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Receipt No:</span>
                <span class="detail-value">${receipt.receipt_no}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${new Date(receipt.receipt_date).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Customer:</span>
                <span class="detail-value">${receipt.customer?.name || ''}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value" style="font-size: 20px; font-weight: bold;">${receipt.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              ${receipt.reference ? `
                <div class="detail-row">
                  <span class="detail-label">Reference:</span>
                  <span class="detail-value">${receipt.reference}</span>
                </div>
              ` : ''}
              ${receipt.notes ? `
                <div class="detail-row">
                  <span class="detail-label">Notes:</span>
                  <span class="detail-value">${receipt.notes}</span>
                </div>
              ` : ''}
            </div>

            ${allocations && allocations.length > 0 ? `
              <div class="allocations">
                <div class="allocations-title">Invoice Allocations</div>
                <table>
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Invoice Date</th>
                      <th style="text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${allocations.map((alloc: any) => `
                      <tr>
                        <td>${alloc.invoices?.invoice_no || ''}</td>
                        <td>${alloc.invoices?.invoice_date ? new Date(alloc.invoices.invoice_date).toLocaleDateString() : ''}</td>
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

  const handleDownloadPDF = async (receipt: any) => {
    try {
      const { data: allocations } = await supabase
        .from("receipt_allocations")
        .select("*, invoices(invoice_no, invoice_date)")
        .eq("receipt_id", receipt.id);

      const { data: { user } } = await supabase.auth.getUser();
      let company = null;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile?.company_id) {
          const { data } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
          company = data;
        }
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(company?.name || "Company", 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(company?.address || "", 14, 27);

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", pageWidth - 14, 20, { align: "right" });

      doc.setLineWidth(0.5);
      doc.line(14, 34, pageWidth - 14, 34);

      // Receipt details
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt No: ${receipt.receipt_no}`, 14, 44);
      doc.text(`Date: ${new Date(receipt.receipt_date).toLocaleDateString()}`, 14, 51);
      doc.text(`Customer: ${receipt.customer?.name || ""}`, 14, 58);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Amount: ${receipt.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14, 68);

      if (receipt.reference) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Reference: ${receipt.reference}`, 14, 78);
      }

      // Allocations
      if (allocations && allocations.length > 0) {
        autoTable(doc, {
          startY: 85,
          head: [["Invoice No", "Invoice Date", "Amount"]],
          body: allocations.map((alloc: any) => [
            alloc.invoices?.invoice_no || "",
            alloc.invoices?.invoice_date ? new Date(alloc.invoices.invoice_date).toLocaleDateString() : "",
            alloc.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 66, 66] },
          columnStyles: { 2: { halign: "right" } },
        });
      }

      doc.save(`receipt-${receipt.receipt_no}.pdf`);
      toast({ title: "PDF downloaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePrintList = () => {
    const filteredReceipts = receipts.filter((receipt) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        receipt.receipt_no?.toLowerCase().includes(search) ||
        receipt.customer?.name?.toLowerCase().includes(search)
      );
    });

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipts List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .text-right { text-align: right; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Receipts List</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>City</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReceipts.map(r => `
                <tr>
                  <td>${r.receipt_no}</td>
                  <td>${new Date(r.receipt_date).toLocaleDateString()}</td>
                  <td>${r.customer?.name || 'N/A'}</td>
                  <td>${r.customer?.area || '-'}</td>
                  <td class="text-right">${r.amount.toLocaleString()}</td>
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
      printWindow.print();
    }
  };

  const handleExportListPDF = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let company = null;
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (profile?.company_id) {
        const { data } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        company = data;
      }
    }

    const filteredReceipts = receipts.filter((receipt) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        receipt.receipt_no?.toLowerCase().includes(search) ||
        receipt.customer?.name?.toLowerCase().includes(search)
      );
    });

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(company?.name || 'Receipts List', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [["Receipt #", "Date", "Customer", "City", "Amount"]],
      body: filteredReceipts.map(r => [
        r.receipt_no,
        new Date(r.receipt_date).toLocaleDateString(),
        r.customer?.name || 'N/A',
        r.customer?.area || '-',
        r.amount.toLocaleString(),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: { 4: { halign: "right" } },
    });

    doc.save(`receipts-list-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  const handleDelete = async () => {
    if (!receiptToDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('receipts')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .eq('id', receiptToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Receipt moved to trash",
      });

      fetchReceipts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setReceiptToDelete(null);
    }
  };

  const parseChequeReference = (reference: string | null) => {
    if (!reference) return null;
    try {
      const cheques = JSON.parse(reference);
      if (Array.isArray(cheques) && cheques.length > 0) {
        return cheques;
      }
    } catch {
      return null;
    }
    return null;
  };

  const handleChequeClick = (reference: string | null) => {
    const cheques = parseChequeReference(reference);
    if (cheques) {
      setSelectedCheques(cheques);
      setChequeDetailsOpen(true);
    }
  };

  const renderReference = (receipt: any) => {
    const cheques = parseChequeReference(receipt.reference);
    
    if (cheques) {
      return (
        <div className="space-y-1">
          {cheques.map((cheque: any, index: number) => (
            <div 
              key={index} 
              className="text-xs border-b border-border/50 pb-1 last:border-0 cursor-pointer hover:bg-accent/50 rounded px-1"
              onClick={() => handleChequeClick(receipt.reference)}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-orange-500" />
                  {cheque.cheque_no}
                </span>
                <span className="text-orange-600 font-semibold">
                  {Number(cheque.amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-muted-foreground">
                {cheque.cheque_date ? new Date(cheque.cheque_date).toLocaleDateString() : '-'}
                {cheque.cheque_bank ? ` • ${cheque.cheque_bank}` : ''}
                {cheque.status && cheque.status !== 'pending' && (
                  <Badge 
                    variant={cheque.status === 'passed' ? 'default' : 'destructive'} 
                    className="ml-2 text-[10px] px-1 py-0"
                  >
                    {cheque.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return receipt.reference || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('sales.receipts')}</h1>
          <p className="text-muted-foreground mt-2">Manage customer payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintList}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportListPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Receipt
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Receipts</CardTitle>
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

      <ReceiptDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
        onSuccess={fetchReceipts}
      />

      <Card>
        <CardHeader>
          <CardTitle>Receipt List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : receipts.filter((receipt) => {
                if (!searchTerm) return true;
                const search = searchTerm.toLowerCase();
                return (
                  receipt.receipt_no?.toLowerCase().includes(search) ||
                  receipt.customer?.name?.toLowerCase().includes(search) ||
                  receipt.customer?.area?.toLowerCase().includes(search) ||
                  receipt.reference?.toLowerCase().includes(search) ||
                  receipt.amount?.toString().includes(search)
                );
              }).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No receipts found</TableCell>
                </TableRow>
              ) : (
                receipts.filter((receipt) => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return (
                    receipt.receipt_no?.toLowerCase().includes(search) ||
                    receipt.customer?.name?.toLowerCase().includes(search) ||
                    receipt.customer?.area?.toLowerCase().includes(search) ||
                    receipt.reference?.toLowerCase().includes(search) ||
                    receipt.amount?.toString().includes(search)
                  );
                }).map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono font-medium">{receipt.receipt_no}</TableCell>
                    <TableCell>{new Date(receipt.receipt_date).toLocaleDateString()}</TableCell>
                    <TableCell>{receipt.customer?.name || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{receipt.customer?.area || '-'}</TableCell>
                    <TableCell>{renderReference(receipt)}</TableCell>
                    <TableCell className="text-right">{receipt.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setPreviewReceipt(receipt);
                            setPreviewOpen(true);
                          }}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(receipt)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handlePrint(receipt)}
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <SendDocumentDropdown
                          documentType="receipt"
                          document={receipt}
                          customer={receipt.customer}
                          companyData={companyData}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadPDF(receipt)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteRequest(receipt)}
                          title="Delete"
                        >
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
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete receipt {receiptToDelete?.receipt_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={chequeDetailsOpen} onOpenChange={setChequeDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cheque Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCheques.map((cheque, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Cheque Number</p>
                      <p className="font-medium">{cheque.cheque_no}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">{Number(cheque.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(cheque.cheque_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bank</p>
                      <p className="font-medium">{cheque.cheque_bank || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Branch</p>
                      <p className="font-medium">{cheque.cheque_branch || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Holder</p>
                      <p className="font-medium">{cheque.cheque_holder || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        receipt={previewReceipt}
      />
    </div>
  );
}
