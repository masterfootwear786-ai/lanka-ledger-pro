import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CreditCard, CheckCircle, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown, Printer, FileDown, Eye, SortAsc, SortDesc, Calendar } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";
import { format, parse } from "date-fns";

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
    district?: string;
    area?: string;
  };
  cheques: ChequeDetail[];
}

type SortOrder = 'asc' | 'desc';
type SortField = 'date' | 'city';

export default function Cheques() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [receiptsWithCheques, setReceiptsWithCheques] = useState<ReceiptWithCheques[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortField, setSortField] = useState<SortField>('date');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    fetchCheques();
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from('companies')
      .select('name, address, phone, email, logo_url')
      .eq('id', profile.company_id)
      .single();
    if (data) setCompanyInfo(data);
  };

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
          customer:contacts(name, district, area)
        `)
        .is('deleted_at', null)
        .order('receipt_date', { ascending: false });

      if (error) throw error;

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

  // Get all cheques first (before filtering)
  const allChequesRaw = receiptsWithCheques.flatMap(receipt => 
    receipt.cheques.map(cheque => ({
      ...cheque,
      receipt_id: receipt.id,
      receipt_no: receipt.receipt_no,
      receipt_date: receipt.receipt_date,
      customer_name: receipt.customer?.name,
      customer_city: receipt.customer?.district || receipt.customer?.area || ''
    }))
  );

  // Calculate month-wise cheque counts with status breakdown
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { 
      count: number; 
      amount: number; 
      passedAmount: number;
      returnedAmount: number;
      pendingAmount: number;
      passedCount: number;
      returnedCount: number;
      pendingCount: number;
      label: string 
    }> = {};
    
    allChequesRaw.forEach(cheque => {
      if (cheque.cheque_date) {
        const date = new Date(cheque.cheque_date);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMMM yyyy');
        const chequeAmount = Number(cheque.amount) || 0;
        
        if (!stats[monthKey]) {
          stats[monthKey] = { 
            count: 0, 
            amount: 0, 
            passedAmount: 0,
            returnedAmount: 0,
            pendingAmount: 0,
            passedCount: 0,
            returnedCount: 0,
            pendingCount: 0,
            label: monthLabel 
          };
        }
        stats[monthKey].count++;
        stats[monthKey].amount += chequeAmount;
        
        // Track by status
        if (cheque.status === 'passed') {
          stats[monthKey].passedAmount += chequeAmount;
          stats[monthKey].passedCount++;
        } else if (cheque.status === 'returned') {
          stats[monthKey].returnedAmount += chequeAmount;
          stats[monthKey].returnedCount++;
        } else {
          stats[monthKey].pendingAmount += chequeAmount;
          stats[monthKey].pendingCount++;
        }
      }
    });
    
    // Sort by month (newest first)
    return Object.entries(stats)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => ({ key, ...value }));
  }, [allChequesRaw]);

  // Calculate total stats for "All Months" card
  const allMonthsStats = useMemo(() => {
    return allChequesRaw.reduce((acc, cheque) => {
      const amount = Number(cheque.amount) || 0;
      acc.total += amount;
      if (cheque.status === 'passed') {
        acc.passed += amount;
        acc.passedCount++;
      } else if (cheque.status === 'returned') {
        acc.returned += amount;
        acc.returnedCount++;
      } else {
        acc.pending += amount;
        acc.pendingCount++;
      }
      return acc;
    }, { total: 0, passed: 0, returned: 0, pending: 0, passedCount: 0, returnedCount: 0, pendingCount: 0 });
  }, [allChequesRaw]);

  // Filter by search term and month
  const filteredCheques = allChequesRaw.filter(cheque => {
    // Month filter
    if (selectedMonth !== 'all') {
      const chequeMonth = format(new Date(cheque.cheque_date), 'yyyy-MM');
      if (chequeMonth !== selectedMonth) return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        cheque.receipt_no.toLowerCase().includes(searchLower) ||
        cheque.customer_name?.toLowerCase().includes(searchLower) ||
        cheque.cheque_no.toLowerCase().includes(searchLower) ||
        cheque.cheque_bank?.toLowerCase().includes(searchLower) ||
        cheque.cheque_holder?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const sortedCheques = [...filteredCheques].sort((a, b) => {
    if (sortField === 'date') {
      const dateA = new Date(a.cheque_date).getTime();
      const dateB = new Date(b.cheque_date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      const cityA = (a.customer_city || '').toLowerCase();
      const cityB = (b.customer_city || '').toLowerCase();
      return sortOrder === 'asc' ? cityA.localeCompare(cityB) : cityB.localeCompare(cityA);
    }
  });

  const updateChequeStatus = async (receiptId: string, chequeNo: string, status: 'passed' | 'returned') => {
    try {
      const receipt = receiptsWithCheques.find(r => r.id === receiptId);
      if (!receipt) return;

      const cheque = receipt.cheques.find(c => c.cheque_no === chequeNo);
      if (!cheque) return;

      const updatedCheques = receipt.cheques.map(cheque => 
        cheque.cheque_no === chequeNo 
          ? { ...cheque, status }
          : cheque
      );

      const { error: updateError } = await supabase
        .from('receipts')
        .update({ reference: JSON.stringify(updatedCheques) })
        .eq('id', receiptId);

      if (updateError) throw updateError;

      if (status === 'returned') {
        const { data: allocations, error: allocError } = await supabase
          .from('receipt_allocations')
          .select('id, amount')
          .eq('receipt_id', receiptId);

        if (allocError) throw allocError;

        if (allocations && allocations.length > 0) {
          let remainingToReverse = cheque.amount;

          for (const allocation of allocations) {
            if (remainingToReverse <= 0) break;
            
            const amountToReverse = Math.min(allocation.amount, remainingToReverse);
            
            if (amountToReverse >= allocation.amount) {
              const { error: deleteError } = await supabase
                .from('receipt_allocations')
                .delete()
                .eq('id', allocation.id);
              
              if (deleteError) throw deleteError;
            } else {
              const { error: reduceError } = await supabase
                .from('receipt_allocations')
                .update({ amount: allocation.amount - amountToReverse })
                .eq('id', allocation.id);
              
              if (reduceError) throw reduceError;
            }
            
            remainingToReverse -= amountToReverse;
          }
        }
      }

      toast({
        title: "Success",
        description: status === 'returned' 
          ? `Cheque ${chequeNo} marked as returned and outstanding balance updated`
          : `Cheque ${chequeNo} marked as ${status}`,
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

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'passed': return 'Passed';
      case 'returned': return 'Returned';
      default: return 'Pending';
    }
  };

  // Calculate totals
  const totalAmount = sortedCheques.reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingCount = sortedCheques.filter(c => !c.status || c.status === 'pending').length;
  const passedCount = sortedCheques.filter(c => c.status === 'passed').length;
  const returnedCount = sortedCheques.filter(c => c.status === 'returned').length;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(companyInfo?.name || 'Company', 14, 20);
    doc.setFontSize(12);
    doc.text('Cheques Report', 14, 30);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 38);
    doc.text(`Sort: By ${sortField === 'date' ? 'Date' : 'City'} (${sortField === 'date' ? (sortOrder === 'asc' ? 'Oldest First' : 'Newest First') : (sortOrder === 'asc' ? 'A to Z' : 'Z to A')})`, 14, 44);
    if (searchTerm) {
      doc.text(`Filter: "${searchTerm}"`, 14, 50);
    }

    const summaryY = searchTerm ? 56 : 50;
    doc.text(`Total Cheques: ${sortedCheques.length} | Pending: ${pendingCount} | Passed: ${passedCount} | Returned: ${returnedCount}`, 14, summaryY);
    doc.text(`Total Amount: Rs. ${totalAmount.toLocaleString()}`, 14, summaryY + 6);

    autoTable(doc, {
      startY: summaryY + 14,
      head: [['Cheque No', 'Date', 'Customer', 'City', 'Receipt', 'Bank', 'Branch', 'Holder', 'Amount', 'Status']],
      body: sortedCheques.map(cheque => [
        cheque.cheque_no,
        new Date(cheque.cheque_date).toLocaleDateString(),
        cheque.customer_name || 'N/A',
        cheque.customer_city || '-',
        cheque.receipt_no,
        cheque.cheque_bank || '-',
        cheque.cheque_branch || '-',
        cheque.cheque_holder || '-',
        Number(cheque.amount).toLocaleString(),
        getStatusText(cheque.status)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save(`cheques-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cheques Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          h2 { font-size: 14px; font-weight: normal; color: #666; margin-bottom: 20px; }
          .summary { margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .status-pending { color: #666; }
          .status-passed { color: green; }
          .status-returned { color: red; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${companyInfo?.name || 'Company'}</h1>
        <h2>Cheques Report - ${new Date().toLocaleDateString()}</h2>
        <div class="summary">
          <p><strong>Sort:</strong> By ${sortField === 'date' ? 'Date' : 'City'} (${sortField === 'date' ? (sortOrder === 'asc' ? 'Oldest First' : 'Newest First') : (sortOrder === 'asc' ? 'A to Z' : 'Z to A')})</p>
          ${searchTerm ? `<p><strong>Filter:</strong> "${searchTerm}"</p>` : ''}
          <p><strong>Total Cheques:</strong> ${sortedCheques.length} | 
             <strong>Pending:</strong> ${pendingCount} | 
             <strong>Passed:</strong> ${passedCount} | 
             <strong>Returned:</strong> ${returnedCount}</p>
          <p><strong>Total Amount:</strong> Rs. ${totalAmount.toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cheque No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>City</th>
              <th>Receipt</th>
              <th>Bank</th>
              <th>Branch</th>
              <th>Holder</th>
              <th class="text-right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sortedCheques.map(cheque => `
              <tr>
                <td>${cheque.cheque_no}</td>
                <td>${new Date(cheque.cheque_date).toLocaleDateString()}</td>
                <td>${cheque.customer_name || 'N/A'}</td>
                <td>${cheque.customer_city || '-'}</td>
                <td>${cheque.receipt_no}</td>
                <td>${cheque.cheque_bank || '-'}</td>
                <td>${cheque.cheque_branch || '-'}</td>
                <td>${cheque.cheque_holder || '-'}</td>
                <td class="text-right">${Number(cheque.amount).toLocaleString()}</td>
                <td class="status-${cheque.status || 'pending'}">${getStatusText(cheque.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cheques</h1>
          <p className="text-muted-foreground mt-2">View and manage cheque payments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Sort Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by {sortField === 'date' ? 'Date' : 'City'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortField('date'); setSortOrder('asc'); }}>
                <SortAsc className="h-4 w-4 mr-2" />
                Date - Oldest First
                {sortField === 'date' && sortOrder === 'asc' && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField('date'); setSortOrder('desc'); }}>
                <SortDesc className="h-4 w-4 mr-2" />
                Date - Newest First
                {sortField === 'date' && sortOrder === 'desc' && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField('city'); setSortOrder('asc'); }}>
                <SortAsc className="h-4 w-4 mr-2" />
                City - A to Z
                {sortField === 'city' && sortOrder === 'asc' && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortField('city'); setSortOrder('desc'); }}>
                <SortDesc className="h-4 w-4 mr-2" />
                City - Z to A
                {sortField === 'city' && sortOrder === 'desc' && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Preview Button */}
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>

          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Month Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedMonth === 'all' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
          onClick={() => setSelectedMonth('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold">All Months</span>
              </div>
              <Badge variant="secondary">{allChequesRaw.length} cheques</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-green-500/10 rounded p-2 text-center">
                <p className="text-green-600 font-medium">Passed</p>
                <p className="font-bold text-green-700">{allMonthsStats.passedCount}</p>
                <p className="text-green-600">Rs. {allMonthsStats.passed.toLocaleString()}</p>
              </div>
              <div className="bg-red-500/10 rounded p-2 text-center">
                <p className="text-red-600 font-medium">Returned</p>
                <p className="font-bold text-red-700">{allMonthsStats.returnedCount}</p>
                <p className="text-red-600">Rs. {allMonthsStats.returned.toLocaleString()}</p>
              </div>
              <div className="bg-amber-500/10 rounded p-2 text-center">
                <p className="text-amber-600 font-medium">Pending</p>
                <p className="font-bold text-amber-700">{allMonthsStats.pendingCount}</p>
                <p className="text-amber-600">Rs. {allMonthsStats.pending.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t text-center">
              <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">Rs. {allMonthsStats.total.toLocaleString()}</span></p>
            </div>
          </CardContent>
        </Card>
        
        {monthlyStats.map((month) => (
          <Card 
            key={month.key}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedMonth === month.key ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            onClick={() => setSelectedMonth(month.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold truncate">{month.label}</span>
                <Badge variant="secondary">{month.count} cheques</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-green-500/10 rounded p-2 text-center">
                  <p className="text-green-600 font-medium">Passed</p>
                  <p className="font-bold text-green-700">{month.passedCount}</p>
                  <p className="text-green-600">Rs. {month.passedAmount.toLocaleString()}</p>
                </div>
                <div className="bg-red-500/10 rounded p-2 text-center">
                  <p className="text-red-600 font-medium">Returned</p>
                  <p className="font-bold text-red-700">{month.returnedCount}</p>
                  <p className="text-red-600">Rs. {month.returnedAmount.toLocaleString()}</p>
                </div>
                <div className="bg-amber-500/10 rounded p-2 text-center">
                  <p className="text-amber-600 font-medium">Pending</p>
                  <p className="font-bold text-amber-700">{month.pendingCount}</p>
                  <p className="text-amber-600">Rs. {month.pendingAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t text-center">
                <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">Rs. {month.amount.toLocaleString()}</span></p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Cheques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by cheque number, customer, or bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months ({allChequesRaw.length})</SelectItem>
                {monthlyStats.map((month) => (
                  <SelectItem key={month.key} value={month.key}>
                    {month.label} ({month.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cheque List ({sortedCheques.length})</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {sortField === 'date' 
              ? (sortOrder === 'asc' ? 'Date: Oldest First' : 'Date: Newest First')
              : (sortOrder === 'asc' ? 'City: A to Z' : 'City: Z to A')}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>City</TableHead>
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
                    <TableCell colSpan={11} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : sortedCheques.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center">No cheques found</TableCell>
                  </TableRow>
                ) : (
                  sortedCheques.map((cheque, index) => (
                    <TableRow key={`${cheque.receipt_no}-${index}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {cheque.cheque_no}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(cheque.cheque_date).toLocaleDateString()}</TableCell>
                      <TableCell>{cheque.customer_name || 'N/A'}</TableCell>
                      <TableCell>{cheque.customer_city || '-'}</TableCell>
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
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cheques Report Preview</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Header */}
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold">{companyInfo?.name || 'Company'}</h2>
              <p className="text-muted-foreground">Cheques Report - {new Date().toLocaleDateString()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sort: By {sortField === 'date' ? 'Date' : 'City'} ({sortField === 'date' ? (sortOrder === 'asc' ? 'Oldest First' : 'Newest First') : (sortOrder === 'asc' ? 'A to Z' : 'Z to A')})
                {searchTerm && ` | Filter: "${searchTerm}"`}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Total Cheques</p>
                <p className="text-lg font-bold">{sortedCheques.length}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-orange-500">{pendingCount}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Passed</p>
                <p className="text-lg font-bold text-green-500">{passedCount}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Returned</p>
                <p className="text-lg font-bold text-red-500">{returnedCount}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold">Rs. {totalAmount.toLocaleString()}</p>
              </Card>
            </div>

            {/* Cheques Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cheque No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCheques.map((cheque, index) => (
                    <TableRow key={`preview-${cheque.receipt_no}-${index}`}>
                      <TableCell className="font-mono">{cheque.cheque_no}</TableCell>
                      <TableCell>{new Date(cheque.cheque_date).toLocaleDateString()}</TableCell>
                      <TableCell>{cheque.customer_name || 'N/A'}</TableCell>
                      <TableCell>{cheque.customer_city || '-'}</TableCell>
                      <TableCell>{cheque.receipt_no}</TableCell>
                      <TableCell>{cheque.cheque_bank || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(cheque.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${
                          cheque.status === 'passed' ? 'text-green-600' :
                          cheque.status === 'returned' ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {getStatusText(cheque.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
