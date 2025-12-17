import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  status?: string;
  terms?: string;
  notes?: string;
  subtotal?: number;
  tax_total?: number;
  discount?: number;
  grand_total?: number;
  stock_type?: string;
  customer?: {
    name?: string;
    area?: string;
    phone?: string;
    district?: string;
  };
}

interface CompanyData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

interface InvoiceLine {
  description?: string;
  item_id?: string;
  size_39?: number;
  size_40?: number;
  size_41?: number;
  size_42?: number;
  size_43?: number;
  size_44?: number;
  size_45?: number;
  unit_price?: number;
  line_total?: number;
}

interface GroupedLine {
  artNo: string;
  color: string;
  description: string;
  sizes: { [key: number]: number };
  unitPrice: number;
  lineTotal: number;
  totalPairs: number;
}

export function groupInvoiceLines(lines: InvoiceLine[]): GroupedLine[] {
  const grouped = lines.reduce((acc: Record<string, GroupedLine>, line) => {
    const parts = (line.description || "").split(" - ");
    const artNo = parts[0] || "-";
    const color = parts[1] || "-";
    const key = `${artNo}|||${color}`;

    if (!acc[key]) {
      acc[key] = {
        artNo,
        color,
        description: line.description || "",
        sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 },
        unitPrice: line.unit_price || 0,
        lineTotal: 0,
        totalPairs: 0,
      };
    }

    acc[key].sizes[39] += line.size_39 || 0;
    acc[key].sizes[40] += line.size_40 || 0;
    acc[key].sizes[41] += line.size_41 || 0;
    acc[key].sizes[42] += line.size_42 || 0;
    acc[key].sizes[43] += line.size_43 || 0;
    acc[key].sizes[44] += line.size_44 || 0;
    acc[key].sizes[45] += line.size_45 || 0;
    acc[key].lineTotal += line.line_total || 0;
    acc[key].totalPairs =
      acc[key].sizes[39] + acc[key].sizes[40] + acc[key].sizes[41] +
      acc[key].sizes[42] + acc[key].sizes[43] + acc[key].sizes[44] + acc[key].sizes[45];

    return acc;
  }, {});

  return Object.values(grouped);
}

export function calculateGrandTotals(groupedLines: GroupedLine[]) {
  return groupedLines.reduce(
    (totals, group) => {
      return {
        size_39: totals.size_39 + group.sizes[39],
        size_40: totals.size_40 + group.sizes[40],
        size_41: totals.size_41 + group.sizes[41],
        size_42: totals.size_42 + group.sizes[42],
        size_43: totals.size_43 + group.sizes[43],
        size_44: totals.size_44 + group.sizes[44],
        size_45: totals.size_45 + group.sizes[45],
        totalPairs:
          totals.totalPairs + group.totalPairs,
        lineTotal: totals.lineTotal + group.lineTotal,
      };
    },
    { size_39: 0, size_40: 0, size_41: 0, size_42: 0, size_43: 0, size_44: 0, size_45: 0, totalPairs: 0, lineTotal: 0 }
  );
}

function getPaymentMethod(terms: string | undefined): string {
  if (!terms) return "Not specified";
  try {
    const parsed = typeof terms === "string" && terms.startsWith("{") ? JSON.parse(terms) : null;
    if (parsed?.payment_method) {
      return parsed.payment_method.charAt(0).toUpperCase() + parsed.payment_method.slice(1);
    }
    return terms.charAt(0).toUpperCase() + terms.slice(1);
  } catch {
    return terms || "Not specified";
  }
}

