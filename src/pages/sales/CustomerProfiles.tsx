import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye, TrendingUp, TrendingDown, DollarSign, Users, CreditCard, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface PendingCheque {
  chequeNo: string;
  amount: number;
  date: string;
  bank: string;
}

interface CustomerProfile {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  area: string | null;
  district: string | null;
  credit_limit: number | null;
  active: boolean;
  updated_at: string | null;
  totalInvoiced: number;
  totalPaid: number;
  totalReturns: number;
  pendingCheques: number;
  pendingChequesCount: number;
  pendingChequesList: PendingCheque[];
  outstanding: number;
  creditBalance: number;
}

export default function CustomerProfiles() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOutstanding: 0,
    totalPendingCheques: 0,
    activeCustomers: 0,
    totalCreditBalance: 0,
  });

  useEffect(() => {
    fetchCustomerProfiles();
  }, []);

  const fetchCustomerProfiles = async () => {
    setLoading(true);
    try {
      // Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from("contacts")
        .select("*")
        .eq("contact_type", "customer")
        .is('deleted_at', null)
        .order("name");

      if (customersError) throw customersError;

      // Fetch invoices for all customers
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("customer_id, grand_total")
        .is('deleted_at', null);

      if (invoicesError) throw invoicesError;

      // Fetch receipts for all customers
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("receipts")
        .select("customer_id, amount, reference")
        .is('deleted_at', null);

      if (receiptsError) throw receiptsError;

      // Fetch return notes for all customers
      const { data: returnNotesData, error: returnNotesError } = await supabase
        .from("return_notes")
        .select("customer_id, grand_total")
        .is('deleted_at', null);

      if (returnNotesError) throw returnNotesError;

      // Process data
      const customerProfiles: CustomerProfile[] = (customersData || []).map(customer => {
        // Calculate totals for this customer
        const customerInvoices = (invoicesData || []).filter(inv => inv.customer_id === customer.id);
        const customerReceipts = (receiptsData || []).filter(rec => rec.customer_id === customer.id);
        const customerReturns = (returnNotesData || []).filter(rn => rn.customer_id === customer.id);

        const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
        const totalReturns = customerReturns.reduce((sum, rn) => sum + (rn.grand_total || 0), 0);
        
        // Calculate paid amount and pending cheques
        let cashPayments = 0;
        let passedCheques = 0;
        let pendingChequesTotal = 0;
        const pendingChequesList: PendingCheque[] = [];

        customerReceipts.forEach(receipt => {
          try {
            // Try to parse as JSON array (cheques)
            const parsed = receipt.reference ? JSON.parse(receipt.reference) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Receipt has cheque payments
              parsed.forEach((cheque: any) => {
                const amount = Number(cheque.amount) || 0;
                if (cheque.status === 'passed') {
                  passedCheques += amount;
                } else if (cheque.status === 'returned') {
                  // Returned cheques don't count
                } else {
                  // Pending (no status or status = 'pending')
                  pendingChequesTotal += amount;
                  pendingChequesList.push({
                    chequeNo: cheque.cheque_no || cheque.chequeNo || '-',
                    amount: amount,
                    date: cheque.cheque_date || cheque.date || '-',
                    bank: cheque.cheque_bank || cheque.bank || '-',
                  });
                }
              });
            } else {
              // Cash payment or bank transfer
              cashPayments += receipt.amount || 0;
            }
          } catch {
            // Not JSON, treat as cash payment
            cashPayments += receipt.amount || 0;
          }
        });

        // Total paid includes cash + passed cheques + returns (returns act as credit)
        const totalPaid = cashPayments + passedCheques + totalReturns;
        const rawOutstanding = totalInvoiced - totalPaid;
        // Credit balance = stored value from database OR calculated from overpayment
        const storedCreditBalance = customer.credit_balance || 0;
        const calculatedCreditBalance = rawOutstanding < 0 ? Math.abs(rawOutstanding) : 0;
        const creditBalance = storedCreditBalance > 0 ? storedCreditBalance : calculatedCreditBalance;
        const outstanding = Math.max(0, rawOutstanding);

        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          area: customer.area,
          district: customer.district,
          credit_limit: customer.credit_limit,
          active: customer.active,
          updated_at: customer.updated_at,
          totalInvoiced,
          totalPaid,
          totalReturns,
          pendingCheques: pendingChequesTotal,
          pendingChequesCount: pendingChequesList.length,
          pendingChequesList,
          outstanding,
          creditBalance,
        };
      });

      setCustomers(customerProfiles);

      // Calculate overall stats
      setStats({
        totalCustomers: customerProfiles.length,
        totalOutstanding: customerProfiles.reduce((sum, c) => sum + c.outstanding, 0),
        totalPendingCheques: customerProfiles.reduce((sum, c) => sum + c.pendingCheques, 0),
        activeCustomers: customerProfiles.filter(c => c.active).length,
        totalCreditBalance: customerProfiles.reduce((sum, c) => sum + c.creditBalance, 0),
      });

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Editable credit balance state
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);
  const [editCreditValue, setEditCreditValue] = useState<string>("");

  const handleEditCredit = (customer: CustomerProfile) => {
    setEditingCreditId(customer.id);
    setEditCreditValue(customer.creditBalance.toString());
  };

  const handleSaveCredit = async (customerId: string) => {
    const value = parseFloat(editCreditValue) || 0;
    try {
      const { error } = await supabase
        .from("contacts")
        .update({ credit_balance: value })
        .eq("id", customerId);

      if (error) throw error;

      // Update local state
      setCustomers(prev => prev.map(c => 
        c.id === customerId ? { ...c, creditBalance: value } : c
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalCreditBalance: customers.reduce((sum, c) => 
          sum + (c.id === customerId ? value : c.creditBalance), 0
        ),
      }));

      toast.success("Credit balance updated");
      setEditingCreditId(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingCreditId(null);
    setEditCreditValue("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Profiles</h1>
        <p className="text-muted-foreground mt-2">View all customer profiles with outstanding balances</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold">{stats.activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <DollarSign className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <TrendingDown className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Cheques</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPendingCheques)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.totalCreditBalance > 0 ? "border-2 border-green-500/30" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-600/10">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credit Balance</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCreditBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customer Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Returns</TableHead>
                  <TableHead className="text-right">Pending Cheques</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Credit Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center">
                      No customer profiles found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono">{customer.code}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        {customer.area || customer.district ? 
                          `${customer.area || ''}${customer.area && customer.district ? ', ' : ''}${customer.district || ''}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.totalInvoiced)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(customer.totalPaid)}</TableCell>
                      <TableCell className="text-right text-purple-600">
                        {customer.totalReturns > 0 ? formatCurrency(customer.totalReturns) : '-'}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        {customer.pendingChequesCount > 0 ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-right">
                              {formatCurrency(customer.pendingCheques)} ({customer.pendingChequesCount})
                            </div>
                            <div className="space-y-0.5">
                              {customer.pendingChequesList.slice(0, 3).map((cheque, idx) => (
                                <div key={idx} className="text-xs border-b border-border/50 pb-1">
                                  <div className="flex justify-between gap-2">
                                    <span className="font-medium">{cheque.chequeNo}</span>
                                    <span>{formatCurrency(cheque.amount)}</span>
                                  </div>
                                  <div className="text-muted-foreground">
                                    {cheque.date !== '-' ? formatDate(cheque.date) : '-'} {cheque.bank && cheque.bank !== '-' ? `• ${cheque.bank}` : ''}
                                  </div>
                                </div>
                              ))}
                              {customer.pendingChequesCount > 3 && (
                                <div className="text-xs text-muted-foreground text-right">
                                  +{customer.pendingChequesCount - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-right block">-</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${customer.outstanding > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {customer.outstanding > 0 ? formatCurrency(customer.outstanding) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingCreditId === customer.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={editCreditValue}
                              onChange={(e) => setEditCreditValue(e.target.value)}
                              className="w-24 h-8 text-right text-sm"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              onClick={() => handleSaveCredit(customer.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <span className={`font-semibold ${customer.creditBalance > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {customer.creditBalance > 0 ? formatCurrency(customer.creditBalance) : '-'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              onClick={() => handleEditCredit(customer)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.active ? "default" : "secondary"}>
                          {customer.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sales/customers/${customer.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
