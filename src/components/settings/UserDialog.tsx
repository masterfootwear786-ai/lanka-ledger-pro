import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSION_MANAGER_EMAILS } from "@/hooks/useUserRole";
import { KeyRound, ChevronDown, ChevronRight } from "lucide-react";
import { PERMISSION_MODULES, ModuleName } from "@/hooks/useUserPermissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().optional(),
  password: z.union([z.literal(""), z.string().min(6, "Password must be at least 6 characters")]).optional(),
  active: z.boolean(),
  language: z.string(),
  roles: z.object({
    admin: z.boolean(),
    accountant: z.boolean(),
    clerk: z.boolean(),
    sales_rep: z.boolean(),
    storekeeper: z.boolean(),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

type PermissionState = Record<string, {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}>;

// Generate permission key
const getPermKey = (module: string, subModule?: string | null) => 
  subModule ? `${module}:${subModule}` : module;

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const initKeyRef = useRef<string | null>(null);

  const isSystemOwner = currentUser?.email && PERMISSION_MANAGER_EMAILS.includes(currentUser.email);

  // Initialize default permissions
  const initializeDefaultPermissions = (): PermissionState => {
    const permState: PermissionState = {};
    Object.entries(PERMISSION_MODULES).forEach(([moduleName, moduleDef]) => {
      if (moduleDef.subModules) {
        Object.keys(moduleDef.subModules).forEach(subModule => {
          const key = getPermKey(moduleName, subModule);
          permState[key] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
        });
      } else {
        const key = getPermKey(moduleName);
        permState[key] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
      }
    });
    return permState;
  };

  const handleResetPassword = async () => {
    if (!user?.id) return;
    
    try {
      setResettingPassword(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.company_id) {
        throw new Error("User has no company");
      }

      const { data: company } = await supabase
        .from('companies')
        .select('action_password')
        .eq('id', profile.company_id)
        .single();

      let defaultPassword = company?.action_password || "123456";
      if (defaultPassword.length < 6) {
        defaultPassword = "123456";
      }

      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: user.id, newPassword: defaultPassword }
      });

      if (error) throw error;

      toast({
        title: "Password Reset",
        description: `Password has been reset to: ${defaultPassword}`,
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    shouldFocusError: true,
    defaultValues: {
      full_name: "",
      email: "",
      username: "",
      password: "",
      active: true,
      language: "en",
      roles: {
        admin: false,
        accountant: false,
        clerk: false,
        sales_rep: false,
        storekeeper: false,
      },
    },
  });

  useEffect(() => {
    if (!open) {
      initKeyRef.current = null;
      setInitializing(false);
      setPermissions(initializeDefaultPermissions());
      setExpandedModules(new Set());
      return;
    }

    const initKey = user ? user.id : "new";
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    let cancelled = false;

    const loadUserData = async () => {
      setInitializing(true);

      try {
        if (user) {
          // Fetch user permissions
          const { data: permsData } = await supabase
            .from("user_permissions")
            .select("*")
            .eq("user_id", user.id);

          if (cancelled) return;

          // Initialize permissions state
          const permState = initializeDefaultPermissions();

          // Apply saved permissions
          permsData?.forEach((perm: any) => {
            const key = getPermKey(perm.module, perm.sub_module);
            if (permState[key]) {
              permState[key] = {
                can_view: perm.can_view || false,
                can_create: perm.can_create || false,
                can_edit: perm.can_edit || false,
                can_delete: perm.can_delete || false,
              };
            }
          });

          setPermissions(permState);

          form.reset({
            full_name: user.full_name || "",
            email: user.email || "",
            username: user.username || "",
            password: "",
            active: user.active ?? true,
            language: user.language || "en",
            roles: {
              admin: user.roles?.includes("admin") || false,
              accountant: user.roles?.includes("accountant") || false,
              clerk: user.roles?.includes("clerk") || false,
              sales_rep: user.roles?.includes("sales_rep") || false,
              storekeeper: user.roles?.includes("storekeeper") || false,
            },
          });
        } else {
          setPermissions(initializeDefaultPermissions());
          form.reset({
            full_name: "",
            email: "",
            username: "",
            password: "",
            active: true,
            language: "en",
            roles: {
              admin: false,
              accountant: false,
              clerk: false,
              sales_rep: false,
              storekeeper: false,
            },
          });
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const handlePermissionChange = (key: string, field: keyof PermissionState[''], checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: checked,
      },
    }));
  };

  const handleModuleToggle = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const handleSelectAll = (module: string, field: keyof PermissionState[''], checked: boolean) => {
    const moduleDef = PERMISSION_MODULES[module as ModuleName];
    
    setPermissions(prev => {
      const next = { ...prev };
      
      if (moduleDef.subModules) {
        Object.keys(moduleDef.subModules).forEach(subModule => {
          const key = getPermKey(module, subModule);
          next[key] = { ...next[key], [field]: checked };
        });
      } else {
        const key = getPermKey(module);
        next[key] = { ...next[key], [field]: checked };
      }
      
      return next;
    });
  };

  const isModuleAllChecked = (module: string, field: keyof PermissionState['']): boolean => {
    const moduleDef = PERMISSION_MODULES[module as ModuleName];
    
    if (moduleDef.subModules) {
      return Object.keys(moduleDef.subModules).every(subModule => {
        const key = getPermKey(module, subModule);
        return permissions[key]?.[field] || false;
      });
    } else {
      const key = getPermKey(module);
      return permissions[key]?.[field] || false;
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      let userId = user?.id;
      let companyId = user?.company_id;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', authUser.id)
        .single();

      if (!currentProfile?.company_id) {
        throw new Error("Current user has no company assigned");
      }

      if (!companyId) {
        companyId = currentProfile.company_id;
      }

      if (!user) {
        // Creating new user
        if (!data.password) {
          throw new Error("Password is required for new users");
        }

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

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            company_id: companyId,
            full_name: data.full_name,
            active: data.active,
            language: data.language,
            username: data.username ? data.username.toLowerCase().trim() : null,
            is_sales_rep: data.roles.sales_rep,
          })
          .eq("id", userId);

        if (profileUpdateError) throw profileUpdateError;

      } else {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            company_id: companyId,
            full_name: data.full_name,
            active: data.active,
            language: data.language,
            username: data.username ? data.username.toLowerCase().trim() : null,
            is_sales_rep: data.roles.sales_rep,
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

      // Handle granular permissions - delete existing and insert new
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Prepare new permissions
      const newPermissions: any[] = [];
      
      Object.entries(permissions).forEach(([key, perm]) => {
        if (perm.can_view || perm.can_create || perm.can_edit || perm.can_delete) {
          const [module, subModule] = key.split(':');
          newPermissions.push({
            user_id: userId,
            company_id: companyId,
            module,
            sub_module: subModule || null,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
          });
        }
      });

      if (newPermissions.length > 0) {
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(newPermissions);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add New User"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              const fields = Object.keys(errors);
              toast({
                title: "Validation error",
                description: fields.length
                  ? `Please check: ${fields.join(", ")}`
                  : "Please check the highlighted fields and try again.",
                variant: "destructive",
              });
            })}
            className={
              initializing
                ? "space-y-6 opacity-60 pointer-events-none"
                : "space-y-6"
            }
            aria-busy={initializing}
          >
            {/* Basic Info */}
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
                      <Input {...field} readOnly={!!user} aria-readonly={!!user} />
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
                      Users can login with either email or username
                    </p>
                  </FormItem>
                )}
              />

              {!user ? (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <FormLabel>Password</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetPassword}
                      disabled={resettingPassword}
                      className="w-full"
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      {resettingPassword ? "Resetting..." : "Reset Password"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Resets to company action password or 123456
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        Inactive users cannot login
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
                name="language"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Language</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        Preferred language
                      </div>
                    </div>
                    <FormControl>
                      <select
                        {...field}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="en">English</option>
                        <option value="si">සිංහල</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Roles */}
            <div className="space-y-4">
              <FormLabel className="text-base">User Roles</FormLabel>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="roles.admin"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Admin</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Full access to all features
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
                          onCheckedChange={(v) => field.onChange(v === true)}
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
                          onCheckedChange={(v) => field.onChange(v === true)}
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
                          onCheckedChange={(v) => field.onChange(v === true)}
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
                          onCheckedChange={(v) => field.onChange(v === true)}
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

            {/* Granular Module Permissions */}
            <div className="space-y-4">
              <div>
                <FormLabel className="text-base">Module Permissions</FormLabel>
                <p className="text-xs text-muted-foreground mt-1">
                  Set permissions for each module and sub-module. V=View, C=Create, E=Edit, D=Delete
                </p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 border rounded-lg p-2">
                {Object.entries(PERMISSION_MODULES).map(([moduleName, moduleDef]) => {
                  const hasSubModules = moduleDef.subModules !== null;
                  const isExpanded = expandedModules.has(moduleName);

                  return (
                    <div key={moduleName} className="border rounded-lg overflow-hidden">
                      {hasSubModules ? (
                        <Collapsible open={isExpanded} onOpenChange={() => handleModuleToggle(moduleName)}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="font-medium text-sm">{moduleDef.label}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map((field) => (
                                <div key={field} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    id={`${moduleName}-all-${field}`}
                                    checked={isModuleAllChecked(moduleName, field)}
                                    onCheckedChange={(checked) => handleSelectAll(moduleName, field, !!checked)}
                                  />
                                  <Label htmlFor={`${moduleName}-all-${field}`} className="text-xs cursor-pointer">
                                    {field === 'can_view' ? 'V' : field === 'can_create' ? 'C' : field === 'can_edit' ? 'E' : 'D'}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-2 space-y-1 bg-background">
                              {Object.entries(moduleDef.subModules!).map(([subKey, subLabel]) => {
                                const permKey = getPermKey(moduleName, subKey);
                                const perm = permissions[permKey] || { can_view: false, can_create: false, can_edit: false, can_delete: false };

                                return (
                                  <div key={subKey} className="flex items-center justify-between py-2 px-3 hover:bg-muted/30 rounded">
                                    <span className="text-sm">{subLabel as string}</span>
                                    <div className="flex items-center gap-4">
                                      {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map((field) => (
                                        <div key={field} className="flex items-center gap-1">
                                          <Checkbox
                                            id={`${permKey}-${field}`}
                                            checked={perm[field]}
                                            onCheckedChange={(checked) => handlePermissionChange(permKey, field, !!checked)}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-muted/50">
                          <span className="font-medium text-sm">{moduleDef.label}</span>
                          <div className="flex items-center gap-4 text-xs">
                            {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map((field) => {
                              const permKey = getPermKey(moduleName);
                              const perm = permissions[permKey] || { can_view: false, can_create: false, can_edit: false, can_delete: false };

                              return (
                                <div key={field} className="flex items-center gap-1">
                                  <Checkbox
                                    id={`${permKey}-${field}`}
                                    checked={perm[field]}
                                    onCheckedChange={(checked) => handlePermissionChange(permKey, field, !!checked)}
                                  />
                                  <Label htmlFor={`${permKey}-${field}`} className="text-xs cursor-pointer">
                                    {field === 'can_view' ? 'V' : field === 'can_create' ? 'C' : field === 'can_edit' ? 'E' : 'D'}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <Button type="submit" disabled={loading || initializing}>
                {loading ? "Saving..." : user ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
