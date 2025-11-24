import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GroupedStock {
  code: string;
  color: string;
  name: string;
  totalStock: number;
  purchasePrice: number;
  stockValue: number;
  isLowStock: boolean;
}

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

  // Group items by Art No (code) and Color
  const groupedStock: GroupedStock[] = [];
  const groupMap = new Map<string, GroupedStock>();

  filteredItems.forEach(item => {
    const key = `${item.code}-${item.color || 'NO_COLOR'}`;
    
    if (!groupMap.has(key)) {
      const stockQty = item.stock_quantity || 0;
      const purchasePrice = item.purchase_price || 0;
      
      groupMap.set(key, {
        code: item.code,
        color: item.color || '-',
        name: item.name,
        totalStock: stockQty,
        purchasePrice: purchasePrice,
        stockValue: stockQty * purchasePrice,
        isLowStock: stockQty < 10
      });
    }
  });

  groupedStock.push(...groupMap.values());
  groupedStock.sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return a.color.localeCompare(b.color);
  });

  const totalValue = groupedStock.reduce((sum, group) => sum + group.stockValue, 0);
  const lowStockItems = groupedStock.filter(group => group.isLowStock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stock</h1>
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
          <CardTitle>Stock by Design & Color</CardTitle>
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
                    <TableHead className="w-48">Name</TableHead>
                    <TableHead className="text-center w-20">39</TableHead>
                    <TableHead className="text-center w-20">40</TableHead>
                    <TableHead className="text-center w-20">41</TableHead>
                    <TableHead className="text-center w-20">42</TableHead>
                    <TableHead className="text-center w-20">43</TableHead>
                    <TableHead className="text-center w-20">44</TableHead>
                    <TableHead className="text-center w-20">45</TableHead>
                    <TableHead className="text-right w-24">Total Stock</TableHead>
                    <TableHead className="text-right w-32">Purchase Price</TableHead>
                    <TableHead className="text-right w-32">Stock Value</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center">
                        No items found with inventory tracking enabled
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedStock.map((group, index) => (
                      <TableRow key={`${group.code}-${group.color}-${index}`}>
                        <TableCell className="font-mono font-semibold">{group.code}</TableCell>
                        <TableCell className="font-medium">{group.color}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{group.name}</TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                        <TableCell className="text-center text-muted-foreground">-</TableCell>
                        <TableCell className="text-right">
                          <span className={group.isLowStock ? "text-destructive font-bold" : "font-semibold"}>
                            {group.totalStock.toFixed(0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {group.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {group.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {group.isLowStock && (
                            <div className="flex items-center gap-1 text-destructive whitespace-nowrap">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Low</span>
                            </div>
                          )}
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
    </div>
  );
}
