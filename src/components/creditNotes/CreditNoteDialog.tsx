import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const creditNoteSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  credit_note_no: z.string().min(1, "Credit note number is required").max(50),
  credit_date: z.string(),
  invoice_id: z.string().optional(),
  reason: z.string().max(500).optional(),
});

type CreditNoteFormData = z.infer<typeof creditNoteSchema>;

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

interface CreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditNote?: any;
  onSuccess?: () => void;
}

export function CreditNoteDialog({ open, onOpenChange, creditNote, onSuccess }: CreditNoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const form = useForm<CreditNoteFormData>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      credit_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
      
      if (creditNote) {
        loadCreditNoteData();
      } else {
        form.reset({
          credit_date: new Date().toISOString().split('T')[0],
        });
        setLineItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0, line_total: 0 }]);
      }
    }
  }, [open, creditNote]);

  useEffect(() => {
    const customerId = form.watch("customer_id");
    if (customerId) {
      fetchInvoices(customerId);
    }
  }, [form.watch("customer_id")]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_type', 'customer')
      .eq('active', true);
    if (data) setCustomers(data);
  };

  const fetchInvoices = async (customerId: string) => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('invoice_date', { ascending: false });
    if (data) setInvoices(data);
  };

  const loadCreditNoteData = async () => {
    if (!creditNote) return;

    form.reset({
      customer_id: creditNote.customer_id,
      credit_note_no: creditNote.credit_note_no,
      credit_date: creditNote.credit_date,
      invoice_id: creditNote.invoice_id || '',
      reason: creditNote.reason || '',
    });

    const { data: lines } = await supabase
      .from('credit_note_lines')
      .select('*')
      .eq('credit_note_id', creditNote.id)
      .order('line_no');

    if (lines && lines.length > 0) {
      setLineItems(lines.map((line, idx) => ({
        id: line.id || `${idx}`,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate || 0,
        line_total: line.line_total,
      })));
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      line_total: 0,
    }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
          const subtotal = updated.quantity * updated.unit_price;
          updated.line_total = subtotal + (subtotal * updated.tax_rate / 100);
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax_total = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
    const grand_total = subtotal + tax_total;
    return { subtotal, tax_total, grand_total };
  };

  const onSubmit = async (data: CreditNoteFormData) => {
    if (lineItems.length === 0 || !lineItems.some(item => item.description)) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      setLoading(true);
      const { subtotal, tax_total, grand_total } = calculateTotals();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw new Error(`Profile error: ${profileError.message}`);
      if (!profile) throw new Error("User profile not found");
      if (!profile.company_id) throw new Error("No company assigned to user");

      let creditNoteId = creditNote?.id;
      let credit_note_no = data.credit_note_no;

      if (creditNote) {
        const { error: updateError } = await supabase
          .from('credit_notes')
          .update({
            customer_id: data.customer_id,
            credit_date: data.credit_date,
            invoice_id: data.invoice_id || null,
            reason: data.reason,
            subtotal,
            tax_total,
            grand_total,
          })
          .eq('id', creditNote.id);

        if (updateError) throw updateError;

        const { error: deleteLinesError } = await supabase
          .from('credit_note_lines')
          .delete()
          .eq('credit_note_id', creditNote.id);

        if (deleteLinesError) throw deleteLinesError;
      } else {
        credit_note_no = `CN-${Date.now()}`;

        const { data: newCreditNote, error: creditNoteError } = await supabase
          .from('credit_notes')
          .insert({
            company_id: profile.company_id,
            customer_id: data.customer_id,
            credit_note_no,
            credit_date: data.credit_date,
            invoice_id: data.invoice_id || null,
            reason: data.reason,
            subtotal,
            tax_total,
            grand_total,
            status: 'draft',
          })
          .select()
          .single();

        if (creditNoteError) throw creditNoteError;
        creditNoteId = newCreditNote.id;
      }

      const lines = lineItems
        .filter(item => item.description)
        .map((item, idx) => ({
          credit_note_id: creditNoteId,
          line_no: idx + 1,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: (item.quantity * item.unit_price) * (item.tax_rate / 100),
          line_total: item.line_total,
        }));

      const { error: linesError } = await supabase
        .from('credit_note_lines')
        .insert(lines);

      if (linesError) throw linesError;

      toast.success(creditNote ? "Credit note updated successfully" : "Credit note created successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax_total, grand_total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creditNote ? "Edit Credit Note" : "Create Credit Note"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="credit_note_no">Credit Note Number *</Label>
              <Input
                id="credit_note_no"
                {...form.register("credit_note_no")}
                placeholder="CN-001"
              />
              {form.formState.errors.credit_note_no && (
                <p className="text-sm text-destructive">{form.formState.errors.credit_note_no.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credit_date">Credit Date *</Label>
              <Input
                id="credit_date"
                type="date"
                {...form.register("credit_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_id">Related Invoice</Label>
              <Select
                value={form.watch("invoice_id")}
                onValueChange={(value) => form.setValue("invoice_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              {...form.register("reason")}
              rows={2}
              placeholder="Reason for credit note..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-24">Tax %</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLineItem(line.id, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLineItem(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLineItem(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={line.tax_rate}
                          onChange={(e) => updateLineItem(line.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {line.line_total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(line.id)}
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
                <span className="font-medium">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">{tax_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Credit Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
