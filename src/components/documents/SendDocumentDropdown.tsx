import { useState } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SendDocumentDropdownProps {
  documentType: "invoice" | "order" | "bill" | "receipt" | "return_note";
  document: any;
  customer?: any;
  supplier?: any;
  lines?: any[];
  companyData?: any;
}

export function SendDocumentDropdown({
  documentType,
  document,
  customer,
  supplier,
  lines = [],
  companyData,
}: SendDocumentDropdownProps) {
  const [sending, setSending] = useState(false);

  const getDocumentNo = () => {
    switch (documentType) {
      case "invoice":
        return document.invoice_no;
      case "order":
        return document.order_no;
      case "bill":
        return document.bill_no;
      case "receipt":
        return document.receipt_no;
      case "return_note":
        return document.return_note_no;
      default:
        return "";
    }
  };

  const getDocumentDate = () => {
    switch (documentType) {
      case "invoice":
        return document.invoice_date;
      case "order":
        return document.order_date;
      case "bill":
        return document.bill_date;
      case "receipt":
        return document.receipt_date;
      case "return_note":
        return document.return_date;
      default:
        return new Date().toISOString();
    }
  };

  const getContactEmail = () => {
    if (customer?.email) return customer.email;
    if (supplier?.email) return supplier.email;
    if (document.customer?.email) return document.customer.email;
    if (document.supplier?.email) return document.supplier.email;
    return null;
  };

  const getContactPhone = () => {
    if (customer?.whatsapp || customer?.phone) return customer.whatsapp || customer.phone;
    if (supplier?.whatsapp || supplier?.phone) return supplier.whatsapp || supplier.phone;
    if (document.customer?.whatsapp || document.customer?.phone) 
      return document.customer.whatsapp || document.customer.phone;
    if (document.supplier?.whatsapp || document.supplier?.phone) 
      return document.supplier.whatsapp || document.supplier.phone;
    return null;
  };

  const getContactName = () => {
    if (customer?.name) return customer.name;
    if (supplier?.name) return supplier.name;
    if (document.customer?.name) return document.customer.name;
    if (document.supplier?.name) return document.supplier.name;
    return "Customer";
  };

  const generatePDF = async (): Promise<string> => {
    const doc = new jsPDF();
    const docNo = getDocumentNo();
    const docDate = getDocumentDate();
    const contactName = getContactName();
    const company = companyData || {};

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(company.name || "Master Footwear", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (company.address) doc.text(company.address, 14, 28);
    if (company.phone) doc.text(`Tel: ${company.phone}`, 14, 34);

    // Document Title
    const title = documentType.charAt(0).toUpperCase() + documentType.slice(1).replace("_", " ");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 140, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`No: ${docNo}`, 140, 28);
    doc.text(`Date: ${new Date(docDate).toLocaleDateString()}`, 140, 34);

    // Contact Info
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(documentType === "bill" ? "Supplier:" : "Customer:", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.text(contactName, 14, 55);

    // Line Items Table
    if (lines && lines.length > 0) {
      const tableData = lines.map((line: any) => [
        line.description || "-",
        line.quantity || (
          (line.size_39 || 0) + (line.size_40 || 0) + (line.size_41 || 0) +
          (line.size_42 || 0) + (line.size_43 || 0) + (line.size_44 || 0) + (line.size_45 || 0)
        ),
        (line.unit_price || 0).toLocaleString(),
        (line.line_total || 0).toLocaleString(),
      ]);

      autoTable(doc, {
        startY: 65,
        head: [["Description", "Qty", "Unit Price", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
      });
    }

    // Total
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: Rs. ${(document.grand_total || document.amount || 0).toLocaleString()}`, 140, finalY + 15);

    // Convert to base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    return pdfBase64;
  };

  const handleSendEmail = async () => {
    const email = getContactEmail();
    if (!email) {
      toast.error("No email address found for this contact");
      return;
    }

    setSending(true);
    try {
      const pdfBase64 = await generatePDF();
      const docNo = getDocumentNo();
      const contactName = getContactName();

      const { data, error } = await supabase.functions.invoke("send-document-details", {
        body: {
          to: email,
          contactName,
          documentType: documentType.replace("_", " ").toUpperCase(),
          documentNo: docNo,
          amount: document.grand_total || document.amount || 0,
          date: getDocumentDate(),
          companyName: companyData?.name || "Master Footwear",
          pdfBase64,
        },
      });

      if (error) throw error;

      toast.success(`${documentType.replace("_", " ")} sent to ${email}`);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    const phone = getContactPhone();
    if (!phone) {
      toast.error("No phone number found for this contact");
      return;
    }

    try {
      const docNo = getDocumentNo();
      const contactName = getContactName();
      const amount = document.grand_total || document.amount || 0;
      const docDate = new Date(getDocumentDate()).toLocaleDateString();
      const company = companyData?.name || "Master Footwear";

      const message = `*${company}*\n\n` +
        `Dear ${contactName},\n\n` +
        `Please find your ${documentType.replace("_", " ")} details:\n\n` +
        `📄 ${documentType.replace("_", " ").toUpperCase()}: ${docNo}\n` +
        `📅 Date: ${docDate}\n` +
        `💰 Amount: Rs. ${amount.toLocaleString()}\n\n` +
        `Thank you for your business!`;

      await navigator.clipboard.writeText(message);
      toast.success("Message copied to clipboard. Open WhatsApp and paste to send.");

      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("0") 
        ? "94" + cleanPhone.substring(1) 
        : cleanPhone;

      // Try to open WhatsApp
      setTimeout(() => {
        window.open(`https://wa.me/${formattedPhone}`, "_blank");
      }, 500);
    } catch (error: any) {
      console.error("Error preparing WhatsApp message:", error);
      toast.error("Failed to prepare WhatsApp message");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" title="Send" disabled={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSendEmail} disabled={sending}>
          <Mail className="mr-2 h-4 w-4" />
          Send via Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSendWhatsApp} disabled={sending}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Send via WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
