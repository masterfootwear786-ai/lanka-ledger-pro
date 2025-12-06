import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StockItem {
  id: string;
  item_id: string;
  code: string;
  name: string;
  color: string;
  sale_price: number;
  low_stock_threshold: number;
  size_39: number;
  size_40: number;
  size_41: number;
  size_42: number;
  size_43: number;
  size_44: number;
  size_45: number;
  totalStock: number;
  stockValue: number;
  hasLowStock: boolean;
}

interface MainStockPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockData: StockItem[];
  companyName?: string;
}

export function MainStockPreviewDialog({
  open,
  onOpenChange,
  stockData,
  companyName = "Company"
}: MainStockPreviewDialogProps) {
  const [displayCompanyName, setDisplayCompanyName] = useState(companyName);

  useEffect(() => {
    const fetchCompany = async () => {
      const { data: profile } = await supabase.from('profiles').select('company_id').maybeSingle();
      if (profile?.company_id) {
        const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).maybeSingle();
        if (company?.name) setDisplayCompanyName(company.name);
      }
    };
    fetchCompany();
  }, []);

  const totalItems = stockData.length;
  const totalPairs = stockData.reduce((sum, item) => sum + item.totalStock, 0);
  const totalValue = stockData.reduce((sum, item) => sum + item.stockValue, 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Main Stock Report - ${displayCompanyName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company-name { font-size: 18px; font-weight: bold; }
            .report-title { font-size: 14px; margin-top: 5px; color: #666; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 10px; color: #666; }
            .summary-value { font-size: 16px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            td.left { text-align: left; }
            td.right { text-align: right; }
            .negative { color: red; font-weight: bold; }
            .low-stock { color: orange; }
            .footer { margin-top: 15px; text-align: center; font-size: 9px; color: #666; }
            @media print { body { margin: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${displayCompanyName}</div>
            <div class="report-title">Main Stock Report (Lorry + Warehouse)</div>
            <div style="font-size: 10px; color: #888; margin-top: 5px;">Generated: ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Items</div>
              <div class="summary-value">${totalItems}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Pairs</div>
              <div class="summary-value">${totalPairs.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Value (LKR)</div>
              <div class="summary-value">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Art No</th>
                <th>Color</th>
                <th>Name</th>
                <th>39</th>
                <th>40</th>
                <th>41</th>
                <th>42</th>
                <th>43</th>
                <th>44</th>
                <th>45</th>
                <th>Total</th>
                <th>Value (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${stockData.map(item => `
                <tr>
                  <td class="left" style="font-family: monospace; font-weight: bold;">${item.code}</td>
                  <td class="left">${item.color}</td>
                  <td class="left">${item.name}</td>
                  <td class="${item.size_39 < 0 ? 'negative' : item.size_39 > 0 && item.size_39 < item.low_stock_threshold ? 'low-stock' : ''}">${item.size_39}</td>
                  <td class="${item.size_40 < 0 ? 'negative' : item.size_40 > 0 && item.size_40 < item.low_stock_threshold ? 'low-stock' : ''}">${item.size_40}</td>
                  <td class="${item.size_41 < 0 ? 'negative' : item.size_41 > 0 && item.size_41 < item.low_stock_threshold ? 'low-stock' : ''}">${item.size_41}</td>
                  <td class="${item.size_42 < 0 ? 'negative' : item.size_42 > 0 && item.size_42 < item.low_stock_threshold ? 'low-stock' : ''}">${item.size_42}</td>
                  <td class="${item.size_43 < 0 ? 'negative' : item.size_43 > 0 && item.size_43 < item.low_stock_threshold ? 'low-stock' : ''}">${item.size_43}</td>
                  <td class="${item.size_44 < 0 ? 'negative' : item.size_44 > 0 && item.size_44 < item.low_stock_threshold ? 'low-stock' : ''}">${item.size_44}</td>
                  <td class="${item.size_45 < 0 ? 'negative' : item.size_45 > 0 && item.size_45 < item.low_stock_threshold ? 'low-stock' : ''}">${item.size_45}</td>
                  <td class="${item.totalStock < 0 ? 'negative' : ''}" style="font-weight: bold;">${item.totalStock}</td>
                  <td class="right ${item.stockValue < 0 ? 'negative' : ''}">${item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Main Stock Report - ${displayCompanyName}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFontSize(18);
    doc.text(displayCompanyName, 14, 20);
    doc.setFontSize(12);
    doc.text('Main Stock Report (Lorry + Warehouse)', 14, 28);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
    
    // Summary
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`Total Items: ${totalItems}  |  Total Pairs: ${totalPairs.toLocaleString()}  |  Total Value: LKR ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 44);
    
    // Table
    autoTable(doc, {
      startY: 50,
      head: [['Art No', 'Color', 'Name', '39', '40', '41', '42', '43', '44', '45', 'Total', 'Value (LKR)']],
      body: stockData.map(item => [
        item.code,
        item.color,
        item.name,
        item.size_39.toString(),
        item.size_40.toString(),
        item.size_41.toString(),
        item.size_42.toString(),
        item.size_43.toString(),
        item.size_44.toString(),
        item.size_45.toString(),
        item.totalStock.toString(),
        item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        10: { fontStyle: 'bold', halign: 'center' },
        11: { halign: 'right' }
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const rowIndex = data.row.index;
          const item = stockData[rowIndex];
          // Check for negative values in size columns
          if (data.column.index >= 3 && data.column.index <= 9) {
            const sizeKey = `size_${39 + (data.column.index - 3)}` as keyof StockItem;
            const qty = item[sizeKey] as number;
            if (qty < 0) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Total column
          if (data.column.index === 10 && item.totalStock < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          }
          // Value column
          if (data.column.index === 11 && item.stockValue < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    });
    
    doc.save(`main-stock-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Main Stock Preview</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Company Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold">{displayCompanyName}</h2>
            <p className="text-muted-foreground">Main Stock Report (Lorry + Warehouse)</p>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Total Items</div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Total Pairs</div>
              <div className="text-2xl font-bold">{totalPairs.toLocaleString()}</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Total Value (LKR)</div>
              <div className="text-2xl font-bold">{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Stock Table */}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Art No</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">39</TableHead>
                  <TableHead className="text-center">40</TableHead>
                  <TableHead className="text-center">41</TableHead>
                  <TableHead className="text-center">42</TableHead>
                  <TableHead className="text-center">43</TableHead>
                  <TableHead className="text-center">44</TableHead>
                  <TableHead className="text-center">45</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Value (LKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-semibold">{item.code}</TableCell>
                    <TableCell>{item.color}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    {['39', '40', '41', '42', '43', '44', '45'].map(size => {
                      const qty = item[`size_${size}` as keyof StockItem] as number;
                      const isNegative = qty < 0;
                      return (
                        <TableCell 
                          key={size} 
                          className={`text-center ${isNegative ? 'text-destructive font-bold' : ''}`}
                        >
                          {qty}
                        </TableCell>
                      );
                    })}
                    <TableCell className={`text-center font-bold ${item.totalStock < 0 ? 'text-destructive' : ''}`}>
                      {item.totalStock}
                    </TableCell>
                    <TableCell className={`text-right ${item.stockValue < 0 ? 'text-destructive' : ''}`}>
                      {item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
