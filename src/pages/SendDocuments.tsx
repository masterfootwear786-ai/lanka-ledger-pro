import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (profile) {
      const [customersRes, suppliersRes, invoicesRes, billsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("*")
          .eq("company_id", profile.company_id)
          .in("contact_type", ["customer", "both"]),
        supabase
          .from("contacts")
          .select("*")
          .eq("company_id", profile.company_id)
          .in("contact_type", ["supplier", "both"]),
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
      ]);

      setCustomers(customersRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setInvoices(invoicesRes.data || []);
      setBills(billsRes.data || []);
    }
  };

  const contacts = selectedType === "customer" ? customers : suppliers;
  const documents = selectedType === "customer" ? invoices : bills;
  const selectedContactData = contacts.find((c) => c.id === selectedContact);
  const selectedDocumentData = documents.find((d) => d.id === selectedDocument);

  const handleSendEmail = async () => {
    if (!selectedContactData || !selectedDocumentData) {
      toast({ variant: "destructive", description: "Please select contact and document" });
      return;
    }

    if (!selectedContactData.email) {
      toast({ variant: "destructive", description: "Contact has no email address" });
      return;
    }

    setLoading(true);
    try {
      const documentType = selectedType === "customer" ? "Invoice" : "Bill";
      const documentNo = selectedType === "customer" 
        ? selectedDocumentData.invoice_no 
        : selectedDocumentData.bill_no;

      const { data, error } = await supabase.functions.invoke("send-document-details", {
        body: {
          to: selectedContactData.email,
          contactName: selectedContactData.name,
          documentType,
          documentNo,
          amount: selectedDocumentData.grand_total,
          message,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Failed to send email");
      }

      // Check if the response indicates an error from Resend
      if (data?.error) {
        console.error("Resend API error:", data.error);
        throw new Error(data.error.message || "Failed to send email");
      }

      toast({ description: `Email sent successfully to ${selectedContactData.email}` });
      setMessage("");
    } catch (error: any) {
      console.error("Send email error:", error);
      toast({ 
        variant: "destructive", 
        title: "Failed to send email",
        description: error.message || "Please check your Resend API key and try again" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedContactData || !selectedDocumentData) {
      toast({ variant: "destructive", description: "Please select contact and document" });
      return;
    }

    let phone = selectedContactData.whatsapp || selectedContactData.phone;
    if (!phone) {
      toast({ variant: "destructive", description: "Contact has no WhatsApp/phone number" });
      return;
    }

    // Clean phone number - remove all non-numeric characters
    phone = phone.replace(/[^0-9]/g, "");
    
    // If phone starts with 0, assume Sri Lanka and add country code 94
    if (phone.startsWith("0")) {
      phone = "94" + phone.substring(1);
    }
    
    // If phone doesn't start with country code, add 94 (Sri Lanka default)
    if (phone.length === 9) {
      phone = "94" + phone;
    }

    const documentType = selectedType === "customer" ? "Invoice" : "Bill";
    const documentNo = selectedType === "customer" 
      ? selectedDocumentData.invoice_no 
      : selectedDocumentData.bill_no;

    const whatsappMessage = encodeURIComponent(
      `Hello ${selectedContactData.name},\n\n${documentType} ${documentNo}\nAmount: ${selectedDocumentData.grand_total.toLocaleString()}\n\n${message}`
    );
    
    const whatsappUrl = `https://wa.me/${phone}?text=${whatsappMessage}`;
    window.open(whatsappUrl, "_blank");
    toast({ description: "Opening WhatsApp..." });
  };

  const handleSendSMS = () => {
    if (!selectedContactData || !selectedDocumentData) {
      toast({ variant: "destructive", description: "Please select contact and document" });
      return;
    }

    const phone = selectedContactData.phone;
    if (!phone) {
      toast({ variant: "destructive", description: "Contact has no phone number" });
      return;
    }

    const documentType = selectedType === "customer" ? "Invoice" : "Bill";
    const documentNo = selectedType === "customer" 
      ? selectedDocumentData.invoice_no 
      : selectedDocumentData.bill_no;

    const smsMessage = encodeURIComponent(
      `${documentType} ${documentNo} - Amount: ${selectedDocumentData.grand_total.toLocaleString()}. ${message}`
    );
    
    const smsUrl = `sms:${phone}?body=${smsMessage}`;
    window.location.href = smsUrl;
    toast({ description: "Opening SMS app..." });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Send Documents</h1>
        <p className="text-muted-foreground">Send invoice and bill details via Email, WhatsApp, or SMS</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Document</CardTitle>
            <CardDescription>Choose the document type and details to send</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedType} onValueChange={(value: any) => {
                setSelectedType(value);
                setSelectedContact("");
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
              <Select value={selectedContact} onValueChange={setSelectedContact}>
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
                          {docNo} - {doc.grand_total?.toLocaleString()}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional Message</Label>
              <Textarea
                placeholder="Enter additional message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Selected contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedContactData ? (
              <>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedContactData.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedContactData.email || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedContactData.phone || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">WhatsApp</Label>
                  <p className="font-medium">{selectedContactData.whatsapp || selectedContactData.phone || "Not provided"}</p>
                  <p className="text-xs text-muted-foreground">Use international format: +94771234567</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">Select a contact to view details</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Document</CardTitle>
          <CardDescription>Choose how to send the document details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSendEmail}
              disabled={!selectedContact || !selectedDocument || loading}
              className="flex-1 min-w-[150px]"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send via Email
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              disabled={!selectedContact || !selectedDocument}
              variant="outline"
              className="flex-1 min-w-[150px]"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send via WhatsApp
            </Button>
            <Button
              onClick={handleSendSMS}
              disabled={!selectedContact || !selectedDocument}
              variant="outline"
              className="flex-1 min-w-[150px]"
            >
              <Phone className="mr-2 h-4 w-4" />
              Send via SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
