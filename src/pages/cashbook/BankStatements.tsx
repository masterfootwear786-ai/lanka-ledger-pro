import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Upload, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function BankStatements() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_statements')
        .select(`
          *,
          bank_account:chart_of_accounts(code, name)
        `)
        .order('statement_date', { ascending: false });

      if (error) throw error;
      setStatements(data || []);
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Statements</h1>
          <p className="text-muted-foreground mt-2">Import and manage bank statements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Statement
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : statements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No statements found</TableCell>
                </TableRow>
              ) : (
                statements
                  .filter(stmt => 
                    stmt.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    stmt.external_ref?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell>{new Date(statement.statement_date).toLocaleDateString()}</TableCell>
                      <TableCell>{statement.bank_account?.name || 'N/A'}</TableCell>
                      <TableCell>{statement.description}</TableCell>
                      <TableCell className="font-mono text-sm">{statement.external_ref}</TableCell>
                      <TableCell className={`text-right font-medium ${statement.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {statement.amount >= 0 ? '+' : ''}{statement.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statement.reconciled ? "default" : "secondary"}>
                          {statement.reconciled ? "Reconciled" : "Pending"}
                        </Badge>
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