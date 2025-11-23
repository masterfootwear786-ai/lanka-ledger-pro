import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderLine {
  id: string;
  line_no: number;
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_rate: number;
  tax_amount: number;
}

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
  onSuccess: () => void;
}

export function OrderDialog({ open, onOpenChange, order, onSuccess }: OrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    order_no: "",
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: "",
    status: "draft",
    notes: "",
    terms: "",
  });
  const [lines, setLines] = useState<OrderLine[]>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchItems();
      
      if (order) {
        loadOrderData();
      } else {
        generateOrderNo();
        addNewLine();
      }
    } else {
      resetForm();
    }
  }, [open, order]);

  const fetchCustomers = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', profileData?.company_id)
        .eq('contact_type', 'customer')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Error fetching customers: " + error.message);
    }
  };

  const fetchItems = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('company_id', profileData?.company_id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error("Error fetching items: " + error.message);
    }
  };

  const generateOrderNo = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      const { data, error } = await supabase
        .from('sales_orders')
        .select('order_no')
        .eq('company_id', profileData?.company_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNo = 1;
      if (data && data.length > 0) {
        const lastNo = data[0].order_no;
        const match = lastNo.match(/\d+$/);
        if (match) {
          nextNo = parseInt(match[0]) + 1;
        }
      }

      setFormData(prev => ({
        ...prev,
        order_no: `SO-${String(nextNo).padStart(5, '0')}`
      }));
    } catch (error: any) {
      toast.error("Error generating order number: " + error.message);
    }
  };

  const loadOrderData = async () => {
    try {
      const { data: orderLines, error } = await supabase
        .from('sales_order_lines')
        .select('*')
        .eq('order_id', order.id)
        .order('line_no');

      if (error) throw error;

      setFormData({
        customer_id: order.customer_id,
        order_no: order.order_no,
        order_date: order.order_date,
        delivery_date: order.delivery_date || "",
        status: order.status,
        notes: order.notes || "",
        terms: order.terms || "",
      });

      setLines(orderLines.map(line => ({
        id: line.id,
        line_no: line.line_no,
        item_id: line.item_id || "",
        description: line.description,
        quantity: Number(line.quantity),
        unit_price: Number(line.unit_price),
        line_total: Number(line.line_total),
        tax_rate: Number(line.tax_rate),
        tax_amount: Number(line.tax_amount),
      })));
    } catch (error: any) {
      toast.error("Error loading order: " + error.message);
    }
  };

  const addNewLine = () => {
    const newLine: OrderLine = {
      id: crypto.randomUUID(),
      line_no: lines.length + 1,
      item_id: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      line_total: 0,
      tax_rate: 0,
      tax_amount: 0,
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: string, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;

      const updated = { ...line, [field]: value };

      // If item selected, populate description and price
      if (field === 'item_id' && value) {
        const item = items.find(i => i.id === value);
        if (item) {
          updated.description = item.name;
          updated.unit_price = Number(item.sale_price || 0);
        }
      }

      // Recalculate totals
      const quantity = Number(updated.quantity);
      const unitPrice = Number(updated.unit_price);
      const taxRate = Number(updated.tax_rate);

      updated.line_total = quantity * unitPrice;
      updated.tax_amount = (updated.line_total * taxRate) / 100;

      return updated;
    }));
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const taxTotal = lines.reduce((sum, line) => sum + line.tax_amount, 0);
    const grandTotal = subtotal + taxTotal;
    
    return { subtotal, taxTotal, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profileData?.company_id) {
        throw new Error("Company not found");
      }

      if (!formData.customer_id) {
        throw new Error("Please select a customer");
      }

      if (lines.length === 0 || lines.every(l => !l.description)) {
        throw new Error("Please add at least one line item");
      }

      const totals = calculateTotals();

      const orderData = {
        company_id: profileData.company_id,
        customer_id: formData.customer_id,
        order_no: formData.order_no,
        order_date: formData.order_date,
        delivery_date: formData.delivery_date || null,
        status: formData.status,
        notes: formData.notes,
        terms: formData.terms,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        grand_total: totals.grandTotal,
      };

      let orderId: string;

      if (order) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('sales_orders')
          .update(orderData)
          .eq('id', order.id);

        if (orderError) throw orderError;
        orderId = order.id;

        // Delete existing lines
        const { error: deleteError } = await supabase
          .from('sales_order_lines')
          .delete()
          .eq('order_id', order.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('sales_orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = newOrder.id;
      }

      // Insert order lines
      const lineData = lines
        .filter(line => line.description)
        .map((line, index) => ({
          order_id: orderId,
          line_no: index + 1,
          item_id: line.item_id || null,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          line_total: line.line_total,
          tax_rate: line.tax_rate,
          tax_amount: line.tax_amount,
        }));

      const { error: linesError } = await supabase
        .from('sales_order_lines')
        .insert(lineData);

      if (linesError) throw linesError;

      toast.success(order ? "Order updated successfully" : "Order created successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: "",
      order_no: "",
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: "",
      status: "draft",
      notes: "",
      terms: "",
    });
    setLines([]);
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit Order' : 'New Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.code} - {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_no">Order No *</Label>
              <Input
                id="order_no"
                value={formData.order_no}
                onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_date">Order Date *</Label>
              <Input
                id="order_date"
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Order Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addNewLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="w-[120px]">Price</TableHead>
                    <TableHead className="w-[100px]">Tax %</TableHead>
                    <TableHead className="w-[120px]">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Select
                          value={line.item_id}
                          onValueChange={(value) => updateLine(line.id, 'item_id', value)}
                        >
                          <SelectTrigger>
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
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                          min="0"
                          step="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.unit_price}
                          onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.tax_rate}
                          onChange={(e) => updateLine(line.id, 'tax_rate', e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {(line.line_total + line.tax_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
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
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{totals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms</Label>
              <Textarea
                id="terms"
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : order ? "Update Order" : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
