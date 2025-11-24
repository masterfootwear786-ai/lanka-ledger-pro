import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Printer } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StatusFilter = "all" | "draft" | "approved" | "paid";

export default function Invoices() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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
        .from("invoices")
        .select(
          `
          *,
          customer:contacts(name, area)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "approved":
        return "bg-blue-500";
      case "draft":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  // 🔎 Search + Status filter
  const filteredInvoices = invoices.filter((invoice) => {
    const term = searchTerm.trim().toLowerCase();

    // status filter
    if (statusFilter !== "all" && invoice.status !== statusFilter) {
      return false;
    }

    if (!term) return true;

    const invoiceNo = String(invoice.invoice_no || "").toLowerCase();
    const customerName = String(invoice.customer?.name || "").toLowerCase();
    const city = String(invoice.customer?.area || "").toLowerCase();
    const status = String(invoice.status || "").toLowerCase();

    return invoiceNo.includes(term) || customerName.includes(term) || city.includes(term) || status.includes(term);
  });

  const handleView = async (invoice: any) => {
    try {
      const { data: lines, error } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("line_no", { ascending: true });

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
      const { error: linesError } = await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceToDelete.id);

      if (linesError) throw linesError;

      // Delete invoice
      const { error } = await supabase.from("invoices").delete().eq("id", invoiceToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice deleted successfully.",
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
      const { data: lines } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("line_no", { ascending: true });

      const printWindow = window.open("", "", "width=800,height=600");
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
            <p><strong>Customer:</strong> ${invoice.customer?.name || "N/A"}</p>
            ${
              invoice.due_date
                ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>`
                : ""
            }
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
              ${(lines || [])
                .map(
                  (line: any) => `
                <tr>
                  <td>${line.description}</td>
                  <td>${line.quantity}</td>
                  <td>${line.unit_price.toFixed(2)}</td>
                  <td>${line.tax_amount.toFixed(2)}</td>
                  <td>${line.line_total.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <div class="total">
            <p>Subtotal: ${invoice.subtotal?.toFixed(2) || "0.00"}</p>
            <p>Tax: ${invoice.tax_total?.toFixed(2) || "0.00"}</p>
            <p>Discount: ${invoice.discount?.toFixed(2) || "0.00"}</p>
            <p>Grand Total: ${invoice.grand_total?.toFixed(2) || "0.00"}</p>
          </div>
          ${invoice.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong><p>${invoice.notes}</p></div>` : ""}
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

  const getStatusFilterLabel = (value: StatusFilter) => {
    switch (value) {
      case "all":
        return "All Statuses";
      case "draft":
        return "Draft";
      case "approved":
        return "Approved";
      case "paid":
        return "Paid";
      default:
        return "All Statuses";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("sales.invoices")}</h1>
          <p className="mt-2 text-muted-foreground">Manage customer invoices</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("sales.createInvoice")}
        </Button>
      </div>

      {/* Create / Edit dialog */}
      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
      />

      {/* Search + Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-3 h-4 w-4" />
              <Input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{getStatusFilterLabel(statusFilter)}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("approved")}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("paid")}>Paid</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Invoice list */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.invoice_no}</TableCell>
                    <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.customer?.name || "N/A"}</TableCell>
                    <TableCell>{invoice.customer?.area || "-"}</TableCell>
                    <TableCell className="text-right">{invoice.grand_total?.toLocaleString() || "0"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>{t(`status.${invoice.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleView(invoice)} title="View Details">
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
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(invoice)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRequest(invoice)}
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

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">INVOICE</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6 p-6 bg-background">
              {/* Invoice Header */}
              <div className="text-center pb-4 border-b-2 border-primary">
                <div className="text-xl font-bold text-primary mb-2">Invoice #{selectedInvoice.invoice_no}</div>
                <div className="text-sm text-muted-foreground">
                  Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                  {selectedInvoice.due_date && (
                    <> | Due: {new Date(selectedInvoice.due_date).toLocaleDateString()}</>
                  )}
                </div>
              </div>

              {/* Bill To Section */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-primary mb-2">BILL TO:</div>
                <div className="space-y-1">
                  <div className="font-semibold text-lg">{selectedInvoice.customer?.name || "N/A"}</div>
                  {selectedInvoice.customer?.area && (
                    <div className="text-sm text-muted-foreground">{selectedInvoice.customer.area}</div>
                  )}
                  <div className="mt-2">
                    <Badge className={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="text-sm font-semibold text-primary mb-3">INVOICE ITEMS</div>
                <div className="overflow-hidden rounded-lg border-2 border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead className="w-20 font-bold border-r">Art No</TableHead>
                        <TableHead className="min-w-[200px] font-bold border-r">Description</TableHead>
                        <TableHead className="w-20 text-center font-bold border-r">Color</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">39</TableHead>
                        <TableHead className="w-12 text-center font-bold border-r">40</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">41</TableHead>
                        <TableHead className="w-12 text-center font-bold border-r">42</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">43</TableHead>
                        <TableHead className="w-12 text-center font-bold border-r">44</TableHead>
                        <TableHead className="w-12 bg-primary/5 text-center font-bold border-r">45</TableHead>
                        <TableHead className="w-24 text-center font-bold border-r">Total Pairs</TableHead>
                        <TableHead className="w-28 text-right font-bold border-r">Unit Price</TableHead>
                        <TableHead className="w-32 text-right font-bold">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceLines.map((line, idx) => {
                        const sizes = JSON.parse(line.description || "{}");
                        const totalPairs = line.quantity || 0;

                        return (
                          <TableRow key={line.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <TableCell className="font-mono border-r">{sizes.artNo || "-"}</TableCell>
                            <TableCell className="border-r">{sizes.description || "-"}</TableCell>
                            <TableCell className="text-center border-r">{sizes.color || "-"}</TableCell>
                            <TableCell className="bg-primary/5 text-center border-r">{sizes.size_39 || "-"}</TableCell>
                            <TableCell className="text-center border-r">{sizes.size_40 || "-"}</TableCell>
                            <TableCell className="bg-primary/5 text-center border-r">{sizes.size_41 || "-"}</TableCell>
                            <TableCell className="text-center border-r">{sizes.size_42 || "-"}</TableCell>
                            <TableCell className="bg-primary/5 text-center border-r">{sizes.size_43 || "-"}</TableCell>
                            <TableCell className="text-center border-r">{sizes.size_44 || "-"}</TableCell>
                            <TableCell className="bg-primary/5 text-center border-r">{sizes.size_45 || "-"}</TableCell>
                            <TableCell className="text-center font-semibold border-r">{totalPairs}</TableCell>
                            <TableCell className="text-right border-r">
                              {line.unit_price ? line.unit_price.toFixed(2) : "0.00"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {line.line_total ? line.line_total.toFixed(2) : "0.00"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary Section */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 bg-muted/30 rounded-lg p-4 border-2 border-border">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-mono">{selectedInvoice.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Tax:</span>
                    <span className="font-mono">{selectedInvoice.tax_total?.toFixed(2) || "0.00"}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span className="font-medium">Discount:</span>
                      <span className="font-mono">-{selectedInvoice.discount?.toFixed(2) || "0.00"}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-primary pt-2 mt-2"></div>
                  <div className="flex justify-between text-lg font-bold text-primary">
                    <span>Grand Total:</span>
                    <span className="font-mono">{selectedInvoice.grand_total?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedInvoice.notes && (
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="text-sm font-semibold text-primary mb-2">NOTES:</div>
                  <p className="text-sm whitespace-pre-wrap">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                Thank you for your business!
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
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
