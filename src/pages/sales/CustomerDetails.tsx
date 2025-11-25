import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, FileText, Receipt, FileEdit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { generateCustomerStatement } from "@/lib/customerStatement";
import StatementOptionsDialog, { StatementOptions } from "@/components/statements/StatementOptionsDialog";
import StatementPreviewDialog from "@/components/statements/StatementPreviewDialog";
import jsPDF from "jspdf";

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    outstanding: 0,
  });
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewOptions, setPreviewOptions] = useState<StatementOptions | null>(null);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel for faster loading
      const [
        { data: customerData, error: customerError },
        { data: invoicesData, error: invoicesError },
        { data: receiptsData, error: receiptsError }
      ] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", id).single(),
        supabase.from("invoices").select("*").eq("customer_id", id).order("invoice_date", { ascending: false }),
        supabase.from("receipts").select("*").eq("customer_id", id).order("receipt_date", { ascending: false })
      ]);

      if (customerError) throw customerError;
      if (invoicesError) throw invoicesError;
      if (receiptsError) throw receiptsError;

      setCustomer(customerData);
      setInvoices(invoicesData || []);
      setReceipts(receiptsData || []);

      // Calculate statistics
      const totalInvoiced = invoicesData?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) || 0;
      const totalPaid = receiptsData?.reduce((sum, rec) => sum + (rec.amount || 0), 0) || 0;
      const outstanding = totalInvoiced - totalPaid;

      setStats({
        totalInvoiced,
        totalPaid,
        outstanding,
      });
    } catch (error: any) {
      toast.error(error.message);
      navigate("/sales/customers");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      approved: "default",
      paid: "default",
      void: "destructive",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getTransactions = () => {
    return [
      ...invoices.map((inv) => ({
        date: inv.invoice_date,
        type: "Invoice",
        reference: inv.invoice_no,
        debit: inv.grand_total || 0,
        credit: 0,
      })),
      ...receipts.map((rec) => ({
        date: rec.receipt_date,
        type: "Receipt",
        reference: rec.receipt_no,
        debit: 0,
        credit: rec.amount || 0,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const handleExportPDF = (options: StatementOptions) => {
    const transactions = getTransactions();
    generateCustomerStatement(customer, stats, transactions, options);
    toast.success("Customer statement exported successfully");
    setShowStatementDialog(false);
  };

  const handleEmailStatement = async (options: StatementOptions) => {
    try {
      const transactions = getTransactions();
      
      // Generate PDF and convert to base64
      const doc = new jsPDF();
      generateCustomerStatement(customer, stats, transactions, options);
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      
      const fileName = `Customer_Statement_${customer.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

      const { error } = await supabase.functions.invoke("send-customer-statement", {
        body: {
          to: customer.email,
          customerName: customer.name,
          pdfBase64,
          fileName,
        },
      });

      if (error) throw error;
      
      toast.success("Statement sent successfully to " + customer.email);
      setShowStatementDialog(false);
    } catch (error: any) {
      toast.error("Failed to send email: " + error.message);
    }
  };

  const handleWhatsAppStatement = (options: StatementOptions) => {
    const transactions = getTransactions();
    generateCustomerStatement(customer, stats, transactions, options);
    
    const message = encodeURIComponent(
      `Hello ${customer.name}, your account statement has been generated. Outstanding balance: ${stats.outstanding.toLocaleString()}`
    );
    const whatsappUrl = `https://wa.me/${customer.phone?.replace(/[^0-9]/g, "")}?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
    setShowStatementDialog(false);
  };

  const handleViewStatement = (options: StatementOptions) => {
    setPreviewOptions(options);
    setShowStatementDialog(false);
    setShowPreviewDialog(true);
  };

  const handleExportFromPreview = () => {
    if (previewOptions) {
      const transactions = getTransactions();
      generateCustomerStatement(customer, stats, transactions, previewOptions);
      toast.success("Customer statement exported successfully");
    }
  };

  const handleEmailFromPreview = async () => {
    if (!previewOptions) return;
    try {
      const transactions = getTransactions();
      
      const doc = new jsPDF();
      generateCustomerStatement(customer, stats, transactions, previewOptions);
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      
      const fileName = `Customer_Statement_${customer.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

      const { error } = await supabase.functions.invoke("send-customer-statement", {
        body: {
          to: customer.email,
          customerName: customer.name,
          pdfBase64,
          fileName,
        },
      });

      if (error) throw error;
      
      toast.success("Statement sent successfully to " + customer.email);
      setShowPreviewDialog(false);
    } catch (error: any) {
      toast.error("Failed to send email: " + error.message);
    }
  };

  const handleWhatsAppFromPreview = () => {
    if (!previewOptions) return;
    const transactions = getTransactions();
    generateCustomerStatement(customer, stats, transactions, previewOptions);
    
    const message = encodeURIComponent(
      `Hello ${customer.name}, your account statement has been generated. Outstanding balance: ${stats.outstanding.toLocaleString()}`
    );
    const whatsappUrl = `https://wa.me/${customer.phone?.replace(/[^0-9]/g, "")}?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
    setShowPreviewDialog(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-4 bg-muted rounded w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sales/customers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="text-muted-foreground">Customer Code: {customer.code}</p>
        </div>
        <Button onClick={() => setShowStatementDialog(true)} variant="outline">
          <FileEdit className="h-4 w-4 mr-2" />
          Generate Statement
        </Button>
        <Badge variant={customer.active ? "default" : "secondary"}>
          {customer.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Customer Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoiced.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Credit Limit:</span>
                <div className="font-medium">{customer.credit_limit?.toLocaleString() || "N/A"}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Payment Terms:</span>
                <div className="font-medium">{customer.payment_terms || 0} days</div>
              </div>
              {customer.tax_number && (
                <div>
                  <span className="text-sm text-muted-foreground">Tax Number:</span>
                  <div className="font-medium">{customer.tax_number}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="receipts">
            Receipts ({receipts.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Complete History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No invoices found</TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoice_no}</TableCell>
                        <TableCell>{format(new Date(invoice.invoice_date), "PPP")}</TableCell>
                        <TableCell>
                          {invoice.due_date ? format(new Date(invoice.due_date), "PPP") : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {invoice.grand_total?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No receipts found</TableCell>
                    </TableRow>
                  ) : (
                    receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-mono">{receipt.receipt_no}</TableCell>
                        <TableCell>{format(new Date(receipt.receipt_date), "PPP")}</TableCell>
                        <TableCell>{receipt.reference || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {receipt.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {receipt.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const transactions = [
                      ...invoices.map((inv) => ({
                        date: inv.invoice_date,
                        type: "Invoice",
                        reference: inv.invoice_no,
                        debit: inv.grand_total,
                        credit: 0,
                      })),
                      ...receipts.map((rec) => ({
                        date: rec.receipt_date,
                        type: "Receipt",
                        reference: rec.receipt_no,
                        debit: 0,
                        credit: rec.amount,
                      })),
                    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    let runningBalance = 0;

                    return transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No transactions found</TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((txn, idx) => {
                        runningBalance += txn.debit - txn.credit;
                        return (
                          <TableRow key={idx}>
                            <TableCell>{format(new Date(txn.date), "PPP")}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{txn.type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono">{txn.reference}</TableCell>
                            <TableCell className="text-right">
                              {txn.debit > 0 ? txn.debit.toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {txn.credit > 0 ? txn.credit.toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {runningBalance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StatementOptionsDialog
        open={showStatementDialog}
        onOpenChange={setShowStatementDialog}
        customerEmail={customer.email}
        customerPhone={customer.phone}
        onExport={handleExportPDF}
        onEmail={handleEmailStatement}
        onWhatsApp={handleWhatsAppStatement}
        onView={handleViewStatement}
      />

      {previewOptions && (
        <StatementPreviewDialog
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
          customer={customer}
          stats={stats}
          transactions={getTransactions()}
          options={previewOptions}
          onExport={handleExportFromPreview}
          onEmail={handleEmailFromPreview}
          onWhatsApp={handleWhatsAppFromPreview}
        />
      )}
    </div>
  );
}
