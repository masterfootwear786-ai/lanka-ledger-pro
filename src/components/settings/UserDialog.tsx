import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  active: z.boolean(),
  language: z.string(),
  roles: z.object({
    admin: z.boolean(),
    accountant: z.boolean(),
    clerk: z.boolean(),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      active: true,
      language: "en",
      roles: {
        admin: false,
        accountant: false,
        clerk: false,
      },
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || "",
        email: user.email || "",
        active: user.active ?? true,
        language: user.language || "en",
        roles: {
          admin: user.roles?.includes("admin") || false,
          accountant: user.roles?.includes("accountant") || false,
          clerk: user.roles?.includes("clerk") || false,
        },
      });
    }
  }, [user, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          active: data.active,
          language: data.language,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Get current roles
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("role, id")
        .eq("user_id", user.id);

      const currentRoleNames = currentRoles?.map((r) => r.role) || [];
      const selectedRoles: ("admin" | "accountant" | "clerk")[] = [];
      
      if (data.roles.admin) selectedRoles.push("admin");
      if (data.roles.accountant) selectedRoles.push("accountant");
      if (data.roles.clerk) selectedRoles.push("clerk");

      // Roles to add
      const rolesToAdd = selectedRoles.filter((r) => !currentRoleNames.includes(r));
      // Roles to remove
      const rolesToRemove = currentRoleNames.filter((r) => !selectedRoles.includes(r));

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error: addError } = await supabase
          .from("user_roles")
          .insert(
            rolesToAdd.map((role) => ({
              user_id: user.id,
              role,
            }))
          );

        if (addError) throw addError;
      }

      // Remove old roles
      if (rolesToRemove.length > 0) {
        const roleIdsToRemove = currentRoles
          ?.filter((r) => rolesToRemove.includes(r.role))
          .map((r) => r.id);

        if (roleIdsToRemove && roleIdsToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from("user_roles")
            .delete()
            .in("id", roleIdsToRemove);

          if (removeError) throw removeError;
        }
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

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
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this user account
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>User Roles</FormLabel>
              <div className="space-y-2 border rounded-lg p-4">
                <FormField
                  control={form.control}
                  name="roles.admin"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Admin</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Full system access and user management
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roles.accountant"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Accountant</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Can manage financial records and reports
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roles.clerk"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Clerk</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Standard user access with basic permissions
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
