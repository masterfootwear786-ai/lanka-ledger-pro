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

interface ReceiptWithCheques {
  id: string;
  receipt_no: string;
  receipt_date: string;
  customer: {
    name: string;
  };
  cheques: ChequeDetail[];
}

export default function Cheques() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [receiptsWithCheques, setReceiptsWithCheques] = useState<ReceiptWithCheques[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCheques();
  }, []);

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          id,
          receipt_no,
          receipt_date,
          reference,
          customer:contacts(name)
        `)
        .order('receipt_date', { ascending: false });

      if (error) throw error;

      // Filter receipts that have cheque payments
      const chequesData: ReceiptWithCheques[] = [];
      
      data?.forEach((receipt: any) => {
        if (receipt.reference) {
          try {
            const parsed = JSON.parse(receipt.reference);
            if (Array.isArray(parsed) && parsed.length > 0) {
              chequesData.push({
                id: receipt.id,
                receipt_no: receipt.receipt_no,
                receipt_date: receipt.receipt_date,
                customer: receipt.customer,
                cheques: parsed
              });
            }
          } catch {
            // Not a JSON cheque reference, skip
          }
        }
      });

      setReceiptsWithCheques(chequesData);
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

  const filteredCheques = receiptsWithCheques.filter(receipt => {
    const searchLower = searchTerm.toLowerCase();
    return (
      receipt.receipt_no.toLowerCase().includes(searchLower) ||
      receipt.customer?.name.toLowerCase().includes(searchLower) ||
      receipt.cheques.some(cheque => 
        cheque.cheque_no.toLowerCase().includes(searchLower) ||
        cheque.cheque_bank?.toLowerCase().includes(searchLower) ||
        cheque.cheque_holder?.toLowerCase().includes(searchLower)
      )
    );
  });

  // Flatten all cheques for display
  const allCheques = filteredCheques.flatMap(receipt => 
    receipt.cheques.map(cheque => ({
      ...cheque,
      receipt_id: receipt.id,
      receipt_no: receipt.receipt_no,
      receipt_date: receipt.receipt_date,
      customer_name: receipt.customer?.name
    }))
  );

  const updateChequeStatus = async (receiptId: string, chequeNo: string, status: 'passed' | 'returned') => {
    try {
      // Find the receipt
      const receipt = receiptsWithCheques.find(r => r.id === receiptId);
      if (!receipt) return;

      // Update cheque status in the array
      const updatedCheques = receipt.cheques.map(cheque => 
        cheque.cheque_no === chequeNo 
          ? { ...cheque, status }
          : cheque
      );

      // Update receipt reference field
      const { error } = await supabase
        .from('receipts')
        .update({ reference: JSON.stringify(updatedCheques) })
        .eq('id', receiptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cheque ${chequeNo} marked as ${status}`,
      });

      fetchCheques();
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
          <h1 className="text-3xl font-bold">Cheques</h1>
          <p className="text-muted-foreground mt-2">View and manage cheque payments</p>
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
              placeholder="Search by cheque number, customer, or bank..."
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
                <TableHead>Customer</TableHead>
                <TableHead>Receipt No</TableHead>
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
                  <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : allCheques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No cheques found</TableCell>
                </TableRow>
              ) : (
                allCheques.map((cheque, index) => (
                  <TableRow key={`${cheque.receipt_no}-${index}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        <CreditCard className="h-3 w-3 mr-1" />
                        {cheque.cheque_no}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(cheque.cheque_date).toLocaleDateString()}</TableCell>
                    <TableCell>{cheque.customer_name || 'N/A'}</TableCell>
                    <TableCell className="font-mono">{cheque.receipt_no}</TableCell>
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
                          <Button variant="ghost" size="sm">
                            Update Status
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateChequeStatus(cheque.receipt_id, cheque.cheque_no, 'passed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Mark as Passed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateChequeStatus(cheque.receipt_id, cheque.cheque_no, 'returned')}
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
