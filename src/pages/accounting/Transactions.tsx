import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Eye, Pencil, Trash2, Package, Wallet, TrendingDown, CreditCard, Building, Car, Utensils, Home, Wrench, ShieldCheck, Briefcase, MoreHorizontal, Users, UserMinus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import TransactionDialog from "@/components/accounting/TransactionDialog";
import TransactionViewDialog from "@/components/accounting/TransactionViewDialog";

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_no: string;
  transaction_type: string;
  description: string;
  amount: number;
  reference?: string;
  contact_id?: string;
  contacts?: {
    name: string;
    code: string;
  };
}

const categoryConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  'COGS': { icon: Package, color: 'text-red-700', bgColor: 'bg-red-100' },
  'Salary': { icon: Wallet, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'Rent': { icon: Building, color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'Fuel': { icon: Car, color: 'text-orange-700', bgColor: 'bg-orange-100' },
  'Food': { icon: Utensils, color: 'text-green-700', bgColor: 'bg-green-100' },
  'Accommodation': { icon: Home, color: 'text-teal-700', bgColor: 'bg-teal-100' },
  'Utilities': { icon: TrendingDown, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  'Transport': { icon: Car, color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  'Office Supplies': { icon: Briefcase, color: 'text-pink-700', bgColor: 'bg-pink-100' },
  'Marketing': { icon: TrendingDown, color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  'Maintenance': { icon: Wrench, color: 'text-amber-700', bgColor: 'bg-amber-100' },
  'Insurance': { icon: ShieldCheck, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  'Professional Fees': { icon: CreditCard, color: 'text-violet-700', bgColor: 'bg-violet-100' },
  'Other': { icon: MoreHorizontal, color: 'text-gray-700', bgColor: 'bg-gray-100' },
  'credit': { icon: UserMinus, color: 'text-rose-700', bgColor: 'bg-rose-100' },
  'debit': { icon: UserPlus, color: 'text-sky-700', bgColor: 'bg-sky-100' },
};

export default function Expenses() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          contacts (
            name,
            code
          )
        `)
        .eq("company_id", profile.company_id)
        .order("transaction_date", { ascending: false })
        .order("transaction_no", { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDeleteRequest = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });

      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleView = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsViewDialogOpen(true);
  };

  // Separate creditor/debtor from regular expenses
  const regularExpenses = transactions.filter(t => t.transaction_type !== 'credit' && t.transaction_type !== 'debit');
  const creditorDebtorTransactions = transactions.filter(t => t.transaction_type === 'credit' || t.transaction_type === 'debit');

  // Calculate totals by category (excluding creditor/debtor)
  const categoryTotals = regularExpenses.reduce((acc, t) => {
    const category = t.transaction_type;
    acc[category] = (acc[category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const cogsTotal = categoryTotals['COGS'] || 0;
  const operatingExpenses = Object.entries(categoryTotals)
    .filter(([key]) => key !== 'COGS')
    .reduce((acc, [, val]) => acc + val, 0);
  
  // Creditor/Debtor totals
  const creditorsTotal = creditorDebtorTransactions.filter(t => t.transaction_type === 'credit').reduce((acc, t) => acc + t.amount, 0);
  const debtorsTotal = creditorDebtorTransactions.filter(t => t.transaction_type === 'debit').reduce((acc, t) => acc + t.amount, 0);

  // Total Expenses = Regular Expenses + Debtors - Creditors
  const baseExpenses = cogsTotal + operatingExpenses;
  const totalExpenses = baseExpenses + debtorsTotal - creditorsTotal;

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = 
      t.transaction_no.toLowerCase().includes(search.toLowerCase()) ||
      t.transaction_type.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.contacts?.name?.toLowerCase().includes(search.toLowerCase());
    
    const isCreditorDebtor = t.transaction_type === 'credit' || t.transaction_type === 'debit';
    
    if (activeTab === "all") return matchesSearch && !isCreditorDebtor;
    if (activeTab === "cogs") return matchesSearch && t.transaction_type === 'COGS';
    if (activeTab === "creditor_debtor") return matchesSearch && isCreditorDebtor;
    return matchesSearch && t.transaction_type !== 'COGS' && !isCreditorDebtor;
  });

  const getCategoryBadge = (category: string) => {
    const config = categoryConfig[category] || categoryConfig['Other'];
    const Icon = config.icon;
    const displayName = category === 'credit' ? 'Creditor' : category === 'debit' ? 'Debtor' : category;
    return (
      <Badge variant="secondary" className={`${config.bgColor} ${config.color} font-medium gap-1`}>
        <Icon className="h-3 w-3" />
        {displayName}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses & COGS</h1>
          <p className="text-muted-foreground mt-2">
            Record and manage expenses and cost of goods sold
          </p>
        </div>
        <Button onClick={() => {
          setSelectedTransaction(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              COGS (Cost of Goods Sold)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cogsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.transaction_type === 'COGS').length} entries
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Operating Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {operatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.transaction_type !== 'COGS').length} entries
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Net Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalExpenses >= 0 ? 'text-purple-600' : 'text-green-600'}`}>
              {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expenses + Debtors - Creditors
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserMinus className="h-4 w-4" />
              Creditors (-) 
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              -{creditorsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reduces from expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Debtors (+)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">
              +{debtorsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Adds to expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown - Professional View */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {Object.entries(categoryTotals).sort(([,a], [,b]) => b - a).map(([category, total]) => {
              const config = categoryConfig[category] || categoryConfig['Other'];
              const Icon = config.icon;
              const categoryTransactions = regularExpenses.filter(t => t.transaction_type === category);
              const transactionCount = categoryTransactions.length;
              
              return (
                <div key={category} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{category}</h4>
                        <p className="text-xs text-muted-foreground">{transactionCount} {transactionCount === 1 ? 'entry' : 'entries'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${config.color}`}>
                        {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Transaction Details */}
                  {categoryTransactions.length > 0 && (
                    <div className="ml-12 space-y-2">
                      {categoryTransactions.slice(0, 5).map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-md bg-muted/30 border border-border/50">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                              {new Date(t.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </span>
                            <span className="truncate text-foreground flex-1">
                              {t.description || 'No description'}
                            </span>
                            {t.reference && (
                              <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium shrink-0">
                                Ref: {t.reference}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold ml-4 shrink-0">
                            {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      {categoryTransactions.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-3">
                          + {categoryTransactions.length - 5} more entries
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {Object.keys(categoryTotals).length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No expense categories recorded yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs and Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            <TabsTrigger value="cogs" className="text-red-600">COGS</TabsTrigger>
            <TabsTrigger value="expenses">Operating</TabsTrigger>
            <TabsTrigger value="creditor_debtor" className="text-rose-600">Creditors/Debtors</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by no, category, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <ExpenseTable 
            transactions={filteredTransactions}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            getCategoryBadge={getCategoryBadge}
          />
        </TabsContent>
        <TabsContent value="cogs" className="mt-0">
          <ExpenseTable 
            transactions={filteredTransactions}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            getCategoryBadge={getCategoryBadge}
          />
        </TabsContent>
        <TabsContent value="expenses" className="mt-0">
          <ExpenseTable 
            transactions={filteredTransactions}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            getCategoryBadge={getCategoryBadge}
          />
        </TabsContent>
        <TabsContent value="creditor_debtor" className="mt-0">
          <ExpenseTable 
            transactions={filteredTransactions}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            getCategoryBadge={getCategoryBadge}
          />
        </TabsContent>
      </Tabs>

      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transaction={selectedTransaction}
        onSuccess={fetchTransactions}
      />

      <TransactionViewDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        transaction={selectedTransaction}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {transactionToDelete?.transaction_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ExpenseTableProps {
  transactions: Transaction[];
  loading: boolean;
  onView: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  getCategoryBadge: (category: string) => JSX.Element;
}

function ExpenseTable({ transactions, loading, onView, onEdit, onDelete, getCategoryBadge }: ExpenseTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Entry No</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Reference</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No entries found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{transaction.transaction_no}</TableCell>
                  <TableCell>{getCategoryBadge(transaction.transaction_type)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{transaction.description}</TableCell>
                  <TableCell>
                    {transaction.contacts ? (
                      <span className="text-sm">{transaction.contacts.name}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {transaction.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.reference || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onView(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(transaction)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(transaction)}
                      >
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
  );
}
