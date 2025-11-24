import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess: () => void;
}

export function OrderEditDialog({ open, onOpenChange, order, onSuccess }: OrderEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [orderLines, setOrderLines] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (open && order) {
      loadOrderData();
      loadCustomers();
    }
  }, [open, order]);

  const loadOrderData = async () => {
    try {
      // Fetch order details
      const { data: orderDetails, error: orderError } = await supabase
        .from("sales_orders")
        .select("*, customer:contacts(id, name, area)")
        .eq("id", order.id)
        .single();

      if (orderError) throw orderError;

      // Fetch order lines
      const { data: lines, error: linesError } = await supabase
        .from("sales_order_lines")
        .select("*")
        .eq("order_id", order.id)
        .order("line_no", { ascending: true });

      if (linesError) throw linesError;

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", orderDetails.company_id)
        .single();

      if (companyError) throw companyError;

      setOrderData(orderDetails);
      setOrderLines(lines || []);
      setCompanyData(company);
    } catch (error: any) {
      toast.error("Error loading order: " + error.message);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profileData?.company_id) return;

      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", profileData.company_id)
        .eq("contact_type", "customer")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Error loading customers: " + error.message);
    }
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    const updatedLines = [...orderLines];
    updatedLines[index] = {
      ...updatedLines[index],
      [field]: value,
    };

    // Recalculate line total
    if (field === "quantity" || field === "unit_price") {
      const quantity = field === "quantity" ? parseFloat(value) || 0 : updatedLines[index].quantity;
      const unitPrice = field === "unit_price" ? parseFloat(value) || 0 : updatedLines[index].unit_price;
      updatedLines[index].line_total = quantity * unitPrice;
    }

    setOrderLines(updatedLines);
  };

  const handleAddLine = () => {
    const newLine = {
      id: `temp-${Date.now()}`,
      order_id: order.id,
      line_no: orderLines.length + 1,
      description: "",
      quantity: 0,
      unit_price: 0,
      line_total: 0,
      discount: 0,
      tax_amount: 0,
      tax_rate: 0,
    };
    setOrderLines([...orderLines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    const updatedLines = orderLines.filter((_, i) => i !== index);
    // Renumber lines
    updatedLines.forEach((line, i) => {
      line.line_no = i + 1;
    });
    setOrderLines(updatedLines);
  };

  const calculateTotals = () => {
    const subtotal = orderLines.reduce((sum, line) => sum + (parseFloat(line.line_total) || 0), 0);
    const taxTotal = orderLines.reduce((sum, line) => sum + (parseFloat(line.tax_amount) || 0), 0);
    const discount = parseFloat(orderData?.discount) || 0;
    const grandTotal = subtotal + taxTotal - discount;

    return { subtotal, taxTotal, grandTotal };
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const totals = calculateTotals();

      // Update order header
      const { error: orderError } = await supabase
        .from("sales_orders")
        .update({
          customer_id: orderData.customer_id,
          order_date: orderData.order_date,
          delivery_date: orderData.delivery_date,
          status: orderData.status,
          notes: orderData.notes,
          terms: orderData.terms,
          subtotal: totals.subtotal,
          tax_total: totals.taxTotal,
          discount: orderData.discount || 0,
          grand_total: totals.grandTotal,
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Delete existing lines
      const { error: deleteError } = await supabase
        .from("sales_order_lines")
        .delete()
        .eq("order_id", order.id);

      if (deleteError) throw deleteError;

      // Insert updated lines
      const linesToInsert = orderLines.map((line) => ({
        order_id: order.id,
        line_no: line.line_no,
        description: line.description,
        quantity: parseFloat(line.quantity) || 0,
        unit_price: parseFloat(line.unit_price) || 0,
        line_total: parseFloat(line.line_total) || 0,
        discount: parseFloat(line.discount) || 0,
        tax_amount: parseFloat(line.tax_amount) || 0,
        tax_rate: parseFloat(line.tax_rate) || 0,
        tax_code: line.tax_code,
        item_id: line.item_id,
        account_id: line.account_id,
      }));

      const { error: insertError } = await supabase
        .from("sales_order_lines")
        .insert(linesToInsert);

      if (insertError) throw insertError;

      toast.success("Order updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error saving order: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!orderData) return null;

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6 bg-background">
          {/* Company Header */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-primary">
            <div className="flex items-start gap-6">
              {companyData?.logo_url && (
                <img 
                  src={companyData.logo_url} 
                  alt={companyData.name} 
                  className="h-20 w-20 object-contain"
                />
              )}
              <div className="space-y-1">
                <div className="text-2xl font-bold text-primary">{companyData?.name || "Company Name"}</div>
                {companyData?.address && (
                  <div className="text-sm text-muted-foreground">{companyData.address}</div>
                )}
                <div className="text-sm text-muted-foreground space-x-4">
                  {companyData?.phone && <span>Tel: {companyData.phone}</span>}
                  {companyData?.email && <span>Email: {companyData.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary mb-2">SALES ORDER</div>
              <div className="text-lg font-semibold">#{orderData.order_no}</div>
            </div>
          </div>

          {/* Editable Order Details */}
          <div className="grid grid-cols-2 gap-6 bg-muted/30 rounded-lg p-4">
            <div className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select 
                  value={orderData.customer_id} 
                  onValueChange={(value) => setOrderData({...orderData, customer_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={orderData.order_date}
                  onChange={(e) => setOrderData({...orderData, order_date: e.target.value})}
                />
              </div>

              <div>
                <Label>Delivery Date</Label>
                <Input
                  type="date"
                  value={orderData.delivery_date || ""}
                  onChange={(e) => setOrderData({...orderData, delivery_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select 
                  value={orderData.status} 
                  onValueChange={(value) => setOrderData({...orderData, status: value})}
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

              <div>
                <Label>Discount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={orderData.discount || 0}
                  onChange={(e) => setOrderData({...orderData, discount: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Editable Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-primary">ORDER ITEMS</div>
              <Button size="sm" onClick={handleAddLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
            
            <div className="overflow-hidden rounded-lg border-2 border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead className="min-w-[300px]">Description</TableHead>
                    <TableHead className="w-24 text-center">Quantity</TableHead>
                    <TableHead className="w-32 text-right">Unit Price</TableHead>
                    <TableHead className="w-32 text-right">Line Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderLines.map((line, index) => (
                    <TableRow key={line.id || index}>
                      <TableCell>{line.line_no}</TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => handleUpdateLine(index, "description", e.target.value)}
                          placeholder="Art No - Color - Size XX"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateLine(index, "quantity", e.target.value)}
                          className="text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => handleUpdateLine(index, "unit_price", e.target.value)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {line.line_total?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2 bg-muted/30 rounded-lg p-4 border-2 border-border">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Subtotal:</span>
                <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Tax:</span>
                <span className="font-mono">{totals.taxTotal.toFixed(2)}</span>
              </div>
              {orderData.discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span className="font-medium">Discount:</span>
                  <span className="font-mono">-{parseFloat(orderData.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t-2 border-primary pt-2 mt-2"></div>
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>Grand Total:</span>
                <span className="font-mono">{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Notes</Label>
              <Textarea
                value={orderData.notes || ""}
                onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                rows={4}
              />
            </div>
            <div>
              <Label>Terms</Label>
              <Textarea
                value={orderData.terms || ""}
                onChange={(e) => setOrderData({...orderData, terms: e.target.value})}
                rows={4}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
