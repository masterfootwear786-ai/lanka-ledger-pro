import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, Loader2 } from "lucide-react";
import { UserRole } from "@/hooks/useUserRole";

interface UserPermissionsSheetProps {
  companyId: string | null;
  onSuccess: () => void;
}

export function UserPermissionsSheet({ companyId, onSuccess }: UserPermissionsSheetProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);

  const roles: { value: UserRole; label: string }[] = [
    { value: "admin", label: "Admin" },
    { value: "sales_rep", label: "Sales Rep" },
    { value: "storekeeper", label: "Storekeeper" },
    { value: "clerk", label: "Clerk" },
    { value: "accountant", label: "Accountant" },
  ];

  const handleAssignPermission = async () => {
    if (!emailOrUsername.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email or username",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Error",
        description: "Company not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const searchValue = emailOrUsername.trim().toLowerCase();
      
      // Find user by email or username
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, company_id, username")
        .or(`email.ilike.${searchValue},username.ilike.${searchValue}`);

      if (profileError) throw profileError;

      const profile = profiles?.[0];

      if (!profile) {
        toast({
          title: "User Not Found",
          description: "No user found with that email or username. Please make sure the user has registered.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update user's company_id if not set
      if (!profile.company_id) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ company_id: companyId })
          .eq("id", profile.id);

        if (updateError) {
          throw updateError;
        }
      }

      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.id)
        .eq("role", selectedRole)
        .single();

      if (existingRole) {
        toast({
          title: "Role Already Assigned",
          description: `${profile.email} already has the ${selectedRole} role`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Assign the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([{
          user_id: profile.id,
          role: selectedRole,
          company_id: companyId,
        }]);

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: `${selectedRole} role assigned to ${profile.email || profile.full_name}`,
      });

      // Reset form and close sheet
      setEmailOrUsername("");
      setSelectedRole("");
      setOpen(false);
      onSuccess();
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          User Permissions
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            User Permissions
          </SheetTitle>
          <SheetDescription>
            Assign roles and permissions to users by their email or username
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Email/Username Input */}
          <div className="space-y-2">
            <Label htmlFor="email-username">Email or Username</Label>
            <Input
              id="email-username"
              placeholder="Enter email or username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign Button */}
          <Button
            className="w-full"
            onClick={handleAssignPermission}
            disabled={loading || !emailOrUsername.trim() || !selectedRole}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Assign Permissions
              </>
            )}
          </Button>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            Only registered users can be assigned permissions. Make sure the user has created an account first.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
