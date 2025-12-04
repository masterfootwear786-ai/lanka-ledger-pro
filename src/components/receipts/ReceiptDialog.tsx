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
import { Plus, Trash2 } from "lucide-react";

const receiptSchema = z.object({
  customer_id: z.string().min(1, "Customer is required"),
  invoice_id: z.string().optional(),
  receipt_date: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(["Cash", "Cheque", "Credit"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

interface ChequeDetails {
  cheque_no: string;
  cheque_date: string;
  cheque_bank: string;
  cheque_branch: string;
  cheque_holder: string;
  amount: number;
}

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
  const [cheques, setCheques] = useState<ChequeDetails[]>([]);
  const [currentCheque, setCurrentCheque] = useState<ChequeDetails>({
    cheque_no: "",
    cheque_date: new Date().toISOString().split('T')[0],
    cheque_bank: "",
    cheque_branch: "",
    cheque_holder: "",
    amount: 0,
  });

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
        const paymentMethod = receipt.reference?.includes("CHQ") || receipt.reference?.includes("Cheque") ? "Cheque" : 
                              receipt.reference?.includes("CREDIT") ? "Credit" : "Cash";
        setSelectedPaymentMethod(paymentMethod);
        
        // Parse cheques from reference if payment method is Cheque
        if (paymentMethod === "Cheque" && receipt.reference) {
          try {
            const parsed = JSON.parse(receipt.reference);
            if (Array.isArray(parsed)) {
              setCheques(parsed);
            }
          } catch {
            setCheques([]);
          }
        } else {
          setCheques([]);
        }
        
        form.reset({
          customer_id: receipt.customer_id,
          receipt_date: receipt.receipt_date,
          amount: receipt.amount,
          payment_method: paymentMethod as any,
          reference: paymentMethod !== "Cheque" ? (receipt.reference || "") : "",
          notes: receipt.notes || "",
        });
      } else {
        // New receipt
        setSelectedPaymentMethod("Cash");
        setCheques([]);
        setCurrentCheque({
          cheque_no: "",
          cheque_date: new Date().toISOString().split('T')[0],
          cheque_bank: "",
          cheque_branch: "",
          cheque_holder: "",
          amount: 0,
        });
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
    if (invoice && selectedPaymentMethod !== "Cheque") {
      form.setValue("amount", invoice.grand_total);
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

    const newCheques = [...cheques, currentCheque];
    setCheques(newCheques);
    
    // Calculate total amount from all cheques
    const totalAmount = newCheques.reduce((sum, chq) => sum + chq.amount, 0);
    form.setValue("amount", totalAmount);

    // Reset current cheque form
    setCurrentCheque({
      cheque_no: "",
      cheque_date: new Date().toISOString().split('T')[0],
      cheque_bank: "",
      cheque_branch: "",
      cheque_holder: "",
      amount: 0,
    });
  };

  const removeCheque = (index: number) => {
    const newCheques = cheques.filter((_, i) => i !== index);
    setCheques(newCheques);
    
    // Recalculate total amount
    const totalAmount = newCheques.reduce((sum, chq) => sum + chq.amount, 0);
    form.setValue("amount", totalAmount);
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
      if (data.payment_method === "Cheque") {
        if (cheques.length > 0) {
          // Store cheques as JSON
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
                        onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_no: e.target.value })}
                        placeholder="Enter cheque number"
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
                        onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_bank: e.target.value })}
                        placeholder="Enter bank name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input
                        value={currentCheque.cheque_branch}
                        onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_branch: e.target.value })}
                        placeholder="Enter branch name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Account Holder Name</Label>
                      <Input
                        value={currentCheque.cheque_holder}
                        onChange={(e) => setCurrentCheque({ ...currentCheque, cheque_holder: e.target.value })}
                        placeholder="Enter account holder name"
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
                      />
                    </div>
                  </div>
                </div>

                {cheques.length > 0 && (
                  <div className="col-span-2 space-y-3">
                    <Label className="text-base font-semibold">Added Cheques ({cheques.length})</Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cheques.map((cheque, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 grid grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Cheque No</p>
                                <p className="font-mono font-semibold text-orange-600">{cheque.cheque_no}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                                <p className="font-medium">{new Date(cheque.cheque_date).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                                <p className="font-bold text-green-600">Rs. {cheque.amount.toLocaleString()}</p>
                              </div>
                              {cheque.cheque_bank && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Bank</p>
                                  <p className="font-medium">{cheque.cheque_bank}</p>
                                </div>
                              )}
                              {cheque.cheque_branch && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Branch</p>
                                  <p className="font-medium">{cheque.cheque_branch}</p>
                                </div>
                              )}
                              {cheque.cheque_holder && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Holder</p>
                                  <p className="font-medium">{cheque.cheque_holder}</p>
                                </div>
                              )}
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

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("amount", { valueAsNumber: true })}
                readOnly={selectedPaymentMethod === "Cheque"}
                className={selectedPaymentMethod === "Cheque" ? "bg-muted" : ""}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
              {selectedPaymentMethod === "Cheque" && (
                <p className="text-xs text-muted-foreground">
                  Amount is auto-calculated from cheques
                </p>
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
