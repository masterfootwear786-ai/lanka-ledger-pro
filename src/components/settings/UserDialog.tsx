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
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
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
      password: "",
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
        password: "",
        active: user.active ?? true,
        language: user.language || "en",
        roles: {
          admin: user.roles?.includes("admin") || false,
          accountant: user.roles?.includes("accountant") || false,
          clerk: user.roles?.includes("clerk") || false,
        },
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        password: "",
        active: true,
        language: "en",
        roles: {
          admin: false,
          accountant: false,
          clerk: false,
        },
      });
    }
  }, [user, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      let userId = user?.id;
      let companyId = user?.company_id;

      if (!user) {
        // Creating new user
        if (!data.password) {
          throw new Error("Password is required for new users");
        }

        // Get current user's company ID
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error("Not authenticated");

        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', currentUser.id)
          .single();

        if (!currentProfile?.company_id) {
          throw new Error("Current user has no company assigned");
        }

        companyId = currentProfile.company_id;

        // Create auth user via signup
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create user");

        userId = authData.user.id;

        // Update the new user's profile with company ID
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            company_id: companyId,
            full_name: data.full_name,
            active: data.active,
            language: data.language,
          })
          .eq("id", userId);

        if (profileUpdateError) throw profileUpdateError;

      } else {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: data.full_name,
            active: data.active,
            language: data.language,
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }

      // Get current roles
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("role, id")
        .eq("user_id", userId);

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
              user_id: userId,
              role,
              company_id: companyId,
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
        description: user ? "User updated successfully" : "User created successfully",
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
          <DialogTitle>{user ? "Edit User" : "Add New User"}</DialogTitle>
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
                    <Input {...field} disabled={!!user} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!user && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Minimum 6 characters" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                {loading ? "Saving..." : user ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
