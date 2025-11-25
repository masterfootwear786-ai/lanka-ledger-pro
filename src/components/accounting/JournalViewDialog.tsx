import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface JournalViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal: any;
}

export function JournalViewDialog({ open, onOpenChange, journal }: JournalViewDialogProps) {
  const [lines, setLines] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (open && journal) {
      fetchJournalLines();
    }
  }, [open, journal]);

  const fetchJournalLines = async () => {
    const { data: journalLines } = await supabase
      .from('journal_lines')
      .select('*')
      .eq('journal_id', journal.id)
      .order('line_no');

    if (journalLines) {
      setLines(journalLines);
      
      // Fetch account details
      const accountIds = [...new Set(journalLines.map(line => line.account_id))];
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .in('id', accountIds);

      if (accountsData) {
        const accountMap = new Map();
        accountsData.forEach(acc => accountMap.set(acc.id, acc));
        setAccounts(accountMap);
      }
    }
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  if (!journal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Journal Entry Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Journal #</div>
              <div className="font-medium">{journal.journal_no}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">{new Date(journal.journal_date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={journal.posted ? "default" : "secondary"}>
                {journal.status}
              </Badge>
            </div>
          </div>

          {journal.description && (
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="font-medium">{journal.description}</div>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const account = accounts.get(line.account_id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        {account ? `${account.code} - ${account.name}` : 'Unknown Account'}
                      </TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">
                        {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{totalDebit.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{totalCredit.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
