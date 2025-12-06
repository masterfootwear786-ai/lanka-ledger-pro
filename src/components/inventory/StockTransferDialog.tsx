import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Warehouse, Truck } from "lucide-react";

interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StockTransferDialog({ open, onOpenChange, onSuccess }: StockTransferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [warehouseStock, setWarehouseStock] = useState<any>({});
  const [formData, setFormData] = useState({
    item_id: "",
    size_39: 0,
    size_40: 0,
    size_41: 0,
    size_42: 0,
    size_43: 0,
    size_44: 0,
    size_45: 0,
  });

  useEffect(() => {
    if (open) {
      fetchItems();
      setFormData({
        item_id: "",
        size_39: 0,
        size_40: 0,
        size_41: 0,
        size_42: 0,
        size_43: 0,
        size_44: 0,
        size_45: 0,
      });
      setWarehouseStock({});
    }
  }, [open]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, code, color, name")
      .eq("track_inventory", true)
      .eq("active", true)
      .order("code");

    if (error) {
      toast.error(error.message);
    } else {
      setItems(data || []);
    }
  };

  const fetchWarehouseStock = async (itemId: string) => {
    const { data, error } = await supabase
      .from("stock_by_size")
      .select("*")
      .eq("item_id", itemId)
      .eq("stock_type", "store");

    if (error) {
      toast.error(error.message);
    } else {
      const stockMap: any = {};
      data?.forEach(stock => {
        stockMap[`size_${stock.size}`] = stock.quantity || 0;
      });
      setWarehouseStock(stockMap);
    }
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
      
      for (const size of sizes) {
        const transferQty = formData[`size_${size}` as keyof typeof formData] as number;
        const availableQty = warehouseStock[`size_${size}`] || 0;
        
        if (transferQty > 0) {
          // Validate warehouse has enough stock
          if (transferQty > availableQty) {
            throw new Error(`Not enough stock in Warehouse for size ${size}. Available: ${availableQty}`);
          }

          // Deduct from Warehouse stock (stored as 'store' in database)
          const { data: warehouseRecord } = await supabase
            .from("stock_by_size")
            .select("*")
            .eq("item_id", formData.item_id)
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
            .eq("item_id", formData.item_id)
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
                item_id: formData.item_id,
                size: size,
                quantity: transferQty,
                stock_type: "lorry"
              });
          }
        }
      }

      toast.success("Stock transferred from Warehouse to Lorry successfully");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(item => item.id === formData.item_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-green-600" />
            <ArrowRight className="h-4 w-4" />
            <Truck className="h-5 w-5 text-orange-600" />
            Transfer Stock: Warehouse to Lorry
          </DialogTitle>
          <DialogDescription>
            Transfer stock from Warehouse to Lorry. Select an item and enter quantities to transfer.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Item</Label>
            <Select
              value={formData.item_id}
              onValueChange={(value) => {
                setFormData({ 
                  ...formData, 
                  item_id: value,
                  size_39: 0, size_40: 0, size_41: 0, size_42: 0, size_43: 0, size_44: 0, size_45: 0 
                });
                fetchWarehouseStock(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item to transfer" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} - {item.color} - {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Transfer Quantities</Label>
                <div className="text-sm text-muted-foreground">
                  Available in Warehouse → Transfer to Lorry
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {(['39', '40', '41', '42', '43', '44', '45'] as const).map((size) => {
                  const availableQty = warehouseStock[`size_${size}`] || 0;
                  const transferQty = formData[`size_${size}` as keyof typeof formData] as number;
                  
                  return (
                    <div key={size} className="space-y-2">
                      <Label>Size {size}</Label>
                      <div className="text-xs text-green-600 font-medium">
                        Warehouse: {availableQty}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={availableQty}
                        value={transferQty}
                        onChange={(e) => {
                          const value = Math.min(parseFloat(e.target.value) || 0, availableQty);
                          setFormData({
                            ...formData,
                            [`size_${size}`]: value
                          });
                        }}
                        placeholder="0"
                        className={transferQty > availableQty ? 'border-red-500' : ''}
                      />
                      {transferQty > 0 && (
                        <div className="text-xs text-orange-600 font-medium">
                          → Lorry: +{transferQty}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.item_id}>
              {loading ? "Transferring..." : "Transfer Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
