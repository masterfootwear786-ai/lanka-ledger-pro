import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
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

export default function CreateOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
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
    fetchCustomers();
    generateOrderNo();
    addNewLine();
  }, []);

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
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Error fetching customers: " + error.message);
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
    setLines(prev => [...prev, newLine]);
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
        grand_total: totals.grandTotal,
      };

      // Create new order
      const { data: newOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

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
              order_id: newOrder.id,
              line_no: lineNo++,
              description: `${line.art_no} - ${line.color} - Size ${size}`,
              quantity: Number(qty),
              unit_price: Number(line.unit_price),
              line_total: Number(qty) * Number(line.unit_price),
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

      toast.success("Order created successfully");
      navigate('/sales/orders');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/sales/orders')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Create New Order</h1>
                <p className="text-sm text-muted-foreground">Add a new sales order</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/sales/orders')}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Order"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Details Card */}
          <div className="bg-card rounded-lg border p-6 space-y-6">
            <h2 className="text-lg font-semibold">Order Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Order Lines Card */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Order Lines</h2>
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
                    <TableHead className="w-[60px] text-center">39</TableHead>
                    <TableHead className="w-[60px] text-center">40</TableHead>
                    <TableHead className="w-[60px] text-center">41</TableHead>
                    <TableHead className="w-[60px] text-center">42</TableHead>
                    <TableHead className="w-[60px] text-center">43</TableHead>
                    <TableHead className="w-[60px] text-center">44</TableHead>
                    <TableHead className="w-[60px] text-center">45</TableHead>
                    <TableHead className="w-[80px] text-center">Total</TableHead>
                    <TableHead className="w-[120px]">Price</TableHead>
                    <TableHead className="w-[120px] text-right">Amount</TableHead>
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
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.color}
                          onChange={(e) => updateLine(line.id, 'color', e.target.value)}
                          placeholder="Color"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_39 || ''}
                          onChange={(e) => updateLine(line.id, 'size_39', e.target.value)}
                          min="0"
                          className="h-9 w-14 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_40 || ''}
                          onChange={(e) => updateLine(line.id, 'size_40', e.target.value)}
                          min="0"
                          className="h-9 w-14 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_41 || ''}
                          onChange={(e) => updateLine(line.id, 'size_41', e.target.value)}
                          min="0"
                          className="h-9 w-14 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_42 || ''}
                          onChange={(e) => updateLine(line.id, 'size_42', e.target.value)}
                          min="0"
                          className="h-9 w-14 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_43 || ''}
                          onChange={(e) => updateLine(line.id, 'size_43', e.target.value)}
                          min="0"
                          className="h-9 w-14 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_44 || ''}
                          onChange={(e) => updateLine(line.id, 'size_44', e.target.value)}
                          min="0"
                          className="h-9 w-14 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_45 || ''}
                          onChange={(e) => updateLine(line.id, 'size_45', e.target.value)}
                          min="0"
                          className="h-9 w-14 text-center"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-center">
                        {line.total_pairs}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.unit_price || ''}
                          onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
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

            {/* Totals */}
            <div className="flex justify-end pt-4 border-t">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-xl font-bold">
                  <span>Grand Total:</span>
                  <span>{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms Card */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Additional Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows={4}
                  placeholder="Terms and conditions..."
                />
              </div>
            </div>
          </div>

          {/* Mobile Save Button */}
          <div className="md:hidden">
            <Button type="submit" className="w-full" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
