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
  const [groupedLines, setGroupedLines] = useState<any[]>([]);

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
      
      // Group lines by Art No and Color
      groupLinesByArtNoColor(lines || []);
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

  const groupLinesByArtNoColor = (lines: any[]) => {
    const grouped = lines.reduce((acc, line) => {
      const parts = (line.description || "").split(" - ");
      const artNo = parts[0] || "";
      const color = parts[1] || "";
      
      const key = `${artNo}|||${color}`;
      
      if (!acc[key]) {
        acc[key] = {
          artNo,
          color,
          unitPrice: line.unit_price || 0,
          sizes: {
            "39": 0,
            "40": 0,
            "41": 0,
            "42": 0,
            "43": 0,
            "44": 0,
            "45": 0
          }
        };
      }
      
      // Read sizes directly from the line columns
      acc[key].sizes["39"] += line.size_39 || 0;
      acc[key].sizes["40"] += line.size_40 || 0;
      acc[key].sizes["41"] += line.size_41 || 0;
      acc[key].sizes["42"] += line.size_42 || 0;
      acc[key].sizes["43"] += line.size_43 || 0;
      acc[key].sizes["44"] += line.size_44 || 0;
      acc[key].sizes["45"] += line.size_45 || 0;
      
      // Use higher unit price if available
      if (line.unit_price > acc[key].unitPrice) {
        acc[key].unitPrice = line.unit_price;
      }
      
      return acc;
    }, {} as Record<string, any>);

    setGroupedLines(Object.values(grouped));
  };

  const handleUpdateGroupedLine = (index: number, field: string, value: any) => {
    const updated = [...groupedLines];
    if (field === "unitPrice") {
      updated[index].unitPrice = parseFloat(value) || 0;
    } else if (field.startsWith("size_")) {
      const size = field.replace("size_", "");
      updated[index].sizes[size] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setGroupedLines(updated);
  };

  const handleAddLine = () => {
    const newGroup = {
      artNo: "",
      color: "",
      unitPrice: 0,
      sizes: {
        "39": 0,
        "40": 0,
        "41": 0,
        "42": 0,
        "43": 0,
        "44": 0,
        "45": 0
      }
    };
    setGroupedLines([...groupedLines, newGroup]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = groupedLines.filter((_, i) => i !== index);
    setGroupedLines(updated);
  };

  const calculateTotals = () => {
    const subtotal = groupedLines.reduce((sum, group) => {
      const totalPairs = Object.values(group.sizes).reduce((s: number, qty: any) => {
        return s + (parseFloat(String(qty)) || 0);
      }, 0);
      const unitPrice = parseFloat(String(group.unitPrice)) || 0;
      const lineTotal = Number(totalPairs) * Number(unitPrice);
      return sum + lineTotal;
    }, 0);
    const taxTotal = 0; // Orders don't have tax
    const discount = parseFloat(orderData?.discount) || 0;
    const grandTotal = subtotal - discount;

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

      // Convert grouped lines to order lines with size columns
      const linesToInsert: any[] = [];
      let lineNo = 1;

      groupedLines.forEach((group) => {
        const totalPairs = 
          (parseFloat(group.sizes["39"]) || 0) +
          (parseFloat(group.sizes["40"]) || 0) +
          (parseFloat(group.sizes["41"]) || 0) +
          (parseFloat(group.sizes["42"]) || 0) +
          (parseFloat(group.sizes["43"]) || 0) +
          (parseFloat(group.sizes["44"]) || 0) +
          (parseFloat(group.sizes["45"]) || 0);

        if (totalPairs > 0) {
          const unitPrice = parseFloat(group.unitPrice) || 0;
          linesToInsert.push({
            order_id: order.id,
            line_no: lineNo++,
            description: `${group.artNo} - ${group.color}`,
            quantity: totalPairs,
            unit_price: unitPrice,
            line_total: totalPairs * unitPrice,
            size_39: parseFloat(group.sizes["39"]) || 0,
            size_40: parseFloat(group.sizes["40"]) || 0,
            size_41: parseFloat(group.sizes["41"]) || 0,
            size_42: parseFloat(group.sizes["42"]) || 0,
            size_43: parseFloat(group.sizes["43"]) || 0,
            size_44: parseFloat(group.sizes["44"]) || 0,
            size_45: parseFloat(group.sizes["45"]) || 0,
            discount: 0,
            tax_amount: 0,
            tax_rate: 0,
          });
        }
      });

      if (linesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("sales_order_lines")
          .insert(linesToInsert);

        if (insertError) throw insertError;
      }

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
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Edit Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-3 bg-background">
          {/* Company Header */}
          <div className="flex items-start justify-between pb-3 border-b border-primary">
            <div className="flex items-start gap-3">
              {companyData?.logo_url && (
                <img 
                  src={companyData.logo_url} 
                  alt={companyData.name} 
                  className="h-14 w-14 object-contain"
                />
              )}
              <div className="space-y-0.5">
                <div className="text-lg font-bold text-primary">{companyData?.name || "Company Name"}</div>
                {companyData?.address && (
                  <div className="text-xs text-muted-foreground">{companyData.address}</div>
                )}
                <div className="text-xs text-muted-foreground space-x-3">
                  {companyData?.phone && <span>Tel: {companyData.phone}</span>}
                  {companyData?.email && <span>Email: {companyData.email}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-primary mb-1">SALES ORDER</div>
              <div className="text-sm font-semibold">#{orderData.order_no}</div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-semibold mb-1">Customer</Label>
                  <Select 
                    value={orderData.customer_id} 
                    onValueChange={(value) => {
                      const customer = customers.find(c => c.id === value);
                      setOrderData({
                        ...orderData, 
                        customer_id: value,
                        customer: customer
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
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

                {orderData.customer?.area && (
                  <div className="text-xs p-2 bg-background rounded border">
                    <span className="text-muted-foreground font-medium">City: </span>
                    <span className="font-semibold">{orderData.customer.area}</span>
                  </div>
                )}

                {orderData.customer?.phone && (
                  <div className="text-xs p-2 bg-background rounded border">
                    <span className="text-muted-foreground font-medium">Phone: </span>
                    <span className="font-semibold">{orderData.customer.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-semibold mb-1">Order Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={orderData.order_date}
                    onChange={(e) => setOrderData({...orderData, order_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-1">Delivery Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={orderData.delivery_date || ""}
                    onChange={(e) => setOrderData({...orderData, delivery_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-semibold mb-1">Status</Label>
                  <Select 
                    value={orderData.status} 
                    onValueChange={(value) => setOrderData({...orderData, status: value})}
                  >
                    <SelectTrigger className="h-8 text-sm">
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
                  <Label className="text-sm font-semibold mb-1">Discount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-sm"
                    value={orderData.discount || 0}
                    onChange={(e) => setOrderData({...orderData, discount: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Editable Line Items - Grouped by Art No and Color */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-primary">ORDER ITEMS</div>
              <Button size="sm" onClick={handleAddLine} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Line
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10 h-8">
                        <TableHead className="w-28 text-xs font-bold border-r">Art No</TableHead>
                        <TableHead className="w-28 text-center text-xs font-bold border-r">Color</TableHead>
                        <TableHead className="w-16 bg-primary/5 text-center text-xs font-bold border-r">39</TableHead>
                        <TableHead className="w-16 text-center text-xs font-bold border-r">40</TableHead>
                        <TableHead className="w-16 bg-primary/5 text-center text-xs font-bold border-r">41</TableHead>
                        <TableHead className="w-16 text-center text-xs font-bold border-r">42</TableHead>
                        <TableHead className="w-16 bg-primary/5 text-center text-xs font-bold border-r">43</TableHead>
                        <TableHead className="w-16 text-center text-xs font-bold border-r">44</TableHead>
                        <TableHead className="w-16 bg-primary/5 text-center text-xs font-bold border-r">45</TableHead>
                        <TableHead className="w-24 text-center text-xs font-bold border-r">Total</TableHead>
                        <TableHead className="w-28 text-right text-xs font-bold border-r">Price</TableHead>
                        <TableHead className="w-32 text-right text-xs font-bold border-r">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedLines.map((group, index) => {
                        const totalPairs = Object.values(group.sizes).reduce((sum: number, qty: any) => {
                          return sum + (parseFloat(String(qty)) || 0);
                        }, 0);
                        const unitPrice = parseFloat(String(group.unitPrice)) || 0;
                        const lineTotal = Number(totalPairs) * Number(unitPrice);
                        
                        return (
                          <TableRow key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <TableCell className="border-r p-1">
                              <Input
                                value={group.artNo}
                                onChange={(e) => handleUpdateGroupedLine(index, "artNo", e.target.value)}
                                placeholder="Art No"
                                className="h-7 text-xs"
                              />
                            </TableCell>
                            <TableCell className="border-r p-1">
                              <Input
                                value={group.color}
                                onChange={(e) => handleUpdateGroupedLine(index, "color", e.target.value)}
                                placeholder="Color"
                                className="h-7 text-xs"
                              />
                            </TableCell>
                            <TableCell className="bg-primary/5 border-r p-1">
                              <Input
                                type="number"
                                step="1"
                                value={group.sizes["39"]}
                                onChange={(e) => handleUpdateGroupedLine(index, "size_39", e.target.value)}
                                className="h-7 text-center text-xs"
                              />
                            </TableCell>
                            <TableCell className="border-r p-1">
                              <Input
                                type="number"
                                step="1"
                                value={group.sizes["40"]}
                                onChange={(e) => handleUpdateGroupedLine(index, "size_40", e.target.value)}
                                className="h-7 text-center text-xs"
                              />
                            </TableCell>
                            <TableCell className="bg-primary/5 border-r p-1">
                              <Input
                                type="number"
                                step="1"
                                value={group.sizes["41"]}
                                onChange={(e) => handleUpdateGroupedLine(index, "size_41", e.target.value)}
                                className="h-7 text-center text-xs"
                              />
                            </TableCell>
                            <TableCell className="border-r p-1">
                              <Input
                                type="number"
                                step="1"
                                value={group.sizes["42"]}
                                onChange={(e) => handleUpdateGroupedLine(index, "size_42", e.target.value)}
                                className="h-7 text-center text-xs"
                              />
                            </TableCell>
                            <TableCell className="bg-primary/5 border-r p-1">
                              <Input
                                type="number"
                                step="1"
                                value={group.sizes["43"]}
                                onChange={(e) => handleUpdateGroupedLine(index, "size_43", e.target.value)}
                                className="h-7 text-center text-xs"
                              />
                            </TableCell>
                            <TableCell className="border-r p-1">
                              <Input
                                type="number"
                                step="1"
                                value={group.sizes["44"]}
                                onChange={(e) => handleUpdateGroupedLine(index, "size_44", e.target.value)}
                                className="h-7 text-center text-xs"
                              />
                            </TableCell>
                            <TableCell className="bg-primary/5 border-r p-1">
                              <Input
                                type="number"
                                step="1"
                                value={group.sizes["45"]}
                                onChange={(e) => handleUpdateGroupedLine(index, "size_45", e.target.value)}
                                className="h-7 text-center text-xs"
                              />
                            </TableCell>
                            <TableCell className="text-center font-semibold border-r text-sm">
                              {totalPairs.toString()}
                            </TableCell>
                            <TableCell className="border-r p-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={group.unitPrice}
                                onChange={(e) => handleUpdateGroupedLine(index, "unitPrice", e.target.value)}
                                className="h-7 text-right text-xs"
                              />
                            </TableCell>
                            <TableCell className="text-right font-semibold border-r text-sm">
                              {lineTotal.toFixed(2)}
                            </TableCell>
                            <TableCell className="p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveLine(index)}
                                className="h-7 w-7"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 bg-muted/30 rounded-lg p-3 border border-border">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Subtotal:</span>
                <span className="font-mono">{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium">Tax:</span>
                <span className="font-mono">{totals.taxTotal.toFixed(2)}</span>
              </div>
              {orderData.discount > 0 && (
                <div className="flex justify-between text-xs text-destructive">
                  <span className="font-medium">Discount:</span>
                  <span className="font-mono">-{parseFloat(orderData.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-primary pt-1.5 mt-1.5"></div>
              <div className="flex justify-between text-sm font-bold text-primary">
                <span>Grand Total:</span>
                <span className="font-mono">{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Notes</Label>
              <Textarea
                value={orderData.notes || ""}
                onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                rows={3}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-sm">Terms</Label>
              <Textarea
                value={orderData.terms || ""}
                onChange={(e) => setOrderData({...orderData, terms: e.target.value})}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="h-8 text-sm">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
