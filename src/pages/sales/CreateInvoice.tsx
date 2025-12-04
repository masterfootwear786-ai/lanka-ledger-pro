import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

const invoiceSchema = z.object({
  invoice_no: z.string().min(1, "Invoice number is required"),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_area: z.string().optional(),
  customer_mobile: z.string().optional(),
  invoice_date: z.string(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  payment_method: z.enum(["credit", "cash", "cheque"]),
}).refine((data) => data.customer_id || data.customer_name, {
  message: "Either select a customer or enter customer name",
  path: ["customer_name"],
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface LineItem {
  id: string;
  art_no: string;
  description: string;
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
  tax_amount: number;
  discount_selected: boolean;
}

interface Cheque {
  id: string;
  cheque_no: string;
  cheque_date: string;
  cheque_amount: number;
}

export default function CreateInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [documentType, setDocumentType] = useState<'invoice' | 'order'>('invoice');
  const [invoice, setInvoice] = useState<any>(null);
  const [selectAllDiscount, setSelectAllDiscount] = useState(false);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_no: `INV-${Date.now()}`,
      invoice_date: new Date().toISOString().split('T')[0],
      payment_method: "cash",
    },
  });

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchStockData();
    
    if (id) {
      // Load existing invoice data
      loadInvoiceData();
    } else {
      // New invoice
      addLineItem();
    }
  }, [id]);

  useEffect(() => {
    const customerId = form.watch("customer_id");
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      setSelectedCustomer(customer);
    } else {
      setSelectedCustomer(null);
    }
  }, [form.watch("customer_id"), customers]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_type', 'customer')
      .eq('active', true);
    if (data) setCustomers(data);
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('active', true);
    if (data) setItems(data);
  };

  const fetchStockData = async () => {
    const { data: stockBySizeData, error } = await supabase
      .from("stock_by_size")
      .select("*");
    
    if (error) {
      toast({
        title: "Error fetching stock",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const stockMap = new Map<string, any>();
    
    stockBySizeData?.forEach(stock => {
      const key = stock.item_id;
      if (!stockMap.has(key)) {
        stockMap.set(key, {
          item_id: stock.item_id,
          sizes: {}
        });
      }
      stockMap.get(key)!.sizes[stock.size] = stock.quantity || 0;
    });

    setStockData(Array.from(stockMap.values()));
  };

  const loadInvoiceData = async () => {
    if (!id) return;

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, customer:contacts(name)')
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      form.reset({
        invoice_no: invoiceData.invoice_no,
        customer_id: invoiceData.customer_id,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date || '',
        notes: invoiceData.notes || '',
        payment_method: (invoiceData.terms?.includes('cheque') ? 'cheque' : (invoiceData.terms || 'cash')) as "cash" | "cheque" | "credit",
      });

      const { data: lines } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', id)
        .order('line_no', { ascending: true });

      if (lines && lines.length > 0) {
        const reconstructedLines = lines.map((line: any) => {
          const parts = line.description.split(' - ');
          const art_no = parts[0] || '';
          const color = parts[1] || '';
          
          return {
            id: Math.random().toString(),
            art_no,
            description: '',
            color,
            size_39: line.size_39 || 0,
            size_40: line.size_40 || 0,
            size_41: line.size_41 || 0,
            size_42: line.size_42 || 0,
            size_43: line.size_43 || 0,
            size_44: line.size_44 || 0,
            size_45: line.size_45 || 0,
            total_pairs: line.quantity || 0,
            unit_price: line.unit_price,
            tax_rate: line.tax_rate || 0,
            line_total: line.line_total || 0,
            tax_amount: line.tax_amount || 0,
            discount_selected: false,
          };
        });

        setLineItems(reconstructedLines);
      }

      if (invoiceData.terms && invoiceData.terms.includes('cheque')) {
        try {
          const parsed = JSON.parse(invoiceData.terms);
          if (parsed.cheques) {
            setCheques(parsed.cheques);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      if (invoiceData.discount && invoiceData.discount > 0) {
        const discountableAmount = lines?.reduce((sum: number, line: any) => sum + (line.quantity * line.unit_price), 0) || 0;
        if (discountableAmount > 0) {
          setDiscountPercent((invoiceData.discount / discountableAmount) * 100);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate('/sales/invoices');
    }
  };

  const addLineItem = () => {
    const newLine: LineItem = {
      id: Math.random().toString(),
      art_no: "",
      description: "",
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
      tax_rate: 0,
      line_total: 0,
      tax_amount: 0,
      discount_selected: false,
    };
    setLineItems([...lineItems, newLine]);
  };

  const addCheque = () => {
    const newCheque: Cheque = {
      id: Math.random().toString(),
      cheque_no: "",
      cheque_date: "",
      cheque_amount: 0,
    };
    setCheques([...cheques, newCheque]);
  };

  const removeCheque = (id: string) => {
    setCheques(cheques.filter(cheque => cheque.id !== id));
  };

  const updateCheque = (id: string, field: keyof Cheque, value: any) => {
    setCheques(cheques.map(cheque => 
      cheque.id === id ? { ...cheque, [field]: value } : cheque
    ));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    const updatedItems = lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        if (field === "art_no" || field === "color") {
          const selectedItem = items.find(i => i.code === updated.art_no && i.color === updated.color);
          if (selectedItem) {
            updated.unit_price = selectedItem.sale_price || 0;
          }
        }
        
        updated.total_pairs = 
          updated.size_39 + updated.size_40 + updated.size_41 + 
          updated.size_42 + updated.size_43 + updated.size_44 + updated.size_45;
        const subtotal = updated.total_pairs * updated.unit_price;
        updated.tax_amount = subtotal * (updated.tax_rate / 100);
        updated.line_total = subtotal + updated.tax_amount;
        return updated;
      }
      return item;
    });
    
    setLineItems(updatedItems);
    
    // Update select all state based on individual selections
    if (field === "discount_selected") {
      const allSelected = updatedItems.every(item => item.discount_selected);
      setSelectAllDiscount(allSelected);
    }
  };

  const handleSelectAllDiscount = (checked: boolean) => {
    setSelectAllDiscount(checked);
    setLineItems(lineItems.map(item => ({
      ...item,
      discount_selected: checked
    })));
  };

  const getAvailableStock = (art_no: string, color: string) => {
    const item = items.find(i => i.code === art_no && i.color === color);
    if (!item) return null;
    
    const stock = stockData.find(s => s.item_id === item.id);
    if (!stock) return { sizes: {}, total: 0 };
    
    const total = Object.values(stock.sizes).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
    return { sizes: stock.sizes, total };
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total_pairs * item.unit_price), 0);
    const tax_total = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
    
    const discountableAmount = lineItems
      .filter(item => item.discount_selected)
      .reduce((sum, item) => sum + (item.total_pairs * item.unit_price), 0);
    const discount_amount = (discountableAmount * discountPercent) / 100;
    
    const grand_total = subtotal + tax_total - discount_amount;
    return { subtotal, tax_total, discount_amount, grand_total };
  };

  const onSubmit = async (data: InvoiceFormData) => {
    // Prevent double submission
    if (loading) return;
    
    try {
      setLoading(true);
      const { subtotal, tax_total, discount_amount, grand_total } = calculateTotals();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw new Error(`Profile error: ${profileError.message}`);
      if (!profile) throw new Error("User profile not found. Please contact support.");
      if (!profile.company_id) throw new Error("No company assigned to user. Please contact support.");

      let customerId = data.customer_id;
      if (useManualEntry && data.customer_name) {
        const { data: existingCustomer } = await supabase
          .from('contacts')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('name', data.customer_name)
          .eq('contact_type', 'customer')
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('contacts')
            .insert({
              company_id: profile.company_id,
              name: data.customer_name,
              area: data.customer_area,
              phone: data.customer_mobile,
              contact_type: 'customer',
              code: `CUST-${Date.now()}`,
            })
            .select()
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      if (!customerId) throw new Error("Customer is required");

      if (documentType === 'order') {
        const order_no = `ORD-${Date.now()}`;
        
        const { data: newOrder, error: orderError } = await supabase
          .from('sales_orders')
          .insert({
            company_id: profile.company_id,
            customer_id: customerId,
            order_no,
            order_date: data.invoice_date,
            delivery_date: data.due_date,
            notes: data.notes,
            subtotal,
            tax_total,
            discount: discount_amount,
            grand_total,
            status: 'pending',
            terms: data.payment_method === 'cheque' 
              ? JSON.stringify({ payment_method: 'cheque', cheques }) 
              : data.payment_method,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const itemsMap = new Map();
        items.forEach(i => {
          const key = `${i.code}-${i.color}`;
          itemsMap.set(key, i.id);
        });

        const lines: any[] = lineItems.map((item, index) => {
          const itemKey = `${item.art_no}-${item.color}`;
          const itemId = itemsMap.get(itemKey);
          
          return {
            order_id: newOrder.id,
            item_id: itemId || null,
            line_no: index + 1,
            description: `${item.art_no} - ${item.color}`,
            quantity: item.total_pairs,
            size_39: item.size_39,
            size_40: item.size_40,
            size_41: item.size_41,
            size_42: item.size_42,
            size_43: item.size_43,
            size_44: item.size_44,
            size_45: item.size_45,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            line_total: item.line_total,
          };
        });

        const { error: linesError } = await supabase
          .from('sales_order_lines')
          .insert(lines);

        if (linesError) throw linesError;

        toast({
          title: "Success",
          description: "Order created successfully",
        });
      } else {
        let invoiceId: string;
        let invoice_no: string;

        if (invoice) {
          invoice_no = data.invoice_no;
          invoiceId = invoice.id;

          const { error: invoiceError } = await supabase
            .from('invoices')
            .update({
              invoice_no: data.invoice_no,
              customer_id: customerId,
              invoice_date: data.invoice_date,
              due_date: data.due_date,
              notes: data.notes,
              subtotal,
              tax_total,
              discount: discount_amount,
              grand_total,
              terms: data.payment_method === 'cheque' 
                ? JSON.stringify({ payment_method: 'cheque', cheques }) 
                : data.payment_method,
            })
            .eq('id', invoice.id);

          if (invoiceError) throw invoiceError;

          // NOTE: Stock is automatically restored by database trigger (restore_stock_on_line_delete) when lines are deleted
          // Delete existing lines
          const { error: deleteLinesError } = await supabase
            .from('invoice_lines')
            .delete()
            .eq('invoice_id', invoice.id);

          if (deleteLinesError) throw deleteLinesError;
        } else {
          invoice_no = data.invoice_no;

          const { data: newInvoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
              company_id: profile.company_id,
              customer_id: customerId,
              invoice_no,
              invoice_date: data.invoice_date,
              due_date: data.due_date,
              notes: data.notes,
              subtotal,
              tax_total,
              discount: discount_amount,
              grand_total,
              status: 'draft',
              posted: false,
              terms: data.payment_method === 'cheque' 
                ? JSON.stringify({ payment_method: 'cheque', cheques }) 
                : data.payment_method,
            })
            .select()
            .single();

          if (invoiceError) throw invoiceError;
          invoiceId = newInvoice.id;
        }

        const itemsMap = new Map();
        items.forEach(i => {
          const key = `${i.code}-${i.color}`;
          itemsMap.set(key, i.id);
        });

        const lines: any[] = lineItems.map((item, index) => {
          const itemKey = `${item.art_no}-${item.color}`;
          const itemId = itemsMap.get(itemKey);
          
          return {
            invoice_id: invoiceId,
            item_id: itemId || null,
            line_no: index + 1,
            description: `${item.art_no} - ${item.color}`,
            quantity: item.total_pairs,
            size_39: item.size_39,
            size_40: item.size_40,
            size_41: item.size_41,
            size_42: item.size_42,
            size_43: item.size_43,
            size_44: item.size_44,
            size_45: item.size_45,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            line_total: item.line_total,
          };
        });

        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(lines);

        if (linesError) throw linesError;

        // NOTE: Stock is automatically deducted by database trigger (adjust_stock_on_line_insert_or_update)
        // Do NOT manually deduct stock here to avoid double deduction

        if (!invoice) {
          const { error: postError } = await supabase
            .from('invoices')
            .update({
              posted: true,
              posted_at: new Date().toISOString(),
              posted_by: user.id,
              status: 'approved',
            })
            .eq('id', invoiceId);

          if (postError) throw postError;
        }

        toast({
          title: "Success",
          description: invoice ? "Invoice updated successfully" : "Invoice created successfully",
        });
      }

      navigate('/sales/invoices');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/sales/invoices')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{invoice ? 'Edit Invoice' : 'Create New Document'}</h1>
          <p className="text-muted-foreground">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!invoice && (
          <Card>
            <CardHeader>
              <CardTitle>Document Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="documentType"
                    value="invoice"
                    checked={documentType === 'invoice'}
                    onChange={(e) => setDocumentType(e.target.value as 'invoice' | 'order')}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">Invoice</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="documentType"
                    value="order"
                    checked={documentType === 'order'}
                    onChange={(e) => setDocumentType(e.target.value as 'invoice' | 'order')}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">Order</span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Invoice Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="invoice_no">Invoice Number *</Label>
              <Input
                {...form.register("invoice_no")}
                placeholder="Enter invoice number"
              />
              {form.formState.errors.invoice_no && (
                <p className="text-sm text-destructive">{form.formState.errors.invoice_no.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Details</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setUseManualEntry(!useManualEntry);
                  if (!useManualEntry) {
                    form.setValue("customer_id", "");
                    setSelectedCustomer(null);
                  }
                }}
              >
                {useManualEntry ? "Select Existing Customer" : "Manual Entry"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!useManualEntry ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer *</Label>
                  <Select
                    value={form.watch("customer_id")}
                    onValueChange={(value) => form.setValue("customer_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.customer_id && (
                    <p className="text-sm text-destructive">{form.formState.errors.customer_id.message}</p>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                    <div className="text-sm">
                      <span className="font-semibold">Name:</span> {selectedCustomer.name}
                    </div>
                    {selectedCustomer.area && (
                      <div className="text-sm">
                        <span className="font-semibold">Area:</span> {selectedCustomer.area}
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="text-sm">
                        <span className="font-semibold">Mobile:</span> {selectedCustomer.phone}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    {...form.register("customer_name")}
                    placeholder="Enter customer name"
                  />
                  {form.formState.errors.customer_name && (
                    <p className="text-sm text-destructive">{form.formState.errors.customer_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_area">Area</Label>
                  <Input
                    {...form.register("customer_area")}
                    placeholder="Enter area"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_mobile">Mobile Number</Label>
                  <Input
                    {...form.register("customer_mobile")}
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date</Label>
                <Input
                  type="date"
                  {...form.register("invoice_date")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  type="date"
                  {...form.register("due_date")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={form.watch("payment_method")}
                  onValueChange={(value) => form.setValue("payment_method", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.watch("payment_method") === "cheque" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex justify-between items-center">
                  <Label>Cheques</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCheque}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cheque
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {cheques.map((cheque) => (
                    <div key={cheque.id} className="grid grid-cols-4 gap-3 p-3 border rounded-lg bg-background">
                      <div className="space-y-2">
                        <Label>Cheque No</Label>
                        <Input
                          value={cheque.cheque_no}
                          onChange={(e) => updateCheque(cheque.id, "cheque_no", e.target.value)}
                          placeholder="Cheque number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cheque Date</Label>
                        <Input
                          type="date"
                          value={cheque.cheque_date}
                          onChange={(e) => updateCheque(cheque.id, "cheque_date", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          value={cheque.cheque_amount}
                          onChange={(e) => updateCheque(cheque.id, "cheque_amount", parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCheque(cheque.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {cheques.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No cheques added. Click "Add Cheque" to add one.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 overflow-x-auto">
              <div className="min-w-[1200px]">
                <div className="grid grid-cols-[40px_100px_80px_repeat(7,60px)_60px_80px_80px_60px] gap-1 mb-2 text-xs font-semibold bg-muted/50 p-2 rounded-lg">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectAllDiscount}
                      onChange={(e) => handleSelectAllDiscount(e.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                      title="Select all for discount"
                    />
                    <span className="text-[10px]">All</span>
                  </div>
                  <div>DSG. No</div>
                  <div>CLR</div>
                  <div className="text-center">39</div>
                  <div className="text-center">40</div>
                  <div className="text-center">41</div>
                  <div className="text-center">42</div>
                  <div className="text-center">43</div>
                  <div className="text-center">44</div>
                  <div className="text-center">45</div>
                  <div className="text-center">Pairs</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Amount</div>
                  <div></div>
                </div>

                {lineItems.map((line) => (
                  <div key={line.id} className="grid grid-cols-[40px_100px_80px_repeat(7,60px)_60px_80px_80px_60px] gap-1 items-center p-2 border rounded-lg mb-2 bg-background">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={line.discount_selected}
                        onChange={(e) => updateLineItem(line.id, "discount_selected", e.target.checked)}
                        className="h-4 w-4 cursor-pointer"
                        title="Apply discount to this line"
                      />
                    </div>
                    <div className="space-y-1">
                      <select
                        value={line.art_no}
                        onChange={(e) => updateLineItem(line.id, "art_no", e.target.value)}
                        className="h-8 text-xs w-full border rounded px-2"
                      >
                        <option value="">Select Art No</option>
                        {Array.from(new Set(items.map(i => i.code))).map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <select
                        value={line.color}
                        onChange={(e) => updateLineItem(line.id, "color", e.target.value)}
                        className="h-8 text-xs w-full border rounded px-2"
                        disabled={!line.art_no}
                      >
                        <option value="">Select Color</option>
                        {items
                          .filter(i => i.code === line.art_no)
                          .map(i => (
                            <option key={i.id} value={i.color}>{i.color}</option>
                          ))}
                      </select>
                      {line.art_no && line.color && (() => {
                        const stock = getAvailableStock(line.art_no, line.color);
                        return stock && (stock.total as number) > 0 ? (
                          <div className="text-[10px] text-muted-foreground">
                            Stock: {stock.total as number}
                          </div>
                        ) : (
                          <div className="text-[10px] text-destructive">
                            No stock
                          </div>
                        );
                      })()}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={line.size_39 || ""}
                      onChange={(e) => updateLineItem(line.id, "size_39", parseInt(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={line.size_40 || ""}
                      onChange={(e) => updateLineItem(line.id, "size_40", parseInt(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={line.size_41 || ""}
                      onChange={(e) => updateLineItem(line.id, "size_41", parseInt(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={line.size_42 || ""}
                      onChange={(e) => updateLineItem(line.id, "size_42", parseInt(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={line.size_43 || ""}
                      onChange={(e) => updateLineItem(line.id, "size_43", parseInt(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={line.size_44 || ""}
                      onChange={(e) => updateLineItem(line.id, "size_44", parseInt(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                      placeholder="0"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={line.size_45 || ""}
                      onChange={(e) => updateLineItem(line.id, "size_45", parseInt(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                      placeholder="0"
                    />
                    <div className="text-center font-semibold text-sm">
                      {line.total_pairs}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_price || ""}
                      onChange={(e) => updateLineItem(line.id, "unit_price", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-right"
                      placeholder="0.00"
                    />
                    <div className="text-right font-semibold text-sm">
                      {line.line_total.toFixed(2)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(line.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...form.register("notes")}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-4">
                <Label htmlFor="discount_percent" className="whitespace-nowrap">% Discount:</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-32"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">
                  (Applied to {lineItems.filter(i => i.discount_selected).length} selected items)
                </span>
              </div>
              
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{totals.tax_total.toFixed(2)}</span>
                </div>
                {totals.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-{totals.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span>{totals.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/sales/invoices')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : invoice ? "Update Invoice" : documentType === 'invoice' ? "Create Invoice" : "Create Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
