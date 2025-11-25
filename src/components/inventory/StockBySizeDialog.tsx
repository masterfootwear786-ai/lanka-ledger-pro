import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StockBySizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedItem?: any;
  onSuccess?: () => void;
}

export function StockBySizeDialog({ open, onOpenChange, preSelectedItem, onSuccess }: StockBySizeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
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
      if (preSelectedItem) {
        setFormData(prev => ({
          ...prev,
          item_id: preSelectedItem.id,
        }));
      } else {
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
      }
    }
  }, [open, preSelectedItem]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("id, code, color, name, low_stock_threshold")
      .eq("track_inventory", true)
      .eq("active", true)
      .order("code");

    if (error) {
      toast.error(error.message);
    } else {
      setItems(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Update or insert stock for each size
      const sizes = ['39', '40', '41', '42', '43', '44', '45'] as const;
      
      for (const size of sizes) {
        const quantity = formData[`size_${size}` as keyof typeof formData] as number;
        
        if (quantity !== 0) {
          // Check if record exists
          const { data: existing } = await supabase
            .from("stock_by_size")
            .select("*")
            .eq("item_id", formData.item_id)
            .eq("size", size)
            .maybeSingle();

          if (existing) {
            // Update existing
            const newQuantity = existing.quantity + quantity;
            await supabase
              .from("stock_by_size")
              .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            // Insert new
            await supabase
              .from("stock_by_size")
              .insert({
                company_id: profile.company_id,
                item_id: formData.item_id,
                size: size,
                quantity: quantity
              });
          }
        }
      }

      toast.success("Stock updated successfully");
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
          <DialogTitle>Add/Adjust Stock by Size</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Select
              value={formData.item_id}
              onValueChange={(value) => setFormData({ ...formData, item_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} - {item.color} - {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <div className="text-sm text-muted-foreground">
                {selectedItem.code} - {selectedItem.color} - {selectedItem.name}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <Label className="text-base font-semibold mb-3 block">Add Stock by Size</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Enter positive numbers to add stock, negative numbers to reduce stock
            </p>
            {selectedItem && selectedItem.low_stock_threshold && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  ⚠️ <strong>Low Stock Warning:</strong> Items below {selectedItem.low_stock_threshold} pieces will be highlighted in red
                </p>
              </div>
            )}
            <div className="grid grid-cols-4 gap-4">
              {(['39', '40', '41', '42', '43', '44', '45'] as const).map((size) => (
                <div key={size} className="space-y-2">
                  <Label>Size {size}</Label>
                  <Input
                    type="number"
                    value={formData[`size_${size}` as keyof typeof formData]}
                    onChange={(e) => setFormData({
                      ...formData,
                      [`size_${size}`]: parseFloat(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.item_id}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
