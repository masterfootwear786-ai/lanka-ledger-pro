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
    toast.info("Convert to invoice feature coming soon!");
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
                              const size = sizeInfo.replace("Size ", "");
                              
                              const key = `${artNo}|||${color}`;
                              
                              if (!acc[key]) {
                                acc[key] = {
                                  artNo,
                                  color,
                                  sizes: {},
                                  unitPrice: line.unit_price,
                                  totalPairs: 0,
                                  lineTotal: 0
                                };
                              }
                              
                              if (size) {
                                acc[key].sizes[size] = (acc[key].sizes[size] || 0) + (line.quantity || 0);
                              }
                              acc[key].totalPairs += line.quantity || 0;
                              acc[key].lineTotal += line.line_total || 0;
                              
                              return acc;
                            }, {} as Record<string, any>);

                            return Object.values(groupedLines).map((group: any, idx: number) => (
                              <TableRow key={`${group.artNo}-${group.color}`} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                <TableCell className="font-mono border-r">{group.artNo}</TableCell>
                                <TableCell className="border-r">{group.artNo} - {group.color}</TableCell>
                                <TableCell className="text-center border-r">{group.color}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.sizes["39"] || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.sizes["40"] || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.sizes["41"] || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.sizes["42"] || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.sizes["43"] || "-"}</TableCell>
                                <TableCell className="text-center border-r">{group.sizes["44"] || "-"}</TableCell>
                                <TableCell className="bg-primary/5 text-center border-r">{group.sizes["45"] || "-"}</TableCell>
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
    </div>
  );
}
