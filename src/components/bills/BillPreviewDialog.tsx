import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

const SIZES = ['39', '40', '41', '42', '43', '44', '45'];

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

  // Parse description to get Art No and Color
  const parseDescription = (description: string) => {
    const parts = description?.split(' - ') || [];
    return {
      artNo: parts[0] || description || '',
      color: parts[1] || ''
    };
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
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              width: 210mm;
              min-height: 297mm;
              font-size: 11px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              padding-bottom: 15px; 
              border-bottom: 2px solid #333; 
            }
            .company-logo { max-height: 50px; margin-bottom: 8px; }
            .company-name { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
            .company-details { font-size: 10px; color: #666; }
            .title { 
              font-size: 24px; 
              font-weight: bold; 
              text-align: center;
              margin: 15px 0; 
              letter-spacing: 2px;
            }
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              gap: 20px;
            }
            .info-box {
              flex: 1;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .info-label { font-size: 9px; color: #666; margin-bottom: 2px; text-transform: uppercase; }
            .info-value { font-size: 12px; font-weight: 600; }
            .table-container { margin: 15px 0; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 10px;
            }
            th { 
              background: #f5f5f5; 
              padding: 8px 4px; 
              text-align: center; 
              border: 1px solid #ddd; 
              font-size: 9px;
              font-weight: bold;
            }
            td { 
              padding: 6px 4px; 
              border: 1px solid #ddd; 
              text-align: center;
            }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 15px;
            }
            .totals-box {
              width: 250px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 6px 0; 
              border-bottom: 1px solid #eee;
              font-size: 11px;
            }
            .total-row.grand { 
              font-weight: bold; 
              font-size: 14px; 
              border-top: 2px solid #333; 
              margin-top: 8px; 
              padding-top: 8px;
            }
            .notes { 
              margin-top: 20px; 
              padding: 10px; 
              background: #f9f9f9; 
              border-radius: 4px;
              font-size: 10px;
            }
            .notes-title { font-weight: bold; margin-bottom: 5px; }
            @media print { 
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" class="company-logo">` : ''}
            <div class="company-name">${company?.name || ''}</div>
            <div class="company-details">
              ${company?.address || ''}<br>
              ${company?.phone ? `Tel: ${company.phone}` : ''} ${company?.email ? `| ${company.email}` : ''}
            </div>
          </div>

          <div class="title">BILL</div>

          <div class="info-section">
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
            ${bill?.due_date ? `
              <div class="info-box">
                <div class="info-label">Due Date</div>
                <div class="info-value">${new Date(bill.due_date).toLocaleDateString()}</div>
              </div>
            ` : ''}
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th class="text-left" style="width: 80px;">Art No</th>
                  <th class="text-left" style="width: 70px;">Color</th>
                  ${SIZES.map(s => `<th style="width: 35px;">${s}</th>`).join('')}
                  <th style="width: 45px;">Total</th>
                  <th style="width: 60px;">Price</th>
                  <th class="text-right" style="width: 70px;">Line Total</th>
                </tr>
              </thead>
              <tbody>
                ${lines.map((line: any) => {
                  const { artNo, color } = parseDescription(line.description);
                  return `
                    <tr>
                      <td class="text-left">${artNo}</td>
                      <td class="text-left">${color}</td>
                      ${SIZES.map(() => `<td>-</td>`).join('')}
                      <td>${line.quantity}</td>
                      <td>${line.unit_price?.toLocaleString()}</td>
                      <td class="text-right">${line.line_total?.toLocaleString()}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>Rs. ${bill?.subtotal?.toLocaleString() || '0'}</span>
              </div>
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
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 15;

    // Company header
    if (company?.name) {
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(company.name, pageWidth / 2, y, { align: "center" });
      y += 6;
    }
    if (company?.address) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(company.address, pageWidth / 2, y, { align: "center" });
      y += 4;
    }
    if (company?.phone || company?.email) {
      doc.text(`${company?.phone ? 'Tel: ' + company.phone : ''} ${company?.email ? '| ' + company.email : ''}`, pageWidth / 2, y, { align: "center" });
      y += 6;
    }

    // Header line
    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BILL", pageWidth / 2, y, { align: "center" });
    y += 10;

    // Info boxes
    const boxWidth = (contentWidth - 15) / 4;
    const boxHeight = 15;

    const infoBoxes = [
      { label: "Bill No", value: bill?.bill_no || '' },
      { label: "Bill Date", value: new Date(bill?.bill_date).toLocaleDateString() },
      { label: "Supplier", value: bill?.supplier?.name || '' },
      { label: "Due Date", value: bill?.due_date ? new Date(bill.due_date).toLocaleDateString() : '-' }
    ];

    infoBoxes.forEach((box, i) => {
      const x = margin + (i * (boxWidth + 5));
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.rect(x, y, boxWidth, boxHeight);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(box.label, x + 3, y + 5);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const value = box.value.substring(0, 15);
      doc.text(value, x + 3, y + 12);
    });

    y += boxHeight + 10;

    // Table
    if (lines.length > 0) {
      const colWidths = [25, 20, 12, 12, 12, 12, 12, 12, 12, 18, 22, 25];
      const headers = ['Art No', 'Color', '39', '40', '41', '42', '43', '44', '45', 'Total', 'Price', 'Line Total'];
      
      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentWidth, 8, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentWidth, 8);

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, y + 5);
        xPos += colWidths[i];
      });
      y += 8;

      // Table rows
      lines.forEach((line: any) => {
        const { artNo, color } = parseDescription(line.description);
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, y, contentWidth, 7);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        
        xPos = margin;
        const rowData = [
          artNo.substring(0, 12),
          color.substring(0, 10),
          '-', '-', '-', '-', '-', '-', '-',
          String(line.quantity),
          line.unit_price?.toLocaleString() || '0',
          line.line_total?.toLocaleString() || '0'
        ];
        
        rowData.forEach((data, i) => {
          doc.text(data, xPos + 2, y + 5);
          xPos += colWidths[i];
        });
        y += 7;
      });
      y += 8;
    }

    // Totals section
    const totalsX = pageWidth - 80;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", totalsX, y);
    doc.text(`Rs. ${bill?.subtotal?.toLocaleString() || '0'}`, pageWidth - margin, y, { align: "right" });
    y += 6;

    if (bill?.discount) {
      doc.text("Discount:", totalsX, y);
      doc.text(`Rs. ${bill.discount.toLocaleString()}`, pageWidth - margin, y, { align: "right" });
      y += 6;
    }

    doc.setDrawColor(51, 51, 51);
    doc.line(totalsX, y, pageWidth - margin, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Grand Total:", totalsX, y);
    doc.text(`Rs. ${bill?.grand_total?.toLocaleString() || '0'}`, pageWidth - margin, y, { align: "right" });

    // Notes
    if (bill?.notes) {
      y += 15;
      doc.setFillColor(249, 249, 249);
      const notesLines = doc.splitTextToSize(bill.notes, contentWidth - 10);
      const notesHeight = 12 + notesLines.length * 4;
      doc.rect(margin, y, contentWidth, notesHeight, "F");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Notes", margin + 4, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(notesLines, margin + 4, y + 11);
    }

    doc.save(`Bill-${bill?.bill_no}.pdf`);
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

        {/* A4 Preview Container */}
        <div className="bg-white border rounded-lg shadow-sm p-6 mx-auto" style={{ maxWidth: '210mm' }}>
          {/* Company Header */}
          {company && (
            <div className="text-center border-b pb-4 mb-4">
              {company.logo_url && (
                <img src={company.logo_url} alt="Logo" className="h-12 mx-auto mb-2" />
              )}
              <h2 className="text-xl font-bold">{company.name}</h2>
              {company.address && <p className="text-xs text-muted-foreground">{company.address}</p>}
              {(company.phone || company.email) && (
                <p className="text-xs text-muted-foreground">
                  {company.phone} {company.email && `| ${company.email}`}
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold text-center tracking-wider mb-4">BILL</h1>

          {/* Bill Info */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="border rounded p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Bill No</p>
              <p className="font-semibold text-sm">{bill.bill_no}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Bill Date</p>
              <p className="font-semibold text-sm">{new Date(bill.bill_date).toLocaleDateString()}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Supplier</p>
              <p className="font-semibold text-sm">{bill.supplier?.name}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Due Date</p>
              <p className="font-semibold text-sm">{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            <Badge variant={bill.status === "paid" ? "default" : "secondary"}>
              {bill.status || 'draft'}
            </Badge>
          </div>

          {/* Line Items Table */}
          <div className="border rounded overflow-x-auto mb-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-bold">Art No</TableHead>
                  <TableHead className="text-xs font-bold">Color</TableHead>
                  {SIZES.map(size => (
                    <TableHead key={size} className="text-xs font-bold text-center w-10">{size}</TableHead>
                  ))}
                  <TableHead className="text-xs font-bold text-center">Total</TableHead>
                  <TableHead className="text-xs font-bold text-right">Price</TableHead>
                  <TableHead className="text-xs font-bold text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => {
                  const { artNo, color } = parseDescription(line.description);
                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-xs py-2">{artNo}</TableCell>
                      <TableCell className="text-xs py-2">{color}</TableCell>
                      {SIZES.map(size => (
                        <TableCell key={size} className="text-xs text-center py-2">-</TableCell>
                      ))}
                      <TableCell className="text-xs text-center py-2 font-medium">{line.quantity}</TableCell>
                      <TableCell className="text-xs text-right py-2">{line.unit_price?.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right py-2 font-medium">{line.line_total?.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Rs. {bill.subtotal?.toLocaleString() || '0'}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>Rs. {bill.discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Grand Total:</span>
                <span>Rs. {bill.grand_total?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="mt-4 p-3 bg-muted/30 rounded text-sm">
              <p className="font-semibold mb-1">Notes</p>
              <p className="text-muted-foreground">{bill.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
