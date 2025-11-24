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
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
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
      setSelectedColors([]);
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
      setSelectedColors([]);
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

      if (item) {
        // Edit mode - update single item
        const data = {
          ...formData,
          company_id: profile.company_id,
          stock_quantity: formData.stock_quantity ? parseFloat(formData.stock_quantity) : 0,
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
        };
        
        const { error } = await supabase
          .from("items")
          .update(data)
          .eq("id", item.id);
        if (error) throw error;
        toast.success("Item updated successfully");
      } else {
        // Create mode - create items for each selected color
        if (selectedColors.length === 0) {
          throw new Error("Please select at least one color");
        }

        // Check for existing items with same Art No + Color combination
        const { data: existingItems, error: checkError } = await supabase
          .from("items")
          .select("color")
          .eq("code", formData.code)
          .eq("company_id", profile.company_id)
          .in("color", selectedColors);

        if (checkError) throw checkError;

        if (existingItems && existingItems.length > 0) {
          const existingColors = existingItems.map(item => item.color).join(", ");
          throw new Error(`Item with Art No "${formData.code}" already exists with color(s): ${existingColors}. Please unselect these colors.`);
        }

        const itemsToCreate = selectedColors.map(color => ({
          code: formData.code,
          name: formData.name,
          color: color,
          description: formData.description,
          uom: formData.uom,
          stock_quantity: 0, // Always start with 0 stock
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
          track_inventory: formData.track_inventory,
          active: formData.active,
          company_id: profile.company_id,
        }));

        const { error } = await supabase
          .from("items")
          .insert(itemsToCreate);
        if (error) throw error;
        toast.success(`${itemsToCreate.length} item(s) created successfully`);
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
              <Label htmlFor="color">{item ? "Color" : "Colors *"}</Label>
              <div className="flex gap-2">
                {item ? (
                  // Edit mode - single color select
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
                ) : (
                  // Create mode - multi-select colors
                  <div className="flex-1 space-y-2">
                    <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                      {colors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No colors available. Add colors first.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {colors.map((color) => (
                            <label
                              key={color.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedColors.includes(color.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedColors([...selectedColors, color.name]);
                                  } else {
                                    setSelectedColors(selectedColors.filter(c => c !== color.name));
                                  }
                                }}
                                className="h-4 w-4"
                              />
                              {color.hex_code && (
                                <div 
                                  className="w-4 h-4 rounded border" 
                                  style={{ backgroundColor: color.hex_code }}
                                />
                              )}
                              <span className="text-sm">{color.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedColors.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedColors.length} color(s) selected
                      </p>
                    )}
                  </div>
                )}
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
                disabled={!item}
                placeholder={item ? "0" : "Use stock movements to add stock"}
              />
              {!item && (
                <p className="text-xs text-muted-foreground">
                  Stock can only be added through stock movements after creating the item
                </p>
              )}
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