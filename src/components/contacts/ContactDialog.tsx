import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: any;
  type: "customer" | "supplier";
  onSuccess?: () => void;
}

export function ContactDialog({ open, onOpenChange, contact, type, onSuccess }: ContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    area: "",
    district: "",
    tax_number: "",
    credit_limit: "",
    payment_terms: "30",
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        code: contact.code || "",
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        address: contact.address || "",
        area: contact.area || "",
        district: contact.district || "",
        tax_number: contact.tax_number || "",
        credit_limit: contact.credit_limit || "",
        payment_terms: contact.payment_terms?.toString() || "30",
      });
    } else {
      setFormData({
        code: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        area: "",
        district: "",
        tax_number: "",
        credit_limit: "",
        payment_terms: "30",
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Get user's company_id
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

      const data = {
        ...formData,
        company_id: profile.company_id,
        contact_type: type,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
        payment_terms: parseInt(formData.payment_terms),
      };

      if (contact) {
        const { error } = await supabase
          .from("contacts")
          .update(data)
          .eq("id", contact.id);
        if (error) throw error;
        toast.success(`${type === 'customer' ? 'Customer' : 'Supplier'} updated successfully`);
      } else {
        const { error } = await supabase
          .from("contacts")
          .insert([data]);
        if (error) throw error;
        toast.success(`${type === 'customer' ? 'Customer' : 'Supplier'} created successfully`);
      }

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? `Edit ${type === 'customer' ? 'Customer' : 'Supplier'}` : `Add ${type === 'customer' ? 'Customer' : 'Supplier'}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                disabled={!!contact}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_number">Tax Number</Label>
              <Input
                id="tax_number"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <Input
                id="credit_limit"
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
              <Input
                id="payment_terms"
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              />
            </div>
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