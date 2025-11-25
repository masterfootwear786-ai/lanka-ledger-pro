import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryData {
  item_code: string;
  item_name: string;
  color: string;
  size: string;
  quantity: number;
  sale_price: number;
  total_value: number;
  low_stock_threshold: number;
}

export default function InventoryReport() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [inventoryData, setInventoryData] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast.error('Company not found');
        return;
      }

      const { data: stockData, error } = await supabase
        .from('stock_by_size')
        .select(`
          quantity,
          size,
          items!stock_by_size_item_id_fkey (
            code,
            name,
            color,
            sale_price,
            low_stock_threshold
          )
        `)
        .eq('company_id', profile.company_id)
        .order('items(code)', { ascending: true });

      if (error) throw error;

      const formatted = stockData?.map(stock => ({
        item_code: stock.items?.code || '',
        item_name: stock.items?.name || '',
        color: stock.items?.color || '',
        size: stock.size,
        quantity: stock.quantity,
        sale_price: stock.items?.sale_price || 0,
        total_value: stock.quantity * (stock.items?.sale_price || 0),
        low_stock_threshold: stock.items?.low_stock_threshold || 0
      })) || [];

      setInventoryData(formatted);
      toast.success('Inventory report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, []);

  const totals = inventoryData.reduce(
    (acc, item) => ({
      quantity: acc.quantity + item.quantity,
      value: acc.value + item.total_value
    }),
    { quantity: 0, value: 0 }
  );

  const handleExportCSV = () => {
    const data = inventoryData.map(item => ({
      'Item Code': item.item_code,
      'Item Name': item.item_name,
      'Color': item.color,
      'Size': item.size,
      'Quantity': item.quantity,
      'Sale Price': item.sale_price,
      'Total Value': item.total_value,
      'Low Stock Level': item.low_stock_threshold
    }));

    exportToCSV('Inventory_Stock_Report', data);
    toast.success('Report exported to CSV');
  };

  const handleExportExcel = () => {
    const data = inventoryData.map(item => ({
      'Item Code': item.item_code,
      'Item Name': item.item_name,
      'Color': item.color,
      'Size': item.size,
      'Quantity': item.quantity,
      'Sale Price': item.sale_price,
      'Total Value': item.total_value,
      'Low Stock Level': item.low_stock_threshold
    }));

    exportToExcel('Inventory_Stock_Report', data);
    toast.success('Report exported to Excel');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Inventory Stock Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [['Code', 'Name', 'Color', 'Size', 'Qty', 'Price', 'Value']],
      body: inventoryData.map(item => [
        item.item_code,
        item.item_name,
        item.color,
        item.size,
        item.quantity.toString(),
        item.sale_price.toFixed(2),
        item.total_value.toFixed(2)
      ]),
      foot: [['', '', '', 'TOTAL', totals.quantity.toString(), '', totals.value.toFixed(2)]],
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113] },
      footStyles: { fillColor: [39, 174, 96], fontStyle: 'bold' }
    });

    doc.save('Inventory_Stock_Report.pdf');
    toast.success('Report exported to PDF');
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Stock Report</h1>
        <p className="text-muted-foreground mt-2">
          Current inventory stock levels and values
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Levels</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : inventoryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No inventory data found
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {inventoryData.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.item_code}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell>{item.size}</TableCell>
                        <TableCell className={`text-right ${item.quantity <= item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">{item.sale_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-medium">{item.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-center">
                          {item.quantity <= item.low_stock_threshold ? (
                            <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                              In Stock
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted">
                      <TableCell colSpan={4}>TOTAL</TableCell>
                      <TableCell className="text-right">{totals.quantity}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Stock Value</div>
                <div className="text-2xl font-bold">{totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Quantity</div>
                <div className="text-2xl font-bold">{totals.quantity}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Low Stock Items</div>
                <div className="text-2xl font-bold text-red-600">
                  {inventoryData.filter(i => i.quantity <= i.low_stock_threshold).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
