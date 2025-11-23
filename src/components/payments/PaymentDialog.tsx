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
import { Loader2 } from "lucide-react";

const paymentSchema = z.object({
  payment_no: z.string().trim().min(1, "Payment number is required").max(50),
  supplier_id: z.string().min(1, "Supplier is required"),
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.string().min(1, "Amount is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  bank_account_id: z.string().optional(),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: any;
  onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, payment, onSuccess }: PaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedSupplier = watch('supplier_id');
  const selectedBankAccount = watch('bank_account_id');

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchBankAccounts();
      if (payment) {
        reset({
          payment_no: payment.payment_no,
          supplier_id: payment.supplier_id,
          payment_date: payment.payment_date,
          amount: payment.amount.toString(),
          bank_account_id: payment.bank_account_id || '',
          reference: payment.reference || '',
          notes: payment.notes || '',
        });
      } else {
        generatePaymentNo();
        reset({
          payment_date: new Date().toISOString().split('T')[0],
          amount: '',
          reference: '',
          notes: '',
        });
      }
    }
  }, [open, payment, reset]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, code, name')
        .in('contact_type', ['supplier', 'both'])
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, code, name')
        .eq('account_type', 'asset')
        .eq('active', true)
        .order('code');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generatePaymentNo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      const { count } = await supabase
        .from('bill_payments')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      const nextNumber = (count || 0) + 1;
      setValue('payment_no', `PAY-${String(nextNumber).padStart(5, '0')}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) throw new Error("Company not found");

      const paymentData = {
        payment_no: data.payment_no,
        company_id: profile.company_id,
        supplier_id: data.supplier_id,
        payment_date: data.payment_date,
        amount: parseFloat(data.amount),
        bank_account_id: data.bank_account_id || null,
        reference: data.reference || null,
        notes: data.notes || null,
        created_by: user.id,
      };

      if (payment) {
        const { error } = await supabase
          .from('bill_payments')
          .update(paymentData)
          .eq('id', payment.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('bill_payments')
          .insert([paymentData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
      reset();
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
          <DialogTitle>{payment ? 'Edit Payment' : 'Create Payment'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_no">Payment No *</Label>
              <Input
                id="payment_no"
                {...register("payment_no")}
                placeholder="PAY-00001"
                disabled={!!payment}
              />
              {errors.payment_no && (
                <p className="text-sm text-red-500">{errors.payment_no.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                {...register("payment_date")}
              />
              {errors.payment_date && (
                <p className="text-sm text-red-500">{errors.payment_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_id">Supplier *</Label>
            <Select
              value={selectedSupplier}
              onValueChange={(value) => setValue('supplier_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.code} - {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplier_id && (
              <p className="text-sm text-red-500">{errors.supplier_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount")}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account_id">Bank Account</Label>
              <Select
                value={selectedBankAccount}
                onValueChange={(value) => setValue('bank_account_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bank_account_id && (
                <p className="text-sm text-red-500">{errors.bank_account_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              {...register("reference")}
              placeholder="Payment reference"
              maxLength={100}
            />
            {errors.reference && (
              <p className="text-sm text-red-500">{errors.reference.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Additional notes"
              rows={3}
              maxLength={500}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? 'Update' : 'Create'} Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
