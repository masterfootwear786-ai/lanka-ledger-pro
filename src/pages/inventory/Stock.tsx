import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Stock() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("track_inventory", true)
        .eq("active", true)
        .order("code");
      
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.color?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = filteredItems.reduce((sum, item) => {
    const itemValue = (item.stock_quantity || 0) * (item.purchase_price || 0);
    return sum + itemValue;
  }, 0);

  const lowStockItems = filteredItems.filter(item => (item.stock_quantity || 0) < 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('inventory.stockOnHand')}</h1>
        <p className="text-muted-foreground mt-2">View current stock levels</p>
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
            <div className="text-2xl font-bold">{filteredItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Low Stock Items</div>
            <div className="text-2xl font-bold text-destructive">
              {lowStockItems.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Stock</CardTitle>
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
          <CardTitle>Stock on Hand</CardTitle>
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
                  <TableHead className="text-right">Stock Qty</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No items found with inventory tracking enabled
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const stockQty = item.stock_quantity || 0;
                    const isLowStock = stockQty < 10;
                    const itemValue = stockQty * (item.purchase_price || 0);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.color || '-'}</TableCell>
                        <TableCell className="text-right">
                          <span className={isLowStock ? "text-destructive font-bold" : ""}>
                            {stockQty.toFixed(0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.purchase_price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {itemValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {isLowStock && (
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Low Stock</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
