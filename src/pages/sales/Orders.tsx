import { useState, useEffect } from "react";
import { Plus, Eye, Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoiceDialog } from "@/components/invoices/InvoiceDialog";
import { OrderEditDialog } from "@/components/orders/OrderEditDialog";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [orderLines, setOrderLines] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [orderToConvert, setOrderToConvert] = useState<any>(null);
  const [convertOrderLines, setConvertOrderLines] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profileData?.company_id) {
        toast.error("Company not found");
        return;
      }

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:contacts(id, code, name)
        `)
        .eq('company_id', profileData.company_id)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Error fetching orders: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (order: any) => {
    try {
      const { data: lines, error } = await supabase
        .from("sales_order_lines")
        .select("*")
        .eq("order_id", order.id)
        .order("line_no", { ascending: true });

      if (error) throw error;

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", order.company_id)
        .single();

      if (companyError) throw companyError;

      setSelectedOrder(order);
      setOrderLines(lines || []);
      setCompanyData(company);
      setViewDialogOpen(true);
    } catch (error: any) {
      toast.error("Error loading order details: " + error.message);
    }
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;

    try {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderToDelete.id);

      if (error) throw error;

      toast.success("Order deleted successfully");
      fetchOrders();
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error: any) {
      toast.error("Error deleting order: " + error.message);
    }
  };

  const handleConvertToInvoice = async (order: any) => {
    try {
      // Fetch order lines
      const { data: orderLines, error: linesError } = await supabase
        .from('sales_order_lines')
        .select('*')
        .eq('order_id', order.id)
        .order('line_no', { ascending: true });

      if (linesError) throw linesError;
      if (!orderLines || orderLines.length === 0) {
        toast.error("Cannot convert order with no line items");
        return;
      }

      // Fetch company data for preview
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", order.company_id)
        .single();

      if (companyError) throw companyError;

      setOrderToConvert(order);
      setConvertOrderLines(orderLines);
      setCompanyData(company);
      setConvertDialogOpen(true);
    } catch (error: any) {
      toast.error("Error loading order: " + error.message);
    }
  };

  const confirmConvertToInvoice = async () => {
    if (!orderToConvert) return;

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate invoice number
      const invoice_no = `INV-${Date.now()}`;

      // Create invoice (initially as draft)
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: orderToConvert.company_id,
          customer_id: orderToConvert.customer_id,
          invoice_no,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: orderToConvert.delivery_date,
          notes: orderToConvert.notes ? `Converted from Order ${orderToConvert.order_no}\n${orderToConvert.notes}` : `Converted from Order ${orderToConvert.order_no}`,
          subtotal: orderToConvert.subtotal,
          tax_total: orderToConvert.tax_total,
          discount: orderToConvert.discount,
          grand_total: orderToConvert.grand_total,
          status: 'draft',
          posted: false,
          terms: orderToConvert.terms,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice lines from order lines
      const invoiceLines = convertOrderLines.map((line: any) => ({
        invoice_id: newInvoice.id,
        item_id: line.item_id,
        line_no: line.line_no,
        description: line.description,
        quantity: line.quantity,
        size_39: line.size_39,
        size_40: line.size_40,
        size_41: line.size_41,
        size_42: line.size_42,
        size_43: line.size_43,
        size_44: line.size_44,
        size_45: line.size_45,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        tax_amount: line.tax_amount,
        line_total: line.line_total,
        account_id: line.account_id,
      }));

      const { error: invoiceLinesError } = await supabase
        .from('invoice_lines')
        .insert(invoiceLines);

      if (invoiceLinesError) throw invoiceLinesError;

      // Post the invoice to trigger stock deduction
      const { error: postError } = await supabase
        .from('invoices')
        .update({
          posted: true,
          posted_at: new Date().toISOString(),
          posted_by: user.id,
          status: 'approved',
        })
        .eq('id', newInvoice.id);

      if (postError) throw postError;

      toast.success(`Order ${orderToConvert.order_no} converted to Invoice ${invoice_no}`);
      
      // Update order status
      await supabase
        .from('sales_orders')
        .update({ status: 'delivered' })
        .eq('id', orderToConvert.id);

      setConvertDialogOpen(false);
      setOrderToConvert(null);
      setConvertOrderLines([]);
      fetchOrders();
    } catch (error: any) {
      toast.error("Error converting to invoice: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      draft: "secondary",
      confirmed: "default",
      processing: "outline",
      ready: "default",
      delivered: "default",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  const filteredOrders = orders.filter((order) =>
    order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
        <Button onClick={() => {
          setSelectedOrder(null);
          setViewOnly(false);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Order
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_no}</TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{order.customer?.name}</TableCell>
                    <TableCell>
                      {order.delivery_date 
                        ? new Date(order.delivery_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      {order.currency_code} {Number(order.grand_total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleConvertToInvoice(order)}
                          title="Convert to Invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setOrderToDelete(order);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={selectedOrder}
        onSuccess={() => {
          fetchOrders();
          setDialogOpen(false);
          setSelectedOrder(null);
          setViewOnly(false);
        }}
      />

      <OrderEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={selectedOrder}
        onSuccess={() => {
          fetchOrders();
          setEditDialogOpen(false);
          setSelectedOrder(null);
        }}
      />

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Order Details</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 p-6 bg-background">
              {/* Company Header with Logo */}
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
                    {companyData?.tax_number && (
                      <div className="text-sm text-muted-foreground">Tax No: {companyData.tax_number}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary mb-2">SALES ORDER</div>
                  <div className="text-lg font-semibold">#{selectedOrder.order_no}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Date: {new Date(selectedOrder.order_date).toLocaleDateString()}
                  </div>
                  {selectedOrder.delivery_date && (
                    <div className="text-sm text-muted-foreground">
                      Delivery: {new Date(selectedOrder.delivery_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Order For Section */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-primary mb-2">ORDER FOR:</div>
                <div className="space-y-1">
                  <div className="font-semibold text-lg">{selectedOrder.customer?.name || "N/A"}</div>
                  {selectedOrder.customer?.area && (
                    <div className="text-sm text-muted-foreground">City: {selectedOrder.customer.area}</div>
                  )}
                  <div className="mt-2">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="text-sm font-semibold text-primary mb-3">ORDER ITEMS</div>
                <div className="overflow-x-auto">
                  <div className="min-w-[1200px]">
                    <div className="overflow-hidden rounded-lg border-2 border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-primary/10">
                            <TableHead className="w-32 font-bold border-r">Art No</TableHead>
                            <TableHead className="w-48 font-bold border-r">Description</TableHead>
                            <TableHead className="w-32 text-center font-bold border-r">Color</TableHead>
                            <TableHead className="w-20 bg-primary/5 text-center font-bold border-r">39</TableHead>
                            <TableHead className="w-20 text-center font-bold border-r">40</TableHead>
                            <TableHead className="w-20 bg-primary/5 text-center font-bold border-r">41</TableHead>
                            <TableHead className="w-20 text-center font-bold border-r">42</TableHead>
                            <TableHead className="w-20 bg-primary/5 text-center font-bold border-r">43</TableHead>
                            <TableHead className="w-20 text-center font-bold border-r">44</TableHead>
                            <TableHead className="w-20 bg-primary/5 text-center font-bold border-r">45</TableHead>
                            <TableHead className="w-28 text-center font-bold border-r">Total Pairs</TableHead>
                            <TableHead className="w-32 text-right font-bold border-r">Unit Price</TableHead>
                            <TableHead className="w-36 text-right font-bold">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Group lines by Art No and Color
                            const groupedLines = orderLines.reduce((acc, line) => {
                              const parts = (line.description || "").split(" - ");
                              const artNo = parts[0] || "-";
                              const color = parts[1] || "-";
                              const sizeInfo = parts[2] || "";
                              
                              const key = `${artNo}|||${color}`;
                              
                              if (!acc[key]) {
                                acc[key] = {
                                  artNo,
                                  color,
                                  description: `${artNo} - ${color}`,
                                  size_39: 0,
                                  size_40: 0,
                                  size_41: 0,
                                  size_42: 0,
                                  size_43: 0,
                                  size_44: 0,
                                  size_45: 0,
                                  unitPrice: line.unit_price,
                                  totalPairs: 0,
                                  lineTotal: 0
                                };
                              }
                              
                              // Check if size columns have data (new format) or parse from description (old format)
                              if (line.size_39 > 0 || line.size_40 > 0 || line.size_41 > 0 || 
                                  line.size_42 > 0 || line.size_43 > 0 || line.size_44 > 0 || line.size_45 > 0) {
                                // New format: use size columns
                                acc[key].size_39 += line.size_39 || 0;
                                acc[key].size_40 += line.size_40 || 0;
                                acc[key].size_41 += line.size_41 || 0;
                                acc[key].size_42 += line.size_42 || 0;
                                acc[key].size_43 += line.size_43 || 0;
                                acc[key].size_44 += line.size_44 || 0;
                                acc[key].size_45 += line.size_45 || 0;
                              } else if (sizeInfo) {
                                // Old format: parse size from description
                                const size = sizeInfo.replace("Size ", "").trim();
                                if (size === "39") acc[key].size_39 += line.quantity || 0;
                                else if (size === "40") acc[key].size_40 += line.quantity || 0;
                                else if (size === "41") acc[key].size_41 += line.quantity || 0;
                                else if (size === "42") acc[key].size_42 += line.quantity || 0;
                                else if (size === "43") acc[key].size_43 += line.quantity || 0;
                                else if (size === "44") acc[key].size_44 += line.quantity || 0;
                                else if (size === "45") acc[key].size_45 += line.quantity || 0;
                              }
                              
                              acc[key].totalPairs += line.quantity || 0;
                              acc[key].lineTotal += line.line_total || 0;
                              
                              return acc;
                            }, {} as Record<string, any>);

                            return Object.values(groupedLines).map((group: any, idx: number) => (
                              <TableRow key={`${group.artNo}-${group.color}`} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                <TableCell className="font-mono border-r">{group.artNo}</TableCell>
                                <TableCell className="border-r">{group.description}</TableCell>
                                <TableCell className="text-center border-r">{group.color}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_39 || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.size_40 || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_41 || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.size_42 || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_43 || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.size_44 || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.size_45 || "-"}</TableCell>
                                <TableCell className="text-center font-semibold border-r">{group.totalPairs}</TableCell>
                                <TableCell className="text-right border-r">
                                  {group.unitPrice ? group.unitPrice.toFixed(2) : "0.00"}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {group.lineTotal ? group.lineTotal.toFixed(2) : "0.00"}
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 bg-muted/30 rounded-lg p-4 border-2 border-border">
                  <div className="border-t-2 border-primary pt-2 mt-2"></div>
                  <div className="flex justify-between text-lg font-bold text-primary">
                    <span>Grand Total:</span>
                    <span className="font-mono">{selectedOrder.grand_total?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedOrder.notes && (
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="text-sm font-semibold text-primary mb-2">NOTES:</div>
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Terms Section */}
              {selectedOrder.terms && (
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="text-sm font-semibold text-primary mb-2">TERMS:</div>
                  <p className="text-sm whitespace-pre-wrap">{selectedOrder.terms}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                Thank you for your business!
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order {orderToDelete?.order_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Invoice Confirmation Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convert Order to Invoice</DialogTitle>
          </DialogHeader>

          {orderToConvert && (
            <div className="space-y-6">
              {/* Warning Message */}
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-primary">Convert to Invoice Preview</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Order <span className="font-mono font-bold">{orderToConvert.order_no}</span> will be converted to a new invoice.
                      Stock will be automatically deducted when the invoice is created.
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-4 p-6 bg-muted/30 rounded-lg border-2">
                {/* Company Header */}
                <div className="flex items-start justify-between pb-4 border-b border-border">
                  <div className="flex items-start gap-4">
                    {companyData?.logo_url && (
                      <img 
                        src={companyData.logo_url} 
                        alt={companyData.name} 
                        className="h-16 w-16 object-contain"
                      />
                    )}
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-primary">{companyData?.name || "Company Name"}</div>
                      {companyData?.address && (
                        <div className="text-xs text-muted-foreground">{companyData.address}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">INVOICE</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Date: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Customer Section */}
                <div className="bg-background rounded-lg p-3 border">
                  <div className="text-xs font-semibold text-primary mb-1">BILL TO:</div>
                  <div className="font-semibold">{orderToConvert.customer?.name || "N/A"}</div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead className="text-xs font-bold">Art No</TableHead>
                        <TableHead className="text-xs font-bold">Description</TableHead>
                        <TableHead className="text-xs text-center font-bold">Color</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">39</TableHead>
                        <TableHead className="text-xs text-center font-bold">40</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">41</TableHead>
                        <TableHead className="text-xs text-center font-bold">42</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">43</TableHead>
                        <TableHead className="text-xs text-center font-bold">44</TableHead>
                        <TableHead className="text-xs text-center font-bold bg-primary/5">45</TableHead>
                        <TableHead className="text-xs text-center font-bold">Pairs</TableHead>
                        <TableHead className="text-xs text-right font-bold">Price</TableHead>
                        <TableHead className="text-xs text-right font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Group lines by Art No and Color
                        const groupedLines = convertOrderLines.reduce((acc, line) => {
                          const parts = (line.description || "").split(" - ");
                          const artNo = parts[0] || "-";
                          const color = parts[1] || "-";
                          const sizeInfo = parts[2] || "";
                          
                          const key = `${artNo}|||${color}`;
                          
                          if (!acc[key]) {
                            acc[key] = {
                              artNo,
                              color,
                              description: `${artNo} - ${color}`,
                              size_39: 0,
                              size_40: 0,
                              size_41: 0,
                              size_42: 0,
                              size_43: 0,
                              size_44: 0,
                              size_45: 0,
                              unitPrice: line.unit_price,
                              totalPairs: 0,
                              lineTotal: 0
                            };
                          }
                          
                          // Check if size columns have data (new format) or parse from description (old format)
                          if (line.size_39 > 0 || line.size_40 > 0 || line.size_41 > 0 || 
                              line.size_42 > 0 || line.size_43 > 0 || line.size_44 > 0 || line.size_45 > 0) {
                            // New format: use size columns
                            acc[key].size_39 += line.size_39 || 0;
                            acc[key].size_40 += line.size_40 || 0;
                            acc[key].size_41 += line.size_41 || 0;
                            acc[key].size_42 += line.size_42 || 0;
                            acc[key].size_43 += line.size_43 || 0;
                            acc[key].size_44 += line.size_44 || 0;
                            acc[key].size_45 += line.size_45 || 0;
                          } else if (sizeInfo) {
                            // Old format: parse size from description
                            const size = sizeInfo.replace("Size ", "").trim();
                            if (size === "39") acc[key].size_39 += line.quantity || 0;
                            else if (size === "40") acc[key].size_40 += line.quantity || 0;
                            else if (size === "41") acc[key].size_41 += line.quantity || 0;
                            else if (size === "42") acc[key].size_42 += line.quantity || 0;
                            else if (size === "43") acc[key].size_43 += line.quantity || 0;
                            else if (size === "44") acc[key].size_44 += line.quantity || 0;
                            else if (size === "45") acc[key].size_45 += line.quantity || 0;
                          }
                          
                          acc[key].totalPairs += line.quantity || 0;
                          acc[key].lineTotal += line.line_total || 0;
                          
                          return acc;
                        }, {} as Record<string, any>);

                        return Object.values(groupedLines).map((group: any, idx: number) => (
                          <TableRow key={`${group.artNo}-${group.color}`} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <TableCell className="text-xs font-mono">{group.artNo}</TableCell>
                            <TableCell className="text-xs">{group.description}</TableCell>
                            <TableCell className="text-xs text-center">{group.color}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_39 || "-"}</TableCell>
                            <TableCell className="text-xs text-center">{group.size_40 || "-"}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_41 || "-"}</TableCell>
                            <TableCell className="text-xs text-center">{group.size_42 || "-"}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_43 || "-"}</TableCell>
                            <TableCell className="text-xs text-center">{group.size_44 || "-"}</TableCell>
                            <TableCell className="text-xs text-center bg-primary/5">{group.size_45 || "-"}</TableCell>
                            <TableCell className="text-xs text-center font-semibold">{group.totalPairs}</TableCell>
                            <TableCell className="text-xs text-right">{group.unitPrice?.toFixed(2) || "0.00"}</TableCell>
                            <TableCell className="text-xs text-right font-semibold">{group.lineTotal?.toFixed(2) || "0.00"}</TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 bg-background rounded-lg p-3 border">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-mono">{orderToConvert.subtotal?.toFixed(2) || "0.00"}</span>
                    </div>
                    {orderToConvert.tax_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span className="font-mono">{orderToConvert.tax_total?.toFixed(2) || "0.00"}</span>
                      </div>
                    )}
                    {orderToConvert.discount > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Discount:</span>
                        <span className="font-mono">-{orderToConvert.discount?.toFixed(2) || "0.00"}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2"></div>
                    <div className="flex justify-between font-bold text-primary">
                      <span>Grand Total:</span>
                      <span className="font-mono">{orderToConvert.grand_total?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConvertDialogOpen(false);
                    setOrderToConvert(null);
                    setConvertOrderLines([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmConvertToInvoice}
                  className="bg-primary"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Confirm & Convert to Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
