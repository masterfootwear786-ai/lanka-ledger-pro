import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, AlertTriangle, Store, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StockBySizeDialog } from "@/components/inventory/StockBySizeDialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function StoreStock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("active", true)
        .is('deleted_at', null)
        .order("code");
      
      if (itemsError) throw itemsError;

      const { data: stockBySizeData, error: stockError } = await supabase
        .from("stock_by_size")
        .select("*")
        .eq("stock_type", "store");
      
      if (stockError) throw stockError;

      const stockMap = new Map<string, Map<string, number>>();
      
      stockBySizeData?.forEach(stock => {
        if (!stockMap.has(stock.item_id)) {
          stockMap.set(stock.item_id, new Map());
        }
        stockMap.get(stock.item_id)!.set(stock.size, stock.quantity || 0);
      });

      // Get unique item IDs that have store stock
      const itemsWithStoreStock = new Set(stockBySizeData?.map(s => s.item_id) || []);

      const combinedData: StockItem[] = items?.filter(item => itemsWithStoreStock.has(item.id)).map(item => {
        const sizeStock = stockMap.get(item.id) || new Map();
        const size_39 = sizeStock.get('39') || 0;
        const size_40 = sizeStock.get('40') || 0;
        const size_41 = sizeStock.get('41') || 0;
        const size_42 = sizeStock.get('42') || 0;
        const size_43 = sizeStock.get('43') || 0;
        const size_44 = sizeStock.get('44') || 0;
        const size_45 = sizeStock.get('45') || 0;
        
        const totalStock = size_39 + size_40 + size_41 + size_42 + size_43 + size_44 + size_45;
        const threshold = item.low_stock_threshold || 10;
        const hasLowStock = (size_39 > 0 && size_39 < threshold) || 
                           (size_40 > 0 && size_40 < threshold) || 
                           (size_41 > 0 && size_41 < threshold) || 
                           (size_42 > 0 && size_42 < threshold) || 
                           (size_43 > 0 && size_43 < threshold) || 
                           (size_44 > 0 && size_44 < threshold) || 
                           (size_45 > 0 && size_45 < threshold);
        
        return {
          id: `${item.id}-store`,
          item_id: item.id,
          code: item.code,
          name: item.name,
          color: item.color || '-',
          sale_price: item.sale_price || 0,
          low_stock_threshold: threshold,
          size_39,
          size_40,
          size_41,
          size_42,
          size_43,
          size_44,
          size_45,
          totalStock,
          stockValue: totalStock * (item.sale_price || 0),
          hasLowStock
        };
      }) || [];

      setStockData(combinedData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stockData.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLowStockFilter = !showLowStockOnly || item.hasLowStock;
    
    return matchesSearch && matchesLowStockFilter;
  });

  const totalValue = filteredStock.reduce((sum, item) => sum + item.stockValue, 0);
  const totalItems = filteredStock.length;
  const lowStockItems = filteredStock.filter(item => item.hasLowStock);
  const totalPairs = filteredStock.reduce((sum, item) => sum + item.totalStock, 0);

  const handleEditStock = (item: StockItem) => {
    setSelectedItem({
      id: item.item_id,
      code: item.code,
      color: item.color,
      name: item.name,
      low_stock_threshold: item.low_stock_threshold
    });
    setStockDialogOpen(true);
  };

  const handleDeleteStock = async (item: StockItem) => {
    if (!confirm(`Are you sure you want to delete all store stock for ${item.code} - ${item.color}? This will also delete from main stock.`)) {
      return;
    }

    try {
      // Delete store stock
      const { error: storeError } = await supabase
        .from("stock_by_size")
        .delete()
        .eq("item_id", item.item_id)
        .eq("stock_type", "store");

      if (storeError) throw storeError;

      // Also delete from main stock
      const { error: mainError } = await supabase
        .from("stock_by_size")
        .delete()
        .eq("item_id", item.item_id)
        .eq("stock_type", "main");

      if (mainError) throw mainError;

      toast.success("Store and main stock deleted successfully");
      fetchStock();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-green-500/10 text-green-600">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Store Stock</h1>
            <p className="text-muted-foreground mt-1">View and manage store stock levels</p>
          </div>
        </div>
        <Button onClick={() => {
          setSelectedItem(null);
          setStockDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Stock Value</div>
            <div className="text-2xl font-bold">LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Pairs</div>
            <div className="text-2xl font-bold">{totalPairs.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
        >
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Low Stock Alerts</div>
            <div className="text-2xl font-bold text-destructive">
              {lowStockItems.length}
            </div>
            {showLowStockOnly && (
              <div className="text-xs text-muted-foreground mt-2">
                Click to show all items
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <CardTitle>Store Stock Items</CardTitle>
              {showLowStockOnly && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Low Stock Filter Active
                </Badge>
              )}
            </div>
            <div className="relative w-96">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Art No, Name, or Color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Art No</TableHead>
                    <TableHead className="w-32">Color</TableHead>
                    <TableHead className="w-40">Name</TableHead>
                    <TableHead className="text-center w-16">39</TableHead>
                    <TableHead className="text-center w-16">40</TableHead>
                    <TableHead className="text-center w-16">41</TableHead>
                    <TableHead className="text-center w-16">42</TableHead>
                    <TableHead className="text-center w-16">43</TableHead>
                    <TableHead className="text-center w-16">44</TableHead>
                    <TableHead className="text-center w-16">45</TableHead>
                    <TableHead className="text-right w-20">Total</TableHead>
                    <TableHead className="text-right w-28">Value (LKR)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Store className="h-12 w-12 opacity-50" />
                          <p>No stock found in store stock</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedItem(null);
                              setStockDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Stock
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStock.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-semibold">{item.code}</TableCell>
                        <TableCell className="font-medium">{item.color}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        {['39', '40', '41', '42', '43', '44', '45'].map(size => {
                          const qty = item[`size_${size}` as keyof StockItem] as number;
                          const isLow = qty > 0 && qty < item.low_stock_threshold;
                          const isNegative = qty < 0;
                          return (
                            <TableCell 
                              key={size} 
                              className={`text-center ${isNegative ? 'text-red-600 font-bold' : isLow ? 'text-orange-600' : ''}`}
                            >
                              {qty}
                            </TableCell>
                          );
                        })}
                        <TableCell className={`text-right font-bold ${item.totalStock < 0 ? 'text-red-600' : ''}`}>
                          {item.totalStock}
                        </TableCell>
                        <TableCell className={`text-right ${item.stockValue < 0 ? 'text-red-600' : ''}`}>
                          {item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditStock(item)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteStock(item)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Stock
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StockBySizeDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        preSelectedItem={selectedItem}
        stockType="store"
        onSuccess={fetchStock}
      />
    </div>
  );
}
