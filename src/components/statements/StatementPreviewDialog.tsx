import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mail, Send, X } from "lucide-react";
import { format } from "date-fns";
import { StatementOptions } from "./StatementOptionsDialog";

interface Transaction {
  date: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
}

interface CustomerData {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit?: number;
  payment_terms?: number;
}

interface StatsData {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
}

interface StatementPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerData;
  stats: StatsData;
  transactions: Transaction[];
  options: StatementOptions;
  onExport: () => void;
  onEmail: () => void;
  onWhatsApp: () => void;
}

export default function StatementPreviewDialog({
  open,
  onOpenChange,
  customer,
  stats,
  transactions,
  options,
  onExport,
  onEmail,
  onWhatsApp,
}: StatementPreviewDialogProps) {
  // Filter transactions based on options
  let filteredTransactions = transactions;
  
  if (options.dateFrom || options.dateTo) {
    filteredTransactions = transactions.filter((txn) => {
      const txnDate = new Date(txn.date);
      if (options.dateFrom && txnDate < options.dateFrom) return false;
      if (options.dateTo && txnDate > options.dateTo) return false;
      return true;
    });
  }

  if (options.includeInvoices === false) {
    filteredTransactions = filteredTransactions.filter(txn => txn.type !== "Invoice");
  }
  if (options.includeReceipts === false) {
    filteredTransactions = filteredTransactions.filter(txn => txn.type !== "Receipt");
  }

  let runningBalance = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Customer Statement Preview</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              {customer.email && (
                <Button size="sm" variant="outline" onClick={onEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              )}
              {customer.phone && (
                <Button size="sm" variant="outline" onClick={onWhatsApp}>
                  <Send className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-4 bg-background">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">CUSTOMER STATEMENT</h1>
            <p className="text-sm text-muted-foreground">
              Statement Date: {format(new Date(), "PPP")}
            </p>
            {options.dateFrom && options.dateTo && (
              <p className="text-sm text-muted-foreground">
                Period: {format(options.dateFrom, "PPP")} - {format(options.dateTo, "PPP")}
              </p>
            )}
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer Code</p>
                  <p className="font-medium">{customer.code}</p>
                </div>
              </div>
              {customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
              {customer.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{customer.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Summary */}
          {options.includeAccountSummary !== false && (
            <Card>
              <CardHeader>
                <CardTitle>Account Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Invoiced</TableCell>
                      <TableCell className="text-right font-medium">
                        {stats.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Paid</TableCell>
                      <TableCell className="text-right font-medium">
                        {stats.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted">
                      <TableCell className="font-bold">Outstanding Balance</TableCell>
                      <TableCell className="text-right font-bold">
                        {stats.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    {options.showRunningBalance !== false && (
                      <TableHead className="text-right">Balance</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={options.showRunningBalance !== false ? 6 : 5} className="text-center">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((txn, idx) => {
                      runningBalance += txn.debit - txn.credit;
                      return (
                        <TableRow key={idx}>
                          <TableCell>{format(new Date(txn.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{txn.type}</TableCell>
                          <TableCell className="font-mono">{txn.reference}</TableCell>
                          <TableCell className="text-right">
                            {txn.debit > 0 ? txn.debit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {txn.credit > 0 ? txn.credit.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"}
                          </TableCell>
                          {options.showRunningBalance !== false && (
                            <TableCell className="text-right font-medium">
                              {runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              {customer.payment_terms && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Payment Terms:</span>{" "}
                  <span className="font-medium">{customer.payment_terms} days</span>
                </p>
              )}
              {customer.credit_limit && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Credit Limit:</span>{" "}
                  <span className="font-medium">
                    {customer.credit_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </p>
              )}
              {options.notes && (
                <p className="text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  <span>{options.notes}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
