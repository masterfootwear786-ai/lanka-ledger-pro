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
import { Loader2, Plus, Trash2 } from "lucide-react";

const paymentSchema = z.object({
  payment_no: z.string().trim().min(1, "Payment number is required").max(50),
  supplier_id: z.string().min(1, "Supplier is required"),
  bill_id: z.string().optional(),
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.string().min(1, "Amount is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be greater than 0"),
  bank_account_id: z.string().optional(),
  payment_method: z.enum(["Cash", "Cheque"]),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

interface ChequeDetails {
  cheque_no: string;
  cheque_date: string;
  cheque_bank: string;
  cheque_branch: string;
  cheque_holder: string;
  amount: number;
  status?: string;
}

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
  const [bills, setBills] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Cash");
  const [cheques, setCheques] = useState<ChequeDetails[]>([]);
  const [currentCheque, setCurrentCheque] = useState<ChequeDetails>({
    cheque_no: "",
    cheque_date: new Date().toISOString().split('T')[0],
    cheque_bank: "",
    cheque_branch: "",
    cheque_holder: "",
    amount: 0,
    status: "pending",
  });

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
      payment_method: "Cash",
    },
  });

  const selectedSupplier = watch('supplier_id');
  const selectedBill = watch('bill_id');
  const selectedBankAccount = watch('bank_account_id');

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchBankAccounts();
      if (payment) {
        const paymentMethod = payment.reference?.startsWith('[') ? "Cheque" : "Cash";
        setSelectedPaymentMethod(paymentMethod);
        
        if (paymentMethod === "Cheque" && payment.reference) {
          try {
            const parsed = JSON.parse(payment.reference);
            if (Array.isArray(parsed)) {
              setCheques(parsed);
            }
          } catch {
            setCheques([]);
          }
        } else {
          setCheques([]);
        }
        
        reset({
          payment_no: payment.payment_no,
          supplier_id: payment.supplier_id,
          payment_date: payment.payment_date,
          amount: payment.amount.toString(),
          bank_account_id: payment.bank_account_id || '',
          payment_method: paymentMethod as any,
          reference: paymentMethod !== "Cheque" ? (payment.reference || '') : '',
          notes: payment.notes || '',
        });
      } else {
        generatePaymentNo();
        setSelectedPaymentMethod("Cash");
        setCheques([]);
        setCurrentCheque({
          cheque_no: "",
          cheque_date: new Date().toISOString().split('T')[0],
          cheque_bank: "",
          cheque_branch: "",
          cheque_holder: "",
          amount: 0,
          status: "pending",
        });
        reset({
          payment_date: new Date().toISOString().split('T')[0],
          amount: '',
          payment_method: "Cash",
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

  const fetchBills = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('id, bill_no, bill_date, grand_total')
        .eq('supplier_id', supplierId)
        .is('deleted_at', null)
        .order('bill_date', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    setValue('supplier_id', supplierId);
    setValue('bill_id', undefined);
    if (selectedPaymentMethod !== "Cheque") {
      setValue('amount', '');
    }
    fetchBills(supplierId);
  };

  const handleBillSelect = (billId: string) => {
    setValue('bill_id', billId);
    const bill = bills.find(b => b.id === billId);
    if (bill && selectedPaymentMethod !== "Cheque") {
      setValue('amount', bill.grand_total.toString());
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

      const { data: existingPayments } = await supabase
        .from('bill_payments')
        .select('payment_no')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingPayments && existingPayments.length > 0) {
        const lastPaymentNo = existingPayments[0].payment_no;
        const match = lastPaymentNo.match(/PAY-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      setValue('payment_no', `PAY-${String(nextNumber).padStart(5, '0')}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addCheque = () => {
    if (!currentCheque.cheque_no || !currentCheque.cheque_date || currentCheque.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter cheque number, date, and amount",
        variant: "destructive",
      });
      return;
    }

    const newCheques = [...cheques, { ...currentCheque, status: "pending" }];
    setCheques(newCheques);
    
    const totalAmount = newCheques.reduce((sum, chq) => sum + chq.amount, 0);
    setValue("amount", totalAmount.toString());

    setCurrentCheque({
      cheque_no: "",
      cheque_date: new Date().toISOString().split('T')[0],
      cheque_bank: "",
      cheque_branch: "",
      cheque_holder: "",
      amount: 0,
      status: "pending",
    });
  };

  const removeCheque = (index: number) => {
    const newCheques = cheques.filter((_, i) => i !== index);
    setCheques(newCheques);
    
    const totalAmount = newCheques.reduce((sum, chq) => sum + chq.amount, 0);
    setValue("amount", totalAmount.toString());
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

      let referenceStr: string | null = null;
      if (data.payment_method === "Cheque") {
        if (cheques.length > 0) {
          referenceStr = JSON.stringify(cheques);
        } else {
          toast({
            title: "Validation Error",
            description: "Please add at least one cheque",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else if (data.reference) {
        referenceStr = data.reference;
      }

      const paymentData = {
        payment_no: data.payment_no,
        company_id: profile.company_id,
        supplier_id: data.supplier_id,
        payment_date: data.payment_date,
        amount: parseFloat(data.amount),
        bank_account_id: data.bank_account_id || null,
        reference: referenceStr,
        notes: data.notes || null,
        created_by: user.id,
      };

      if (payment) {
        const { error } = await supabase
          .from('bill_payments')
          .update(paymentData)
          .eq('id', payment.id);

        if (error) throw error;

        // Update payment allocation if bill was selected
        if (data.bill_id) {
          await supabase
            .from('payment_allocations')
            .delete()
            .eq('payment_id', payment.id);

          await supabase
            .from('payment_allocations')
            .insert({
              payment_id: payment.id,
              bill_id: data.bill_id,
              amount: parseFloat(data.amount),
            });
        }

        toast({
          title: "Success",
          description: "Payment updated successfully",
        });
      } else {
        const { data: newPayment, error } = await supabase
          .from('bill_payments')
          .insert([paymentData])
          .select()
          .single();

        if (error) throw error;

        // Create payment allocation if bill was selected
        if (data.bill_id && newPayment) {
          await supabase
            .from('payment_allocations')
            .insert({
              payment_id: newPayment.id,
              bill_id: data.bill_id,
              amount: parseFloat(data.amount),
            });
        }

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select
                value={selectedSupplier}
                onValueChange={handleSupplierChange}
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

            <div className="space-y-2">
              <Label htmlFor="bill_id">Bill (Optional)</Label>
              <Select
                value={selectedBill || ""}
                onValueChange={handleBillSelect}
                disabled={!selectedSupplier || bills.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={bills.length === 0 ? "No bills available" : "Select bill"} />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.bill_no} - {new Date(bill.bill_date).toLocaleDateString()} - Rs. {bill.grand_total?.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Label htmlFor="payment_method">Payment Method *</Label>
            <Select
              value={watch("payment_method")}
              onValueChange={(value) => {
                setValue("payment_method", value as any);
                setSelectedPaymentMethod(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
            {errors.payment_method && (
              <p className="text-sm text-red-500">{errors.payment_method.message}</p>
            )}
          </div>

          {selectedPaymentMethod === "Cheque" && (
            <>
              <div className="col-span-2 border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Add Cheque Details</h3>
                  <Button type="button" onClick={addCheque} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cheque
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cheque Number *</Label>
                    <Input
                      value={currentCheque.cheque_no}
                      onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_no: e.target.value.trim().slice(0, 50) })}
                      placeholder="Enter cheque number"
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cheque Date *</Label>
                    <Input
                      type="date"
                      value={currentCheque.cheque_date}
                      onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={currentCheque.cheque_bank}
                      onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_bank: e.target.value.trim().slice(0, 100) })}
                      placeholder="Enter bank name"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input
                      value={currentCheque.cheque_branch}
                      onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_branch: e.target.value.trim().slice(0, 100) })}
                      placeholder="Enter branch name"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input
                      value={currentCheque.cheque_holder}
                      onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_holder: e.target.value.trim().slice(0, 100) })}
                      placeholder="Enter account holder name"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cheque Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentCheque.amount || ""}
                      onChange={(e) => setCurrentCheque({ ...currentCheque, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="Enter amount"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {cheques.length > 0 && (
                <div className="col-span-2 space-y-2">
                  <Label>Added Cheques ({cheques.length})</Label>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {cheques.map((cheque, index) => (
                      <div key={index} className="p-3 flex justify-between items-start hover:bg-muted/50">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{cheque.cheque_no}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(cheque.cheque_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {cheque.cheque_bank && `${cheque.cheque_bank}`}
                            {cheque.cheque_branch && ` - ${cheque.cheque_branch}`}
                          </div>
                          {cheque.cheque_holder && (
                            <div className="text-sm text-muted-foreground">
                              Holder: {cheque.cheque_holder}
                            </div>
                          )}
                          <div className="font-semibold text-primary">
                            Rs. {cheque.amount.toLocaleString()}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCheque(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="text-right font-semibold text-lg pt-2">
                    Total: Rs. {cheques.reduce((sum, chq) => sum + chq.amount, 0).toLocaleString()}
                  </div>
                </div>
              )}
            </>
          )}

          {selectedPaymentMethod !== "Cheque" && (
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
          )}

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
