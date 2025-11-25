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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const receiptSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_id: z.string().optional(),
  receipt_date: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(["Cash", "Cheque", "Credit"]),
  cheque_no: z.string().optional(),
  cheque_date: z.string().optional(),
  cheque_bank: z.string().optional(),
  cheque_branch: z.string().optional(),
  cheque_holder: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  receipt?: any;
}

export function ReceiptDialog({ open, onOpenChange, onSuccess, receipt }: ReceiptDialogProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Cash");

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receipt_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: "Cash",
    },
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
      
      if (receipt) {
        // Load existing receipt data
        const paymentMethod = receipt.reference?.includes("CHQ") ? "Cheque" : 
                              receipt.reference?.includes("CREDIT") ? "Credit" : "Cash";
        setSelectedPaymentMethod(paymentMethod);
        
        form.reset({
          customer_id: receipt.customer_id,
          receipt_date: receipt.receipt_date,
          amount: receipt.amount,
          payment_method: paymentMethod as any,
          reference: receipt.reference || "",
          notes: receipt.notes || "",
        });
      } else {
        // New receipt
        setSelectedPaymentMethod("Cash");
        form.reset({
          receipt_date: new Date().toISOString().split('T')[0],
          amount: 0,
          payment_method: "Cash",
        });
      }
    }
  }, [open, receipt]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .in('contact_type', ['customer', 'both'])
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchInvoices = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_date, grand_total')
        .eq('customer_id', customerId)
        .eq('posted', true)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCustomerChange = (customerId: string) => {
    form.setValue("customer_id", customerId);
    form.setValue("invoice_id", undefined);
    form.setValue("amount", 0);
    fetchInvoices(customerId);
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    form.setValue("invoice_id", invoiceId);
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      form.setValue("amount", invoice.grand_total);
    }
  };

  const generateReceiptNo = async () => {
    const { data: receipts } = await supabase
      .from('receipts')
      .select('receipt_no')
      .order('created_at', { ascending: false })
      .limit(1);

    if (receipts && receipts.length > 0) {
      const lastNo = receipts[0].receipt_no;
      const match = lastNo.match(/\d+$/);
      if (match) {
        const nextNo = parseInt(match[0]) + 1;
        return lastNo.replace(/\d+$/, nextNo.toString().padStart(match[0].length, '0'));
      }
    }
    return 'REC-001';
  };

  const handleSubmit = async (data: ReceiptFormData) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      // Build reference string based on payment method
      let referenceStr: string = "";
      if (data.payment_method === "Cheque" && data.cheque_no) {
        referenceStr = `Cheque No: ${data.cheque_no}`;
        if (data.cheque_date) {
          referenceStr += ` | Date: ${data.cheque_date}`;
        }
        if (data.cheque_bank) {
          referenceStr += ` | Bank: ${data.cheque_bank}`;
        }
        if (data.cheque_branch) {
          referenceStr += ` | Branch: ${data.cheque_branch}`;
        }
        if (data.cheque_holder) {
          referenceStr += ` | Holder: ${data.cheque_holder}`;
        }
      } else if (data.reference) {
        referenceStr = data.reference;
      } else {
        referenceStr = data.payment_method;
      }

      if (receipt) {
        // Update existing receipt
        const { error } = await supabase
          .from('receipts')
          .update({
            customer_id: data.customer_id,
            receipt_date: data.receipt_date,
            amount: data.amount,
            reference: referenceStr,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', receipt.id);

        if (error) throw error;

        // Update receipt allocation if invoice was selected
        if (data.invoice_id) {
          await supabase
            .from('receipt_allocations')
            .upsert({
              receipt_id: receipt.id,
              invoice_id: data.invoice_id,
              amount: data.amount,
            });
        }

        toast({
          title: "Success",
          description: "Receipt updated successfully",
        });
      } else {
        // Create new receipt
        const receiptNo = await generateReceiptNo();

        const { data: newReceipt, error } = await supabase
          .from('receipts')
          .insert({
            receipt_no: receiptNo,
            company_id: profile.company_id,
            customer_id: data.customer_id,
            receipt_date: data.receipt_date,
            amount: data.amount,
            reference: referenceStr,
            notes: data.notes || null,
            posted: false,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Create receipt allocation if invoice was selected
        if (data.invoice_id && newReceipt) {
          await supabase
            .from('receipt_allocations')
            .insert({
              receipt_id: newReceipt.id,
              invoice_id: data.invoice_id,
              amount: data.amount,
            });
        }

        toast({
          title: "Success",
          description: "Receipt created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receipt ? "Edit Receipt" : "Create Receipt"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select
                value={form.watch("customer_id")}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.area || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.customer_id && (
                <p className="text-sm text-destructive">{form.formState.errors.customer_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Invoice Number (Optional)</Label>
              <Select
                value={form.watch("invoice_id") || ""}
                onValueChange={handleInvoiceSelect}
                disabled={!form.watch("customer_id") || invoices.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={invoices.length === 0 ? "No invoices available" : "Select invoice"} />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_no} - {new Date(invoice.invoice_date).toLocaleDateString()} - Rs. {invoice.grand_total.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Receipt Date *</Label>
              <Input
                type="date"
                {...form.register("receipt_date")}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={form.watch("payment_method")}
                onValueChange={(value) => {
                  form.setValue("payment_method", value as any);
                  setSelectedPaymentMethod(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.payment_method && (
                <p className="text-sm text-destructive">{form.formState.errors.payment_method.message}</p>
              )}
            </div>

            {selectedPaymentMethod === "Cheque" && (
              <>
                <div className="space-y-2">
                  <Label>Cheque Number *</Label>
                  <Input
                    {...form.register("cheque_no")}
                    placeholder="Enter cheque number"
                  />
                  {form.formState.errors.cheque_no && (
                    <p className="text-sm text-destructive">{form.formState.errors.cheque_no.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Cheque Date *</Label>
                  <Input
                    type="date"
                    {...form.register("cheque_date")}
                  />
                  {form.formState.errors.cheque_date && (
                    <p className="text-sm text-destructive">{form.formState.errors.cheque_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    {...form.register("cheque_bank")}
                    placeholder="Enter bank name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    {...form.register("cheque_branch")}
                    placeholder="Enter branch name"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Account Holder Name</Label>
                  <Input
                    {...form.register("cheque_holder")}
                    placeholder="Enter account holder name"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {selectedPaymentMethod !== "Cheque" && (
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  {...form.register("reference")}
                  placeholder="Enter reference"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : receipt ? "Update Receipt" : "Create Receipt"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
