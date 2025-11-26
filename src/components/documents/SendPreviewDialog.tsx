import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SendPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  documentType: string;
  documentNo: string;
  contactName: string;
  contactEmail: string;
  amount: number;
  outstandingBalance?: number;
  lineItems?: any[];
  message?: string;
  options: {
    includeOutstanding: boolean;
    includeLineItems: boolean;
    includePaymentTerms: boolean;
  };
  loading?: boolean;
}

export function SendPreviewDialog({
  open,
  onOpenChange,
  onConfirm,
  documentType,
  documentNo,
  contactName,
  contactEmail,
  amount,
  outstandingBalance,
  lineItems,
  message,
  options,
  loading,
}: SendPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">To:</Label>
              <p className="font-medium">{contactEmail}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Subject:</Label>
              <p className="font-medium">{documentType} {documentNo}</p>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Email Content</h3>
            <Separator />
            
            <div className="space-y-2">
              <p>Dear {contactName},</p>
              <p>Please find the details of your {documentType.toLowerCase()}:</p>
            </div>

            <div className="bg-muted/50 p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">{documentType} Number:</span>
                <span>{documentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span>{amount.toLocaleString()}</span>
              </div>
              
              {options.includeOutstanding && outstandingBalance !== undefined && (
                <div className="flex justify-between text-destructive">
                  <span className="font-medium">Outstanding Balance:</span>
                  <span>{outstandingBalance.toLocaleString()}</span>
                </div>
              )}
            </div>

            {options.includeLineItems && lineItems && lineItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Line Items:</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Description</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.description}</td>
                          <td className="text-right p-2">{item.quantity}</td>
                          <td className="text-right p-2">{item.unit_price.toLocaleString()}</td>
                          <td className="text-right p-2">{item.line_total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {message && (
              <div className="space-y-1">
                <p className="font-medium">Additional Message:</p>
                <p className="text-muted-foreground">{message}</p>
              </div>
            )}

            {options.includePaymentTerms && (
              <div className="bg-muted/30 p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Payment Terms:</span> Payment is due within 30 days of invoice date.
                </p>
              </div>
            )}

            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br />Accounts Team</p>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Sending..." : "Confirm & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
