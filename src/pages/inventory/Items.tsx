import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Printer, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ItemDialog } from "@/components/items/ItemDialog";
import { PasswordPromptDialog } from "@/components/PasswordPromptDialog";
import { useActionPassword } from "@/hooks/useActionPassword";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Items() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useActionPassword('items');

  const handlePrintList = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Items List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Inventory Items</h1>
          <p>Total: ${filteredItems.length} items</p>
          <table>
            <thead>
              <tr>
                <th>Design No</th>
                <th>Name</th>
                <th>Color</th>
                <th>Total Stock</th>
                <th>Sale Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map(i => `
                <tr>
                  <td>${i.code || '-'}</td>
                  <td>${i.name || '-'}</td>
                  <td>${i.color || '-'}</td>
                  <td style="text-align: right;">${i.totalStock || 0}</td>
                  <td style="text-align: right;">${i.sale_price?.toLocaleString() || '-'}</td>
                  <td>${i.active ? 'Active' : 'Inactive'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
  };

  const handleDownloadListPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Items", 14, 20);
    doc.setFontSize(10);
    doc.text(`Total: ${filteredItems.length} items`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Design No', 'Name', 'Color', 'Stock', 'Sale Price', 'Status']],
      body: filteredItems.map(i => [i.code, i.name, i.color || '-', i.totalStock || 0, i.sale_price?.toLocaleString() || '-', i.active ? 'Active' : 'Inactive']),
      styles: { fontSize: 8 },
    });

    doc.save('items-list.pdf');
    toast.success("PDF downloaded");
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .is('deleted_at', null)
        .order("code");
      
      if (itemsError) throw itemsError;

      // Fetch stock data
      const { data: stockData, error: stockError } = await supabase
        .from("stock_by_size")
        .select("*");
      
      if (stockError) throw stockError;

      // Calculate total stock for each item
      const stockMap = new Map<string, number>();
      stockData?.forEach(stock => {
        const currentTotal = stockMap.get(stock.item_id) || 0;
        stockMap.set(stock.item_id, currentTotal + (stock.quantity || 0));
      });

      // Add total stock to items
      const itemsWithStock = itemsData?.map(item => ({
        ...item,
        totalStock: stockMap.get(item.id) || 0
      })) || [];

      setItems(itemsWithStock);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    requirePassword(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from("items")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id
          })
          .eq("id", itemToDelete.id);
        
        if (error) throw error;
        toast.success("Item moved to trash");
        fetchItems();
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    });
  };

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('inventory.items')}</h1>
          <p className="text-muted-foreground mt-2">Manage inventory items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewDialogOpen(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadListPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => {
            setSelectedItem(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Design No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-right">Total Stock</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.color || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.totalStock || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.sale_price?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.purchase_price?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.active ? "default" : "secondary"}>
                          {item.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        item={selectedItem}
        onSuccess={fetchItems}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {itemToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordPromptDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onConfirm={handlePasswordConfirm}
        onPasswordVerify={verifyPassword}
        title="Delete Item"
        description="Please enter the action password to delete this item."
      />
    </div>
  );
}
