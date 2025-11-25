import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GeneralLedger() {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: journalsData, error: journalsError } = await supabase
        .from('journals')
        .select(`
          *,
          journal_lines (
            *,
            chart_of_accounts (code, name)
          )
        `)
        .order('journal_date', { ascending: false });

      if (journalsError) throw journalsError;

      // Transform journal entries into general ledger format
      const ledgerEntries: any[] = [];
      let runningBalance = 0;

      journalsData?.forEach(journal => {
        journal.journal_lines?.forEach((line: any) => {
          const debit = line.debit || 0;
          const credit = line.credit || 0;
          runningBalance += debit - credit;

          ledgerEntries.push({
            date: journal.journal_date,
            reference: journal.journal_no,
            description: line.description || journal.description,
            account: line.chart_of_accounts?.name,
            debit,
            credit,
            balance: runningBalance
          });
        });
      });

      setTransactions(ledgerEntries);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    fetchTransactions();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.generalLedger')}</h1>
        <p className="text-muted-foreground mt-2">View general ledger entries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fromDate">{t('common.date')} From</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="toDate">{t('common.date')} To</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleGenerateReport} disabled={loading}>
                {loading ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>General Ledger Entries</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              {t('common.print')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.reference')}</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No transactions found. Journal entries will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">{transaction.reference}</TableCell>
                    <TableCell className="text-sm">{transaction.account}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className="text-right">
                      {transaction.debit > 0 ? transaction.debit.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.credit > 0 ? transaction.credit.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {transaction.balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
