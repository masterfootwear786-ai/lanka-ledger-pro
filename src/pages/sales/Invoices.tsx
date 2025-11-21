import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Eye, Edit, Trash2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceDialog } from "@/components/invoices/InvoiceDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Invoices() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:contacts(name, area)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500";
      case "approved": return "bg-blue-500";
      case "draft": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const handleView = async (invoice: any) => {
    try {
      // Fetch invoice lines
      const { data: lines, error } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('line_no', { ascending: true });

      if (error) throw error;

      setSelectedInvoice(invoice);
      setInvoiceLines(lines || []);
      setViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDeleteRequest = (invoice: any) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      // Delete invoice lines first
      const { error: linesError } = await supabase
        .from('invoice_lines')
        .delete()
        .eq('invoice_id', invoiceToDelete.id);

      if (linesError) throw linesError;

      // Delete invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });

      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePrint = async (invoice: any) => {
    try {
      // Fetch invoice lines
      const { data: lines } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('line_no', { ascending: true });

      // Create print content
      const printWindow = window.open('', '', 'width=800,height=600');
      if (!printWindow) return;

      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoice_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
            .total { text-align: right; margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INVOICE</h1>
            <p>Invoice #: ${invoice.invoice_no}</p>
          </div>
          <div class="info">
            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${invoice.customer?.name || 'N/A'}</p>
            ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${(lines || []).map(line => `
                <tr>
                  <td>${line.description}</td>
                  <td>${line.quantity}</td>
                  <td>${line.unit_price.toFixed(2)}</td>
                  <td>${line.tax_amount.toFixed(2)}</td>
                  <td>${line.line_total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Subtotal: ${invoice.subtotal?.toFixed(2) || '0.00'}</p>
            <p>Tax: ${invoice.tax_total?.toFixed(2) || '0.00'}</p>
            <p>Discount: ${invoice.discount?.toFixed(2) || '0.00'}</p>
            <p>Grand Total: ${invoice.grand_total?.toFixed(2) || '0.00'}</p>
          </div>
          ${invoice.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong><p>${invoice.notes}</p></div>` : ''}
        </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('sales.invoices')}</h1>
          <p className="text-muted-foreground mt-2">Manage customer invoices</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('sales.createInvoice')}
        </Button>
      </div>

      <InvoiceDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
      />

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">{t('common.filter')}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No invoices found</TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.invoice_no}</TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{invoice.customer?.area || '-'}</TableCell>
                    <TableCell className="text-right">{invoice.grand_total?.toLocaleString() || '0'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {t(`status.${invoice.status}`)}
                      </Badge>
                    </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleView(invoice)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(invoice)}
                        title="Edit"
                        disabled={invoice.posted}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePrint(invoice)}
                        title="Print"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRequest(invoice)}
                        title="Delete"
                        disabled={invoice.posted}
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

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoice_no}</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6 pb-4 border-b">
                <div>
                  <h3 className="font-semibold mb-3">Invoice Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Invoice #:</span> {selectedInvoice.invoice_no}</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                    {selectedInvoice.due_date && (
                      <p><span className="font-medium">Due Date:</span> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                    )}
                    <p><span className="font-medium">Status:</span> 
                      <Badge className={`${getStatusColor(selectedInvoice.status)} ml-2`}>
                        {selectedInvoice.status}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedInvoice.customer?.name || 'N/A'}</p>
                    {selectedInvoice.customer?.area && (
                      <p><span className="font-medium">City:</span> {selectedInvoice.customer.area}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold w-16">DSG. No</TableHead>
                        <TableHead className="font-semibold min-w-[200px]">Description</TableHead>
                        <TableHead className="font-semibold text-center w-16">CLR</TableHead>
                        <TableHead className="font-semibold text-center w-12 bg-muted/30">39</TableHead>
                        <TableHead className="font-semibold text-center w-12">40</TableHead>
                        <TableHead className="font-semibold text-center w-12 bg-muted/30">41</TableHead>
                        <TableHead className="font-semibold text-center w-12">42</TableHead>
                        <TableHead className="font-semibold text-center w-12 bg-muted/30">43</TableHead>
                        <TableHead className="font-semibold text-center w-12">44</TableHead>
                        <TableHead className="font-semibold text-center w-12 bg-muted/30">45</TableHead>
                        <TableHead className="font-semibold text-center w-20">Pairs</TableHead>
                        <TableHead className="font-semibold text-right w-24">Price</TableHead>
                        <TableHead className="font-semibold text-right w-28">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceLines.map((line, index) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-center">-</TableCell>
                          <TableCell className="text-center bg-muted/10">{line.quantity > 0 ? line.quantity : '-'}</TableCell>
                          <TableCell className="text-center">-</TableCell>
                          <TableCell className="text-center bg-muted/10">-</TableCell>
                          <TableCell className="text-center">-</TableCell>
                          <TableCell className="text-center bg-muted/10">-</TableCell>
                          <TableCell className="text-center">-</TableCell>
                          <TableCell className="text-center bg-muted/10">-</TableCell>
                          <TableCell className="text-center font-medium">{line.quantity}</TableCell>
                          <TableCell className="text-right">{line.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">{line.line_total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="space-y-2 w-80">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{selectedInvoice.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax Total:</span>
                      <span className="font-medium">{selectedInvoice.tax_total?.toFixed(2) || '0.00'}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-medium">-{selectedInvoice.discount?.toFixed(2) || '0.00'}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Grand Total:</span>
                      <span>{selectedInvoice.grand_total?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handlePrint(selectedInvoice)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoice_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
