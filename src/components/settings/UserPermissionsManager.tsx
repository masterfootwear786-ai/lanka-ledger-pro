import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, ChevronDown, ChevronRight } from "lucide-react";
import { PERMISSION_MODULES, ModuleName, Permission } from "@/hooks/useUserPermissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface UserPermissionsManagerProps {
  userId: string;
  companyId: string;
  onSave?: () => void;
}

type PermissionState = Record<string, {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}>;

export function UserPermissionsManager({ userId, companyId, onSave }: UserPermissionsManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Generate permission key
  const getPermKey = (module: string, subModule?: string | null) => 
    subModule ? `${module}:${subModule}` : module;

  useEffect(() => {
    fetchUserPermissions();
  }, [userId]);

  const fetchUserPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Build permission state from fetched data
      const permState: PermissionState = {};
      
      // Initialize all modules and sub-modules with false
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

      // Apply saved permissions
      data?.forEach((perm: Permission) => {
        const key = getPermKey(perm.module, perm.sub_module);
        permState[key] = {
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
        };
      });

      setPermissions(permState);
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

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete existing permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Prepare new permissions
      const newPermissions: any[] = [];
      
      Object.entries(permissions).forEach(([key, perm]) => {
        // Only save if at least one permission is granted
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
        const { error } = await supabase
          .from('user_permissions')
          .insert(newPermissions);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Permissions saved successfully",
      });

      onSave?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Set permissions for each module and sub-module. V=View, C=Create, E=Edit, D=Delete
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
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
                      <span className="font-medium">{moduleDef.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      {['can_view', 'can_create', 'can_edit', 'can_delete'].map((field) => (
                        <div key={field} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            id={`${moduleName}-all-${field}`}
                            checked={isModuleAllChecked(moduleName, field as keyof PermissionState[''])}
                            onCheckedChange={(checked) => handleSelectAll(moduleName, field as keyof PermissionState[''], !!checked)}
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
                              {['can_view', 'can_create', 'can_edit', 'can_delete'].map((field) => (
                                <div key={field} className="flex items-center gap-1">
                                  <Checkbox
                                    id={`${permKey}-${field}`}
                                    checked={perm[field as keyof typeof perm]}
                                    onCheckedChange={(checked) => handlePermissionChange(permKey, field as keyof PermissionState[''], !!checked)}
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
                  <span className="font-medium">{moduleDef.label}</span>
                  <div className="flex items-center gap-4 text-xs">
                    {['can_view', 'can_create', 'can_edit', 'can_delete'].map((field) => {
                      const permKey = getPermKey(moduleName);
                      const perm = permissions[permKey] || { can_view: false, can_create: false, can_edit: false, can_delete: false };

                      return (
                        <div key={field} className="flex items-center gap-1">
                          <Checkbox
                            id={`${permKey}-${field}`}
                            checked={perm[field as keyof typeof perm]}
                            onCheckedChange={(checked) => handlePermissionChange(permKey, field as keyof PermissionState[''], !!checked)}
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

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Permissions
          </>
        )}
      </Button>
    </div>
  );
}
