import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface TransactionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
}

export default function TransactionViewDialog({ open, onOpenChange, transaction }: TransactionViewDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Expense Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Expense No</Label>
              <p className="font-medium">{transaction.transaction_no}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{new Date(transaction.transaction_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <p className="font-medium">{transaction.transaction_type}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className="font-medium text-lg">
                {transaction.amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Description</Label>
            <p className="font-medium">{transaction.description}</p>
          </div>

          {transaction.reference && (
            <div>
              <Label className="text-muted-foreground">Reference</Label>
              <p className="font-medium">{transaction.reference}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
