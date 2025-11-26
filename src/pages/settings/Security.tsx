import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock } from "lucide-react";

const securitySchema = z.object({
  action_password: z.string().min(4, "Password must be at least 4 characters"),
  confirm_password: z.string(),
}).refine((data) => data.action_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type SecurityFormData = z.infer<typeof securitySchema>;

export default function Security() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [protections, setProtections] = useState({
    invoices: false,
    orders: false,
    customers: false,
    bills: false,
    suppliers: false,
    items: false,
    taxRates: false,
  });

  const form = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
  });

  useEffect(() => {
    checkActionPassword();
  }, []);

  const checkActionPassword = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        
        const { data: company } = await supabase
          .from('companies')
          .select('action_password, password_protection_enabled, protect_invoice_delete, protect_order_delete, protect_customer_delete, protect_bill_delete, protect_supplier_delete, protect_item_delete, protect_tax_rate_delete')
          .eq('id', profile.company_id)
          .single();

        setHasPassword(!!company?.action_password);
        setPasswordEnabled(!!company?.password_protection_enabled);
        setProtections({
          invoices: !!company?.protect_invoice_delete,
          orders: !!company?.protect_order_delete,
          customers: !!company?.protect_customer_delete,
          bills: !!company?.protect_bill_delete,
          suppliers: !!company?.protect_supplier_delete,
          items: !!company?.protect_item_delete,
          taxRates: !!company?.protect_tax_rate_delete,
        });
      }
    } catch (error: any) {
      console.error('Error checking password:', error);
    }
  };

  const onSubmit = async (data: SecurityFormData) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('companies')
        .update({ action_password: data.action_password })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Action password updated successfully",
      });

      setHasPassword(true);
      form.reset();
      checkActionPassword();
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

  const handlePasswordToggle = async (enabled: boolean) => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ password_protection_enabled: enabled })
        .eq('id', companyId);

      if (error) throw error;

      setPasswordEnabled(enabled);
      toast({
        title: "Success",
        description: enabled ? "Password protection enabled" : "Password protection disabled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProtectionToggle = async (module: keyof typeof protections, enabled: boolean) => {
    if (!companyId) return;

    const columnMap = {
      invoices: 'protect_invoice_delete',
      orders: 'protect_order_delete',
      customers: 'protect_customer_delete',
      bills: 'protect_bill_delete',
      suppliers: 'protect_supplier_delete',
      items: 'protect_item_delete',
      taxRates: 'protect_tax_rate_delete',
    };

    try {
      const { error } = await supabase
        .from('companies')
        .update({ [columnMap[module]]: enabled })
        .eq('id', companyId);

      if (error) throw error;

      setProtections(prev => ({ ...prev, [module]: enabled }));
      toast({
        title: "Success",
        description: `${module} delete protection ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure security settings for your account
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Action Password
          </CardTitle>
          <CardDescription>
            Set a password required for edit and delete actions. This provides an extra layer of security.
            {hasPassword && (
              <span className="block mt-2 text-green-600 dark:text-green-400">
                ✓ Action password is currently set
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action_password">
                {hasPassword ? "New Password" : "Password"} *
              </Label>
              <Input
                {...form.register("action_password")}
                type="password"
                placeholder="Enter password (minimum 4 characters)"
              />
              {form.formState.errors.action_password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.action_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password *</Label>
              <Input
                {...form.register("confirm_password")}
                type="password"
                placeholder="Re-enter password"
              />
              {form.formState.errors.confirm_password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : hasPassword ? "Update Password" : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password Protection Settings</CardTitle>
          <CardDescription>
            Enable password protection for delete actions and select which modules require password verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Password Protection</Label>
              <p className="text-sm text-muted-foreground">
                Require password for delete actions in selected modules
              </p>
            </div>
            <Switch
              checked={passwordEnabled}
              onCheckedChange={handlePasswordToggle}
              disabled={!hasPassword}
            />
          </div>

          {passwordEnabled && (
            <div className="space-y-4 border-t pt-4">
              <Label>Protected Modules</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="invoices"
                    checked={protections.invoices}
                    onCheckedChange={(checked) => handleProtectionToggle('invoices', checked as boolean)}
                  />
                  <label htmlFor="invoices" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Invoices
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="orders"
                    checked={protections.orders}
                    onCheckedChange={(checked) => handleProtectionToggle('orders', checked as boolean)}
                  />
                  <label htmlFor="orders" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Orders
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="customers"
                    checked={protections.customers}
                    onCheckedChange={(checked) => handleProtectionToggle('customers', checked as boolean)}
                  />
                  <label htmlFor="customers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Customers
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bills"
                    checked={protections.bills}
                    onCheckedChange={(checked) => handleProtectionToggle('bills', checked as boolean)}
                  />
                  <label htmlFor="bills" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Bills
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="suppliers"
                    checked={protections.suppliers}
                    onCheckedChange={(checked) => handleProtectionToggle('suppliers', checked as boolean)}
                  />
                  <label htmlFor="suppliers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Suppliers
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="items"
                    checked={protections.items}
                    onCheckedChange={(checked) => handleProtectionToggle('items', checked as boolean)}
                  />
                  <label htmlFor="items" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Items
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taxRates"
                    checked={protections.taxRates}
                    onCheckedChange={(checked) => handleProtectionToggle('taxRates', checked as boolean)}
                  />
                  <label htmlFor="taxRates" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Tax Rates
                  </label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• Set an action password first before enabling password protection</p>
          <p>• Enable password protection and select which modules require password verification</p>
          <p>• Keep this password secure and share only with authorized users</p>
          <p>• You can change the password at any time from this page</p>
        </CardContent>
      </Card>
    </div>
  );
}
