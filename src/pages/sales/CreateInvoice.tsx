import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const invoiceSchema = z.object({
  invoice_no: z.string().optional(),
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('id');
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

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      payment_method: "cash",
    },
  });

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchStockData();
    
    if (invoiceId) {
      loadInvoiceData();
    } else {
      addLineItem();
      fetchNextInvoiceNumber();
    }
  }, [invoiceId]);

  const fetchNextInvoiceNumber = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.company_id) return;

    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_no')
      .eq('company_id', profile.company_id)
      .like('invoice_no', 'MST%')
      .order('created_at', { ascending: false })
      .limit(1);

    if (invoices && invoices.length > 0) {
      const lastNumber = invoices[0].invoice_no;
      const numericPart = lastNumber.replace('MST', '');
      const nextNumber = parseInt(numericPart) + 1;
      form.setValue('invoice_no', `MST${nextNumber}`);
    } else {
      form.setValue('invoice_no', 'MST1786');
    }
  };

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
    if (!invoiceId) return;

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice) return;

    const paymentMethod = invoice.terms?.includes('cheque') ? 'cheque' : (invoice.terms || 'cash');
    
    form.reset({
      invoice_no: invoice.invoice_no,
      customer_id: invoice.customer_id,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
      payment_method: (paymentMethod === 'cash' || paymentMethod === 'credit' || paymentMethod === 'cheque') 
        ? paymentMethod 
        : 'cash',
    });

    const { data: lines } = await supabase
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', invoice.id)
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

    if (invoice.terms && invoice.terms.includes('cheque')) {
      try {
        const parsed = JSON.parse(invoice.terms);
        if (parsed.cheques) {
          setCheques(parsed.cheques);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (invoice.discount && invoice.discount > 0) {
      const discountableAmount = lines?.reduce((sum: number, line: any) => sum + (line.quantity * line.unit_price), 0) || 0;
      if (discountableAmount > 0) {
        setDiscountPercent((invoice.discount / discountableAmount) * 100);
      }
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
    setLineItems(lineItems.map(item => {
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
    }));
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
        let invoiceIdToUse: string;
        let invoice_no: string;

        if (invoiceId) {
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('invoice_no')
            .eq('id', invoiceId)
            .single();

          invoice_no = existingInvoice?.invoice_no || '';
          invoiceIdToUse = invoiceId;

          const { error: invoiceError } = await supabase
            .from('invoices')
            .update({
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
            .eq('id', invoiceId);

          if (invoiceError) throw invoiceError;

          const { error: deleteLinesError } = await supabase
            .from('invoice_lines')
            .delete()
            .eq('invoice_id', invoiceId);

          if (deleteLinesError) throw deleteLinesError;
        } else {
          invoice_no = data.invoice_no || `INV-${Date.now()}`;

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
          invoiceIdToUse = newInvoice.id;
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
            invoice_id: invoiceIdToUse,
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

        if (!invoiceId) {
          const { error: postError } = await supabase
            .from('invoices')
            .update({
              posted: true,
              posted_at: new Date().toISOString(),
              posted_by: user.id,
              status: 'approved',
            })
            .eq('id', invoiceIdToUse);

          if (postError) throw postError;
        }

        toast({
          title: "Success",
          description: invoiceId ? "Invoice updated successfully" : "Invoice created successfully",
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
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/sales/invoices')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{invoiceId ? 'Edit Invoice' : 'Create Invoice / Order'}</h1>
            <p className="text-muted-foreground">Fill in the details below</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!invoiceId && (
            <div className="space-y-4">
              <Label>Document Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={documentType === 'invoice' ? 'default' : 'outline'}
                  onClick={() => setDocumentType('invoice')}
                >
                  Invoice
                </Button>
                <Button
                  type="button"
                  variant={documentType === 'order' ? 'default' : 'outline'}
                  onClick={() => setDocumentType('order')}
                >
                  Order
                </Button>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div>
              <Label>Invoice/Order Number</Label>
              <Input 
                {...form.register("invoice_no")} 
                placeholder="e.g., MST1786"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Customer Selection</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="manual-entry" className="text-sm font-normal">Manual Entry</Label>
                <Switch
                  id="manual-entry"
                  checked={useManualEntry}
                  onCheckedChange={setUseManualEntry}
                />
              </div>
            </div>

            {useManualEntry ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input {...form.register("customer_name")} />
                </div>
                <div>
                  <Label>Area</Label>
                  <Input {...form.register("customer_area")} />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input {...form.register("customer_mobile")} />
                </div>
              </div>
            ) : (
              <div>
                <Label>Select Customer</Label>
                <Select
                  value={form.watch("customer_id") || ""}
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
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{documentType === 'order' ? 'Order Date' : 'Invoice Date'}</Label>
              <Input type="date" {...form.register("invoice_date")} />
            </div>
            <div>
              <Label>{documentType === 'order' ? 'Delivery Date' : 'Due Date'}</Label>
              <Input type="date" {...form.register("due_date")} />
            </div>
          </div>

          <div>
            <Label>Payment Method</Label>
            <Select
              value={form.watch("payment_method")}
              onValueChange={(value: any) => form.setValue("payment_method", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.watch("payment_method") === "cheque" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Cheque Details</Label>
                <Button type="button" size="sm" onClick={addCheque}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Cheque
                </Button>
              </div>
              {cheques.map((cheque) => (
                <div key={cheque.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Cheque No</Label>
                    <Input
                      value={cheque.cheque_no}
                      onChange={(e) => updateCheque(cheque.id, "cheque_no", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={cheque.cheque_date}
                      onChange={(e) => updateCheque(cheque.id, "cheque_date", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={cheque.cheque_amount}
                      onChange={(e) => updateCheque(cheque.id, "cheque_amount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCheque(cheque.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Art No</th>
                    <th className="text-left p-2">Color</th>
                    <th className="text-center p-2">39</th>
                    <th className="text-center p-2">40</th>
                    <th className="text-center p-2">41</th>
                    <th className="text-center p-2">42</th>
                    <th className="text-center p-2">43</th>
                    <th className="text-center p-2">44</th>
                    <th className="text-center p-2">45</th>
                    <th className="text-center p-2">Total</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-right p-2">Tax %</th>
                    <th className="text-right p-2">Line Total</th>
                    <th className="text-center p-2">Disc</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">
                        <Input
                          value={item.art_no}
                          onChange={(e) => updateLineItem(item.id, "art_no", e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={item.color}
                          onChange={(e) => updateLineItem(item.id, "color", e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.size_39}
                          onChange={(e) => updateLineItem(item.id, "size_39", parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.size_40}
                          onChange={(e) => updateLineItem(item.id, "size_40", parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.size_41}
                          onChange={(e) => updateLineItem(item.id, "size_41", parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.size_42}
                          onChange={(e) => updateLineItem(item.id, "size_42", parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.size_43}
                          onChange={(e) => updateLineItem(item.id, "size_43", parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.size_44}
                          onChange={(e) => updateLineItem(item.id, "size_44", parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.size_45}
                          onChange={(e) => updateLineItem(item.id, "size_45", parseInt(e.target.value) || 0)}
                          className="w-16 text-center"
                        />
                      </td>
                      <td className="p-2 text-center font-medium">{item.total_pairs}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-24 text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.tax_rate}
                          onChange={(e) => updateLineItem(item.id, "tax_rate", parseFloat(e.target.value) || 0)}
                          className="w-20 text-right"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">{item.line_total.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={item.discount_selected}
                          onChange={(e) => updateLineItem(item.id, "discount_selected", e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} rows={4} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax Total:</span>
                <span className="font-medium">{totals.tax_total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Discount (%):</span>
                <Input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount Amount:</span>
                <span className="font-medium">{totals.discount_amount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>{totals.grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sales/invoices')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : (invoiceId ? "Update" : "Create")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
