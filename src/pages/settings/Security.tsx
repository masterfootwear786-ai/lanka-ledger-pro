import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          .select('action_password')
          .eq('id', profile.company_id)
          .single();

        setHasPassword(!!company?.action_password);
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
          <CardTitle>Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• The action password is required when editing or deleting invoices</p>
          <p>• Keep this password secure and share only with authorized users</p>
          <p>• You can change the password at any time from this page</p>
          <p>• If you forget the password, you'll need to reset it here</p>
        </CardContent>
      </Card>
    </div>
  );
}
