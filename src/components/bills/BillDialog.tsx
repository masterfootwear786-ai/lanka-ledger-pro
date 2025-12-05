import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const billSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  bill_no: z.string().min(1, "Bill number is required").max(50),
  bill_date: z.string(),
  due_date: z.string().optional(),
  supplier_ref: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

type BillFormData = z.infer<typeof billSchema>;

interface LineItem {
  id: string;
  item_id: string;
  art_no: string;
  color: string;
  size_39: number;
  size_40: number;
  size_41: number;
  size_42: number;
  size_43: number;
  size_44: number;
  size_45: number;
  total_pairs: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
  discount_selected: boolean;
}

interface BillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: any;
  onSuccess?: () => void;
}

const SIZES = ['39', '40', '41', '42', '43', '44', '45'] as const;

const createEmptyLineItem = (): LineItem => ({
  id: Date.now().toString(),
  item_id: '',
  art_no: '',
  color: '',
  size_39: 0,
  size_40: 0,
  size_41: 0,
  size_42: 0,
  size_43: 0,
  size_44: 0,
  size_45: 0,
  total_pairs: 0,
  unit_price: 0,
  tax_rate: 0,
  line_total: 0,
  discount_selected: false,
});

export function BillDialog({ open, onOpenChange, bill, onSuccess }: BillDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const form = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      bill_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchItems();
      fetchColors();
      
      if (bill) {
        loadBillData();
      } else {
        form.reset({
          bill_date: new Date().toISOString().split('T')[0],
        });
        setLineItems([createEmptyLineItem()]);
        setDiscountAmount(0);
      }
    }
  }, [open, bill]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_type', 'supplier')
      .eq('active', true);
    if (data) setSuppliers(data);
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('active', true);
    if (data) setItems(data);
  };

  const fetchColors = async () => {
    const { data } = await supabase
      .from('colors')
      .select('*')
      .eq('active', true);
    if (data) setColors(data);
  };

  const loadBillData = async () => {
    if (!bill) return;

    form.reset({
      supplier_id: bill.supplier_id,
      bill_no: bill.bill_no,
      bill_date: bill.bill_date,
      due_date: bill.due_date || '',
      supplier_ref: bill.supplier_ref || '',
      notes: bill.notes || '',
    });

    setDiscountAmount(bill.discount || 0);

    const { data: lines } = await supabase
      .from('bill_lines')
      .select('*')
      .eq('bill_id', bill.id)
      .order('line_no');

    if (lines && lines.length > 0) {
      // Try to match description with items to get art_no and color
      setLineItems(lines.map((line, idx) => {
        const matchedItem = items.find(i => i.name === line.description || i.code === line.description);
        return {
          id: line.id || `${idx}`,
          item_id: line.item_id || '',
          art_no: matchedItem?.code || line.description?.split(' - ')[0] || '',
          color: matchedItem?.color || line.description?.split(' - ')[1] || '',
          size_39: 0,
          size_40: 0,
          size_41: 0,
          size_42: 0,
          size_43: 0,
          size_44: 0,
          size_45: 0,
          total_pairs: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate || 0,
          line_total: line.line_total,
          discount_selected: false,
        };
      }));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, createEmptyLineItem()]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate total pairs if size field changed
        if (field.startsWith('size_')) {
          updated.total_pairs = 
            updated.size_39 + updated.size_40 + updated.size_41 + 
            updated.size_42 + updated.size_43 + updated.size_44 + updated.size_45;
        }
        
        // Recalculate line total
        if (field.startsWith('size_') || field === 'unit_price' || field === 'tax_rate') {
          const subtotal = updated.total_pairs * updated.unit_price;
          updated.line_total = subtotal + (subtotal * updated.tax_rate / 100);
        }
        
        return updated;
      }
      return item;
    }));
  };

  const selectItem = (lineId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setLineItems(lineItems.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            item_id: itemId,
            art_no: item.code || '',
            color: item.color || '',
            unit_price: item.purchase_price || 0,
          };
        }
        return line;
      }));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setLineItems(lineItems.map(item => ({ ...item, discount_selected: checked })));
  };

  const getSelectedItemsTotal = () => {
    return lineItems
      .filter(item => item.discount_selected)
      .reduce((sum, item) => sum + item.line_total, 0);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total_pairs * item.unit_price), 0);
    const tax_total = lineItems.reduce((sum, item) => sum + (item.total_pairs * item.unit_price * item.tax_rate / 100), 0);
    const grand_total = subtotal + tax_total - discountAmount;
    return { subtotal, tax_total, discount: discountAmount, grand_total };
  };

  const onSubmit = async (data: BillFormData) => {
    const validLines = lineItems.filter(item => item.art_no || item.total_pairs > 0);
    if (validLines.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      setLoading(true);
      const { subtotal, tax_total, discount, grand_total } = calculateTotals();

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

      let billId = bill?.id;

      if (bill) {
        const { error: updateError } = await supabase
          .from('bills')
          .update({
            supplier_id: data.supplier_id,
            bill_no: data.bill_no,
            bill_date: data.bill_date,
            due_date: data.due_date,
            supplier_ref: data.supplier_ref,
            notes: data.notes,
            subtotal,
            tax_total,
            discount,
            grand_total,
          })
          .eq('id', bill.id);

        if (updateError) throw updateError;

        const { error: deleteLinesError } = await supabase
          .from('bill_lines')
          .delete()
          .eq('bill_id', bill.id);

        if (deleteLinesError) throw deleteLinesError;
      } else {
        const { data: newBill, error: billError } = await supabase
          .from('bills')
          .insert({
            company_id: profile.company_id,
            supplier_id: data.supplier_id,
            bill_no: data.bill_no,
            bill_date: data.bill_date,
            due_date: data.due_date,
            supplier_ref: data.supplier_ref,
            notes: data.notes,
            subtotal,
            tax_total,
            discount,
            grand_total,
            status: 'draft',
          })
          .select()
          .single();

        if (billError) throw billError;
        billId = newBill.id;
      }

      const lines = validLines.map((item, idx) => ({
        bill_id: billId,
        line_no: idx + 1,
        item_id: item.item_id || null,
        description: item.art_no && item.color ? `${item.art_no} - ${item.color}` : item.art_no || 'Item',
        quantity: item.total_pairs,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        tax_amount: (item.total_pairs * item.unit_price) * (item.tax_rate / 100),
        line_total: item.line_total,
      }));

      const { error: linesError } = await supabase
        .from('bill_lines')
        .insert(lines);

      if (linesError) throw linesError;

      toast.success(bill ? "Bill updated successfully" : "Bill created successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax_total, discount, grand_total } = calculateTotals();
  const allSelected = lineItems.length > 0 && lineItems.every(item => item.discount_selected);
  const selectedTotal = getSelectedItemsTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bill ? "Edit Bill" : "Create Bill"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select
                value={form.watch("supplier_id")}
                onValueChange={(value) => form.setValue("supplier_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.supplier_id && (
                <p className="text-sm text-destructive">{form.formState.errors.supplier_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill_no">Bill Number *</Label>
              <Input
                id="bill_no"
                {...form.register("bill_no")}
                placeholder="BILL-001"
              />
              {form.formState.errors.bill_no && (
                <p className="text-sm text-destructive">{form.formState.errors.bill_no.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bill_date">Bill Date *</Label>
              <Input
                id="bill_date"
                type="date"
                {...form.register("bill_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...form.register("due_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_ref">Supplier Reference</Label>
              <Input
                id="supplier_ref"
                {...form.register("supplier_ref")}
                placeholder="REF-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="min-w-[120px]">Art No</TableHead>
                    <TableHead className="min-w-[100px]">Color</TableHead>
                    {SIZES.map(size => (
                      <TableHead key={size} className="w-16 text-center">{size}</TableHead>
                    ))}
                    <TableHead className="w-20 text-center">Total</TableHead>
                    <TableHead className="w-24">Price</TableHead>
                    <TableHead className="w-20">Tax %</TableHead>
                    <TableHead className="w-28 text-right">Line Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Checkbox
                          checked={line.discount_selected}
                          onCheckedChange={(checked) => updateLineItem(line.id, 'discount_selected', !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.art_no}
                          onChange={(e) => updateLineItem(line.id, 'art_no', e.target.value)}
                          placeholder="Art No"
                          className="min-w-[100px]"
                          list={`items-${line.id}`}
                        />
                        <datalist id={`items-${line.id}`}>
                          {items.map((item) => (
                            <option key={item.id} value={item.code}>
                              {item.name}
                            </option>
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.color}
                          onChange={(e) => updateLineItem(line.id, 'color', e.target.value)}
                          placeholder="Color"
                          className="min-w-[80px]"
                          list={`colors-${line.id}`}
                        />
                        <datalist id={`colors-${line.id}`}>
                          {colors.map((color) => (
                            <option key={color.id} value={color.name} />
                          ))}
                        </datalist>
                      </TableCell>
                      {SIZES.map(size => (
                        <TableCell key={size}>
                          <Input
                            type="number"
                            min="0"
                            value={(line[`size_${size}` as keyof LineItem] as number) || 0}
                            onChange={(e) => updateLineItem(line.id, `size_${size}` as keyof LineItem, parseInt(e.target.value) || 0)}
                            className="w-14 text-center px-1"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-medium">
                        {line.total_pairs}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLineItem(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={line.tax_rate}
                          onChange={(e) => updateLineItem(line.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {line.line_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(line.id)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">{tax_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-28 text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {selectedTotal > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Selected Items Total:</span>
                  <span>{selectedTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Grand Total:</span>
                <span>{grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : bill ? "Update Bill" : "Create Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
