import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedItem?: any;
  onSuccess?: () => void;
}

export function StockMovementDialog({ open, onOpenChange, preSelectedItem, onSuccess }: StockMovementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    item_id: "",
    location_id: "",
    movement_type: "adjustment",
    quantity: "",
    unit_cost: "",
    movement_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchItems();
      fetchLocations();
      if (preSelectedItem) {
        setFormData(prev => ({
          ...prev,
          item_id: preSelectedItem.id,
        }));
      }
    }
  }, [open, preSelectedItem]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("track_inventory", true)
      .eq("active", true)
      .order("code");
    
    if (!error) setItems(data || []);
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("stock_locations")
      .select("*")
      .eq("active", true)
      .order("name");
    
    if (!error) setLocations(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.company_id) throw new Error("No company assigned");

      // Insert stock movement
      const { error } = await supabase
        .from("stock_movements")
        .insert([{
          company_id: profile.company_id,
          item_id: formData.item_id,
          location_id: formData.location_id,
          movement_type: formData.movement_type as any,
          quantity: parseFloat(formData.quantity),
          unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
          movement_date: formData.movement_date,
          notes: formData.notes || null,
          created_by: user.id,
        }]);

      if (error) throw error;

      // Update item stock quantity
      const selectedItem = items.find(i => i.id === formData.item_id);
      if (selectedItem) {
        const quantityChange = formData.movement_type === 'in' || formData.movement_type === 'adjustment' 
          ? parseFloat(formData.quantity)
          : -parseFloat(formData.quantity);

        const { error: updateError } = await supabase
          .from("items")
          .update({
            stock_quantity: (selectedItem.stock_quantity || 0) + quantityChange
          })
          .eq("id", formData.item_id);

        if (updateError) throw updateError;
      }

      toast.success("Stock movement recorded successfully");
      onSuccess?.();
      onOpenChange(false);
      setFormData({
        item_id: "",
        location_id: "",
        movement_type: "adjustment",
        quantity: "",
        unit_cost: "",
        movement_date: new Date().toISOString().split('T')[0],
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(i => i.id === formData.item_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item *</Label>
              <Select
                value={formData.item_id}
                onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code} - {item.name} ({item.color})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedItem && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Current Stock: <span className="font-bold">{selectedItem.stock_quantity || 0}</span> units
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="movement_type">Movement Type *</Label>
              <Select
                value={formData.movement_type}
                onValueChange={(value) => setFormData({ ...formData, movement_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement_date">Movement Date *</Label>
            <Input
              id="movement_date"
              type="date"
              value={formData.movement_date}
              onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Add any additional notes about this movement..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}