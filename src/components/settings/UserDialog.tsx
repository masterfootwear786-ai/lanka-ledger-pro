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
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  active: z.boolean(),
  language: z.string(),
  is_sales_rep: z.boolean(),
  roles: z.object({
    admin: z.boolean(),
    accountant: z.boolean(),
    clerk: z.boolean(),
    sales_rep: z.boolean(),
    storekeeper: z.boolean(),
  }),
  permissions: z.object({
    sales: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    purchasing: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    inventory: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    expenses: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    reports: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
    settings: z.object({
      view: z.boolean(),
      create: z.boolean(),
      edit: z.boolean(),
      delete: z.boolean(),
    }),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

const defaultPermissions = {
  view: false,
  create: false,
  edit: false,
  delete: false,
};

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      username: "",
      password: "",
      active: true,
      language: "en",
      is_sales_rep: false,
      roles: {
        admin: false,
        accountant: false,
        clerk: false,
        sales_rep: false,
        storekeeper: false,
      },
      permissions: {
        sales: { ...defaultPermissions },
        purchasing: { ...defaultPermissions },
        inventory: { ...defaultPermissions },
        expenses: { ...defaultPermissions },
        reports: { ...defaultPermissions },
        settings: { ...defaultPermissions },
      },
    },
  });

  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        // Fetch user permissions
        const { data: permissions } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', user.id);

        const permissionsData: any = {
          sales: { ...defaultPermissions },
          purchasing: { ...defaultPermissions },
          inventory: { ...defaultPermissions },
          expenses: { ...defaultPermissions },
          reports: { ...defaultPermissions },
          settings: { ...defaultPermissions },
        };

        permissions?.forEach((perm) => {
          permissionsData[perm.module] = {
            view: perm.can_view,
            create: perm.can_create,
            edit: perm.can_edit,
            delete: perm.can_delete,
          };
        });

        form.reset({
          full_name: user.full_name || "",
          email: user.email || "",
          username: user.username || "",
          password: "",
          active: user.active ?? true,
          language: user.language || "en",
          is_sales_rep: user.is_sales_rep || false,
          roles: {
            admin: user.roles?.includes("admin") || false,
            accountant: user.roles?.includes("accountant") || false,
            clerk: user.roles?.includes("clerk") || false,
            sales_rep: user.roles?.includes("sales_rep") || false,
            storekeeper: user.roles?.includes("storekeeper") || false,
          },
          permissions: permissionsData,
        });
      } else {
        form.reset({
          full_name: "",
          email: "",
          username: "",
          password: "",
          active: true,
          language: "en",
          is_sales_rep: false,
          roles: {
            admin: false,
            accountant: false,
            clerk: false,
            sales_rep: false,
            storekeeper: false,
          },
          permissions: {
            sales: { ...defaultPermissions },
            purchasing: { ...defaultPermissions },
            inventory: { ...defaultPermissions },
            expenses: { ...defaultPermissions },
            reports: { ...defaultPermissions },
            settings: { ...defaultPermissions },
          },
        });
      }
    };

    loadUserData();
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

        // Update the new user's profile with company ID and username
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            company_id: companyId,
            full_name: data.full_name,
            active: data.active,
            language: data.language,
            username: data.username ? data.username.toLowerCase().trim() : null,
            is_sales_rep: data.is_sales_rep,
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
            username: data.username ? data.username.toLowerCase().trim() : null,
            is_sales_rep: data.is_sales_rep,
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }

      // Handle roles
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("role, id")
        .eq("user_id", userId);

      const currentRoleNames = currentRoles?.map((r) => r.role) || [];
      const selectedRoles: ("admin" | "accountant" | "clerk" | "sales_rep" | "storekeeper")[] = [];
      
      if (data.roles.admin) selectedRoles.push("admin");
      if (data.roles.accountant) selectedRoles.push("accountant");
      if (data.roles.clerk) selectedRoles.push("clerk");
      if (data.roles.sales_rep) selectedRoles.push("sales_rep");
      if (data.roles.storekeeper) selectedRoles.push("storekeeper");

      const rolesToAdd = selectedRoles.filter((r) => !currentRoleNames.includes(r));
      const rolesToRemove = currentRoleNames.filter((r) => !selectedRoles.includes(r));

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

      // Handle permissions
      const modules = ['sales', 'purchasing', 'inventory', 'expenses', 'reports', 'settings'];
      
      for (const module of modules) {
        const modulePerms = data.permissions[module as keyof typeof data.permissions];
        
        // Upsert permissions
        const { error: permError } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: userId,
            company_id: companyId,
            module: module,
            can_view: modulePerms.view,
            can_create: modulePerms.create,
            can_edit: modulePerms.edit,
            can_delete: modulePerms.delete,
          }, {
            onConflict: 'user_id,company_id,module'
          });

        if (permError) throw permError;
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

  const ModulePermissions = ({ module, label }: { module: string; label: string }) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">{label}</h4>
      <div className="grid grid-cols-4 gap-2 pl-4">
        <FormField
          control={form.control}
          name={`permissions.${module}.view` as any}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal">View</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`permissions.${module}.create` as any}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal">Create</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`permissions.${module}.edit` as any}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal">Edit</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`permissions.${module}.delete` as any}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal">Delete</FormLabel>
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (for login)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. john_doe" />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Optional. Sales reps can login with this username.
                    </p>
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
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_sales_rep"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Sales Representative</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark as sales rep for activity tracking
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
            </div>

            <Separator />

            <div className="space-y-3">
              <FormLabel className="text-base">User Roles</FormLabel>
              <div className="grid grid-cols-2 gap-3 border rounded-lg p-4">
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
                        <div className="text-xs text-muted-foreground">
                          Full system access
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
                        <div className="text-xs text-muted-foreground">
                          Financial records
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
                        <div className="text-xs text-muted-foreground">
                          Basic operations
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roles.sales_rep"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sales Rep</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Sales operations
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roles.storekeeper"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Storekeeper</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Inventory management
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <FormLabel className="text-base">Module Permissions</FormLabel>
              <div className="space-y-4 border rounded-lg p-4">
                <ModulePermissions module="sales" label="Sales" />
                <Separator />
                <ModulePermissions module="purchasing" label="Purchasing" />
                <Separator />
                <ModulePermissions module="inventory" label="Inventory" />
                <Separator />
                <ModulePermissions module="expenses" label="Expenses and Other" />
                <Separator />
                <ModulePermissions module="reports" label="Reports" />
                <Separator />
                <ModulePermissions module="settings" label="Settings" />
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