import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChequeDetail {
  cheque_no: string;
  amount: number;
  cheque_date: string;
  cheque_bank: string;
  cheque_branch: string;
  cheque_holder: string;
  status?: 'pending' | 'passed' | 'returned';
}

interface PaymentWithCheques {
  id: string;
  payment_no: string;
  payment_date: string;
  supplier: {
    name: string;
  };
  cheques: ChequeDetail[];
}

export default function SupplierCheques() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentsWithCheques, setPaymentsWithCheques] = useState<PaymentWithCheques[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCheques();
  }, []);

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bill_payments')
        .select(`
          id,
          payment_no,
          payment_date,
          reference,
          supplier:contacts(name)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Filter payments that have cheque payments
      const chequesData: PaymentWithCheques[] = [];
      
      data?.forEach((payment: any) => {
        if (payment.reference) {
          try {
            const parsed = JSON.parse(payment.reference);
            if (Array.isArray(parsed) && parsed.length > 0) {
              chequesData.push({
                id: payment.id,
                payment_no: payment.payment_no,
                payment_date: payment.payment_date,
                supplier: payment.supplier,
                cheques: parsed
              });
            }
          } catch {
            // Not a JSON cheque reference, skip
          }
        }
      });

      setPaymentsWithCheques(chequesData);
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

  const filteredCheques = paymentsWithCheques.filter(payment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.payment_no.toLowerCase().includes(searchLower) ||
      payment.supplier?.name.toLowerCase().includes(searchLower) ||
      payment.cheques.some(cheque => 
        cheque.cheque_no.toLowerCase().includes(searchLower) ||
        cheque.cheque_bank?.toLowerCase().includes(searchLower) ||
        cheque.cheque_holder?.toLowerCase().includes(searchLower)
      )
    );
  });

  // Flatten all cheques for display
  const allCheques = filteredCheques.flatMap(payment => 
    payment.cheques.map(cheque => ({
      ...cheque,
      payment_id: payment.id,
      payment_no: payment.payment_no,
      payment_date: payment.payment_date,
      supplier_name: payment.supplier?.name
    }))
  );

  const updateChequeStatus = async (paymentId: string, chequeNo: string, status: 'passed' | 'returned') => {
    try {
      // Find the payment
      const payment = paymentsWithCheques.find(p => p.id === paymentId);
      if (!payment) {
        toast({
          title: "Error",
          description: "Payment not found",
          variant: "destructive",
        });
        return;
      }

      const cheque = payment.cheques.find(c => c.cheque_no === chequeNo);
      if (!cheque) {
        toast({
          title: "Error",
          description: "Cheque not found",
          variant: "destructive",
        });
        return;
      }

      // Prevent changing from returned back to other statuses
      if (cheque.status === 'returned' && status !== 'returned') {
        toast({
          title: "Cannot Update",
          description: "Cannot change status of a returned cheque. Please create a new payment instead.",
          variant: "destructive",
        });
        return;
      }

      // Update cheque status in the array
      const updatedCheques = payment.cheques.map(c => 
        c.cheque_no === chequeNo 
          ? { ...c, status }
          : c
      );

      // Update payment reference field with new status
      const { error: updateError } = await supabase
        .from('bill_payments')
        .update({ 
          reference: JSON.stringify(updatedCheques),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // If marking as returned, reverse the payment allocations for this cheque amount
      if (status === 'returned') {
        // Get payment allocations for this payment
        const { data: allocations, error: allocError } = await supabase
          .from('payment_allocations')
          .select('id, amount, bill_id')
          .eq('payment_id', paymentId);

        if (allocError) throw allocError;

        if (allocations && allocations.length > 0) {
          let remainingToReverse = cheque.amount;

          // Delete or reduce allocations proportionally
          for (const allocation of allocations) {
            if (remainingToReverse <= 0) break;
            
            const amountToReverse = Math.min(allocation.amount, remainingToReverse);
            
            if (amountToReverse >= allocation.amount) {
              // Delete entire allocation
              const { error: deleteError } = await supabase
                .from('payment_allocations')
                .delete()
                .eq('id', allocation.id);
              
              if (deleteError) throw deleteError;
            } else {
              // Reduce allocation amount
              const { error: reduceError } = await supabase
                .from('payment_allocations')
                .update({ amount: allocation.amount - amountToReverse })
                .eq('id', allocation.id);
              
              if (reduceError) throw reduceError;
            }
            
            remainingToReverse -= amountToReverse;
          }

          toast({
            title: "Success",
            description: `Cheque ${chequeNo} marked as returned. Supplier outstanding balance has been increased by ${cheque.amount.toLocaleString()}`,
          });
        } else {
          toast({
            title: "Success",
            description: `Cheque ${chequeNo} marked as returned`,
          });
        }
      } else {
        toast({
          title: "Success",
          description: `Cheque ${chequeNo} marked as ${status}`,
        });
      }

      // Refresh the list to show updated status
      await fetchCheques();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Passed
          </Badge>
        );
      case 'returned':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Returned
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Cheques</h1>
          <p className="text-muted-foreground mt-2">View and manage supplier cheque payments</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Cheques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by cheque number, supplier, or bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cheque List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cheque No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Payment No</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Holder</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : allCheques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">No cheques found</TableCell>
                </TableRow>
              ) : (
                allCheques.map((cheque, index) => (
                  <TableRow key={`${cheque.payment_no}-${index}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        <CreditCard className="h-3 w-3 mr-1" />
                        {cheque.cheque_no}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(cheque.cheque_date).toLocaleDateString()}</TableCell>
                    <TableCell>{cheque.supplier_name || 'N/A'}</TableCell>
                    <TableCell className="font-mono">{cheque.payment_no}</TableCell>
                    <TableCell>{cheque.cheque_bank || '-'}</TableCell>
                    <TableCell>{cheque.cheque_branch || '-'}</TableCell>
                    <TableCell>{cheque.cheque_holder || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(cheque.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cheque.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant={cheque.status === 'returned' ? 'ghost' : 'outline'} 
                            size="sm"
                            disabled={cheque.status === 'returned'}
                            className={cheque.status === 'returned' ? 'cursor-not-allowed' : ''}
                          >
                            {cheque.status === 'returned' ? 'Returned' : 'Update Status'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateChequeStatus(cheque.payment_id, cheque.cheque_no, 'passed')}
                            disabled={cheque.status === 'passed'}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Mark as Passed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateChequeStatus(cheque.payment_id, cheque.cheque_no, 'returned')}
                            disabled={cheque.status === 'returned'}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2 text-red-500" />
                            Mark as Returned
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
