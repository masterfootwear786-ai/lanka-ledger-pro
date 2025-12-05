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
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  discount_selected: boolean;
}

interface BillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: any;
  onSuccess?: () => void;
}

export function BillDialog({ open, onOpenChange, bill, onSuccess }: BillDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
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
      
      if (bill) {
        loadBillData();
      } else {
        form.reset({
          bill_date: new Date().toISOString().split('T')[0],
        });
        setLineItems([{ id: '1', description: '', quantity: 1, unit_price: 0, line_total: 0, discount_selected: false }]);
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
      setLineItems(lines.map((line, idx) => ({
        id: line.id || `${idx}`,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
        discount_selected: false,
      })));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      discount_selected: false,
    }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.line_total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const selectItem = (lineId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateLineItem(lineId, 'description', item.name);
      updateLineItem(lineId, 'unit_price', item.purchase_price || 0);
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
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const grand_total = subtotal - discountAmount;
    return { subtotal, discount: discountAmount, grand_total };
  };

  const onSubmit = async (data: BillFormData) => {
    if (lineItems.length === 0 || !lineItems.some(item => item.description)) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      setLoading(true);
      const { subtotal, discount, grand_total } = calculateTotals();

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
      let bill_no = data.bill_no;

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
            tax_total: 0,
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
            tax_total: 0,
            discount,
            grand_total,
            status: 'draft',
          })
          .select()
          .single();

        if (billError) throw billError;
        billId = newBill.id;
      }

      const lines = lineItems
        .filter(item => item.description)
        .map((item, idx) => ({
          bill_id: billId,
          line_no: idx + 1,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: 0,
          tax_amount: 0,
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

  const { subtotal, discount, grand_total } = calculateTotals();
  const allSelected = lineItems.length > 0 && lineItems.every(item => item.discount_selected);
  const selectedTotal = getSelectedItemsTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
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
                        <Select onValueChange={(value) => selectItem(line.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLineItem(line.id, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLineItem(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLineItem(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {line.line_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(line.id)}
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

          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{subtotal.toFixed(2)}</span>
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
                <span>Total:</span>
                <span>{grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
