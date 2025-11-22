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
  receipt_date: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.string().optional(),
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
  const [loading, setLoading] = useState(false);

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receipt_date: new Date().toISOString().split('T')[0],
      amount: 0,
    },
  });

  useEffect(() => {
    if (open) {
      fetchCustomers();
      
      if (receipt) {
        // Load existing receipt data
        form.reset({
          customer_id: receipt.customer_id,
          receipt_date: receipt.receipt_date,
          amount: receipt.amount,
          payment_method: receipt.reference || "",
          reference: receipt.reference || "",
          notes: receipt.notes || "",
        });
      } else {
        // New receipt
        form.reset({
          receipt_date: new Date().toISOString().split('T')[0],
          amount: 0,
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

      if (receipt) {
        // Update existing receipt
        const { error } = await supabase
          .from('receipts')
          .update({
            customer_id: data.customer_id,
            receipt_date: data.receipt_date,
            amount: data.amount,
            reference: data.reference || null,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', receipt.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Receipt updated successfully",
        });
      } else {
        // Create new receipt
        const receiptNo = await generateReceiptNo();

        const { error } = await supabase
          .from('receipts')
          .insert({
            receipt_no: receiptNo,
            company_id: profile.company_id,
            customer_id: data.customer_id,
            receipt_date: data.receipt_date,
            amount: data.amount,
            reference: data.reference || null,
            notes: data.notes || null,
            posted: false,
            created_by: user.id,
          });

        if (error) throw error;

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
                onValueChange={(value) => form.setValue("customer_id", value)}
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
              <Label>Receipt Date *</Label>
              <Input
                type="date"
                {...form.register("receipt_date")}
              />
            </div>

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

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Input
                {...form.register("payment_method")}
                placeholder="e.g., Cash, Bank Transfer, Cheque"
              />
            </div>

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                {...form.register("reference")}
                placeholder="e.g., Cheque #, Transfer ID"
              />
            </div>
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
