import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Truck } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StockItem {
  id: string;
  item_id: string;
  code: string;
  name: string;
  color: string;
  sale_price: number;
  size_39: number;
  size_40: number;
  size_41: number;
  size_42: number;
  size_43: number;
  size_44: number;
  size_45: number;
  totalStock: number;
  stockValue: number;
}

interface LorryStockPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockData: StockItem[];
  companyName?: string;
}

export function LorryStockPreviewDialog({ 
  open, 
  onOpenChange, 
  stockData,
  companyName = "MASTER FOOTWEAR PVT LTD"
}: LorryStockPreviewDialogProps) {
  
  const totalValue = stockData.reduce((sum, item) => sum + item.stockValue, 0);
  const totalPairs = stockData.reduce((sum, item) => sum + item.totalStock, 0);
  const totalItems = stockData.length;

  const handlePrint = () => {
    const printContent = document.getElementById('lorry-stock-preview');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Lorry Stock - ${format(new Date(), 'yyyy-MM-dd')}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .report-title { font-size: 18px; color: #666; margin-bottom: 5px; }
                .report-date { font-size: 12px; color: #888; }
                .summary-cards { display: flex; gap: 20px; margin-bottom: 20px; }
                .summary-card { flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
                .summary-label { font-size: 12px; color: #666; }
                .summary-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .font-mono { font-family: monospace; }
                .negative { color: red; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(companyName, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Lorry Stock Report', 105, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 105, 38, { align: 'center' });

    // Summary
    doc.setFontSize(11);
    doc.text(`Total Items: ${totalItems}`, 20, 50);
    doc.text(`Total Pairs: ${totalPairs.toLocaleString()}`, 80, 50);
    doc.text(`Total Value: LKR ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 140, 50);

    // Table
    const tableData = stockData.map(item => [
      item.code,
      item.color,
      item.name,
      item.size_39,
      item.size_40,
      item.size_41,
      item.size_42,
      item.size_43,
      item.size_44,
      item.size_45,
      item.totalStock,
      item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Art No', 'Color', 'Name', '39', '40', '41', '42', '43', '44', '45', 'Total', 'Value']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [100, 100, 100] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 18 },
        2: { cellWidth: 25 },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 10, halign: 'center' },
        5: { cellWidth: 10, halign: 'center' },
        6: { cellWidth: 10, halign: 'center' },
        7: { cellWidth: 10, halign: 'center' },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 10, halign: 'center' },
        10: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        11: { cellWidth: 25, halign: 'right' }
      }
    });

    doc.save(`lorry-stock-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Lorry Stock Preview
          </DialogTitle>
          <DialogDescription>
            Preview and print or download lorry stock report
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        <div id="lorry-stock-preview" className="bg-white p-6 rounded-lg border">
          {/* Header */}
          <div className="text-center border-b-2 border-foreground pb-4 mb-6">
            <h1 className="text-2xl font-bold">{companyName}</h1>
            <h2 className="text-lg text-muted-foreground mt-1">Lorry Stock Report</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generated: {format(new Date(), 'yyyy-MM-dd HH:mm')}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">Total Pairs</div>
              <div className="text-2xl font-bold">{totalPairs.toLocaleString()}</div>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-2xl font-bold">LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Stock Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left">Art No</th>
                <th className="border p-2 text-left">Color</th>
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-center">39</th>
                <th className="border p-2 text-center">40</th>
                <th className="border p-2 text-center">41</th>
                <th className="border p-2 text-center">42</th>
                <th className="border p-2 text-center">43</th>
                <th className="border p-2 text-center">44</th>
                <th className="border p-2 text-center">45</th>
                <th className="border p-2 text-center">Total</th>
                <th className="border p-2 text-right">Value (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50">
                  <td className="border p-2 font-mono font-semibold">{item.code}</td>
                  <td className="border p-2">{item.color}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className={`border p-2 text-center ${item.size_39 < 0 ? 'text-red-600 font-bold' : ''}`}>{item.size_39}</td>
                  <td className={`border p-2 text-center ${item.size_40 < 0 ? 'text-red-600 font-bold' : ''}`}>{item.size_40}</td>
                  <td className={`border p-2 text-center ${item.size_41 < 0 ? 'text-red-600 font-bold' : ''}`}>{item.size_41}</td>
                  <td className={`border p-2 text-center ${item.size_42 < 0 ? 'text-red-600 font-bold' : ''}`}>{item.size_42}</td>
                  <td className={`border p-2 text-center ${item.size_43 < 0 ? 'text-red-600 font-bold' : ''}`}>{item.size_43}</td>
                  <td className={`border p-2 text-center ${item.size_44 < 0 ? 'text-red-600 font-bold' : ''}`}>{item.size_44}</td>
                  <td className={`border p-2 text-center ${item.size_45 < 0 ? 'text-red-600 font-bold' : ''}`}>{item.size_45}</td>
                  <td className={`border p-2 text-center font-bold ${item.totalStock < 0 ? 'text-red-600' : ''}`}>{item.totalStock}</td>
                  <td className={`border p-2 text-right ${item.stockValue < 0 ? 'text-red-600' : ''}`}>
                    {item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold">
                <td colSpan={10} className="border p-2 text-right">Grand Total:</td>
                <td className="border p-2 text-center">{totalPairs.toLocaleString()}</td>
                <td className="border p-2 text-right">LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-muted-foreground">
            <p>Report generated by {companyName}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
