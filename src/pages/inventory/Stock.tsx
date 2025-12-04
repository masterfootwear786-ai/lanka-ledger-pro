import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StockBySizeDialog } from "@/components/inventory/StockBySizeDialog";

interface StockBySize {
  item_id: string;
  code: string;
  color: string;
  name: string;
  size_39: number;
  size_40: number;
  size_41: number;
  size_42: number;
  size_43: number;
  size_44: number;
  size_45: number;
  totalStock: number;
  purchasePrice: number;
  stockValue: number;
  lowStockThreshold: number;
}

export default function Stock() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [stockData, setStockData] = useState<StockBySize[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const syncStockFromInvoices = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company assigned");

      // Fetch invoice lines and existing stock in parallel for speed
      const [invoiceLinesResult, existingStockResult] = await Promise.all([
        supabase
          .from("invoice_lines")
          .select("item_id, size_39, size_40, size_41, size_42, size_43, size_44, size_45")
          .is("deleted_at", null),
        supabase
          .from("stock_by_size")
          .select("id, item_id, size, quantity")
          .eq("company_id", profile.company_id)
      ]);

      if (invoiceLinesResult.error) throw invoiceLinesResult.error;
      if (existingStockResult.error) throw existingStockResult.error;

      const invoiceLines = invoiceLinesResult.data || [];
      const existingStock = existingStockResult.data || [];

      // Create lookup map for existing stock records
      const stockLookup = new Map<string, { id: string; quantity: number }>();
      existingStock.forEach((stock) => {
        const key = `${stock.item_id}-${stock.size}`;
        stockLookup.set(key, { id: stock.id, quantity: stock.quantity });
      });

      // Aggregate all invoice quantities by item_id and size
      const aggregated = new Map<string, { item_id: string; size: string; totalSold: number }>();

      invoiceLines.forEach((line) => {
        if (!line.item_id) return;

        const sizes = [
          { size: "39", qty: line.size_39 || 0 },
          { size: "40", qty: line.size_40 || 0 },
          { size: "41", qty: line.size_41 || 0 },
          { size: "42", qty: line.size_42 || 0 },
          { size: "43", qty: line.size_43 || 0 },
          { size: "44", qty: line.size_44 || 0 },
          { size: "45", qty: line.size_45 || 0 },
        ];

        sizes.forEach(({ size, qty }) => {
          if (qty > 0) {
            const key = `${line.item_id}-${size}`;
            const existing = aggregated.get(key);
            if (existing) {
              existing.totalSold += qty;
            } else {
              aggregated.set(key, { item_id: line.item_id, size, totalSold: qty });
            }
          }
        });
      });

      // Prepare batch updates and inserts
      const updates: { id: string; quantity: number }[] = [];
      const inserts: { company_id: string; item_id: string; size: string; quantity: number }[] = [];

      aggregated.forEach(({ item_id, size, totalSold }, key) => {
        const existingRecord = stockLookup.get(key);
        const newQuantity = -totalSold;

        if (existingRecord) {
          updates.push({ id: existingRecord.id, quantity: newQuantity });
        } else {
          inserts.push({
            company_id: profile.company_id,
            item_id,
            size,
            quantity: newQuantity,
          });
        }
      });

      // Execute batch operations in parallel
      const batchPromises: Promise<any>[] = [];

      // Batch updates (groups of 50 for performance)
      const BATCH_SIZE = 50;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        batch.forEach((update) => {
          batchPromises.push(
            (async () => {
              await supabase
                .from("stock_by_size")
                .update({ quantity: update.quantity, updated_at: new Date().toISOString() })
                .eq("id", update.id);
            })()
          );
        });
      }

      // Batch inserts
      if (inserts.length > 0) {
        batchPromises.push(
          (async () => {
            await supabase.from("stock_by_size").insert(inserts);
          })()
        );
      }

      await Promise.all(batchPromises);

      const totalUpdated = updates.length + inserts.length;
      toast.success(`Stock synchronized! Updated ${totalUpdated} size records from ${invoiceLines.length} invoice lines.`);
      fetchStock();
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      // Fetch all items with inventory tracking
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("track_inventory", true)
        .eq("active", true)
        .order("code");

      if (itemsError) throw itemsError;

      // Fetch all stock by size records
      const { data: stockBySizeData, error: stockError } = await supabase.from("stock_by_size").select("*");

      if (stockError) throw stockError;

      // Group stock by item_id
      const stockMap = new Map<string, Map<string, number>>();

      stockBySizeData?.forEach((stock) => {
        if (!stockMap.has(stock.item_id)) {
          stockMap.set(stock.item_id, new Map());
        }
        stockMap.get(stock.item_id)!.set(stock.size, stock.quantity || 0);
      });

      // Combine items with stock data
      const groupedData: StockBySize[] = [];
      const processedKeys = new Set<string>();

      items?.forEach((item) => {
        const key = `${item.code}-${item.color}`;
        if (processedKeys.has(key)) return;
        processedKeys.add(key);

        const sizeStock = stockMap.get(item.id) || new Map();
        const size_39 = sizeStock.get("39") || 0;
        const size_40 = sizeStock.get("40") || 0;
        const size_41 = sizeStock.get("41") || 0;
        const size_42 = sizeStock.get("42") || 0;
        const size_43 = sizeStock.get("43") || 0;
        const size_44 = sizeStock.get("44") || 0;
        const size_45 = sizeStock.get("45") || 0;

        const totalStock = size_39 + size_40 + size_41 + size_42 + size_43 + size_44 + size_45;
        const purchasePrice = item.purchase_price || 0;
        const lowStockThreshold = item.low_stock_threshold || 10;

        groupedData.push({
          item_id: item.id,
          code: item.code,
          color: item.color || "-",
          name: item.name,
          size_39,
          size_40,
          size_41,
          size_42,
          size_43,
          size_44,
          size_45,
          totalStock,
          purchasePrice,
          stockValue: totalStock * purchasePrice,
          lowStockThreshold,
        });
      });

      setStockData(groupedData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stockData.filter(
    (stock) =>
      stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.color?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalValue = filteredStock.reduce((sum, stock) => sum + stock.stockValue, 0);
  const lowStockItems = filteredStock.filter(
    (stock) =>
      stock.size_39 < stock.lowStockThreshold ||
      stock.size_40 < stock.lowStockThreshold ||
      stock.size_41 < stock.lowStockThreshold ||
      stock.size_42 < stock.lowStockThreshold ||
      stock.size_43 < stock.lowStockThreshold ||
      stock.size_44 < stock.lowStockThreshold ||
      stock.size_45 < stock.lowStockThreshold,
  );

  const addStockQuantity = async (itemId: string, size: string, addQty: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) throw new Error("No company assigned");

      const { data: stockRecord } = await supabase
        .from("stock_by_size")
        .select("id, quantity")
        .eq("item_id", itemId)
        .eq("size", size)
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (stockRecord) {
        const newQuantity = (stockRecord.quantity || 0) + addQty;
        await supabase
          .from("stock_by_size")
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stockRecord.id);
      } else {
        await supabase.from("stock_by_size").insert({
          company_id: profile.company_id,
          item_id: itemId,
          size: size,
          quantity: addQty,
        });
      }

      fetchStock();
      toast.success("Stock added successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddStock = (stock: StockBySize) => {
    setSelectedItem({
      id: stock.item_id,
      code: stock.code,
      color: stock.color,
      name: stock.name,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock</h1>
          <p className="text-muted-foreground mt-2">View and manage stock levels by size</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={syncStockFromInvoices} variant="outline" disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sync from Invoices
          </Button>
          <Button
            onClick={() => {
              setSelectedItem(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Stock Value</div>
            <div className="text-2xl font-bold">
              LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold">{filteredStock.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Low Stock Items</div>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
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
              placeholder={t("common.search")}
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
                    <TableHead className="text-right w-24">Total</TableHead>
                    <TableHead className="text-right w-32">Value</TableHead>
                    <TableHead className="w-24"></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center">
                        No items found with inventory tracking enabled
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStock.map((stock, index) => {
                      const hasLowStock =
                        stock.size_39 < stock.lowStockThreshold ||
                        stock.size_40 < stock.lowStockThreshold ||
                        stock.size_41 < stock.lowStockThreshold ||
                        stock.size_42 < stock.lowStockThreshold ||
                        stock.size_43 < stock.lowStockThreshold ||
                        stock.size_44 < stock.lowStockThreshold ||
                        stock.size_45 < stock.lowStockThreshold;

                      return (
                        <TableRow key={`${stock.code}-${stock.color}-${index}`}>
                          <TableCell className="font-mono font-semibold">{stock.code}</TableCell>
                          <TableCell className="font-medium">{stock.color}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{stock.name}</TableCell>
                          <TableCell
                            className={`text-center ${stock.size_39 < 0 ? "text-red-600 font-bold" : stock.size_39 < stock.lowStockThreshold ? "text-orange-600 font-bold" : ""}`}
                          >
                            {stock.size_39}
                            {stock.size_39 > 0 && stock.size_39 < stock.lowStockThreshold && " ⚠️"}
                          </TableCell>
                          <TableCell
                            className={`text-center ${stock.size_40 < 0 ? "text-red-600 font-bold" : stock.size_40 < stock.lowStockThreshold ? "text-orange-600 font-bold" : ""}`}
                          >
                            {stock.size_40}
                            {stock.size_40 > 0 && stock.size_40 < stock.lowStockThreshold && " ⚠️"}
                          </TableCell>
                          <TableCell
                            className={`text-center ${stock.size_41 < 0 ? "text-red-600 font-bold" : stock.size_41 < stock.lowStockThreshold ? "text-orange-600 font-bold" : ""}`}
                          >
                            {stock.size_41}
                            {stock.size_41 > 0 && stock.size_41 < stock.lowStockThreshold && " ⚠️"}
                          </TableCell>
                          <TableCell
                            className={`text-center ${stock.size_42 < 0 ? "text-red-600 font-bold" : stock.size_42 < stock.lowStockThreshold ? "text-orange-600 font-bold" : ""}`}
                          >
                            {stock.size_42}
                            {stock.size_42 > 0 && stock.size_42 < stock.lowStockThreshold && " ⚠️"}
                          </TableCell>
                          <TableCell
                            className={`text-center ${stock.size_43 < 0 ? "text-red-600 font-bold" : stock.size_43 < stock.lowStockThreshold ? "text-orange-600 font-bold" : ""}`}
                          >
                            {stock.size_43}
                            {stock.size_43 > 0 && stock.size_43 < stock.lowStockThreshold && " ⚠️"}
                          </TableCell>
                          <TableCell
                            className={`text-center ${stock.size_44 < 0 ? "text-red-600 font-bold" : stock.size_44 < stock.lowStockThreshold ? "text-orange-600 font-bold" : ""}`}
                          >
                            {stock.size_44}
                            {stock.size_44 > 0 && stock.size_44 < stock.lowStockThreshold && " ⚠️"}
                          </TableCell>
                          <TableCell
                            className={`text-center ${stock.size_45 < 0 ? "text-red-600 font-bold" : stock.size_45 < stock.lowStockThreshold ? "text-orange-600 font-bold" : ""}`}
                          >
                            {stock.size_45}
                            {stock.size_45 > 0 && stock.size_45 < stock.lowStockThreshold && " ⚠️"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={hasLowStock ? "text-destructive font-bold" : "font-semibold"}>
                              {stock.totalStock.toFixed(0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {stock.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {hasLowStock && (
                              <div className="flex items-center gap-1 text-destructive whitespace-nowrap">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs">Low</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleAddStock(stock)} title="Add Stock">
                              <Plus className="h-4 w-4" />
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
        </CardContent>
      </Card>

      <StockBySizeDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        preSelectedItem={selectedItem}
        onSuccess={fetchStock}
      />
    </div>
  );
}
