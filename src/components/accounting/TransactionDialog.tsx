import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  code: string;
  contact_type: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: any;
  onSuccess: () => void;
}

export default function TransactionDialog({ open, onOpenChange, transaction, onSuccess }: TransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split("T")[0],
    transaction_type: "Salary",
    creditor_debtor_type: "credit", // credit = Creditor, debit = Debtor
    amount: "",
    description: "",
    reference: "",
    contact_id: "",
    contact_name: "",
    contact_phone: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchContacts = async () => {
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
          .from("contacts")
          .select("id, name, code, contact_type")
          .eq("company_id", profile.company_id)
          .eq("active", true)
          .order("name");

        if (!error && data) {
          setContacts(data);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    if (open) {
      fetchContacts();
    }
  }, [open]);

  useEffect(() => {
    if (transaction) {
      const isCreditorDebtor = transaction.transaction_type === 'credit' || transaction.transaction_type === 'debit';
      setFormData({
        transaction_date: transaction.transaction_date,
        transaction_type: isCreditorDebtor ? 'Creditor_Debtor' : transaction.transaction_type,
        creditor_debtor_type: transaction.transaction_type === 'credit' ? 'credit' : transaction.transaction_type === 'debit' ? 'debit' : 'credit',
        amount: transaction.amount.toString(),
        description: transaction.description,
        reference: transaction.reference || "",
        contact_id: transaction.contact_id || "",
        contact_name: transaction.contacts?.name || "",
        contact_phone: transaction.contacts?.phone || "",
      });
    } else {
      setFormData({
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: "Salary",
        creditor_debtor_type: "credit",
        amount: "",
        description: "",
        reference: "",
        contact_id: "",
        contact_name: "",
        contact_phone: "",
      });
    }
  }, [transaction, open]);

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

      // Handle Creditor/Debtor type - save as credit or debit
      const actualTransactionType = formData.transaction_type === 'Creditor_Debtor' 
        ? formData.creditor_debtor_type 
        : formData.transaction_type;

      // For Creditor/Debtor, create or find contact if name provided
      let contactId = formData.contact_id && formData.contact_id !== "none" ? formData.contact_id : null;
      
      if (formData.transaction_type === 'Creditor_Debtor' && formData.contact_name && !contactId) {
        // Create a new contact for this creditor/debtor
        const contactType = formData.creditor_debtor_type === 'credit' ? 'supplier' : 'customer';
        
        // Generate contact code
        const prefix = contactType === 'supplier' ? 'SUP' : 'CUS';
        const { data: lastContact } = await supabase
          .from("contacts")
          .select("code")
          .eq("company_id", profile.company_id)
          .like("code", `${prefix}%`)
          .order("code", { ascending: false })
          .limit(1)
          .single();

        let newCode = `${prefix}-0001`;
        if (lastContact?.code) {
          const lastNum = parseInt(lastContact.code.split("-")[1]) || 0;
          newCode = `${prefix}-${String(lastNum + 1).padStart(4, "0")}`;
        }

        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert([{
            company_id: profile.company_id,
            name: formData.contact_name,
            code: newCode,
            phone: formData.contact_phone || null,
            contact_type: contactType,
            created_by: user.id,
          }])
          .select()
          .single();

        if (contactError) throw contactError;
        contactId = newContact.id;
      }

      const transactionData = {
        company_id: profile.company_id,
        transaction_date: formData.transaction_date,
        transaction_no: transactionNo,
        transaction_type: actualTransactionType,
        amount: parseFloat(formData.amount),
        description: formData.description,
        reference: formData.reference || null,
        contact_id: contactId,
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
              <Label htmlFor="transaction_type">Category</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Creditor_Debtor">Creditor / Debtor</SelectItem>
                  <SelectItem value="COGS">COGS (Cost of Goods Sold)</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Fuel">Fuel</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Accommodation">Accommodation</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Professional Fees">Professional Fees</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.transaction_type === 'Creditor_Debtor' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditor_debtor_type">Type</Label>
                  <Select
                    value={formData.creditor_debtor_type}
                    onValueChange={(value) => setFormData({ ...formData, creditor_debtor_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Creditor (Money We Owe)</SelectItem>
                      <SelectItem value="debit">Debtor (Money Owed to Us)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Enter name..."
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone (Optional)</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Enter phone number..."
                />
              </div>
            </>
          )}

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

          {formData.transaction_type !== 'Creditor_Debtor' && (
            <div className="space-y-2">
              <Label htmlFor="contact_id">Contact (Optional)</Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
