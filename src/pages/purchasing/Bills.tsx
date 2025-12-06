import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Edit, Trash2, Printer, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BillDialog } from "@/components/bills/BillDialog";
import { BillPreviewDialog } from "@/components/bills/BillPreviewDialog";
import { PasswordPromptDialog } from "@/components/PasswordPromptDialog";
import { useActionPassword } from "@/hooks/useActionPassword";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

export default function Bills() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBill, setPreviewBill] = useState<any>(null);
  const [listPreviewOpen, setListPreviewOpen] = useState(false);
  const {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useActionPassword('bills');

  const handlePrintList = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bills List</title>
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
          <h1>Bills List</h1>
          <p>Total: ${filteredBills.length} bills</p>
          <table>
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBills.map(b => `
                <tr>
                  <td>${b.bill_no || '-'}</td>
                  <td>${b.bill_date || '-'}</td>
                  <td>${b.supplier?.name || '-'}</td>
                  <td>${b.due_date || '-'}</td>
                  <td style="text-align: right;">${b.grand_total?.toLocaleString() || '-'}</td>
                  <td>${b.status || 'draft'}</td>
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
    doc.text("Bills List", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${filteredBills.length} bills`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    const tableData = filteredBills.map(b => [
      b.bill_no || '-',
      b.bill_date || '-',
      b.supplier?.name || '-',
      b.due_date || '-',
      b.grand_total?.toLocaleString() || '-',
      b.status || 'draft'
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Bill #', 'Date', 'Supplier', 'Due Date', 'Amount', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save('bills-list.pdf');
    toast.success("PDF downloaded successfully");
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bills")
        .select(`
          *,
          supplier:contacts(name)
        `)
        .is('deleted_at', null)
        .order("bill_date", { ascending: false });
      
      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bill: any) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const handlePrint = async (bill: any) => {
    try {
      const { data: lines } = await supabase
        .from("bill_lines")
        .select("*")
        .eq("bill_id", bill.id)
        .order("line_no", { ascending: true });

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", bill.company_id)
        .single();

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bill ${bill.bill_no}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .title { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
              .details { margin: 30px 0; }
              .detail-row { display: grid; grid-template-columns: 200px 1fr; padding: 12px 0; border-bottom: 1px solid #eee; }
              .detail-label { font-weight: 600; color: #666; }
              .detail-value { color: #000; }
              .line-items { margin: 30px 0; }
              .items-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background: #f5f5f5; padding: 12px; text-align: left; border: 1px solid #ddd; }
              td { padding: 10px; border: 1px solid #ddd; }
              .totals { margin-top: 30px; float: right; width: 350px; }
              .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .total-row.grand { font-weight: bold; font-size: 18px; border-top: 2px solid #333; margin-top: 10px; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">BILL</div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Bill No:</span>
                <span class="detail-value">${bill.bill_no}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bill Date:</span>
                <span class="detail-value">${new Date(bill.bill_date).toLocaleDateString()}</span>
              </div>
              ${bill.due_date ? `
                <div class="detail-row">
                  <span class="detail-label">Due Date:</span>
                  <span class="detail-value">${new Date(bill.due_date).toLocaleDateString()}</span>
                </div>
              ` : ''}
              <div class="detail-row">
                <span class="detail-label">Supplier:</span>
                <span class="detail-value">${bill.supplier?.name || ''}</span>
              </div>
              ${bill.supplier_ref ? `
                <div class="detail-row">
                  <span class="detail-label">Supplier Reference:</span>
                  <span class="detail-value">${bill.supplier_ref}</span>
                </div>
              ` : ''}
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${bill.status || 'draft'}</span>
              </div>
            </div>

            <div class="line-items">
              <div class="items-title">Line Items</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(lines || []).map((line: any) => `
                    <tr>
                      <td>${line.description}</td>
                      <td style="text-align: center;">${line.quantity}</td>
                      <td style="text-align: right;">${line.unit_price?.toFixed(2)}</td>
                      <td style="text-align: right;">${line.line_total?.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${(bill.subtotal || 0).toFixed(2)}</span>
              </div>
              ${bill.discount ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>${bill.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              ${bill.tax_total ? `
                <div class="total-row">
                  <span>Tax:</span>
                  <span>${bill.tax_total.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row grand">
                <span>Grand Total:</span>
                <span>${(bill.grand_total || 0).toFixed(2)}</span>
              </div>
            </div>
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
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!billToDelete) return;
    
    requirePassword(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from("bills")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id
          })
          .eq("id", billToDelete.id);
        
        if (error) throw error;
        toast.success("Bill moved to trash");
        fetchBills();
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setDeleteDialogOpen(false);
        setBillToDelete(null);
      }
    });
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.supplier_ref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = async (billId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("bills")
        .update({ status: newStatus as any })
        .eq("id", billId);
      
      if (error) throw error;
      toast.success("Status updated");
      fetchBills();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePreview = (bill: any) => {
    setPreviewBill(bill);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('purchasing.bills')}</h1>
          <p className="text-muted-foreground mt-2">Manage supplier bills</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setListPreviewOpen(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadListPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => {
            setSelectedBill(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Bill
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Bills</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Bill List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-mono font-medium">{bill.bill_no}</TableCell>
                      <TableCell>{bill.bill_date}</TableCell>
                      <TableCell>{bill.supplier?.name || '-'}</TableCell>
                      <TableCell>{bill.due_date || '-'}</TableCell>
                      <TableCell className="text-right">
                        {bill.grand_total?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={bill.status || 'draft'}
                          onValueChange={(value) => handleStatusChange(bill.id, value)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handlePreview(bill)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(bill)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePrint(bill)} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setBillToDelete(bill);
                              setDeleteDialogOpen(true);
                            }}
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
          )}
        </CardContent>
      </Card>

      <BillDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedBill(null);
        }}
        bill={selectedBill}
        onSuccess={fetchBills}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {billToDelete?.bill_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordPromptDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onConfirm={handlePasswordConfirm}
        onPasswordVerify={verifyPassword}
        title="Delete Bill"
        description="Please enter the action password to delete this bill."
      />

      <BillPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        bill={previewBill}
      />

      {/* List Preview Dialog */}
      <Dialog open={listPreviewOpen} onOpenChange={setListPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Bills List Preview</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintList}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadListPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Bills List</h2>
              <p className="text-sm text-muted-foreground">Total: {filteredBills.length} bills</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono">{bill.bill_no}</TableCell>
                    <TableCell>{bill.bill_date}</TableCell>
                    <TableCell>{bill.supplier?.name || '-'}</TableCell>
                    <TableCell>{bill.due_date || '-'}</TableCell>
                    <TableCell className="text-right">{bill.grand_total?.toLocaleString() || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={bill.status === "paid" ? "default" : "secondary"}>
                        {bill.status || 'draft'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
