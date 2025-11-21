import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { GitCompare, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function BankReconciliation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchReconciliationData();
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('account_type', 'asset')
        .ilike('name', '%bank%')
        .order('code', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      
      // Fetch unreconciled bank statements
      const { data: stmtData, error: stmtError } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('bank_account_id', selectedAccount)
        .eq('reconciled', false)
        .order('statement_date', { ascending: false });

      if (stmtError) throw stmtError;
      setStatements(stmtData || []);

      // Fetch unposted journals
      const { data: jrnlData, error: jrnlError } = await supabase
        .from('journals')
        .select('*')
        .eq('posted', false)
        .order('journal_date', { ascending: false });

      if (jrnlError) throw jrnlError;
      setJournals(jrnlData || []);
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (statementId: string, journalId: string) => {
    try {
      const { error } = await supabase
        .from('bank_statements')
        .update({ 
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_journal_id: journalId
        })
        .eq('id', statementId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transaction reconciled successfully",
      });

      fetchReconciliationData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitCompare className="h-8 w-8" />
            Bank Reconciliation
          </h1>
          <p className="text-muted-foreground mt-2">Match bank statements with accounting records</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Bank Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedAccount && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Unreconciled Bank Statements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : statements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">All reconciled</TableCell>
                    </TableRow>
                  ) : (
                    statements.map((stmt) => (
                      <TableRow key={stmt.id}>
                        <TableCell className="text-sm">{new Date(stmt.statement_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{stmt.description}</TableCell>
                        <TableCell className={`text-right font-medium ${stmt.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stmt.amount >= 0 ? '+' : ''}{stmt.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unposted Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Journal #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : journals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No unposted journals</TableCell>
                    </TableRow>
                  ) : (
                    journals.map((journal) => (
                      <TableRow key={journal.id}>
                        <TableCell className="text-sm">{new Date(journal.journal_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-sm">{journal.journal_no}</TableCell>
                        <TableCell className="text-sm">{journal.description}</TableCell>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedAccount && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Selected Items</p>
                <p className="text-2xl font-bold">0 matched</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
                <Button>
                  <Check className="h-4 w-4 mr-2" />
                  Reconcile Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}