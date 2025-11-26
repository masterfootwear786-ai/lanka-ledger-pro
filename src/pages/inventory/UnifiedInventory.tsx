import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ItemDialog } from "@/components/items/ItemDialog";
import { StockBySizeDialog } from "@/components/inventory/StockBySizeDialog";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  color: string;
  description: string;
  uom: string;
  sale_price: number;
  purchase_price: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  active: boolean;
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

export default function UnifiedInventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Fetch all items
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("active", true)
        .is('deleted_at', null)
        .order("code");
      
      if (itemsError) throw itemsError;

      // Fetch all stock by size records
      const { data: stockBySizeData, error: stockError } = await supabase
        .from("stock_by_size")
        .select("*");
      
      if (stockError) throw stockError;

      // Group stock by item_id
      const stockMap = new Map<string, Map<string, number>>();
      
      stockBySizeData?.forEach(stock => {
        if (!stockMap.has(stock.item_id)) {
          stockMap.set(stock.item_id, new Map());
        }
        stockMap.get(stock.item_id)!.set(stock.size, stock.quantity || 0);
      });

      // Combine items with stock data
      const combinedData: InventoryItem[] = items?.map(item => {
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
        const hasLowStock = size_39 < threshold || size_40 < threshold || size_41 < threshold || 
                           size_42 < threshold || size_43 < threshold || size_44 < threshold || size_45 < threshold;
        
        return {
          id: item.id,
          code: item.code,
          name: item.name,
          color: item.color || '-',
          description: item.description || '',
          uom: item.uom || 'EA',
          sale_price: item.sale_price || 0,
          purchase_price: item.purchase_price || 0,
          low_stock_threshold: threshold,
          track_inventory: item.track_inventory ?? true,
          active: item.active ?? true,
          size_39,
          size_40,
          size_41,
          size_42,
          size_43,
          size_44,
          size_45,
          totalStock,
          stockValue: totalStock * (item.purchase_price || 0),
          hasLowStock
        };
      }) || [];

      setInventoryData(combinedData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLowStockFilter = !showLowStockOnly || item.hasLowStock;
    
    return matchesSearch && matchesLowStockFilter;
  });

  const totalValue = filteredInventory.reduce((sum, item) => sum + item.stockValue, 0);
  const totalItems = filteredInventory.length;
  const lowStockItems = filteredInventory.filter(item => item.hasLowStock);

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemDialogOpen(true);
  };

  const handleManageStock = (item: InventoryItem) => {
    setSelectedItem({
      id: item.id,
      code: item.code,
      color: item.color,
      name: item.name,
      low_stock_threshold: item.low_stock_threshold
    });
    setStockDialogOpen(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete ${item.code} - ${item.color}?`)) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("items")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .eq("id", item.id);
      
      if (error) throw error;
      toast.success("Item moved to trash");
      fetchInventory();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-2">Manage items, stock levels, and pricing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setSelectedItem(null);
            setStockDialogOpen(true);
          }} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
          <Button onClick={() => {
            setSelectedItem(null);
            setItemDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Stock Value</div>
            <div className="text-2xl font-bold">LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold">{totalItems}</div>
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
              <CardTitle>Inventory Items</CardTitle>
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stock">Stock by Size</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Art No</TableHead>
                        <TableHead className="w-32">Color</TableHead>
                        <TableHead className="w-48">Name</TableHead>
                        <TableHead className="text-right w-32">Value</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInventory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono font-semibold">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.color}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">
                              {item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {item.hasLowStock && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Low Stock
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleManageStock(item)}
                                  title="Manage Stock"
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                  title="Edit Item"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item)}
                                  title="Delete Item"
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
                </div>
              )}
            </TabsContent>

            <TabsContent value="stock" className="mt-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Art No</TableHead>
                        <TableHead className="w-32">Color</TableHead>
                        <TableHead className="w-48">Name</TableHead>
                        <TableHead className="text-center w-20">39</TableHead>
                        <TableHead className="text-center w-20">40</TableHead>
                        <TableHead className="text-center w-20">41</TableHead>
                        <TableHead className="text-center w-20">42</TableHead>
                        <TableHead className="text-center w-20">43</TableHead>
                        <TableHead className="text-center w-20">44</TableHead>
                        <TableHead className="text-center w-20">45</TableHead>
                        <TableHead className="text-right w-24">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInventory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono font-semibold">{item.code}</TableCell>
                            <TableCell className="font-medium">{item.color}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className={`text-center ${item.size_39 < item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                              {item.size_39 > 0 ? item.size_39 : '-'}
                              {item.size_39 > 0 && item.size_39 < item.low_stock_threshold && ' ⚠️'}
                            </TableCell>
                            <TableCell className={`text-center ${item.size_40 < item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                              {item.size_40 > 0 ? item.size_40 : '-'}
                              {item.size_40 > 0 && item.size_40 < item.low_stock_threshold && ' ⚠️'}
                            </TableCell>
                            <TableCell className={`text-center ${item.size_41 < item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                              {item.size_41 > 0 ? item.size_41 : '-'}
                              {item.size_41 > 0 && item.size_41 < item.low_stock_threshold && ' ⚠️'}
                            </TableCell>
                            <TableCell className={`text-center ${item.size_42 < item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                              {item.size_42 > 0 ? item.size_42 : '-'}
                              {item.size_42 > 0 && item.size_42 < item.low_stock_threshold && ' ⚠️'}
                            </TableCell>
                            <TableCell className={`text-center ${item.size_43 < item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                              {item.size_43 > 0 ? item.size_43 : '-'}
                              {item.size_43 > 0 && item.size_43 < item.low_stock_threshold && ' ⚠️'}
                            </TableCell>
                            <TableCell className={`text-center ${item.size_44 < item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                              {item.size_44 > 0 ? item.size_44 : '-'}
                              {item.size_44 > 0 && item.size_44 < item.low_stock_threshold && ' ⚠️'}
                            </TableCell>
                            <TableCell className={`text-center ${item.size_45 < item.low_stock_threshold ? 'text-red-600 font-bold' : ''}`}>
                              {item.size_45 > 0 ? item.size_45 : '-'}
                              {item.size_45 > 0 && item.size_45 < item.low_stock_threshold && ' ⚠️'}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${item.hasLowStock ? 'text-destructive' : ''}`}>
                              {item.totalStock}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleManageStock(item)}
                                title="Manage Stock"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pricing" className="mt-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Art No</TableHead>
                        <TableHead className="w-32">Color</TableHead>
                        <TableHead className="w-48">Name</TableHead>
                        <TableHead className="text-right w-32">Purchase Price</TableHead>
                        <TableHead className="text-right w-32">Sale Price</TableHead>
                        <TableHead className="text-right w-32">Margin</TableHead>
                        <TableHead className="text-right w-32">Stock Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInventory.map((item) => {
                          const margin = item.sale_price - item.purchase_price;
                          const marginPercent = item.purchase_price > 0 ? (margin / item.purchase_price) * 100 : 0;
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono font-semibold">{item.code}</TableCell>
                              <TableCell className="font-medium">{item.color}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">
                                {item.purchase_price.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.sale_price.toFixed(2)}
                              </TableCell>
                              <TableCell className={`text-right ${marginPercent < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                  title="Edit Item"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        item={selectedItem}
        onSuccess={fetchInventory}
      />

      <StockBySizeDialog
        open={stockDialogOpen}
        onOpenChange={(open) => {
          setStockDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        preSelectedItem={selectedItem}
        onSuccess={fetchInventory}
      />
    </div>
  );
}
