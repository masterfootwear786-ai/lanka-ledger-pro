import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, Printer, CreditCard } from "lucide-react";
import jsPDF from "jspdf";

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: any;
}

export function ReceiptPreviewDialog({ open, onOpenChange, receipt }: ReceiptPreviewDialogProps) {
  const [company, setCompany] = useState<any>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [cheques, setCheques] = useState<any[]>([]);

  useEffect(() => {
    if (open && receipt) {
      fetchCompanyAndAllocations();
      parseCheques();
    }
  }, [open, receipt]);

  const fetchCompanyAndAllocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profile?.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profile.company_id)
          .single();
        setCompany(companyData);
      }

      const { data: allocationData } = await supabase
        .from("receipt_allocations")
        .select("*, invoices(invoice_no, invoice_date)")
        .eq("receipt_id", receipt.id);
      setAllocations(allocationData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const parseCheques = () => {
    if (!receipt?.reference) {
      setCheques([]);
      return;
    }
    try {
      const parsed = JSON.parse(receipt.reference);
      if (Array.isArray(parsed)) {
        setCheques(parsed);
      } else {
        setCheques([]);
      }
    } catch {
      setCheques([]);
    }
  };

  const getPaymentMethod = () => {
    if (cheques.length > 0) return "Cheque";
    if (receipt?.reference?.includes("CREDIT")) return "Credit";
    return "Cash";
  };

  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open("", "_blank");
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

  const generatePrintContent = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receipt?.receipt_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .company-details { font-size: 12px; color: #666; }
            .title { font-size: 28px; font-weight: bold; margin: 20px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-box { padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
            .info-label { font-size: 12px; color: #666; margin-bottom: 4px; }
            .info-value { font-size: 16px; font-weight: 600; }
            .amount-box { background: #f5f5f5; text-align: center; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .amount-label { font-size: 14px; color: #666; }
            .amount-value { font-size: 32px; font-weight: bold; color: #22c55e; }
            .cheques-section { margin: 20px 0; }
            .cheques-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .cheque-item { padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px; }
            .cheque-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .cheque-label { font-size: 11px; color: #666; }
            .cheque-value { font-size: 13px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f5f5f5; padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
            td { padding: 8px 10px; border: 1px solid #ddd; font-size: 12px; }
            .notes { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px; }
            .notes-title { font-weight: bold; margin-bottom: 5px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
            <div class="company-name">${company?.name || ''}</div>
            <div class="company-details">
              ${company?.address || ''}<br>
              ${company?.phone ? `Tel: ${company.phone}` : ''} ${company?.email ? `| ${company.email}` : ''}
            </div>
            <div class="title">RECEIPT</div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Receipt No</div>
              <div class="info-value">${receipt?.receipt_no}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Date</div>
              <div class="info-value">${new Date(receipt?.receipt_date).toLocaleDateString()}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Customer</div>
              <div class="info-value">${receipt?.customer?.name || ''}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Payment Method</div>
              <div class="info-value">${getPaymentMethod()}</div>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-label">Amount Received</div>
            <div class="amount-value">Rs. ${receipt?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          ${cheques.length > 0 ? `
            <div class="cheques-section">
              <div class="cheques-title">Cheque Details</div>
              ${cheques.map((cheque: any) => `
                <div class="cheque-item">
                  <div class="cheque-grid">
                    <div><div class="cheque-label">Cheque No</div><div class="cheque-value">${cheque.cheque_no}</div></div>
                    <div><div class="cheque-label">Date</div><div class="cheque-value">${new Date(cheque.cheque_date).toLocaleDateString()}</div></div>
                    <div><div class="cheque-label">Amount</div><div class="cheque-value">Rs. ${Number(cheque.amount).toLocaleString()}</div></div>
                    <div><div class="cheque-label">Bank</div><div class="cheque-value">${cheque.cheque_bank || '-'}</div></div>
                    <div><div class="cheque-label">Branch</div><div class="cheque-value">${cheque.cheque_branch || '-'}</div></div>
                    <div><div class="cheque-label">Holder</div><div class="cheque-value">${cheque.cheque_holder || '-'}</div></div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${allocations.length > 0 ? `
            <div class="cheques-section">
              <div class="cheques-title">Invoice Allocations</div>
              <table>
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${allocations.map((alloc: any) => `
                    <tr>
                      <td>${alloc.invoices?.invoice_no || ''}</td>
                      <td>${alloc.invoices?.invoice_date ? new Date(alloc.invoices.invoice_date).toLocaleDateString() : ''}</td>
                      <td style="text-align: right;">Rs. ${alloc.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${receipt?.notes ? `
            <div class="notes">
              <div class="notes-title">Notes</div>
              <div>${receipt.notes}</div>
            </div>
          ` : ''}
        </body>
      </html>
    `;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Company header with border bottom
    if (company?.name) {
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(company.name, pageWidth / 2, y, { align: "center" });
      y += 8;
    }
    if (company?.address) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(company.address, pageWidth / 2, y, { align: "center" });
      y += 5;
    }
    if (company?.phone || company?.email) {
      doc.text(`${company?.phone ? 'Tel: ' + company.phone : ''} ${company?.email ? '| ' + company.email : ''}`, pageWidth / 2, y, { align: "center" });
      y += 8;
    }

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("RECEIPT", pageWidth / 2, y, { align: "center" });
    y += 8;

    // Header border line
    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Info boxes - 2x2 grid
    const boxWidth = (contentWidth - 10) / 2;
    const boxHeight = 20;

    // Box 1 - Receipt No
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Receipt No", margin + 5, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(receipt?.receipt_no || '', margin + 5, y + 15);

    // Box 2 - Date
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Date", margin + boxWidth + 15, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(receipt?.receipt_date).toLocaleDateString(), margin + boxWidth + 15, y + 15);

    y += boxHeight + 5;

    // Box 3 - Customer
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Customer", margin + 5, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(receipt?.customer?.name || '', margin + 5, y + 15);

    // Box 4 - Payment Method
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Payment Method", margin + boxWidth + 15, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(getPaymentMethod(), margin + boxWidth + 15, y + 15);

    y += boxHeight + 10;

    // Amount box with background
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 28, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Amount Received", pageWidth / 2, y + 10, { align: "center" });
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text(`Rs. ${receipt?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth / 2, y + 22, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 38;

    // Cheque details section
    if (cheques.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Cheque Details", margin, y);
      y += 3;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      cheques.forEach((cheque: any) => {
        // Cheque card with border
        const chequeBoxHeight = 30;
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, contentWidth, chequeBoxHeight);

        // 3 columns per row
        const colWidth = contentWidth / 3;
        
        // Row 1
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Cheque No", margin + 5, y + 6);
        doc.text("Date", margin + colWidth + 5, y + 6);
        doc.text("Amount", margin + colWidth * 2 + 5, y + 6);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(cheque.cheque_no || '', margin + 5, y + 12);
        doc.text(new Date(cheque.cheque_date).toLocaleDateString(), margin + colWidth + 5, y + 12);
        doc.text(`Rs. ${Number(cheque.amount).toLocaleString()}`, margin + colWidth * 2 + 5, y + 12);

        // Row 2
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Bank", margin + 5, y + 20);
        doc.text("Branch", margin + colWidth + 5, y + 20);
        doc.text("Holder", margin + colWidth * 2 + 5, y + 20);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(cheque.cheque_bank || '-', margin + 5, y + 26);
        doc.text(cheque.cheque_branch || '-', margin + colWidth + 5, y + 26);
        doc.text(cheque.cheque_holder || '-', margin + colWidth * 2 + 5, y + 26);

        y += chequeBoxHeight + 5;
      });
      y += 5;
    }

    // Invoice allocations table
    if (allocations.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice Allocations", margin, y);
      y += 3;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentWidth, 10, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentWidth, 10);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice No", margin + 5, y + 7);
      doc.text("Date", margin + 70, y + 7);
      doc.text("Amount", pageWidth - margin - 5, y + 7, { align: "right" });
      y += 10;

      // Table rows
      allocations.forEach((alloc: any) => {
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, y, contentWidth, 10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(alloc.invoices?.invoice_no || '', margin + 5, y + 7);
        doc.text(alloc.invoices?.invoice_date ? new Date(alloc.invoices.invoice_date).toLocaleDateString() : '', margin + 70, y + 7);
        doc.text(`Rs. ${alloc.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 7, { align: "right" });
        y += 10;
      });
      y += 10;
    }

    // Notes section
    if (receipt?.notes) {
      doc.setFillColor(249, 249, 249);
      const notesLines = doc.splitTextToSize(receipt.notes, contentWidth - 10);
      const notesHeight = 15 + notesLines.length * 5;
      doc.rect(margin, y, contentWidth, notesHeight, "F");
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Notes", margin + 5, y + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(notesLines, margin + 5, y + 15);
    }

    doc.save(`Receipt-${receipt?.receipt_no}.pdf`);
  };

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receipt Preview - {receipt.receipt_no}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Header */}
          {company && (
            <div className="text-center border-b pb-4">
              {company.logo_url && (
                <img src={company.logo_url} alt="Logo" className="h-12 mx-auto mb-2" />
              )}
              <h2 className="text-xl font-bold">{company.name}</h2>
              {company.address && <p className="text-sm text-muted-foreground">{company.address}</p>}
              {(company.phone || company.email) && (
                <p className="text-sm text-muted-foreground">
                  {company.phone} {company.email && `| ${company.email}`}
                </p>
              )}
            </div>
          )}

          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Receipt No</p>
                <p className="font-bold text-lg">{receipt.receipt_no}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-bold text-lg">{new Date(receipt.receipt_date).toLocaleDateString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-bold text-lg">{receipt.customer?.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <Badge variant="outline" className="text-lg font-bold">{getPaymentMethod()}</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Amount */}
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Amount Received</p>
              <p className="text-3xl font-bold text-green-600">
                Rs. {receipt.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {/* Cheque Details */}
          {cheques.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cheque Details
              </h3>
              <div className="space-y-3">
                {cheques.map((cheque: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Cheque No</p>
                          <p className="font-semibold">{cheque.cheque_no}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p className="font-semibold">{new Date(cheque.cheque_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-semibold text-orange-600">Rs. {Number(cheque.amount).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bank</p>
                          <p className="font-medium">{cheque.cheque_bank || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Branch</p>
                          <p className="font-medium">{cheque.cheque_branch || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Holder</p>
                          <p className="font-medium">{cheque.cheque_holder || '-'}</p>
                        </div>
                      </div>
                      {cheque.status && (
                        <div className="mt-2">
                          <Badge variant={cheque.status === 'passed' ? 'default' : cheque.status === 'returned' ? 'destructive' : 'secondary'}>
                            {cheque.status}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Allocations */}
          {allocations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Invoice Allocations</h3>
              <Card>
                <CardContent className="pt-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-sm">Invoice No</th>
                        <th className="text-left py-2 text-sm">Date</th>
                        <th className="text-right py-2 text-sm">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((alloc: any) => (
                        <tr key={alloc.id} className="border-b last:border-0">
                          <td className="py-2">{alloc.invoices?.invoice_no}</td>
                          <td className="py-2">{alloc.invoices?.invoice_date ? new Date(alloc.invoices.invoice_date).toLocaleDateString() : '-'}</td>
                          <td className="py-2 text-right">Rs. {alloc.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notes */}
          {receipt.notes && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p>{receipt.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
