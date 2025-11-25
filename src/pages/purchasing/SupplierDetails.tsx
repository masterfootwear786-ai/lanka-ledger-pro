import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, FileText, Receipt, FileEdit, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { generateSupplierStatement } from "@/lib/supplierStatement";
import SupplierStatementOptionsDialog, { StatementOptions } from "@/components/statements/SupplierStatementOptionsDialog";
import StatementPreviewDialog from "@/components/statements/StatementPreviewDialog";
import jsPDF from "jspdf";

export default function SupplierDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalPaid: 0,
    outstanding: 0,
  });
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewOptions, setPreviewOptions] = useState<StatementOptions | null>(null);

  useEffect(() => {
    if (id) {
      fetchSupplierData();
    }
  }, [id]);

  const fetchSupplierData = async () => {
    setLoading(true);
    try {
      const [
        { data: supplierData, error: supplierError },
        { data: billsData, error: billsError },
        { data: paymentsData, error: paymentsError }
      ] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", id).single(),
        supabase.from("bills").select("*").eq("supplier_id", id).order("bill_date", { ascending: false }),
        supabase.from("bill_payments").select("*").eq("supplier_id", id).order("payment_date", { ascending: false })
      ]);

      if (supplierError) throw supplierError;
      if (billsError) throw billsError;
      if (paymentsError) throw paymentsError;

      setSupplier(supplierData);
      setBills(billsData || []);
      setPayments(paymentsData || []);

      const totalBilled = billsData?.reduce((sum, bill) => sum + (bill.grand_total || 0), 0) || 0;
      const totalPaid = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const outstanding = totalBilled - totalPaid;

      setStats({
        totalBilled,
        totalPaid,
        outstanding,
      });
    } catch (error: any) {
      toast.error(error.message);
      navigate("/purchasing/suppliers");
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

  const getChequeStatusBadge = (status?: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Passed
          </Badge>
        );
      case 'returned':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Returned
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const parseChequeDetails = (reference: string | null) => {
    if (!reference) return null;
    try {
      const parsed = JSON.parse(reference);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  };

  const getTransactions = () => {
    const allTransactions = [
      ...bills.map((bill) => ({
        date: bill.bill_date,
        type: "Bill",
        reference: bill.bill_no,
        debit: bill.grand_total || 0,
        credit: 0,
      })),
      ...payments.map((payment) => ({
        date: payment.payment_date,
        type: "Payment",
        reference: payment.payment_no,
        debit: 0,
        credit: payment.amount || 0,
      })),
    ];
    
    return allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const handleExportPDF = (options: StatementOptions) => {
    const transactions = getTransactions();
    generateSupplierStatement(supplier, stats, transactions, options);
    toast.success("Supplier statement exported successfully");
    setShowStatementDialog(false);
  };

  const handleEmailStatement = async (options: StatementOptions) => {
    try {
      const transactions = getTransactions();
      
      const doc = new jsPDF();
      generateSupplierStatement(supplier, stats, transactions, options);
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      
      const fileName = `Supplier_Statement_${supplier.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

      const { error } = await supabase.functions.invoke("send-customer-statement", {
        body: {
          to: supplier.email,
          customerName: supplier.name,
          pdfBase64,
          fileName,
        },
      });

      if (error) throw error;
      
      toast.success("Statement sent successfully to " + supplier.email);
      setShowStatementDialog(false);
    } catch (error: any) {
      toast.error("Failed to send email: " + error.message);
    }
  };

  const handleWhatsAppStatement = (options: StatementOptions) => {
    const transactions = getTransactions();
    generateSupplierStatement(supplier, stats, transactions, options);
    
    const message = encodeURIComponent(
      `Hello ${supplier.name}, your account statement has been generated. Outstanding balance: ${stats.outstanding.toLocaleString()}`
    );
    const whatsappUrl = `https://wa.me/${supplier.phone?.replace(/[^0-9]/g, "")}?text=${message}`;
    
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
      generateSupplierStatement(supplier, stats, transactions, previewOptions);
      toast.success("Supplier statement exported successfully");
    }
  };

  const handleEmailFromPreview = async () => {
    if (!previewOptions) return;
    try {
      const transactions = getTransactions();
      
      const doc = new jsPDF();
      generateSupplierStatement(supplier, stats, transactions, previewOptions);
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      
      const fileName = `Supplier_Statement_${supplier.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`;

      const { error } = await supabase.functions.invoke("send-customer-statement", {
        body: {
          to: supplier.email,
          customerName: supplier.name,
          pdfBase64,
          fileName,
        },
      });

      if (error) throw error;
      
      toast.success("Statement sent successfully to " + supplier.email);
      setShowPreviewDialog(false);
    } catch (error: any) {
      toast.error("Failed to send email: " + error.message);
    }
  };

  const handleWhatsAppFromPreview = () => {
    if (!previewOptions) return;
    const transactions = getTransactions();
    generateSupplierStatement(supplier, stats, transactions, previewOptions);
    
    const message = encodeURIComponent(
      `Hello ${supplier.name}, your account statement has been generated. Outstanding balance: ${stats.outstanding.toLocaleString()}`
    );
    const whatsappUrl = `https://wa.me/${supplier.phone?.replace(/[^0-9]/g, "")}?text=${message}`;
    
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

  if (!supplier) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/purchasing/suppliers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground">Supplier Code: {supplier.code}</p>
        </div>
        <Button onClick={() => setShowStatementDialog(true)} variant="outline">
          <FileEdit className="h-4 w-4 mr-2" />
          Generate Statement
        </Button>
        <Badge variant={supplier.active ? "default" : "secondary"}>
          {supplier.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Supplier Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBilled.toLocaleString()}</div>
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
              {supplier.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.email}</span>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.address}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Credit Limit:</span>
                <div className="font-medium">{supplier.credit_limit?.toLocaleString() || "N/A"}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Payment Terms:</span>
                <div className="font-medium">{supplier.payment_terms || 0} days</div>
              </div>
              {supplier.tax_number && (
                <div>
                  <span className="text-sm text-muted-foreground">Tax Number:</span>
                  <div className="font-medium">{supplier.tax_number}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Tabs */}
      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">
            Bills ({bills.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Complete History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No bills found</TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono">{bill.bill_no}</TableCell>
                        <TableCell>{format(new Date(bill.bill_date), "PPP")}</TableCell>
                        <TableCell>
                          {bill.due_date ? format(new Date(bill.due_date), "PPP") : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {bill.grand_total?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(bill.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">No payments found</TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => {
                      const cheques = parseChequeDetails(payment.reference);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.payment_no}</TableCell>
                          <TableCell>{format(new Date(payment.payment_date), "PPP")}</TableCell>
                          <TableCell>
                            {cheques ? (
                              <div className="space-y-1">
                                {cheques.map((cheque: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    <div className="font-medium">Cheque #{cheque.cheque_no}</div>
                                    <div className="text-muted-foreground">
                                      {cheque.cheque_bank && `${cheque.cheque_bank}`}
                                      {cheque.cheque_branch && ` - ${cheque.cheque_branch}`}
                                    </div>
                                    {cheque.cheque_holder && (
                                      <div className="text-muted-foreground">
                                        Holder: {cheque.cheque_holder}
                                      </div>
                                    )}
                                    <div className="text-muted-foreground">
                                      Date: {format(new Date(cheque.cheque_date), "PPP")}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {payment.reference || payment.notes || "Cash Payment"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {cheques ? (
                              <div className="space-y-1">
                                {cheques.map((cheque: any, idx: number) => (
                                  <div key={idx}>
                                    {getChequeStatusBadge(cheque.status)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {payment.amount?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {!cheques && (payment.notes || "-")}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
                    const transactions = getTransactions();
                    let runningBalance = 0;
                    
                    return transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No transactions found</TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((trans, idx) => {
                        runningBalance += trans.debit - trans.credit;
                        return (
                          <TableRow key={idx}>
                            <TableCell>{format(new Date(trans.date), "PPP")}</TableCell>
                            <TableCell>{trans.type}</TableCell>
                            <TableCell className="font-mono">{trans.reference}</TableCell>
                            <TableCell className="text-right">
                              {trans.debit > 0 ? trans.debit.toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {trans.credit > 0 ? trans.credit.toLocaleString() : "-"}
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

      <SupplierStatementOptionsDialog
        open={showStatementDialog}
        onOpenChange={setShowStatementDialog}
        supplierEmail={supplier.email}
        supplierPhone={supplier.phone}
        onExport={handleExportPDF}
        onEmail={handleEmailStatement}
        onWhatsApp={handleWhatsAppStatement}
        onView={handleViewStatement}
      />

      <StatementPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        customer={supplier}
        stats={{
          totalInvoiced: stats.totalBilled,
          totalPaid: stats.totalPaid,
          outstanding: stats.outstanding,
        }}
        transactions={getTransactions()}
        options={previewOptions ? {
          ...previewOptions,
          includeInvoices: previewOptions.includeBills,
          includeReceipts: previewOptions.includePayments,
        } : {
          includeInvoices: true,
          includeReceipts: true,
          showRunningBalance: true,
          includeAccountSummary: true,
        }}
        onExport={handleExportFromPreview}
        onEmail={handleEmailFromPreview}
        onWhatsApp={handleWhatsAppFromPreview}
      />
    </div>
  );
}
