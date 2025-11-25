import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreditorDebtorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: any;
  onSuccess: () => void;
}

export default function CreditorDebtorDialog({ open, onOpenChange, entry, onSuccess }: CreditorDebtorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "creditor",
    name: "",
    phone: "",
    amount: "",
    description: "",
    reference: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (entry) {
      setFormData({
        type: entry.transaction_type === "credit" ? "creditor" : "debit",
        name: entry.contact?.name || "",
        phone: entry.contact?.phone || "",
        amount: entry.amount.toString(),
        description: entry.description,
        reference: entry.reference || "",
      });
    } else {
      setFormData({
        type: "creditor",
        name: "",
        phone: "",
        amount: "",
        description: "",
        reference: "",
      });
    }
  }, [entry, open]);

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

      // First, create or find the contact
      let contactId = entry?.contact_id;
      
      if (!entry) {
        // Check if contact exists
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("company_id", profile.company_id)
          .eq("name", formData.name)
          .single();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          // Generate contact code
          const { data: lastContact } = await supabase
            .from("contacts")
            .select("code")
            .eq("company_id", profile.company_id)
            .order("code", { ascending: false })
            .limit(1)
            .single();

          let contactCode = "CON-0001";
          if (lastContact?.code) {
            const lastNum = parseInt(lastContact.code.split("-")[1]);
            contactCode = `CON-${String(lastNum + 1).padStart(4, "0")}`;
          }

          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from("contacts")
            .insert([{
              company_id: profile.company_id,
              name: formData.name,
              code: contactCode,
              phone: formData.phone || null,
              contact_type: formData.type === "creditor" ? "supplier" : "customer",
              created_by: user.id,
            }])
            .select()
            .single();

          if (contactError) throw contactError;
          contactId = newContact.id;
        }
      }

      // Generate transaction number
      let transactionNo = entry?.transaction_no;
      if (!entry) {
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
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_no: transactionNo,
        transaction_type: formData.type === "creditor" ? "credit" : "debit",
        amount: parseFloat(formData.amount),
        description: formData.description,
        reference: formData.reference || null,
        contact_id: contactId,
        created_by: user.id,
      };

      if (entry) {
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", entry.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: `${formData.type === "creditor" ? "Creditor" : "Debtor"} updated successfully`,
        });
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert([transactionData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: `${formData.type === "creditor" ? "Creditor" : "Debtor"} added successfully`,
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
          <DialogTitle>{entry ? "Edit Entry" : "Add Creditor/Debtor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creditor">Creditor (Money We Owe)</SelectItem>
                <SelectItem value="debtor">Debtor (Money Owed to Us)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
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
