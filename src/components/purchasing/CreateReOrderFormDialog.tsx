import { useState } from "react";
import { Plus, Trash2, Printer, Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportToExcel } from "@/lib/export";
import { toast } from "sonner";

interface ReOrderLineItem {
  id: string;
  artNo: string;
  color: string;
  sizes: { [key: number]: number };
}

interface CreateReOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyData: any;
}

export function CreateReOrderFormDialog({
  open,
  onOpenChange,
  companyData,
}: CreateReOrderFormDialogProps) {
  const [formTitle, setFormTitle] = useState("Goods Re-Order Form");
  const [lines, setLines] = useState<ReOrderLineItem[]>([
    { id: crypto.randomUUID(), artNo: "", color: "", sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 } },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      { id: crypto.randomUUID(), artNo: "", color: "", sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 } },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: string, value: any) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          if (field.startsWith("size_")) {
            const size = parseInt(field.split("_")[1]);
            return {
              ...line,
              sizes: { ...line.sizes, [size]: parseInt(value) || 0 },
            };
          }
          return { ...line, [field]: value };
        }
        return line;
      })
    );
  };

  const calculateTotal = (line: ReOrderLineItem) => {
    return Object.values(line.sizes).reduce((sum, qty) => sum + qty, 0);
  };

  const calculateGrandTotal = () => {
    return lines.reduce((sum, line) => sum + calculateTotal(line), 0);
  };

  const calculateSizeTotal = (size: number) => {
    return lines.reduce((sum, line) => sum + (line.sizes[size] || 0), 0);
  };

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; border-bottom: 3px solid #333; padding-bottom: 15px; }
            .company-info { flex: 1; }
            .company-logo { width: 80px; height: auto; margin-bottom: 10px; }
            .company-name { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
            .company-details { font-size: 11px; color: #666; }
            .title { text-align: center; font-size: 24px; font-weight: bold; margin: 25px 0; text-transform: uppercase; letter-spacing: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #1a1a2e; color: white; padding: 10px; text-align: left; border: 1px solid #333; font-size: 11px; }
            td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
            .size-col { text-align: center; width: 50px; }
            .total-row { font-weight: bold; background: #f0f0f0; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              ${companyData?.logo_url ? `<img src="${companyData.logo_url}" class="company-logo" />` : ''}
              <div class="company-name">${companyData?.name || ''}</div>
              <div class="company-details">
                ${companyData?.address || ''}<br/>
                ${companyData?.phone || ''} | ${companyData?.email || ''}
              </div>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="title">${formTitle}</div>

          <table>
            <thead>
              <tr>
                <th>Art No / Design</th>
                <th>Color</th>
                <th class="size-col">39</th>
                <th class="size-col">40</th>
                <th class="size-col">41</th>
                <th class="size-col">42</th>
                <th class="size-col">43</th>
                <th class="size-col">44</th>
                <th class="size-col">45</th>
                <th class="size-col">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lines.filter(l => l.artNo).map(line => `
                <tr>
                  <td><strong>${line.artNo}</strong></td>
                  <td>${line.color}</td>
                  <td class="size-col">${line.sizes[39] || '-'}</td>
                  <td class="size-col">${line.sizes[40] || '-'}</td>
                  <td class="size-col">${line.sizes[41] || '-'}</td>
                  <td class="size-col">${line.sizes[42] || '-'}</td>
                  <td class="size-col">${line.sizes[43] || '-'}</td>
                  <td class="size-col">${line.sizes[44] || '-'}</td>
                  <td class="size-col">${line.sizes[45] || '-'}</td>
                  <td class="size-col" style="font-weight: bold;">${calculateTotal(line)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2"><strong>GRAND TOTAL</strong></td>
                <td class="size-col">${calculateSizeTotal(39)}</td>
                <td class="size-col">${calculateSizeTotal(40)}</td>
                <td class="size-col">${calculateSizeTotal(41)}</td>
                <td class="size-col">${calculateSizeTotal(42)}</td>
                <td class="size-col">${calculateSizeTotal(43)}</td>
                <td class="size-col">${calculateSizeTotal(44)}</td>
                <td class="size-col">${calculateSizeTotal(45)}</td>
                <td class="size-col">${calculateGrandTotal()}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
            <div style="display: flex; justify-content: space-between;">
              <div style="flex: 1; text-align: center;">
                <div style="border-bottom: 1px solid #333; width: 80%; margin: 0 auto 8px;"></div>
                <div style="font-size: 11px; color: #666;">Prepared By</div>
              </div>
              <div style="flex: 1; text-align: center;">
                <div style="border-bottom: 1px solid #333; width: 80%; margin: 0 auto 8px;"></div>
                <div style="font-size: 11px; color: #666;">Approved By</div>
              </div>
              <div style="flex: 1; text-align: center;">
                <div style="border-bottom: 1px solid #333; width: 80%; margin: 0 auto 8px;"></div>
                <div style="font-size: 11px; color: #666;">Date</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
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

  const handleDownloadPDF = () => {
    const validLines = lines.filter(l => l.artNo);
    if (validLines.length === 0) {
      toast.error("Please add at least one item with Art No");
      return;
    }

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyData?.name || "Company", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyData?.address || "", 14, 27);
    doc.text(`Tel: ${companyData?.phone || ""} | Email: ${companyData?.email || ""}`, 14, 32);

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(formTitle.toUpperCase(), pageWidth / 2, 45, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: "right" });

    // Table
    const tableData = validLines.map(line => [
      line.artNo,
      line.color,
      line.sizes[39] || "-",
      line.sizes[40] || "-",
      line.sizes[41] || "-",
      line.sizes[42] || "-",
      line.sizes[43] || "-",
      line.sizes[44] || "-",
      line.sizes[45] || "-",
      calculateTotal(line),
    ]);

    // Add totals row
    tableData.push([
      "",
      "GRAND TOTAL",
      calculateSizeTotal(39),
      calculateSizeTotal(40),
      calculateSizeTotal(41),
      calculateSizeTotal(42),
      calculateSizeTotal(43),
      calculateSizeTotal(44),
      calculateSizeTotal(45),
      calculateGrandTotal(),
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["Art No", "Color", "39", "40", "41", "42", "43", "44", "45", "Total"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [26, 26, 46] },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        9: { halign: "center", fontStyle: "bold" },
      },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`reorder-form-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF downloaded successfully");
  };

  const handleExportExcel = () => {
    const validLines = lines.filter(l => l.artNo);
    if (validLines.length === 0) {
      toast.error("Please add at least one item with Art No");
      return;
    }

    const exportData = validLines.map(line => ({
      "Art No": line.artNo,
      "Color": line.color,
      "Size 39": line.sizes[39] || 0,
      "Size 40": line.sizes[40] || 0,
      "Size 41": line.sizes[41] || 0,
      "Size 42": line.sizes[42] || 0,
      "Size 43": line.sizes[43] || 0,
      "Size 44": line.sizes[44] || 0,
      "Size 45": line.sizes[45] || 0,
      "Total Pairs": calculateTotal(line),
    }));

    // Add summary row
    exportData.push({
      "Art No": "",
      "Color": "GRAND TOTAL",
      "Size 39": calculateSizeTotal(39),
      "Size 40": calculateSizeTotal(40),
      "Size 41": calculateSizeTotal(41),
      "Size 42": calculateSizeTotal(42),
      "Size 43": calculateSizeTotal(43),
      "Size 44": calculateSizeTotal(44),
      "Size 45": calculateSizeTotal(45),
      "Total Pairs": calculateGrandTotal(),
    });

    exportToExcel(`reorder-form-${new Date().toISOString().split('T')[0]}`, exportData, "Re-Order Form");
    toast.success("Excel exported successfully");
  };

  const handleClear = () => {
    setLines([
      { id: crypto.randomUUID(), artNo: "", color: "", sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 } },
    ]);
    setFormTitle("Goods Re-Order Form");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Create Re-Order Form</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="formTitle">Form Title</Label>
              <Input
                id="formTitle"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Goods Re-Order Form"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Date: {new Date().toLocaleDateString()}
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5">
                  <TableHead className="w-[180px]">Art No / Design</TableHead>
                  <TableHead className="w-[140px]">Color</TableHead>
                  <TableHead className="text-center w-16">39</TableHead>
                  <TableHead className="text-center w-16">40</TableHead>
                  <TableHead className="text-center w-16">41</TableHead>
                  <TableHead className="text-center w-16">42</TableHead>
                  <TableHead className="text-center w-16">43</TableHead>
                  <TableHead className="text-center w-16">44</TableHead>
                  <TableHead className="text-center w-16">45</TableHead>
                  <TableHead className="text-center w-20">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Input
                        value={line.artNo}
                        onChange={(e) => updateLine(line.id, "artNo", e.target.value)}
                        placeholder="Art No"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.color}
                        onChange={(e) => updateLine(line.id, "color", e.target.value)}
                        placeholder="Color"
                        className="h-9"
                      />
                    </TableCell>
                    {[39, 40, 41, 42, 43, 44, 45].map((size) => (
                      <TableCell key={size} className="p-1">
                        <Input
                          type="number"
                          min="0"
                          value={line.sizes[size] || ""}
                          onChange={(e) => updateLine(line.id, `size_${size}`, e.target.value)}
                          className="h-9 text-center px-1"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold">
                      {calculateTotal(line)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={2}>GRAND TOTAL</TableCell>
                  {[39, 40, 41, 42, 43, 44, 45].map((size) => (
                    <TableCell key={size} className="text-center">
                      {calculateSizeTotal(size)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">{calculateGrandTotal()}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={addLine}>
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
            <Button variant="ghost" onClick={handleClear}>
              Clear All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