export function generateInvoicePrintContent(
  invoice: InvoiceData,
  lines: InvoiceLine[],
  company: CompanyData | null
): string {
  const groupedLines = groupInvoiceLines(lines);
  const grandTotals = calculateGrandTotals(groupedLines);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${invoice.invoice_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .company-info { flex: 1; }
          .company-logo { width: 80px; height: auto; margin-bottom: 8px; }
          .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .company-details { font-size: 11px; color: #666; }
          .invoice-header { text-align: right; }
          .invoice-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
          .invoice-no { font-size: 14px; font-weight: 600; }
          .invoice-date { font-size: 11px; color: #666; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .info-box { background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 12px; }
          .info-title { font-size: 11px; font-weight: bold; color: #333; margin-bottom: 8px; text-transform: uppercase; }
          .customer-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
          .customer-detail { font-size: 11px; color: #666; margin-bottom: 2px; }
          .customer-phone { font-size: 11px; margin-top: 6px; }
          .customer-phone span { color: #666; }
          .customer-phone strong { color: #333; }
          .line-items { margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f0f0f0; padding: 8px 6px; text-align: left; border: 1px solid #ddd; font-size: 10px; font-weight: bold; }
          td { padding: 6px; border: 1px solid #ddd; font-size: 11px; }
          .size-col { text-align: center; width: 35px; }
          .total-pairs { text-align: center; font-weight: 600; }
          .price-col { text-align: right; }
          .total-section { margin-top: 20px; float: right; width: 250px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; }
          .total-row.grand { font-weight: bold; font-size: 14px; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; }
          .notes-section { clear: both; margin-top: 20px; padding: 12px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; }
          .signature-section { clear: both; margin-top: 280px; display: flex; justify-content: space-between; }
          .signature-box { flex: 1; text-align: center; padding: 0 30px; }
          .signature-line { border-bottom: 1px solid #333; width: 80%; margin: 0 auto 8px auto; }
          .signature-label { font-size: 11px; color: #666; }
          .footer { text-align: center; font-size: 10px; color: #666; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${company?.logo_url ? `<img src="${company.logo_url}" class="company-logo" />` : ""}
            <div class="company-name">${company?.name || ""}</div>
            <div class="company-details">
              ${company?.address || ""}<br/>
              ${company?.phone || ""} ${company?.email ? `| ${company.email}` : ""}
            </div>
          </div>
          <div class="invoice-header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-no">#${invoice.invoice_no}</div>
            <div class="invoice-date">
              Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
              ${invoice.due_date ? `<br/>Due: ${new Date(invoice.due_date).toLocaleDateString()}` : ""}
            </div>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <div class="info-title">Bill To:</div>
            <div class="customer-name">${invoice.customer?.name || "N/A"}</div>
            ${invoice.customer?.area ? `<div class="customer-detail">${invoice.customer.area}</div>` : ""}
            ${invoice.customer?.phone ? `<div class="customer-phone"><span>Tel:</span> <strong>${invoice.customer.phone}</strong></div>` : ""}
          </div>
          <div class="info-box">
            <div class="info-title">Payment Information:</div>
            <div style="font-weight: 600;">Payment Method: ${getPaymentMethod(invoice.terms)}</div>
          </div>
          <div class="info-box">
            <div class="info-title">Goods Issue By:</div>
            <div style="font-weight: 600;">${invoice.stock_type === "store" ? "Warehouse" : "Lorry"}</div>
          </div>
        </div>

        <div class="line-items">
          <table>
            <thead>
              <tr>
                <th>Art No</th>
                <th>Color</th>
                <th class="size-col">39</th>
                <th class="size-col">40</th>
                <th class="size-col">41</th>
                <th class="size-col">42</th>
                <th class="size-col">43</th>
                <th class="size-col">44</th>
                <th class="size-col">45</th>
                <th class="size-col">Total</th>
                <th class="price-col">Unit Price</th>
                <th class="price-col">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${groupedLines
                .map(
                  (line) => `
                <tr>
                  <td>${line.artNo}</td>
                  <td class="size-col">${line.color}</td>
                  <td class="size-col">${line.sizes[39] || "-"}</td>
                  <td class="size-col">${line.sizes[40] || "-"}</td>
                  <td class="size-col">${line.sizes[41] || "-"}</td>
                  <td class="size-col">${line.sizes[42] || "-"}</td>
                  <td class="size-col">${line.sizes[43] || "-"}</td>
                  <td class="size-col">${line.sizes[44] || "-"}</td>
                  <td class="size-col">${line.sizes[45] || "-"}</td>
                  <td class="total-pairs">${line.totalPairs}</td>
                  <td class="price-col">${line.unitPrice?.toFixed(2) || "0.00"}</td>
                  <td class="price-col">${line.lineTotal?.toFixed(2) || "0.00"}</td>
                </tr>
              `
                )
                .join("")}
              <tr style="background: #e0e7ff; font-weight: bold; border-top: 2px solid #333;">
                <td colspan="2" style="font-size: 12px; color: #4338ca;">TOTAL</td>
                <td class="size-col" style="color: #4338ca;">${grandTotals.size_39 || "-"}</td>
                <td class="size-col" style="color: #4338ca;">${grandTotals.size_40 || "-"}</td>
                <td class="size-col" style="color: #4338ca;">${grandTotals.size_41 || "-"}</td>
                <td class="size-col" style="color: #4338ca;">${grandTotals.size_42 || "-"}</td>
                <td class="size-col" style="color: #4338ca;">${grandTotals.size_43 || "-"}</td>
                <td class="size-col" style="color: #4338ca;">${grandTotals.size_44 || "-"}</td>
                <td class="size-col" style="color: #4338ca;">${grandTotals.size_45 || "-"}</td>
                <td class="total-pairs" style="font-size: 13px; color: #4338ca;">${grandTotals.totalPairs} <span style="font-size: 9px; color: #666;">pairs</span></td>
                <td class="price-col"></td>
                <td class="price-col" style="font-size: 13px; color: #4338ca;">${grandTotals.lineTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${(invoice.subtotal || 0).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Tax:</span>
            <span>${(invoice.tax_total || 0).toFixed(2)}</span>
          </div>
          ${
            invoice.discount
              ? `
            <div class="total-row" style="color: #c00;">
              <span>Discount:</span>
              <span>-${invoice.discount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          <div class="total-row grand">
            <span>Grand Total:</span>
            <span>${(invoice.grand_total || 0).toFixed(2)}</span>
          </div>
        </div>

        ${
          invoice.notes
            ? `
          <div class="notes-section">
            <div class="info-title">Notes:</div>
            <p style="margin: 0; white-space: pre-wrap;">${invoice.notes}</p>
          </div>
        `
            : ""
        }

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Customer Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Sales Rep Signature</div>
          </div>
        </div>

        <div class="footer">
          Thank you for your business!
        </div>
      </body>
    </html>
  `;
}

// Helper function to convert image URL to base64
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePDF(
  invoice: InvoiceData,
  lines: InvoiceLine[],
  company: CompanyData | null
): Promise<jsPDF> {
  const groupedLines = groupInvoiceLines(lines);
  const grandTotals = calculateGrandTotals(groupedLines);

  // Create high-quality PDF with better settings
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false, // Disable compression for better quality
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Load and add company logo
  let yPos = 15;
  let logoAdded = false;
  
  if (company?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(company.logo_url);
      if (logoBase64) {
        // Add logo with good quality - 25mm width, auto height
        doc.addImage(logoBase64, 'PNG', 14, yPos - 5, 25, 25, undefined, 'FAST');
        logoAdded = true;
      }
    } catch (e) {
      console.log('Could not load logo:', e);
    }
  }

  // Company name - position based on whether logo was added
  const textStartX = logoAdded ? 42 : 14;
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company?.name || "Company", textStartX, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (company?.address) {
    doc.text(company.address, textStartX, yPos);
    yPos += 4;
  }
  doc.text(`Tel: ${company?.phone || ""} | Email: ${company?.email || ""}`, textStartX, yPos);

  // Invoice title on right
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - 14, 15, { align: "right" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`#${invoice.invoice_no}`, pageWidth - 14, 23, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - 14, 30, { align: "right" });
  if (invoice.due_date) {
    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 14, 36, { align: "right" });
  }

  // Divider line
  yPos = logoAdded ? 45 : 40;
  doc.setLineWidth(0.5);
  doc.setDrawColor(100, 100, 100);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  // Customer info boxes with better styling
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("BILL TO:", 14, yPos);
  doc.text("PAYMENT:", 85, yPos);
  doc.text("GOODS ISSUE BY:", 145, yPos);
  yPos += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(invoice.customer?.name || "N/A", 14, yPos);
  doc.text(getPaymentMethod(invoice.terms), 85, yPos);
  doc.text(invoice.stock_type === "store" ? "Warehouse" : "Lorry", 145, yPos);
  yPos += 5;

  doc.setFontSize(9);
  if (invoice.customer?.area) {
    doc.text(invoice.customer.area, 14, yPos);
    yPos += 4;
  }
  if (invoice.customer?.phone) {
    doc.text(`Tel: ${invoice.customer.phone}`, 14, yPos);
    yPos += 4;
  }

  yPos += 8;

  // Items table with improved styling
  const tableData = groupedLines.map((line) => [
    line.artNo,
    line.color,
    line.sizes[39] || "-",
    line.sizes[40] || "-",
    line.sizes[41] || "-",
    line.sizes[42] || "-",
    line.sizes[43] || "-",
    line.sizes[44] || "-",
    line.sizes[45] || "-",
    line.totalPairs.toString(),
    line.unitPrice?.toFixed(2) || "0.00",
    line.lineTotal?.toFixed(2) || "0.00",
  ]);

  // Add totals row
  tableData.push([
    "TOTAL",
    "",
    grandTotals.size_39 || "-",
    grandTotals.size_40 || "-",
    grandTotals.size_41 || "-",
    grandTotals.size_42 || "-",
    grandTotals.size_43 || "-",
    grandTotals.size_44 || "-",
    grandTotals.size_45 || "-",
    `${grandTotals.totalPairs}`,
    "",
    grandTotals.lineTotal.toFixed(2),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Art No", "Color", "39", "40", "41", "42", "43", "44", "45", "Pairs", "Price", "Total"]],
    body: tableData,
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: { 
      fillColor: [50, 50, 50], 
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 20 },
      2: { cellWidth: 11, halign: "center" },
      3: { cellWidth: 11, halign: "center" },
      4: { cellWidth: 11, halign: "center" },
      5: { cellWidth: 11, halign: "center" },
      6: { cellWidth: 11, halign: "center" },
      7: { cellWidth: 11, halign: "center" },
      8: { cellWidth: 11, halign: "center" },
      9: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      10: { cellWidth: 22, halign: "right" },
      11: { cellWidth: 24, halign: "right" },
    },
    didParseCell: (data) => {
      // Style the last row (totals)
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [224, 231, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [67, 56, 202];
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 12;

  // Summary section on the right with better styling
  const summaryX = pageWidth - 75;
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(summaryX - 5, finalY, 65, 48, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);

  doc.text("Subtotal:", summaryX, finalY + 10);
  doc.text((invoice.subtotal || 0).toFixed(2), pageWidth - 16, finalY + 10, { align: "right" });

  doc.text("Tax:", summaryX, finalY + 18);
  doc.text((invoice.tax_total || 0).toFixed(2), pageWidth - 16, finalY + 18, { align: "right" });

  let discountY = finalY + 26;
  if (invoice.discount && invoice.discount > 0) {
    doc.setTextColor(200, 0, 0);
    doc.text("Discount:", summaryX, discountY);
    doc.text(`-${invoice.discount.toFixed(2)}`, pageWidth - 16, discountY, { align: "right" });
    doc.setTextColor(0);
    discountY += 8;
  }

  // Grand total
  doc.setLineWidth(0.5);
  doc.setDrawColor(100, 100, 100);
  doc.line(summaryX, discountY, pageWidth - 14, discountY);
  discountY += 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", summaryX, discountY + 3);
  doc.text((invoice.grand_total || 0).toFixed(2), pageWidth - 16, discountY + 3, { align: "right" });

  // Notes section
  let contentEndY = discountY + 15;
  if (invoice.notes) {
    contentEndY = discountY + 25;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES:", 14, contentEndY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(invoice.notes, 14, contentEndY + 6, { maxWidth: pageWidth - 28 });
    contentEndY += 20;
  }

  // Signature section - ensure there's always space for signatures
  const pageHeight = doc.internal.pageSize.getHeight();
  const signatureSpaceNeeded = 50; // Space needed for signatures + footer
  let sigY = contentEndY + 30; // Position 30px below content

  // If not enough space on current page, add a new page
  if (sigY + signatureSpaceNeeded > pageHeight) {
    doc.addPage();
    sigY = 40; // Start near top of new page
  }
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);

  // Customer signature
  doc.line(30, sigY, 85, sigY);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Customer Signature", 40, sigY + 6);

  // Sales rep signature
  doc.line(pageWidth - 85, sigY, pageWidth - 30, sigY);
  doc.text("Sales Rep Signature", pageWidth - 75, sigY + 6);

  // Footer - position below signatures
  const footerY = sigY + 20;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

  return doc;
}

export async function generateInvoicePDFBase64(
  invoice: InvoiceData,
  lines: InvoiceLine[],
  company: CompanyData | null
): Promise<string> {
  const doc = await generateInvoicePDF(invoice, lines, company);
  return doc.output("datauristring").split(",")[1];
}
