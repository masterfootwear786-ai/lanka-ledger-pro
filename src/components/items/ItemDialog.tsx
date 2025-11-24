import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ColorDialog } from "./ColorDialog";

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
  onSuccess?: () => void;
}

export function ItemDialog({ open, onOpenChange, item, onSuccess }: ItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [colors, setColors] = useState<any[]>([]);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    color: "",
    description: "",
    uom: "EA",
    stock_quantity: "0",
    sale_price: "",
    purchase_price: "",
    track_inventory: true,
    active: true,
  });

  const fetchColors = async () => {
    const { data, error } = await supabase
      .from("colors")
      .select("*")
      .eq("active", true)
      .order("name");
    
    if (error) {
      console.error("Error fetching colors:", error);
      return;
    }
    
    setColors(data || []);
  };

  useEffect(() => {
    if (open) {
      fetchColors();
    }
  }, [open]);

  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code || "",
        name: item.name || "",
        color: item.color || "",
        description: item.description || "",
        uom: item.uom || "EA",
        stock_quantity: item.stock_quantity?.toString() || "0",
        sale_price: item.sale_price?.toString() || "",
        purchase_price: item.purchase_price?.toString() || "",
        track_inventory: item.track_inventory ?? true,
        active: item.active ?? true,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        color: "",
        description: "",
        uom: "EA",
        stock_quantity: "0",
        sale_price: "",
        purchase_price: "",
        track_inventory: true,
        active: true,
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw new Error(`Profile error: ${profileError.message}`);
      if (!profile) throw new Error("User profile not found");
      if (!profile.company_id) throw new Error("No company assigned to user");

      const data = {
        ...formData,
        company_id: profile.company_id,
        stock_quantity: formData.stock_quantity ? parseFloat(formData.stock_quantity) : 0,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
      };

      if (item) {
        const { error } = await supabase
          .from("items")
          .update(data)
          .eq("id", item.id);
        if (error) throw error;
        toast.success("Item updated successfully");
      } else {
        const { error } = await supabase
          .from("items")
          .insert([data]);
        if (error) throw error;
        toast.success("Item created successfully");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Art No / Design No *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="e.g., DSG-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {colors.map((color) => (
                      <SelectItem key={color.id} value={color.name}>
                        <div className="flex items-center gap-2">
                          {color.hex_code && (
                            <div 
                              className="w-4 h-4 rounded border" 
                              style={{ backgroundColor: color.hex_code }}
                            />
                          )}
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setColorDialogOpen(true)}
                  title="Add new color"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uom">Unit of Measure</Label>
              <Input
                id="uom"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stock</Label>
              <Input
                id="stock_quantity"
                type="number"
                step="1"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Sale Price</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Purchase Price</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="track_inventory"
                checked={formData.track_inventory}
                onCheckedChange={(checked) => setFormData({ ...formData, track_inventory: checked })}
              />
              <Label htmlFor="track_inventory">Track Inventory</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <ColorDialog 
        open={colorDialogOpen}
        onOpenChange={setColorDialogOpen}
        onSuccess={fetchColors}
      />
    </Dialog>
  );
}