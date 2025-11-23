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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const debitNoteSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  debit_note_no: z.string().min(1, "Debit note number is required").max(50),
  debit_date: z.string(),
  bill_id: z.string().optional(),
  reason: z.string().max(500).optional(),
  amount: z.string().min(1, "Amount is required"),
});

type DebitNoteFormData = z.infer<typeof debitNoteSchema>;

interface DebitNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debitNote?: any;
  onSuccess?: () => void;
}

export function DebitNoteDialog({ open, onOpenChange, debitNote, onSuccess }: DebitNoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  const form = useForm<DebitNoteFormData>({
    resolver: zodResolver(debitNoteSchema),
    defaultValues: {
      debit_date: new Date().toISOString().split('T')[0],
      amount: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      
      if (debitNote) {
        form.reset({
          supplier_id: debitNote.supplier_id,
          debit_note_no: debitNote.debit_note_no,
          debit_date: debitNote.debit_date,
          bill_id: debitNote.bill_id || '',
          reason: debitNote.reason || '',
          amount: debitNote.grand_total?.toString() || '',
        });
      } else {
        form.reset({
          debit_date: new Date().toISOString().split('T')[0],
          amount: "",
        });
      }
    }
  }, [open, debitNote]);

  useEffect(() => {
    const supplierId = form.watch("supplier_id");
    if (supplierId) {
      fetchBills(supplierId);
    }
  }, [form.watch("supplier_id")]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_type', 'supplier')
      .eq('active', true);
    if (data) setSuppliers(data);
  };

  const fetchBills = async (supplierId: string) => {
    const { data } = await supabase
      .from('bills')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('bill_date', { ascending: false });
    if (data) setBills(data);
  };

  const onSubmit = async (data: DebitNoteFormData) => {
    try {
      setLoading(true);
      const amount = parseFloat(data.amount);

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

      let debit_note_no = data.debit_note_no;

      if (debitNote) {
        const { error: updateError } = await supabase
          .from('debit_notes')
          .update({
            supplier_id: data.supplier_id,
            debit_date: data.debit_date,
            bill_id: data.bill_id || null,
            reason: data.reason,
            grand_total: amount,
            subtotal: amount,
          })
          .eq('id', debitNote.id);

        if (updateError) throw updateError;
      } else {
        debit_note_no = `DN-${Date.now()}`;

        const { error: debitNoteError } = await supabase
          .from('debit_notes')
          .insert({
            company_id: profile.company_id,
            supplier_id: data.supplier_id,
            debit_note_no,
            debit_date: data.debit_date,
            bill_id: data.bill_id || null,
            reason: data.reason,
            grand_total: amount,
            subtotal: amount,
            status: 'draft',
          });

        if (debitNoteError) throw debitNoteError;
      }

      toast.success(debitNote ? "Debit note updated successfully" : "Debit note created successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{debitNote ? "Edit Debit Note" : "Create Debit Note"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select
                value={form.watch("supplier_id")}
                onValueChange={(value) => form.setValue("supplier_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.supplier_id && (
                <p className="text-sm text-destructive">{form.formState.errors.supplier_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="debit_note_no">Debit Note Number *</Label>
              <Input
                id="debit_note_no"
                {...form.register("debit_note_no")}
                placeholder="DN-001"
              />
              {form.formState.errors.debit_note_no && (
                <p className="text-sm text-destructive">{form.formState.errors.debit_note_no.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="debit_date">Debit Date *</Label>
              <Input
                id="debit_date"
                type="date"
                {...form.register("debit_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill_id">Related Bill</Label>
              <Select
                value={form.watch("bill_id")}
                onValueChange={(value) => form.setValue("bill_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bill (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.bill_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              {...form.register("amount")}
              placeholder="0.00"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              {...form.register("reason")}
              rows={3}
              placeholder="Reason for debit note..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Debit Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
