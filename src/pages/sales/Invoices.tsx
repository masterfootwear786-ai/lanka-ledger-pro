import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type PasswordPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** මේක action එක run කරන්න call කරන function එක (edit / delete)  */
  onConfirm: () => void;
  /** Password check කරන function එක – true නම් OK, false නම් fail */
  onPasswordVerify: (password: string) => Promise<boolean> | boolean;
  title?: string;
  description?: string;
};

export function PasswordPromptDialog({
  open,
  onOpenChange,
  onConfirm,
  onPasswordVerify,
  title = "Action Password Required",
  description = "Please enter your action password to continue.",
}: PasswordPromptDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    if (submitting) return;
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const ok = await onPasswordVerify(password);

      if (!ok) {
        setError("Invalid password");
        toast({
          title: "Access denied",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        return;
      }

      // Password correct → close dialog + run action
      setPassword("");
      onOpenChange(false);
      onConfirm();
    } catch (e) {
      setError("Something went wrong");
      toast({
        title: "Error",
        description: "Could not verify password.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">Action password</label>
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter action password"
            disabled={submitting}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Checking..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
