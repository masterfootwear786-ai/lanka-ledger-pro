import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";

interface BillPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: any;
}

export function BillPreviewDialog({ open, onOpenChange, bill }: BillPreviewDialogProps) {
  const [company, setCompany] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);

  useEffect(() => {
    if (open && bill) {
      fetchCompanyAndLines();
    }
  }, [open, bill]);

  const fetchCompanyAndLines = async () => {
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

      const { data: lineData } = await supabase
        .from("bill_lines")
        .select("*")
        .eq("bill_id", bill.id)
        .order("line_no");
      setLines(lineData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
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
          <title>Bill ${bill?.bill_no}</title>
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
            .amount-value { font-size: 32px; font-weight: bold; color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f5f5f5; padding: 10px; text-align: left; border: 1px solid #ddd; font-size: 12px; }
            td { padding: 8px 10px; border: 1px solid #ddd; font-size: 12px; }
            .totals { margin-top: 20px; width: 300px; float: right; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .total-row.grand { font-weight: bold; font-size: 16px; border-top: 2px solid #333; margin-top: 10px; }
            .notes { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px; clear: both; }
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
            <div class="title">BILL</div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Bill No</div>
              <div class="info-value">${bill?.bill_no}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Bill Date</div>
              <div class="info-value">${new Date(bill?.bill_date).toLocaleDateString()}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Supplier</div>
              <div class="info-value">${bill?.supplier?.name || ''}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Status</div>
              <div class="info-value">${bill?.status || 'draft'}</div>
            </div>
          </div>

          ${bill?.due_date ? `
            <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
              <span style="color: #666;">Due Date:</span> 
              <strong>${new Date(bill.due_date).toLocaleDateString()}</strong>
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Tax %</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map((line: any) => `
                <tr>
                  <td>${line.description}</td>
                  <td style="text-align: center;">${line.quantity}</td>
                  <td style="text-align: right;">Rs. ${line.unit_price?.toLocaleString()}</td>
                  <td style="text-align: right;">${line.tax_rate || 0}%</td>
                  <td style="text-align: right;">Rs. ${line.line_total?.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>Rs. ${bill?.subtotal?.toLocaleString() || '0'}</span>
            </div>
            ${bill?.tax_total ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>Rs. ${bill.tax_total.toLocaleString()}</span>
              </div>
            ` : ''}
            ${bill?.discount ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>Rs. ${bill.discount.toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="total-row grand">
              <span>Grand Total:</span>
              <span>Rs. ${bill?.grand_total?.toLocaleString() || '0'}</span>
            </div>
          </div>

          ${bill?.notes ? `
            <div class="notes">
              <div class="notes-title">Notes</div>
              <div>${bill.notes}</div>
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

    // Company header
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
    doc.text("BILL", pageWidth / 2, y, { align: "center" });
    y += 8;

    // Header line
    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Info boxes
    const boxWidth = (contentWidth - 10) / 2;
    const boxHeight = 20;

    // Box 1 - Bill No
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Bill No", margin + 5, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(bill?.bill_no || '', margin + 5, y + 15);

    // Box 2 - Date
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Bill Date", margin + boxWidth + 15, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(bill?.bill_date).toLocaleDateString(), margin + boxWidth + 15, y + 15);

    y += boxHeight + 5;

    // Box 3 - Supplier
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Supplier", margin + 5, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(bill?.supplier?.name || '', margin + 5, y + 15);

    // Box 4 - Status
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Status", margin + boxWidth + 15, y + 7);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(bill?.status || 'draft', margin + boxWidth + 15, y + 15);

    y += boxHeight + 10;

    // Amount box
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 28, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Total Amount", pageWidth / 2, y + 10, { align: "center" });
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(`Rs. ${bill?.grand_total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`, pageWidth / 2, y + 22, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 38;

    // Line items table
    if (lines.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Line Items", margin, y);
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
      doc.text("Description", margin + 5, y + 7);
      doc.text("Qty", margin + 90, y + 7);
      doc.text("Price", margin + 110, y + 7);
      doc.text("Total", pageWidth - margin - 5, y + 7, { align: "right" });
      y += 10;

      // Table rows
      lines.forEach((line: any) => {
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, y, contentWidth, 10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const desc = line.description?.substring(0, 35) || '';
        doc.text(desc, margin + 5, y + 7);
        doc.text(String(line.quantity), margin + 90, y + 7);
        doc.text(`Rs. ${line.unit_price?.toLocaleString()}`, margin + 110, y + 7);
        doc.text(`Rs. ${line.line_total?.toLocaleString()}`, pageWidth - margin - 5, y + 7, { align: "right" });
        y += 10;
      });
      y += 10;
    }

    // Totals section
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", pageWidth - 80, y);
    doc.text(`Rs. ${bill?.subtotal?.toLocaleString() || '0'}`, pageWidth - margin, y, { align: "right" });
    y += 8;

    if (bill?.tax_total) {
      doc.text("Tax:", pageWidth - 80, y);
      doc.text(`Rs. ${bill.tax_total.toLocaleString()}`, pageWidth - margin, y, { align: "right" });
      y += 8;
    }

    if (bill?.discount) {
      doc.text("Discount:", pageWidth - 80, y);
      doc.text(`Rs. ${bill.discount.toLocaleString()}`, pageWidth - margin, y, { align: "right" });
      y += 8;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Grand Total:", pageWidth - 80, y);
    doc.text(`Rs. ${bill?.grand_total?.toLocaleString() || '0'}`, pageWidth - margin, y, { align: "right" });

    // Notes
    if (bill?.notes) {
      y += 15;
      doc.setFillColor(249, 249, 249);
      const notesLines = doc.splitTextToSize(bill.notes, contentWidth - 10);
      const notesHeight = 15 + notesLines.length * 5;
      doc.rect(margin, y, contentWidth, notesHeight, "F");

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Notes", margin + 5, y + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(notesLines, margin + 5, y + 15);
    }

    doc.save(`Bill-${bill?.bill_no}.pdf`);
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Bill Preview - {bill.bill_no}</span>
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

          {/* Bill Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Bill No</p>
                <p className="font-bold text-lg">{bill.bill_no}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Bill Date</p>
                <p className="font-bold text-lg">{new Date(bill.bill_date).toLocaleDateString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-bold text-lg">{bill.supplier?.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={bill.status === "paid" ? "default" : "secondary"} className="text-lg">
                  {bill.status || 'draft'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {bill.due_date && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-bold">{new Date(bill.due_date).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          )}

          {/* Amount */}
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold text-red-600">
                Rs. {bill.grand_total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {/* Line Items */}
          {lines.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Line Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax %</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-center">{line.quantity}</TableCell>
                      <TableCell className="text-right">Rs. {line.unit_price?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{line.tax_rate || 0}%</TableCell>
                      <TableCell className="text-right font-medium">Rs. {line.line_total?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>Rs. {bill.subtotal?.toLocaleString()}</span>
              </div>
              {bill.tax_total > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>Rs. {bill.tax_total?.toLocaleString()}</span>
                </div>
              )}
              {bill.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount:</span>
                  <span>Rs. {bill.discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Grand Total:</span>
                <span>Rs. {bill.grand_total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-2">Notes</h4>
                <p className="text-sm">{bill.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
