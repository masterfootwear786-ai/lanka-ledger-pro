import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const invoiceSchema = z.object({
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

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  invoice?: any;
}

export function InvoiceDialog({ open, onOpenChange, onSuccess, invoice }: InvoiceDialogProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      payment_method: "cash",
    },
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchItems();
      
      if (invoice) {
        // Load existing invoice data
        loadInvoiceData();
      } else {
        // New invoice
        addLineItem();
      }
    } else {
      // Reset form when closed
      form.reset({
        invoice_date: new Date().toISOString().split('T')[0],
        payment_method: "cash",
      });
      setLineItems([]);
      setCheques([]);
      setDiscountPercent(0);
      setUseManualEntry(false);
    }
  }, [open, invoice]);

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

  const loadInvoiceData = async () => {
    if (!invoice) return;

    // Set form data
    form.reset({
      customer_id: invoice.customer_id,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || '',
      notes: invoice.notes || '',
      payment_method: invoice.terms?.includes('cheque') ? 'cheque' : (invoice.terms || 'cash'),
    });

    // Fetch invoice lines
    const { data: lines } = await supabase
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('line_no', { ascending: true });

    if (lines && lines.length > 0) {
      // Group lines by art_no to reconstruct the original line items with sizes
      const groupedLines: { [key: string]: any } = {};
      
      lines.forEach(line => {
        // Extract art_no, description, color from the description
        const match = line.description.match(/^(.+?) - (.+?) - (.+?) - Size (\d+)$/);
        const key = match ? `${match[1]}_${match[2]}_${match[3]}` : line.description;
        
        if (!groupedLines[key]) {
          groupedLines[key] = {
            id: Math.random().toString(),
            art_no: match ? match[1] : '',
            description: match ? match[2] : line.description,
            color: match ? match[3] : '',
            size_39: 0,
            size_40: 0,
            size_41: 0,
            size_42: 0,
            size_43: 0,
            size_44: 0,
            size_45: 0,
            total_pairs: 0,
            unit_price: line.unit_price,
            tax_rate: line.tax_rate || 0,
            line_total: 0,
            tax_amount: 0,
            discount_selected: false,
          };
        }
        
        // Add quantity to appropriate size
        if (match) {
          const size = match[4];
          groupedLines[key][`size_${size}`] = line.quantity;
        }
      });

      // Convert to array and recalculate totals
      const reconstructedLines = Object.values(groupedLines).map((item: any) => {
        item.total_pairs = item.size_39 + item.size_40 + item.size_41 + 
                          item.size_42 + item.size_43 + item.size_44 + item.size_45;
        const subtotal = item.total_pairs * item.unit_price;
        item.tax_amount = subtotal * (item.tax_rate / 100);
        item.line_total = subtotal + item.tax_amount;
        return item;
      });

      setLineItems(reconstructedLines);
    }

    // Parse cheques if payment method is cheque
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

    // Calculate discount percent from existing discount
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
        // Calculate total pairs
        updated.total_pairs = 
          updated.size_39 + updated.size_40 + updated.size_41 + 
          updated.size_42 + updated.size_43 + updated.size_44 + updated.size_45;
        // Calculate totals
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
    
    // Calculate discount on selected items
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

      // Get user's company_id
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

      // If manual entry, create or find customer
      let customerId = data.customer_id;
      if (useManualEntry && data.customer_name) {
        // Check if customer exists with same name
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
          // Create new customer
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

      let invoiceId: string;
      let invoice_no: string;

      if (invoice) {
        // Update existing invoice
        invoice_no = invoice.invoice_no;
        invoiceId = invoice.id;

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
          .eq('id', invoice.id);

        if (invoiceError) throw invoiceError;

        // Delete existing lines
        const { error: deleteLinesError } = await supabase
          .from('invoice_lines')
          .delete()
          .eq('invoice_id', invoice.id);

        if (deleteLinesError) throw deleteLinesError;
      } else {
        // Generate invoice number
        invoice_no = `INV-${Date.now()}`;

        // Insert new invoice
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
            terms: data.payment_method === 'cheque' 
              ? JSON.stringify({ payment_method: 'cheque', cheques }) 
              : data.payment_method,
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceId = newInvoice.id;
      }

      // Insert invoice lines - create separate lines for each size
      const lines: any[] = [];
      lineItems.forEach((item, index) => {
        const sizes = [
          { size: '39', qty: item.size_39 },
          { size: '40', qty: item.size_40 },
          { size: '41', qty: item.size_41 },
          { size: '42', qty: item.size_42 },
          { size: '43', qty: item.size_43 },
          { size: '44', qty: item.size_44 },
          { size: '45', qty: item.size_45 },
        ];
        
        sizes.forEach(s => {
          if (s.qty > 0) {
            lines.push({
              invoice_id: invoiceId,
              line_no: lines.length + 1,
              description: `${item.art_no} - ${item.description} - ${item.color} - Size ${s.size}`,
              quantity: s.qty,
              unit_price: item.unit_price,
              tax_rate: item.tax_rate,
              tax_amount: (s.qty * item.unit_price) * (item.tax_rate / 100),
              line_total: s.qty * item.unit_price + ((s.qty * item.unit_price) * (item.tax_rate / 100)),
            });
          }
        });
      });

      const { error: linesError } = await supabase
        .from('invoice_lines')
        .insert(lines);

      if (linesError) throw linesError;

      toast({
        title: "Success",
        description: invoice ? "Invoice updated successfully" : "Invoice created successfully",
      });

      onSuccess();
      onOpenChange(false);
      form.reset();
      setLineItems([]);
      setCheques([]);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Customer Details</Label>
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
          </div>

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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            <div className="space-y-2 overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Header Row */}
                <div className="grid grid-cols-[40px_100px_120px_80px_repeat(7,60px)_60px_80px_80px_60px] gap-1 mb-2 text-xs font-semibold">
                  <div className="text-center">✓</div>
                  <div>DSG. No</div>
                  <div>Description</div>
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

                {/* Line Items */}
                {lineItems.map((line) => (
                  <div key={line.id} className="grid grid-cols-[40px_100px_120px_80px_repeat(7,60px)_60px_80px_80px_60px] gap-1 items-center p-2 border rounded-lg mb-2 bg-background">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={line.discount_selected}
                        onChange={(e) => updateLineItem(line.id, "discount_selected", e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                    <Input
                      placeholder="Art No"
                      value={line.art_no}
                      onChange={(e) => updateLineItem(line.id, "art_no", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => updateLineItem(line.id, "description", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Color"
                      value={line.color}
                      onChange={(e) => updateLineItem(line.id, "color", e.target.value)}
                      className="h-8 text-xs"
                    />
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
          </div>

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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
