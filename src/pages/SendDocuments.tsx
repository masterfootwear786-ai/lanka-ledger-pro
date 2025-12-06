import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, FileText, Download, Send, User, Receipt, RotateCcw, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export default function SendDocuments() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<"customer" | "supplier">("customer");
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);

  // Customer statement data
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [customerReceipts, setCustomerReceipts] = useState<any[]>([]);
  const [customerReturnNotes, setCustomerReturnNotes] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    pendingCheques: 0,
    totalReturns: 0,
    outstanding: 0,
  });

  const [options, setOptions] = useState({
    includeInvoices: true,
    includeReceipts: true,
    includeReturnNotes: true,
    includeOutstanding: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedContact && selectedType === "customer") {
      fetchCustomerDetails();
    }
  }, [selectedContact, selectedType]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profile?.company_id) {
      const [customersRes, suppliersRes, invoicesRes, billsRes, companyRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("*")
          .eq("company_id", profile.company_id)
          .in("contact_type", ["customer", "both"])
          .order("name"),
        supabase
          .from("contacts")
          .select("*")
          .eq("company_id", profile.company_id)
          .in("contact_type", ["supplier", "both"])
          .order("name"),
        supabase
          .from("invoices")
          .select("*, contacts(*)")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("bills")
          .select("*, contacts(*)")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("companies")
          .select("*")
          .eq("id", profile.company_id)
          .single(),
      ]);

      setCustomers(customersRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setInvoices(invoicesRes.data || []);
      setBills(billsRes.data || []);
      setCompany(companyRes.data);
    }
  };

  const fetchCustomerDetails = async () => {
    if (!selectedContact) return;

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from("invoices")
      .select("*")
      .eq("customer_id", selectedContact)
      .order("invoice_date", { ascending: false });

    // Fetch receipts with allocations
    const { data: receiptsData } = await supabase
      .from("receipts")
      .select("*, receipt_allocations(*)")
      .eq("customer_id", selectedContact)
      .order("receipt_date", { ascending: false });

    // Fetch return notes
    const { data: returnNotesData } = await supabase
      .from("return_notes")
      .select("*")
      .eq("customer_id", selectedContact)
      .order("return_date", { ascending: false });

    setCustomerInvoices(invoicesData || []);
    setCustomerReceipts(receiptsData || []);
    setCustomerReturnNotes(returnNotesData || []);

    // Calculate stats
    const totalInvoiced = invoicesData?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) || 0;
    const totalReturns = returnNotesData?.reduce((sum, rn) => sum + (rn.grand_total || 0), 0) || 0;
    
    // Calculate payments - separate cash and cheques
    let totalPaid = 0;
    let pendingCheques = 0;

    receiptsData?.forEach(receipt => {
      const reference = receipt.reference || "";
      const notes = receipt.notes || "";
      const combined = `${reference} ${notes}`.toLowerCase();
      const isCheque = combined.includes("cheque");
      const isPending = combined.includes("pending");
      
      if (isCheque && isPending) {
        pendingCheques += receipt.amount || 0;
      } else {
        totalPaid += receipt.amount || 0;
      }
    });

    const outstanding = totalInvoiced - totalPaid - totalReturns;

    setCustomerStats({
      totalInvoiced,
      totalPaid,
      pendingCheques,
      totalReturns,
      outstanding: Math.max(0, outstanding),
    });
  };

  const contacts = selectedType === "customer" ? customers : suppliers;
  const documents = selectedType === "customer" ? invoices : bills;
  const selectedContactData = contacts.find((c) => c.id === selectedContact);
  const selectedDocumentData = documents.find((d) => d.id === selectedDocument);

  const generateCustomerStatementPDF = () => {
    if (!selectedContactData) return null;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(company?.name || "MASTER FOOTWEAR (PVT) LTD", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Customer Statement", pageWidth / 2, 28, { align: "center" });

    yPos = 45;

    // Customer Info Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPos, pageWidth - 28, 30, 2, 2, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Customer Details", 18, yPos + 8);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: ${selectedContactData.name}`, 18, yPos + 16);
    doc.text(`Code: ${selectedContactData.code}`, 18, yPos + 22);
    doc.text(`Phone: ${selectedContactData.phone || "-"}`, pageWidth / 2, yPos + 16);
    doc.text(`Area: ${selectedContactData.area || "-"}`, pageWidth / 2, yPos + 22);

    yPos += 40;
    doc.setFontSize(8);
    doc.text(`Statement Date: ${format(new Date(), "PPP")}`, 14, yPos);

    // Summary Cards
    yPos += 10;
    const cardWidth = (pageWidth - 38) / 4;
    
    const summaryCards = [
      { label: "Total Invoiced", value: customerStats.totalInvoiced, color: [59, 130, 246] },
      { label: "Total Paid", value: customerStats.totalPaid, color: [34, 197, 94] },
      { label: "Total Returns", value: customerStats.totalReturns, color: [168, 85, 247] },
      { label: "Outstanding", value: customerStats.outstanding, color: [239, 68, 68] },
    ];

    summaryCards.forEach((card, i) => {
      const x = 14 + (i * (cardWidth + 4));
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(x, yPos, cardWidth, 20, 2, 2, 'F');
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255);
      doc.text(card.label, x + 4, yPos + 7);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Rs. ${card.value.toLocaleString()}`, x + 4, yPos + 15);
    });

    yPos += 30;

    // Invoices Section
    if (options.includeInvoices && customerInvoices.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`Invoices (${customerInvoices.length})`, 14, yPos);
      
      yPos += 5;
      const invoiceData = customerInvoices.map(inv => [
        inv.invoice_no,
        format(new Date(inv.invoice_date), "dd/MM/yyyy"),
        inv.terms || "Credit",
        `Rs. ${(inv.grand_total || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Invoice No", "Date", "Payment Type", "Amount"]],
        body: invoiceData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          3: { halign: "right", fontStyle: "bold" },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Receipts Section
    if (options.includeReceipts && customerReceipts.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`Payments (${customerReceipts.length})`, 14, yPos);
      
      yPos += 5;
      const receiptData = customerReceipts.map(rec => [
        rec.receipt_no,
        format(new Date(rec.receipt_date), "dd/MM/yyyy"),
        rec.reference || "Cash",
        `Rs. ${(rec.amount || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Receipt No", "Date", "Reference", "Amount"]],
        body: receiptData,
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          3: { halign: "right", fontStyle: "bold" },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Return Notes Section
    if (options.includeReturnNotes && customerReturnNotes.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`Return Notes (${customerReturnNotes.length})`, 14, yPos);
      
      yPos += 5;
      const returnData = customerReturnNotes.map(rn => [
        rn.return_note_no,
        format(new Date(rn.return_date), "dd/MM/yyyy"),
        rn.reason || "-",
        `Rs. ${(rn.grand_total || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Return Note No", "Date", "Reason", "Amount"]],
        body: returnData,
        theme: "striped",
        headStyles: { fillColor: [168, 85, 247], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          3: { halign: "right", fontStyle: "bold" },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Outstanding Summary
    if (options.includeOutstanding) {
      const finalY = yPos + 5;
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14, finalY, pageWidth - 28, 25, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28);
      doc.text("Outstanding Balance", 18, finalY + 10);
      doc.setFontSize(14);
      doc.text(`Rs. ${customerStats.outstanding.toLocaleString()}`, 18, finalY + 20);

      if (customerStats.pendingCheques > 0) {
        doc.setFontSize(9);
        doc.setTextColor(194, 65, 12);
        doc.text(`Pending Cheques: Rs. ${customerStats.pendingCheques.toLocaleString()}`, pageWidth - 18, finalY + 15, { align: "right" });
      }
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("This is a computer-generated statement.", pageWidth / 2, pageHeight - 15, { align: "center" });
    doc.text(company?.phone || "", pageWidth / 2, pageHeight - 10, { align: "center" });

    return doc;
  };

  const handleDownloadPDF = () => {
    const doc = generateCustomerStatementPDF();
    if (doc) {
      doc.save(`Statement_${selectedContactData?.code}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ description: "PDF downloaded successfully" });
    }
  };

  const handleSendEmail = async () => {
    if (!selectedContactData) {
      toast({ variant: "destructive", description: "Please select a customer" });
      return;
    }

    if (!selectedContactData.email) {
      toast({ variant: "destructive", description: "Customer has no email address" });
      return;
    }

    setLoading(true);
    try {
      const doc = generateCustomerStatementPDF();
      if (!doc) throw new Error("Failed to generate PDF");

      // Convert PDF to base64
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      const { data, error } = await supabase.functions.invoke("send-customer-statement", {
        body: {
          to: selectedContactData.email,
          customerName: selectedContactData.name,
          customerCode: selectedContactData.code,
          stats: customerStats,
          message,
          pdfBase64,
          companyName: company?.name || "Master Footwear",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error.message || "Failed to send email");

      toast({ description: `Statement sent to ${selectedContactData.email}` });
      setMessage("");
    } catch (error: any) {
      console.error("Send email error:", error);
      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedContactData) {
      toast({ variant: "destructive", description: "Please select a customer" });
      return;
    }

    let phone = selectedContactData.whatsapp || selectedContactData.phone;
    if (!phone) {
      toast({ variant: "destructive", description: "Customer has no WhatsApp number" });
      return;
    }

    phone = phone.replace(/[^0-9]/g, "");
    if (phone.startsWith("0")) {
      phone = "94" + phone.substring(1);
    }
    if (phone.length === 9) {
      phone = "94" + phone;
    }

    const whatsappMessage = `
*${company?.name || "MASTER FOOTWEAR"}*
Customer Statement for ${selectedContactData.name}

📊 *Summary*
• Total Invoiced: Rs. ${customerStats.totalInvoiced.toLocaleString()}
• Total Paid: Rs. ${customerStats.totalPaid.toLocaleString()}
• Total Returns: Rs. ${customerStats.totalReturns.toLocaleString()}
• *Outstanding: Rs. ${customerStats.outstanding.toLocaleString()}*
${customerStats.pendingCheques > 0 ? `• Pending Cheques: Rs. ${customerStats.pendingCheques.toLocaleString()}` : ""}

${message ? `\n📝 ${message}` : ""}

Thank you for your business!
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(whatsappMessage).then(() => {
      toast({
        title: "Message Copied!",
        description: "Open WhatsApp and paste the message to send",
      });
    });

    // Try to open WhatsApp
    const waLinkUrl = `https://wa.me/${phone}`;
    window.open(waLinkUrl, "_blank");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Send className="h-8 w-8" />
          Send Documents
        </h1>
        <p className="text-muted-foreground">Send customer statements and documents via Email or WhatsApp</p>
      </div>

      <Tabs defaultValue="statement" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="statement" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Customer Statement
          </TabsTrigger>
          <TabsTrigger value="document" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Single Document
          </TabsTrigger>
        </TabsList>

        {/* Customer Statement Tab */}
        <TabsContent value="statement" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Customer
                </CardTitle>
                <CardDescription>Choose a customer to generate statement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={selectedContact} onValueChange={setSelectedContact}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Include in Statement</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="invoices"
                        checked={options.includeInvoices}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, includeInvoices: checked as boolean })
                        }
                      />
                      <label htmlFor="invoices" className="text-sm">Invoices</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="receipts"
                        checked={options.includeReceipts}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, includeReceipts: checked as boolean })
                        }
                      />
                      <label htmlFor="receipts" className="text-sm">Payments/Receipts</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="returnNotes"
                        checked={options.includeReturnNotes}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, includeReturnNotes: checked as boolean })
                        }
                      />
                      <label htmlFor="returnNotes" className="text-sm">Return Notes</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="outstanding"
                        checked={options.includeOutstanding}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, includeOutstanding: checked as boolean })
                        }
                      />
                      <label htmlFor="outstanding" className="text-sm">Outstanding Summary</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Message</Label>
                  <Textarea
                    placeholder="Add a custom message (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statement Preview</CardTitle>
                <CardDescription>Summary of customer details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedContactData ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Customer</span>
                        <span className="font-medium">{selectedContactData.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Code</span>
                        <span className="font-medium">{selectedContactData.code}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="font-medium">{selectedContactData.email || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Phone</span>
                        <span className="font-medium">{selectedContactData.phone || "-"}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Invoiced</p>
                        <p className="font-bold text-blue-600">Rs. {customerStats.totalInvoiced.toLocaleString()}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="font-bold text-green-600">Rs. {customerStats.totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Returns</p>
                        <p className="font-bold text-purple-600">Rs. {customerStats.totalReturns.toLocaleString()}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="font-bold text-red-600">Rs. {customerStats.outstanding.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="outline">{customerInvoices.length} Invoices</Badge>
                      <Badge variant="outline">{customerReceipts.length} Receipts</Badge>
                      <Badge variant="outline">{customerReturnNotes.length} Returns</Badge>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a customer to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send Statement</CardTitle>
              <CardDescription>Download PDF or send via Email/WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleDownloadPDF}
                  disabled={!selectedContact}
                  variant="outline"
                  className="flex-1 min-w-[150px]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={!selectedContact || loading}
                  className="flex-1 min-w-[150px]"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? "Sending..." : "Send via Email"}
                </Button>
                <Button
                  onClick={handleSendWhatsApp}
                  disabled={!selectedContact}
                  variant="secondary"
                  className="flex-1 min-w-[150px]"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Single Document Tab */}
        <TabsContent value="document" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Document</CardTitle>
                <CardDescription>Choose invoice or bill to send</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={selectedType} onValueChange={(value: any) => {
                    setSelectedType(value);
                    setSelectedDocument("");
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer Invoice</SelectItem>
                      <SelectItem value="supplier">Supplier Bill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{selectedType === "customer" ? "Customer" : "Supplier"}</Label>
                  <Select value={selectedContact} onValueChange={(value) => {
                    setSelectedContact(value);
                    setSelectedDocument("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} - {contact.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{selectedType === "customer" ? "Invoice" : "Bill"}</Label>
                  <Select
                    value={selectedDocument}
                    onValueChange={setSelectedDocument}
                    disabled={!selectedContact}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents
                        .filter(doc => {
                          const contactId = selectedType === "customer" ? doc.customer_id : doc.supplier_id;
                          return contactId === selectedContact;
                        })
                        .map((doc) => {
                          const docNo = selectedType === "customer" ? doc.invoice_no : doc.bill_no;
                          return (
                            <SelectItem key={doc.id} value={doc.id}>
                              {docNo} - Rs. {doc.grand_total?.toLocaleString()}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Add a message (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDocumentData && selectedContactData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact</span>
                      <span className="font-medium">{selectedContactData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Document No</span>
                      <span className="font-medium">
                        {selectedType === "customer" ? selectedDocumentData.invoice_no : selectedDocumentData.bill_no}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-bold text-lg">Rs. {selectedDocumentData.grand_total?.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a document</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSendEmail}
                  disabled={!selectedDocument || loading}
                  className="flex-1 min-w-[150px]"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? "Sending..." : "Send via Email"}
                </Button>
                <Button
                  onClick={handleSendWhatsApp}
                  disabled={!selectedDocument}
                  variant="secondary"
                  className="flex-1 min-w-[150px]"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}