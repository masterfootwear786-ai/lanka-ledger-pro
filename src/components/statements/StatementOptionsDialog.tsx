import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Download, Mail, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatementOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerEmail?: string;
  customerPhone?: string;
  onExport: (options: StatementOptions) => void;
  onEmail: (options: StatementOptions) => void;
  onWhatsApp: (options: StatementOptions) => void;
}

export interface StatementOptions {
  dateFrom?: Date;
  dateTo?: Date;
  includeInvoices: boolean;
  includeReceipts: boolean;
  includeCreditNotes: boolean;
  showRunningBalance: boolean;
  includeAccountSummary: boolean;
  notes?: string;
}

export default function StatementOptionsDialog({
  open,
  onOpenChange,
  customerEmail,
  customerPhone,
  onExport,
  onEmail,
  onWhatsApp,
}: StatementOptionsDialogProps) {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [includeCreditNotes, setIncludeCreditNotes] = useState(true);
  const [showRunningBalance, setShowRunningBalance] = useState(true);
  const [includeAccountSummary, setIncludeAccountSummary] = useState(true);
  const [notes, setNotes] = useState("");

  const getOptions = (): StatementOptions => ({
    dateFrom,
    dateTo,
    includeInvoices,
    includeReceipts,
    includeCreditNotes,
    showRunningBalance,
    includeAccountSummary,
    notes,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Statement Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="font-semibold">Date Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Include Options */}
          <div className="space-y-4">
            <h3 className="font-semibold">Include in Statement</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="invoices"
                  checked={includeInvoices}
                  onCheckedChange={(checked) => setIncludeInvoices(checked as boolean)}
                />
                <Label htmlFor="invoices" className="cursor-pointer">
                  Invoices
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="receipts"
                  checked={includeReceipts}
                  onCheckedChange={(checked) => setIncludeReceipts(checked as boolean)}
                />
                <Label htmlFor="receipts" className="cursor-pointer">
                  Receipts
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="creditNotes"
                  checked={includeCreditNotes}
                  onCheckedChange={(checked) => setIncludeCreditNotes(checked as boolean)}
                />
                <Label htmlFor="creditNotes" className="cursor-pointer">
                  Credit Notes
                </Label>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <h3 className="font-semibold">Display Options</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="balance"
                  checked={showRunningBalance}
                  onCheckedChange={(checked) => setShowRunningBalance(checked as boolean)}
                />
                <Label htmlFor="balance" className="cursor-pointer">
                  Show Running Balance
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={includeAccountSummary}
                  onCheckedChange={(checked) => setIncludeAccountSummary(checked as boolean)}
                />
                <Label htmlFor="summary" className="cursor-pointer">
                  Include Account Summary
                </Label>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add custom notes to statement..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onExport(getOptions())}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {customerEmail && (
            <Button
              variant="outline"
              onClick={() => onEmail(getOptions())}
              className="w-full sm:w-auto"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Statement
            </Button>
          )}
          {customerPhone && (
            <Button
              variant="outline"
              onClick={() => onWhatsApp(getOptions())}
              className="w-full sm:w-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
