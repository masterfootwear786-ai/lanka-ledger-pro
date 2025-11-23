import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

interface OrderLine {
  id: string;
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
  line_total: number;
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
  const [templates, setTemplates] = useState<any[]>([]);
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
      fetchTemplates();
      
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

  const fetchTemplates = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      const { data, error } = await supabase
        .from('order_templates')
        .select('*')
        .eq('company_id', profileData?.company_id)
        .eq('active', true)
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Error fetching templates: " + error.message);
    }
  };

  const loadTemplate = async (templateId: string) => {
    try {
      const { data: template, error: templateError } = await supabase
        .from('order_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: templateLines, error: linesError } = await supabase
        .from('order_template_lines')
        .select('*')
        .eq('template_id', templateId)
        .order('line_no');

      if (linesError) throw linesError;

      // Load template data into form
      setFormData(prev => ({
        ...prev,
        customer_id: template.customer_id || prev.customer_id,
        notes: template.notes || "",
        terms: template.terms || "",
      }));

      // Load template lines
      if (templateLines && templateLines.length > 0) {
        setLines(templateLines.map(line => ({
          id: crypto.randomUUID(),
          art_no: line.art_no || "",
          color: line.color || "",
          size_39: Number(line.size_39),
          size_40: Number(line.size_40),
          size_41: Number(line.size_41),
          size_42: Number(line.size_42),
          size_43: Number(line.size_43),
          size_44: Number(line.size_44),
          size_45: Number(line.size_45),
          total_pairs: Number(line.size_39) + Number(line.size_40) + Number(line.size_41) + 
                      Number(line.size_42) + Number(line.size_43) + Number(line.size_44) + Number(line.size_45),
          unit_price: Number(line.unit_price),
          line_total: 0,
        })).map(line => {
          line.line_total = line.total_pairs * line.unit_price;
          return line;
        }));
      }

      toast.success("Template loaded successfully");
    } catch (error: any) {
      toast.error("Error loading template: " + error.message);
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

      // Group lines by art_no and color to reconstruct the original line items
      if (orderLines && orderLines.length > 0) {
        const groupedLines: { [key: string]: any } = {};
        
        orderLines.forEach(line => {
          const match = line.description.match(/^(.+?) - (.+?) - Size (\d+)$/);
          const key = match ? `${match[1]}_${match[2]}` : line.description;
          
          if (!groupedLines[key]) {
            groupedLines[key] = {
              id: Math.random().toString(),
              art_no: match ? match[1] : '',
              color: match ? match[2] : '',
              size_39: 0,
              size_40: 0,
              size_41: 0,
              size_42: 0,
              size_43: 0,
              size_44: 0,
              size_45: 0,
              total_pairs: 0,
              unit_price: Number(line.unit_price),
              line_total: 0,
            };
          }
          
          if (match) {
            const size = match[3];
            groupedLines[key][`size_${size}`] = Number(line.quantity);
          }
        });

        const reconstructedLines = Object.values(groupedLines).map((item: any) => {
          item.total_pairs = item.size_39 + item.size_40 + item.size_41 + 
                            item.size_42 + item.size_43 + item.size_44 + item.size_45;
          item.line_total = item.total_pairs * item.unit_price;
          return item;
        });

        setLines(reconstructedLines);
      }
    } catch (error: any) {
      toast.error("Error loading order: " + error.message);
    }
  };

  const addNewLine = () => {
    const newLine: OrderLine = {
      id: crypto.randomUUID(),
      art_no: "",
      color: "",
      size_39: 0,
      size_40: 0,
      size_41: 0,
      size_42: 0,
      size_43: 0,
      size_44: 0,
      size_45: 0,
      total_pairs: 0,
      unit_price: 0,
      line_total: 0,
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof OrderLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;

      const updated = { ...line, [field]: value };

      // Calculate total pairs
      updated.total_pairs = 
        Number(updated.size_39) + Number(updated.size_40) + Number(updated.size_41) + 
        Number(updated.size_42) + Number(updated.size_43) + Number(updated.size_44) + Number(updated.size_45);
      
      // Calculate line total
      updated.line_total = updated.total_pairs * Number(updated.unit_price);

      return updated;
    }));
  };

  const calculateTotals = () => {
    const grandTotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    
    return { grandTotal };
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

      if (lines.length === 0 || lines.every(l => !l.art_no && l.total_pairs === 0)) {
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
        subtotal: totals.grandTotal,
        discount: 0,
        tax_total: 0,
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

      // Insert order lines (expand sizes to individual lines)
      const lineData: any[] = [];
      let lineNo = 1;

      lines.forEach(line => {
        if (!line.art_no && line.total_pairs === 0) return;

        const sizes = [39, 40, 41, 42, 43, 44, 45];
        sizes.forEach(size => {
          const qty = line[`size_${size}` as keyof OrderLine];
          if (qty && Number(qty) > 0) {
            lineData.push({
              order_id: orderId,
              line_no: lineNo++,
              description: `${line.art_no} - ${line.color} - Size ${size}`,
              quantity: Number(qty),
              unit_price: Number(line.unit_price),
              line_total: Number(qty) * Number(line.unit_price),
              tax_rate: Number(line.tax_rate),
              tax_amount: (Number(qty) * Number(line.unit_price) * Number(line.tax_rate)) / 100,
            });
          }
        });
      });

      if (lineData.length > 0) {
        const { error: linesError } = await supabase
          .from('sales_order_lines')
          .insert(lineData);

        if (linesError) throw linesError;
      }

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
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit Order' : 'New Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!order && templates.length > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="mb-2 block">Load from Template</Label>
              <div className="flex gap-2">
                <Select onValueChange={loadTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {template.template_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Art No</TableHead>
                    <TableHead className="w-[200px]">Color</TableHead>
                    <TableHead className="w-[80px]">39</TableHead>
                    <TableHead className="w-[80px]">40</TableHead>
                    <TableHead className="w-[80px]">41</TableHead>
                    <TableHead className="w-[80px]">42</TableHead>
                    <TableHead className="w-[80px]">43</TableHead>
                    <TableHead className="w-[80px]">44</TableHead>
                    <TableHead className="w-[80px]">45</TableHead>
                    <TableHead className="w-[90px]">Total</TableHead>
                    <TableHead className="w-[150px]">Price</TableHead>
                    <TableHead className="w-[150px]">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Input
                          value={line.art_no}
                          onChange={(e) => updateLine(line.id, 'art_no', e.target.value)}
                          placeholder="Art No"
                          className="h-9 text-base font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.color}
                          onChange={(e) => updateLine(line.id, 'color', e.target.value)}
                          placeholder="Color"
                          className="h-9 text-base font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_39}
                          onChange={(e) => updateLine(line.id, 'size_39', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_40}
                          onChange={(e) => updateLine(line.id, 'size_40', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_41}
                          onChange={(e) => updateLine(line.id, 'size_41', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_42}
                          onChange={(e) => updateLine(line.id, 'size_42', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_43}
                          onChange={(e) => updateLine(line.id, 'size_43', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_44}
                          onChange={(e) => updateLine(line.id, 'size_44', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_45}
                          onChange={(e) => updateLine(line.id, 'size_45', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-base">
                        {line.total_pairs}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.unit_price}
                          onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="h-9 text-base font-medium"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-base">
                        {line.line_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          className="h-8 w-8"
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
            <div className="w-80 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.lineDiscounts > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Line Discounts:</span>
                  <span className="font-medium">-{totals.lineDiscounts.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">{totals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="order_discount">Order Discount:</Label>
                <Input
                  id="order_discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-8 w-32 text-right"
                />
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total:</span>
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
