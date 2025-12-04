import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Mail, Send, CheckCircle, XCircle, Clock, Banknote } from "lucide-react";
import { format } from "date-fns";
import { StatementOptions } from "./StatementOptionsDialog";

interface Transaction {
  date: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
  status?: string | null;
  details?: any;
  pendingAmount?: number;
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
  pendingCheques?: number;
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
    filteredTransactions = filteredTransactions.filter(txn => 
      !txn.type.includes("Cheque") && txn.type !== "Cash Payment"
    );
  }

  // Calculate running balance only counting actual paid amounts
  let runningBalance = 0;

  // Get pending cheques for separate section
  const pendingCheques = filteredTransactions.filter(
    txn => txn.type === "Cheque (Pending)" && txn.pendingAmount && txn.pendingAmount > 0
  );

  const getStatusBadge = (type: string) => {
    if (type === "Invoice") {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Invoice</Badge>;
    }
    if (type === "Cash Payment") {
      return <Badge className="bg-green-500 hover:bg-green-600"><Banknote className="h-3 w-3 mr-1" />Cash</Badge>;
    }
    if (type === "Cheque (Cleared)") {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Cleared</Badge>;
    }
    if (type === "Cheque (Pending)") {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    if (type === "Cheque (Returned)") {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Returned</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

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
          <div className="text-center space-y-2 border-b pb-6">
            <h1 className="text-3xl font-bold tracking-tight">CUSTOMER STATEMENT</h1>
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
          <Card className="border-2">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground font-semibold">Customer Name</p>
                    <p className="font-bold text-lg">{customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground font-semibold">Customer Code</p>
                    <p className="font-medium">{customer.code}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {customer.phone && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold">Phone</p>
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                  )}
                  {customer.address && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold">Address</p>
                      <p className="font-medium">{customer.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Summary */}
          {options.includeAccountSummary !== false && (
            <Card className="border-2">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-lg">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs uppercase text-blue-600 font-semibold mb-1">Total Invoiced</p>
                    <p className="text-xl font-bold text-blue-700">
                      {stats.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs uppercase text-green-600 font-semibold mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-700">
                      {stats.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs uppercase text-orange-600 font-semibold mb-1">Pending Cheques</p>
                    <p className="text-xl font-bold text-orange-700">
                      {(stats.pendingCheques || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs uppercase text-red-600 font-semibold mb-1">Outstanding</p>
                    <p className="text-xl font-bold text-red-700">
                      {stats.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Cheques Section */}
          {pendingCheques.length > 0 && (
            <Card className="border-2 border-orange-200">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-lg text-orange-700 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Cheques ({pendingCheques.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-50/50">
                      <TableHead>Cheque No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Bank / Branch</TableHead>
                      <TableHead>Holder</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCheques.map((txn, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono font-semibold">{txn.details?.chequeNo}</TableCell>
                        <TableCell>{txn.details?.date ? format(new Date(txn.details.date), "dd/MM/yyyy") : "-"}</TableCell>
                        <TableCell>{txn.details?.bank} - {txn.details?.branch}</TableCell>
                        <TableCell>{txn.details?.holder}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {txn.pendingAmount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Transaction History */}
          <Card className="border-2">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="w-36">Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right w-32">Debit</TableHead>
                    <TableHead className="text-right w-32">Credit</TableHead>
                    {options.showRunningBalance !== false && (
                      <TableHead className="text-right w-32">Balance</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={options.showRunningBalance !== false ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((txn, idx) => {
                      // Only add to running balance if it's an actual transaction (not pending)
                      if (txn.type !== "Cheque (Pending)") {
                        runningBalance += txn.debit - txn.credit;
                      }
                      return (
                        <TableRow key={idx} className={txn.type === "Cheque (Pending)" ? "bg-orange-50/30" : ""}>
                          <TableCell className="font-medium">{format(new Date(txn.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{getStatusBadge(txn.type)}</TableCell>
                          <TableCell className="font-mono text-sm">{txn.reference}</TableCell>
                          <TableCell className="text-right font-medium">
                            {txn.debit > 0 ? (
                              <span className="text-red-600">{txn.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {txn.credit > 0 ? (
                              <span className="text-green-600">{txn.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            ) : txn.type === "Cheque (Pending)" ? (
                              <span className="text-orange-500 text-xs">(Pending: {txn.pendingAmount?.toLocaleString()})</span>
                            ) : "-"}
                          </TableCell>
                          {options.showRunningBalance !== false && (
                            <TableCell className="text-right font-bold">
                              {txn.type !== "Cheque (Pending)" ? (
                                <span className={runningBalance > 0 ? "text-red-600" : "text-green-600"}>
                                  {runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                              ) : "-"}
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
          <Card className="border">
            <CardContent className="pt-6 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {customer.payment_terms && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Payment Terms:</span>
                    <span className="font-semibold">{customer.payment_terms} days</span>
                  </div>
                )}
                {customer.credit_limit && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Credit Limit:</span>
                    <span className="font-semibold">
                      {customer.credit_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              {options.notes && (
                <div className="pt-3 border-t">
                  <p className="text-sm">
                    <span className="text-muted-foreground font-semibold">Notes: </span>
                    <span>{options.notes}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>This is a computer-generated statement. Please contact us if you have any queries.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}