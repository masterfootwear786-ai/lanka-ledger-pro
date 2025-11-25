import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: any;
  onSuccess: () => void;
}

export default function TransactionDialog({ open, onOpenChange, transaction, onSuccess }: TransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split("T")[0],
    transaction_type: "expense",
    account_id: "",
    amount: "",
    description: "",
    reference: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date,
        transaction_type: transaction.transaction_type,
        account_id: transaction.account_id || "",
        amount: transaction.amount.toString(),
        description: transaction.description,
        reference: transaction.reference || "",
      });
    } else {
      setFormData({
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "expense",
        account_id: "",
        amount: "",
        description: "",
        reference: "",
      });
    }
  }, [transaction, open]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (!profile?.company_id) return;

        const { data, error } = await supabase
          .from("chart_of_accounts")
          .select("*")
          .eq("company_id", profile.company_id)
          .eq("active", true)
          .order("code");

        if (error) throw error;
        setAccounts(data || []);
      } catch (error: any) {
        console.error("Error fetching accounts:", error);
      }
    };

    if (open) {
      fetchAccounts();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      // Generate transaction number if creating new
      let transactionNo = transaction?.transaction_no;
      if (!transaction) {
        const { data: lastTransaction } = await supabase
          .from("transactions")
          .select("transaction_no")
          .eq("company_id", profile.company_id)
          .order("transaction_no", { ascending: false })
          .limit(1)
          .single();

        if (lastTransaction?.transaction_no) {
          const lastNum = parseInt(lastTransaction.transaction_no.split("-")[1]);
          transactionNo = `TXN-${String(lastNum + 1).padStart(4, "0")}`;
        } else {
          transactionNo = "TXN-0001";
        }
      }

      const transactionData = {
        company_id: profile.company_id,
        transaction_date: formData.transaction_date,
        transaction_no: transactionNo,
        transaction_type: formData.transaction_type,
        account_id: formData.account_id || null,
        amount: parseFloat(formData.amount),
        description: formData.description,
        reference: formData.reference || null,
        created_by: user.id,
      };

      if (transaction) {
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", transaction.id);

        if (error) throw error;

      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert([transactionData]);

        if (error) throw error;

      toast({
        title: "Success",
        description: "Expense created successfully",
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Expense Type</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="cash_in">Cash In</SelectItem>
                  <SelectItem value="cash_out">Cash Out</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_id">Account (Optional)</Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
