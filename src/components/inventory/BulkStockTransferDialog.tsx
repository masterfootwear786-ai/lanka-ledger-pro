import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Warehouse, Truck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StockItem {
  id: string;
  item_id: string;
  code: string;
  name: string;
  color: string;
  size_39: number;
  size_40: number;
  size_41: number;
  size_42: number;
  size_43: number;
  size_44: number;
  size_45: number;
}

interface BulkStockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: StockItem[];
  onSuccess?: () => void;
}

export function BulkStockTransferDialog({ open, onOpenChange, selectedItems, onSuccess }: BulkStockTransferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [transferData, setTransferData] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (open && selectedItems.length > 0) {
      // Initialize transfer data with all available warehouse quantities
      const initialData: Record<string, Record<string, number>> = {};
      selectedItems.forEach(item => {
        initialData[item.item_id] = {
          size_39: item.size_39 || 0,
          size_40: item.size_40 || 0,
          size_41: item.size_41 || 0,
          size_42: item.size_42 || 0,
          size_43: item.size_43 || 0,
          size_44: item.size_44 || 0,
          size_45: item.size_45 || 0,
        };
      });
      setTransferData(initialData);
    }
  }, [open, selectedItems]);

  const handleTransferQtyChange = (itemId: string, size: string, value: number, maxValue: number) => {
    const newValue = Math.min(Math.max(0, value), maxValue);
    setTransferData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [size]: newValue
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      const sizes = ['39', '40', '41', '42', '43', '44', '45'] as const;
      let totalTransferred = 0;

      for (const item of selectedItems) {
        const itemTransferData = transferData[item.item_id];
        if (!itemTransferData) continue;

        for (const size of sizes) {
          const transferQty = itemTransferData[`size_${size}`] || 0;
          const availableQty = item[`size_${size}` as keyof StockItem] as number || 0;
          
          if (transferQty > 0 && transferQty <= availableQty) {
            // Deduct from Warehouse stock
            const { data: warehouseRecord } = await supabase
              .from("stock_by_size")
              .select("*")
              .eq("item_id", item.item_id)
              .eq("size", size)
              .eq("stock_type", "store")
              .maybeSingle();

            if (warehouseRecord) {
              await supabase
                .from("stock_by_size")
                .update({ 
                  quantity: warehouseRecord.quantity - transferQty, 
                  updated_at: new Date().toISOString() 
                })
                .eq("id", warehouseRecord.id);
            }

            // Add to Lorry stock
            const { data: lorryRecord } = await supabase
              .from("stock_by_size")
              .select("*")
              .eq("item_id", item.item_id)
              .eq("size", size)
              .eq("stock_type", "lorry")
              .maybeSingle();

            if (lorryRecord) {
              await supabase
                .from("stock_by_size")
                .update({ 
                  quantity: lorryRecord.quantity + transferQty, 
                  updated_at: new Date().toISOString() 
                })
                .eq("id", lorryRecord.id);
            } else {
              await supabase
                .from("stock_by_size")
                .insert({
                  company_id: profile.company_id,
                  item_id: item.item_id,
                  size: size,
                  quantity: transferQty,
                  stock_type: "lorry"
                });
            }

            totalTransferred += transferQty;
          }
        }
      }

      toast.success(`${totalTransferred} pairs transferred from Warehouse to Lorry`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTotalTransfer = () => {
    let total = 0;
    Object.values(transferData).forEach(sizes => {
      Object.values(sizes).forEach(qty => {
        total += qty || 0;
      });
    });
    return total;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-green-600" />
            <ArrowRight className="h-4 w-4" />
            <Truck className="h-5 w-5 text-orange-600" />
            Bulk Transfer: Warehouse to Lorry ({selectedItems.length} items)
          </DialogTitle>
          <DialogDescription>
            Transfer selected items from Warehouse to Lorry. Adjust quantities as needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ScrollArea className="h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 w-28">Art No</TableHead>
                  <TableHead className="w-24">Color</TableHead>
                  <TableHead className="text-center w-20">39</TableHead>
                  <TableHead className="text-center w-20">40</TableHead>
                  <TableHead className="text-center w-20">41</TableHead>
                  <TableHead className="text-center w-20">42</TableHead>
                  <TableHead className="text-center w-20">43</TableHead>
                  <TableHead className="text-center w-20">44</TableHead>
                  <TableHead className="text-center w-20">45</TableHead>
                  <TableHead className="text-right w-20">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map((item) => {
                  const itemData = transferData[item.item_id] || {};
                  const totalTransfer = Object.values(itemData).reduce((sum, qty) => sum + (qty || 0), 0);
                  
                  return (
                    <TableRow key={item.item_id}>
                      <TableCell className="font-mono font-semibold sticky left-0 bg-background">
                        {item.code}
                      </TableCell>
                      <TableCell className="font-medium">{item.color}</TableCell>
                      {['39', '40', '41', '42', '43', '44', '45'].map(size => {
                        const maxQty = item[`size_${size}` as keyof StockItem] as number || 0;
                        const currentQty = itemData[`size_${size}`] || 0;
                        
                        return (
                          <TableCell key={size} className="p-1">
                            <div className="space-y-1">
                              <div className="text-xs text-green-600 text-center">{maxQty}</div>
                              <Input
                                type="number"
                                min="0"
                                max={maxQty}
                                value={currentQty}
                                onChange={(e) => handleTransferQtyChange(
                                  item.item_id, 
                                  `size_${size}`, 
                                  parseInt(e.target.value) || 0,
                                  maxQty
                                )}
                                className="h-8 text-center text-sm w-16"
                                disabled={maxQty === 0}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold text-orange-600">
                        {totalTransfer}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Total to transfer: </span>
              <span className="font-bold text-orange-600">{getTotalTransfer()} pairs</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || getTotalTransfer() === 0}>
                {loading ? "Transferring..." : `Transfer ${getTotalTransfer()} Pairs`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
