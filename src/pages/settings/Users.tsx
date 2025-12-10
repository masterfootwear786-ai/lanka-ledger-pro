import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users as UsersIcon, Mail, Shield, Edit, Trash2, AlertCircle, Plus, Clock, RefreshCw, XCircle } from "lucide-react";
import { UserDialog } from "@/components/settings/UserDialog";
import { UserPermissionsSheet } from "@/components/settings/UserPermissionsSheet";
import { useUserRole, PERMISSION_MANAGER_EMAILS } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Users() {
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading, canManagePermissions, userEmail } = useUserRole();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [userToReject, setUserToReject] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Realtime subscription for pending users
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('user-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          fetchUsers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      setCompanyId(profile.company_id);

      // Fetch ALL users in the same company (including inactive ones for pending)
      const { data: companyProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id);

      // Also fetch users WITHOUT company_id (new signups waiting to be assigned)
      const { data: pendingProfiles } = await supabase
        .from('profiles')
        .select('*')
        .is('company_id', null);

      // Combine both lists
      const allProfiles = [...(companyProfiles || []), ...(pendingProfiles || [])];

      if (allProfiles.length > 0) {
        // Fetch roles for each user
        const usersWithRoles = await Promise.all(
          allProfiles.map(async (profile) => {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.id);

            return {
              ...profile,
              roles: roles?.map(r => r.role) || [],
              isPendingAssignment: !profile.company_id, // Mark users without company
            };
          })
        );

        setUsers(usersWithRoles);
      } else {
        setUsers([]);
      }
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'accountant':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'clerk':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sales_rep':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'storekeeper':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return '';
    }
  };

  const handleEditUser = (user: any) => {
    if (!canManagePermissions()) {
      toast({
        title: "Access Denied",
        description: "Only authorized administrators can manage user permissions",
        variant: "destructive",
      });
      return;
    }
    setEditingUser(user);
    setUserDialogOpen(true);
  };

  const handleAddUser = () => {
    if (!canManagePermissions()) {
      toast({
        title: "Access Denied",
        description: "Only authorized administrators can add users",
        variant: "destructive",
      });
      return;
    }
    setEditingUser(null);
    setUserDialogOpen(true);
  };

  const handleDeleteClick = (user: any) => {
    if (!canManagePermissions()) {
      toast({
        title: "Access Denied",
        description: "Only authorized administrators can manage users",
        variant: "destructive",
      });
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      // Delete user roles first
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userToDelete.id);

      if (rolesError) throw rolesError;

      // Deactivate the profile instead of deleting
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ active: false })
        .eq("id", userToDelete.id);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "User has been deactivated",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleRejectClick = (user: any) => {
    if (!canManagePermissions()) {
      toast({
        title: "Access Denied",
        description: "Only authorized administrators can reject users",
        variant: "destructive",
      });
      return;
    }
    setUserToReject(user);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!userToReject) return;

    try {
      // Delete the profile completely (this will cascade delete roles if any)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToReject.id);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "User has been rejected and removed from the system",
        duration: 3000,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRejectDialogOpen(false);
      setUserToReject(null);
    }
  };

  // Pending = users with no roles (regardless of active status - they need permission assignment)
  const pendingUsers = users.filter(u => u.roles.length === 0);
  const activeUsers = users.filter(u => u.roles.length > 0 && u.company_id && u.active);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access user management. Only administrators can manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage user accounts and their roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManagePermissions() && (
            <>
              <UserPermissionsSheet companyId={companyId} onSuccess={fetchUsers} />
              <Button onClick={handleAddUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Authorization notice */}
      {!canManagePermissions() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can view users but only authorized administrators ({PERMISSION_MANAGER_EMAILS.join(', ')}) can manage permissions.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Active ({activeUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Users Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="h-5 w-5" />
                Users Waiting for Permissions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                These users have registered but are waiting for role assignment
              </p>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users waiting for permissions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingUsers.map((user) => (
                    <Card key={user.id} className={`border-amber-300 dark:border-amber-700 ${user.isPendingAssignment ? 'border-dashed' : ''}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Shield className="h-4 w-4 text-amber-600" />
                          {user.full_name || "Unnamed User"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs break-all">{user.email}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            Waiting for permissions
                          </Badge>
                          {user.isPendingAssignment && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              New Signup
                            </Badge>
                          )}
                        </div>
                        {canManagePermissions() && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="flex-1"
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectClick(user)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeUsers.map((user) => {
              const isProtectedUser = PERMISSION_MANAGER_EMAILS.includes(user.email);
              
              return (
                <Card key={user.id} className={isProtectedUser ? "border-primary/50 bg-primary/5" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className={`h-5 w-5 ${isProtectedUser ? "text-primary" : ""}`} />
                      {user.full_name || "Unnamed User"}
                      {isProtectedUser && (
                        <Badge variant="outline" className="ml-auto text-xs bg-primary/10 text-primary border-primary/30">
                          System Owner
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="break-all">{user.email}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Roles:</div>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role: string) => (
                          <Badge
                            key={role}
                            className={getRoleBadgeColor(role)}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">Status:</span>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Language: {user.language || "en"}
                    </div>

                    {canManagePermissions() && !isProtectedUser && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteClick(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {activeUsers.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active users with roles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <UserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={editingUser}
        onSuccess={fetchUsers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user account for {userToDelete?.full_name || userToDelete?.email}.
              The user will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject User Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {userToReject?.full_name || userToReject?.email} from the system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reject User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
