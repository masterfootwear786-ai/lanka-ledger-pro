import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AccountDialog } from "@/components/accounting/AccountDialog";

export default function ChartOfAccounts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (account: any) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      // Check if account is being used in any transactions
      const [
        { count: journalCount },
        { count: billLinesCount },
        { count: invoiceLinesCount },
        { count: bankStatementsCount },
        { count: billPaymentsCount },
        { count: receiptsCount }
      ] = await Promise.all([
        supabase.from('journal_lines').select('*', { count: 'exact', head: true }).eq('account_id', accountToDelete.id),
        supabase.from('bill_lines').select('*', { count: 'exact', head: true }).eq('account_id', accountToDelete.id),
        supabase.from('invoice_lines').select('*', { count: 'exact', head: true }).eq('account_id', accountToDelete.id),
        supabase.from('bank_statements').select('*', { count: 'exact', head: true }).eq('bank_account_id', accountToDelete.id),
        supabase.from('bill_payments').select('*', { count: 'exact', head: true }).eq('bank_account_id', accountToDelete.id),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('bank_account_id', accountToDelete.id)
      ]);

      const totalUsage = (journalCount || 0) + (billLinesCount || 0) + (invoiceLinesCount || 0) + 
                         (bankStatementsCount || 0) + (billPaymentsCount || 0) + (receiptsCount || 0);

      if (totalUsage > 0) {
        toast({
          title: "Cannot Delete Account",
          description: "This account is being used in transactions and cannot be deleted. You can deactivate it instead.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        setAccountToDelete(null);
        return;
      }

      // If no usage found, proceed with deletion
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', accountToDelete.id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Account deleted successfully",
      });

      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.chartOfAccounts')}</h1>
          <p className="text-muted-foreground mt-2">Manage chart of accounts</p>
        </div>
        <Button onClick={() => {
          setSelectedAccount(null);
          setAccountDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No accounts found</TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.account_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell>
                      <Badge variant="default">{account.active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedAccount(account);
                          setAccountDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRequest(account)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete account {accountToDelete?.code}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        account={selectedAccount}
        onSuccess={fetchAccounts}
      />
    </div>
  );
}
