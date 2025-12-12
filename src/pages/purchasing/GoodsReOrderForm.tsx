import { useState, useEffect } from "react";
import { Printer, Download, FileSpreadsheet, ClipboardList } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { exportToExcel } from "@/lib/export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReOrderItem {
  artNo: string;
  color: string;
  sizes: { [key: number]: number };
  totalPairs: number;
}

export default function GoodsReOrderForm() {
  const [items, setItems] = useState<ReOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyData, setCompanyData] = useState<any>(null);
  const [stockType, setStockType] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    fetchStockData();
  }, [stockType]);

  const fetchStockData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profileData?.company_id) {
        toast.error("Company not found");
        return;
      }

      // Fetch company data
      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .single();
      setCompanyData(company);

      // Fetch stock by size with items
      let query = supabase
        .from("stock_by_size")
        .select(`
          *,
          item:items(id, code, name, color, low_stock_threshold)
        `)
        .eq("company_id", profileData.company_id);

      if (stockType !== "all") {
        query = query.eq("stock_type", stockType);
      }

      const { data: stockData, error } = await query;

      if (error) throw error;

      // Group by Art No and Color
      const grouped: { [key: string]: ReOrderItem } = {};

      (stockData || []).forEach((stock: any) => {
        if (!stock.item) return;

        const artNo = stock.item.code || "-";
        const color = stock.item.color || "-";
        const key = `${artNo}|||${color}`;

        if (!grouped[key]) {
          grouped[key] = {
            artNo,
            color,
            sizes: { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 },
            totalPairs: 0,
          };
        }

        const size = parseInt(stock.size);
        if (size >= 39 && size <= 45) {
          grouped[key].sizes[size] += stock.quantity || 0;
          grouped[key].totalPairs += stock.quantity || 0;
        }
      });

      // Convert to array and sort
      const itemsArray = Object.values(grouped).sort((a, b) => 
        a.artNo.localeCompare(b.artNo)
      );

      setItems(itemsArray);
    } catch (error: any) {
      toast.error("Error fetching stock data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.artNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showLowStockOnly) {
      return matchesSearch && item.totalPairs <= 10;
    }
    return matchesSearch;
  });

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Goods Re-Order Form</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; border-bottom: 3px solid #333; padding-bottom: 15px; }
            .company-info { flex: 1; }
            .company-logo { width: 80px; height: auto; margin-bottom: 10px; }
            .company-name { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
            .company-details { font-size: 11px; color: #666; }
            .title { text-align: center; font-size: 24px; font-weight: bold; margin: 25px 0; text-transform: uppercase; letter-spacing: 2px; }
            .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #1a1a2e; color: white; padding: 10px; text-align: left; border: 1px solid #333; font-size: 11px; }
            td { padding: 8px; border: 1px solid #ddd; font-size: 12px; }
            .size-col { text-align: center; width: 50px; }
            .total-row { font-weight: bold; background: #f0f0f0; }
            .low-stock { background: #fee2e2; }
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
              <div><strong>Stock Type:</strong> ${stockType === 'all' ? 'All Stock' : stockType === 'lorry' ? 'Lorry Stock' : 'Warehouse'}</div>
            </div>
          </div>
          
          <div class="title">Goods Re-Order Form</div>
          <div class="subtitle">Current Stock Levels by Size</div>

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
              ${filteredItems.map(item => `
                <tr class="${item.totalPairs <= 10 ? 'low-stock' : ''}">
                  <td><strong>${item.artNo}</strong></td>
                  <td>${item.color}</td>
                  <td class="size-col">${item.sizes[39] || '-'}</td>
                  <td class="size-col">${item.sizes[40] || '-'}</td>
                  <td class="size-col">${item.sizes[41] || '-'}</td>
                  <td class="size-col">${item.sizes[42] || '-'}</td>
                  <td class="size-col">${item.sizes[43] || '-'}</td>
                  <td class="size-col">${item.sizes[44] || '-'}</td>
                  <td class="size-col">${item.sizes[45] || '-'}</td>
                  <td class="size-col" style="font-weight: bold;">${item.totalPairs}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2"><strong>GRAND TOTAL</strong></td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + (item.sizes[39] || 0), 0)}</td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + (item.sizes[40] || 0), 0)}</td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + (item.sizes[41] || 0), 0)}</td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + (item.sizes[42] || 0), 0)}</td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + (item.sizes[43] || 0), 0)}</td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + (item.sizes[44] || 0), 0)}</td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + (item.sizes[45] || 0), 0)}</td>
                <td class="size-col">${filteredItems.reduce((sum, item) => sum + item.totalPairs, 0)}</td>
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
    doc.text("GOODS RE-ORDER FORM", pageWidth / 2, 45, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: "right" });
    doc.text(`Stock Type: ${stockType === 'all' ? 'All Stock' : stockType === 'lorry' ? 'Lorry Stock' : 'Warehouse'}`, pageWidth - 14, 27, { align: "right" });

    // Table
    const tableData = filteredItems.map(item => [
      item.artNo,
      item.color,
      item.sizes[39] || "-",
      item.sizes[40] || "-",
      item.sizes[41] || "-",
      item.sizes[42] || "-",
      item.sizes[43] || "-",
      item.sizes[44] || "-",
      item.sizes[45] || "-",
      item.totalPairs,
    ]);

    // Add totals row
    tableData.push([
      "",
      "GRAND TOTAL",
      filteredItems.reduce((sum, item) => sum + (item.sizes[39] || 0), 0),
      filteredItems.reduce((sum, item) => sum + (item.sizes[40] || 0), 0),
      filteredItems.reduce((sum, item) => sum + (item.sizes[41] || 0), 0),
      filteredItems.reduce((sum, item) => sum + (item.sizes[42] || 0), 0),
      filteredItems.reduce((sum, item) => sum + (item.sizes[43] || 0), 0),
      filteredItems.reduce((sum, item) => sum + (item.sizes[44] || 0), 0),
      filteredItems.reduce((sum, item) => sum + (item.sizes[45] || 0), 0),
      filteredItems.reduce((sum, item) => sum + item.totalPairs, 0),
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

    doc.save(`goods-reorder-form-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF downloaded successfully");
  };

  const handleExportExcel = () => {
    const exportData = filteredItems.map(item => ({
      "Art No": item.artNo,
      "Color": item.color,
      "Size 39": item.sizes[39] || 0,
      "Size 40": item.sizes[40] || 0,
      "Size 41": item.sizes[41] || 0,
      "Size 42": item.sizes[42] || 0,
      "Size 43": item.sizes[43] || 0,
      "Size 44": item.sizes[44] || 0,
      "Size 45": item.sizes[45] || 0,
      "Total Pairs": item.totalPairs,
    }));

    // Add summary row
    exportData.push({
      "Art No": "",
      "Color": "GRAND TOTAL",
      "Size 39": filteredItems.reduce((sum, item) => sum + (item.sizes[39] || 0), 0),
      "Size 40": filteredItems.reduce((sum, item) => sum + (item.sizes[40] || 0), 0),
      "Size 41": filteredItems.reduce((sum, item) => sum + (item.sizes[41] || 0), 0),
      "Size 42": filteredItems.reduce((sum, item) => sum + (item.sizes[42] || 0), 0),
      "Size 43": filteredItems.reduce((sum, item) => sum + (item.sizes[43] || 0), 0),
      "Size 44": filteredItems.reduce((sum, item) => sum + (item.sizes[44] || 0), 0),
      "Size 45": filteredItems.reduce((sum, item) => sum + (item.sizes[45] || 0), 0),
      "Total Pairs": filteredItems.reduce((sum, item) => sum + item.totalPairs, 0),
    });

    exportToExcel(`goods-reorder-form-${new Date().toISOString().split('T')[0]}`, exportData, "Re-Order Form");
    toast.success("Excel exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Goods Re-Order Form</h1>
            <p className="text-muted-foreground text-sm">Current stock levels for purchasing reference</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search by Art No or Color..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={stockType} onValueChange={setStockType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stock Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="lorry">Lorry Stock</SelectItem>
            <SelectItem value="store">Warehouse</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="lowStock"
            checked={showLowStockOnly}
            onCheckedChange={(checked) => setShowLowStockOnly(checked === true)}
          />
          <Label htmlFor="lowStock" className="text-sm cursor-pointer">
            Show Low Stock Only (≤10 pairs)
          </Label>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="font-bold">Art No / Design</TableHead>
              <TableHead className="font-bold">Color</TableHead>
              <TableHead className="text-center w-14 font-bold">39</TableHead>
              <TableHead className="text-center w-14 font-bold">40</TableHead>
              <TableHead className="text-center w-14 font-bold">41</TableHead>
              <TableHead className="text-center w-14 font-bold">42</TableHead>
              <TableHead className="text-center w-14 font-bold">43</TableHead>
              <TableHead className="text-center w-14 font-bold">44</TableHead>
              <TableHead className="text-center w-14 font-bold">45</TableHead>
              <TableHead className="text-center w-20 font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  No stock items found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredItems.map((item, index) => (
                  <TableRow 
                    key={index} 
                    className={item.totalPairs <= 10 ? "bg-destructive/10" : ""}
                  >
                    <TableCell className="font-semibold">{item.artNo}</TableCell>
                    <TableCell>{item.color}</TableCell>
                    <TableCell className="text-center">{item.sizes[39] || "-"}</TableCell>
                    <TableCell className="text-center">{item.sizes[40] || "-"}</TableCell>
                    <TableCell className="text-center">{item.sizes[41] || "-"}</TableCell>
                    <TableCell className="text-center">{item.sizes[42] || "-"}</TableCell>
                    <TableCell className="text-center">{item.sizes[43] || "-"}</TableCell>
                    <TableCell className="text-center">{item.sizes[44] || "-"}</TableCell>
                    <TableCell className="text-center">{item.sizes[45] || "-"}</TableCell>
                    <TableCell className={`text-center font-bold ${item.totalPairs <= 10 ? "text-destructive" : ""}`}>
                      {item.totalPairs}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={2}>GRAND TOTAL</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + (item.sizes[39] || 0), 0)}</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + (item.sizes[40] || 0), 0)}</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + (item.sizes[41] || 0), 0)}</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + (item.sizes[42] || 0), 0)}</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + (item.sizes[43] || 0), 0)}</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + (item.sizes[44] || 0), 0)}</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + (item.sizes[45] || 0), 0)}</TableCell>
                  <TableCell className="text-center">{filteredItems.reduce((sum, item) => sum + item.totalPairs, 0)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>• Low stock items (≤10 pairs) are highlighted in red</p>
        <p>• Use this form to identify items that need to be re-ordered from suppliers</p>
      </div>
    </div>
  );
}
