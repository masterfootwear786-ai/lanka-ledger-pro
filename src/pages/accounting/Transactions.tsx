import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Eye, Pencil, Trash2, Package, Wallet, TrendingDown, CreditCard, Building, Car, Utensils, Home, Wrench, ShieldCheck, Briefcase, MoreHorizontal } from "lucide-react";
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

  // Calculate totals by category
  const categoryTotals = transactions.reduce((acc, t) => {
    const category = t.transaction_type;
    acc[category] = (acc[category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const cogsTotal = categoryTotals['COGS'] || 0;
  const operatingExpenses = Object.entries(categoryTotals)
    .filter(([key]) => key !== 'COGS')
    .reduce((acc, [, val]) => acc + val, 0);
  const totalExpenses = cogsTotal + operatingExpenses;

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = 
      t.transaction_no.toLowerCase().includes(search.toLowerCase()) ||
      t.transaction_type.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.contacts?.name?.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "cogs") return matchesSearch && t.transaction_type === 'COGS';
    return matchesSearch && t.transaction_type !== 'COGS';
  });

  const getCategoryBadge = (category: string) => {
    const config = categoryConfig[category] || categoryConfig['Other'];
    const Icon = config.icon;
    return (
      <Badge variant="secondary" className={`${config.bgColor} ${config.color} font-medium gap-1`}>
        <Icon className="h-3 w-3" />
        {category}
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
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.length} total entries
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(categoryTotals).length > 0 ? (
              <>
                <div className="text-lg font-bold text-green-600">
                  {Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0]?.[0] || '-'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0]?.[1] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </>
            ) : (
              <div className="text-lg font-bold text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(categoryTotals).sort(([,a], [,b]) => b - a).map(([category, total]) => {
              const config = categoryConfig[category] || categoryConfig['Other'];
              const Icon = config.icon;
              return (
                <div key={category} className={`p-3 rounded-lg ${config.bgColor} border`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>{category}</span>
                  </div>
                  <div className={`text-sm font-bold ${config.color}`}>
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All Entries</TabsTrigger>
            <TabsTrigger value="cogs" className="text-red-600">COGS</TabsTrigger>
            <TabsTrigger value="expenses">Operating Expenses</TabsTrigger>
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
