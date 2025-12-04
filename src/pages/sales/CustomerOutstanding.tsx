import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Eye, Printer, FileSpreadsheet, DollarSign, CreditCard, Wallet, TrendingDown, Filter, FileText, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PendingCheque {
  chequeNo: string;
  amount: number;
  date: string;
  bank: string;
  customerName: string;
  customerId: string;
}

interface CustomerOutstandingData {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  area: string | null;
  district: string | null;
  totalInvoiced: number;
  cashPaid: number;
  chequePaid: number;
  totalPaid: number;
  pendingCheques: number;
  pendingChequesList: PendingCheque[];
  returnedCheques: number;
  outstanding: number;
  toCollect: number;
}

type FilterType = 'all' | 'with_outstanding' | 'with_pending_cheques' | 'fully_paid' | 'overdue';

export default function CustomerOutstanding() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<CustomerOutstandingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("outstanding");
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    totalPendingCheques: 0,
    totalToCollect: 0,
    customersWithOutstanding: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: customersData, error: customersError },
        { data: invoicesData, error: invoicesError },
        { data: receiptsData, error: receiptsError }
      ] = await Promise.all([
        supabase.from("contacts").select("*").eq("contact_type", "customer").is('deleted_at', null).order("name"),
        supabase.from("invoices").select("customer_id, grand_total").is('deleted_at', null),
        supabase.from("receipts").select("customer_id, amount, reference").is('deleted_at', null)
      ]);

      if (customersError) throw customersError;
      if (invoicesError) throw invoicesError;
      if (receiptsError) throw receiptsError;

      // Get unique areas
      const uniqueAreas = [...new Set((customersData || []).map(c => c.area).filter(Boolean))] as string[];
      setAreas(uniqueAreas);

      const customerOutstandingData: CustomerOutstandingData[] = (customersData || []).map(customer => {
        const customerInvoices = (invoicesData || []).filter(inv => inv.customer_id === customer.id);
        const customerReceipts = (receiptsData || []).filter(rec => rec.customer_id === customer.id);

        const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
        
        let cashPaid = 0;
        let chequePaid = 0;
        let pendingChequesTotal = 0;
        let returnedCheques = 0;
        const pendingChequesList: PendingCheque[] = [];

        customerReceipts.forEach(receipt => {
          try {
            const parsed = receipt.reference ? JSON.parse(receipt.reference) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach((cheque: any) => {
                const amount = Number(cheque.amount) || 0;
                if (cheque.status === 'passed') {
                  chequePaid += amount;
                } else if (cheque.status === 'returned') {
                  returnedCheques += amount;
                } else {
                  pendingChequesTotal += amount;
                  pendingChequesList.push({
                    chequeNo: cheque.cheque_no || cheque.chequeNo || '-',
                    amount: amount,
                    date: cheque.cheque_date || cheque.date || '-',
                    bank: cheque.cheque_bank || cheque.bank || '-',
                    customerName: customer.name,
                    customerId: customer.id,
                  });
                }
              });
            } else {
              cashPaid += receipt.amount || 0;
            }
          } catch {
            cashPaid += receipt.amount || 0;
          }
        });

        const totalPaid = cashPaid + chequePaid;
        const outstanding = totalInvoiced - totalPaid;
        const toCollect = Math.max(0, outstanding - pendingChequesTotal);

        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          area: customer.area,
          district: customer.district,
          totalInvoiced,
          cashPaid,
          chequePaid,
          totalPaid,
          pendingCheques: pendingChequesTotal,
          pendingChequesList,
          returnedCheques,
          outstanding,
          toCollect,
        };
      });

      setCustomers(customerOutstandingData);

      setStats({
        totalOutstanding: customerOutstandingData.reduce((sum, c) => sum + c.outstanding, 0),
        totalPendingCheques: customerOutstandingData.reduce((sum, c) => sum + c.pendingCheques, 0),
        totalToCollect: customerOutstandingData.reduce((sum, c) => sum + c.toCollect, 0),
        customersWithOutstanding: customerOutstandingData.filter(c => c.outstanding > 0).length,
      });

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.area?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply area filter (multi-select)
    if (selectedAreas.length > 0) {
      filtered = filtered.filter(c => c.area && selectedAreas.includes(c.area));
    }

    // Apply status filter
    switch (filter) {
      case 'with_outstanding':
        filtered = filtered.filter(c => c.outstanding > 0);
        break;
      case 'with_pending_cheques':
        filtered = filtered.filter(c => c.pendingCheques > 0);
        break;
      case 'fully_paid':
        filtered = filtered.filter(c => c.outstanding <= 0);
        break;
      case 'overdue':
        filtered = filtered.filter(c => c.toCollect > 0);
        break;
    }

    return filtered;
  };

  const getAllPendingCheques = () => {
    let cheques: PendingCheque[] = [];
    customers.forEach(c => {
      cheques = [...cheques, ...c.pendingChequesList];
    });
    
    if (searchTerm) {
      cheques = cheques.filter(c => 
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.chequeNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return cheques.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString || dateString === '-') return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-area');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Customer Outstanding Report</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .text-right { text-align: right; }
                .text-red { color: red; }
                .text-green { color: green; }
                .text-orange { color: orange; }
                h1 { margin-bottom: 10px; }
                .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                .stat-box { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
              </style>
            </head>
            <body>
              <h1>Customer Outstanding Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <div class="stats">
                <div class="stat-box"><strong>Total Outstanding:</strong> ${formatCurrency(stats.totalOutstanding)}</div>
                <div class="stat-box"><strong>Pending Cheques:</strong> ${formatCurrency(stats.totalPendingCheques)}</div>
                <div class="stat-box"><strong>To Collect:</strong> ${formatCurrency(stats.totalToCollect)}</div>
              </div>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExportExcel = () => {
    const filteredData = getFilteredCustomers();
    const exportData = filteredData.map(c => ({
      'Code': c.code,
      'Customer Name': c.name,
      'Area': c.area || '-',
      'Total Invoiced': c.totalInvoiced,
      'Cash Paid': c.cashPaid,
      'Cheque Paid': c.chequePaid,
      'Total Paid': c.totalPaid,
      'Pending Cheques': c.pendingCheques,
      'Outstanding': c.outstanding,
      'To Collect': c.toCollect,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding');
    XLSX.writeFile(wb, `customer_outstanding_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel');
  };

  const handleExportCheques = () => {
    const cheques = getAllPendingCheques();
    const exportData = cheques.map(c => ({
      'Cheque No': c.chequeNo,
      'Customer': c.customerName,
      'Date': c.date,
      'Bank': c.bank,
      'Amount': c.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pending Cheques');
    XLSX.writeFile(wb, `pending_cheques_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Exported to Excel');
  };

  const handleExportPDF = () => {
    const filteredData = getFilteredCustomers();
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Customer Outstanding Report', 14, 22);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    // Summary
    doc.setFontSize(12);
    doc.text(`Total Outstanding: ${formatCurrency(stats.totalOutstanding)}`, 14, 40);
    doc.text(`Pending Cheques: ${formatCurrency(stats.totalPendingCheques)}`, 14, 48);
    doc.text(`To Collect: ${formatCurrency(stats.totalToCollect)}`, 14, 56);
    
    // Table
    const tableData = filteredData.map(c => [
      c.code,
      c.name,
      c.area || '-',
      formatCurrency(c.totalInvoiced),
      formatCurrency(c.totalPaid),
      formatCurrency(c.pendingCheques),
      formatCurrency(c.outstanding),
      c.toCollect > 0 ? formatCurrency(c.toCollect) : 'Covered',
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [['Code', 'Customer', 'Area', 'Invoiced', 'Paid', 'Pending', 'Outstanding', 'To Collect']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      },
      didParseCell: (data) => {
        // Highlight outstanding column
        if (data.column.index === 6 && data.section === 'body') {
          const value = parseFloat(String(data.cell.raw).replace(/,/g, ''));
          if (value > 0) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
    
    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Outstanding: ${formatCurrency(filteredData.reduce((sum, c) => sum + c.outstanding, 0))}`, 14, finalY);
    
    doc.save(`customer_outstanding_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Exported to PDF');
  };

  const filteredCustomers = getFilteredCustomers();
  const pendingCheques = getAllPendingCheques();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Outstanding</h1>
          <p className="text-muted-foreground mt-2">View and manage all customer outstanding balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('with_outstanding')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <DollarSign className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
                <p className="text-xs text-muted-foreground">{stats.customersWithOutstanding} customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('with_pending_cheques')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <CreditCard className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Cheques</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalPendingCheques)}</p>
                <p className="text-xs text-muted-foreground">{pendingCheques.length} cheques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('overdue')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Wallet className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">To Collect (Cash/Cheque)</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalToCollect)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('fully_paid')}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingDown className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fully Paid</p>
                <p className="text-2xl font-bold text-green-600">{customers.filter(c => c.outstanding <= 0).length}</p>
                <p className="text-xs text-muted-foreground">customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="with_outstanding">With Outstanding</SelectItem>
                <SelectItem value="with_pending_cheques">With Pending Cheques</SelectItem>
                <SelectItem value="overdue">To Collect</SelectItem>
                <SelectItem value="fully_paid">Fully Paid</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  {selectedAreas.length === 0 
                    ? "All Areas" 
                    : selectedAreas.length === 1 
                      ? selectedAreas[0] 
                      : `${selectedAreas.length} Areas`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-2 py-1 mb-1 border-b">
                    <span className="text-sm font-medium">Select Areas</span>
                    {selectedAreas.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => setSelectedAreas([])}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {areas.map(area => (
                      <div 
                        key={area} 
                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                        onClick={() => {
                          setSelectedAreas(prev => 
                            prev.includes(area) 
                              ? prev.filter(a => a !== area)
                              : [...prev, area]
                          );
                        }}
                      >
                        <Checkbox 
                          checked={selectedAreas.includes(area)} 
                          onCheckedChange={() => {}}
                        />
                        <span className="text-sm">{area}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {selectedAreas.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedAreas.map(area => (
                  <Badge key={area} variant="secondary" className="flex items-center gap-1">
                    {area}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setSelectedAreas(prev => prev.filter(a => a !== area))}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="outstanding">Outstanding List</TabsTrigger>
          <TabsTrigger value="pending_cheques">Pending Cheques</TabsTrigger>
          <TabsTrigger value="payment_details">Payment Details</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <CardTitle>Customer Outstanding ({filteredCustomers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div id="print-area">
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Total Invoiced</TableHead>
                        <TableHead className="text-right">Total Paid</TableHead>
                        <TableHead className="text-right">Pending Cheques</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">To Collect</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">No customers found</TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-mono">{customer.code}</TableCell>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.area || '-'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(customer.totalInvoiced)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(customer.totalPaid)}</TableCell>
                            <TableCell className="text-right text-orange-600">
                              {customer.pendingCheques > 0 ? (
                                <span>{formatCurrency(customer.pendingCheques)} ({customer.pendingChequesList.length})</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${customer.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(customer.outstanding)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${customer.toCollect > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                              {customer.toCollect > 0 ? formatCurrency(customer.toCollect) : 'Covered'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/customers/${customer.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending_cheques">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending Cheques ({pendingCheques.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportCheques}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Cheques
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cheque No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCheques.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No pending cheques</TableCell>
                      </TableRow>
                    ) : (
                      pendingCheques.map((cheque, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{cheque.chequeNo}</TableCell>
                          <TableCell className="font-medium">{cheque.customerName}</TableCell>
                          <TableCell>{formatDate(cheque.date)}</TableCell>
                          <TableCell>{cheque.bank || '-'}</TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">
                            {formatCurrency(cheque.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/customers/${cheque.customerId}`)}>
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
        </TabsContent>

        <TabsContent value="payment_details">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details ({filteredCustomers.length})</CardTitle>
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
                      <TableHead className="text-right">Total Invoiced</TableHead>
                      <TableHead className="text-right">Cash Paid</TableHead>
                      <TableHead className="text-right">Cheque Paid</TableHead>
                      <TableHead className="text-right">Pending Cheques</TableHead>
                      <TableHead className="text-right">Returned Cheques</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No customers found</TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-mono">{customer.code}</TableCell>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(customer.totalInvoiced)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(customer.cashPaid)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(customer.chequePaid)}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(customer.pendingCheques)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(customer.returnedCheques)}</TableCell>
                          <TableCell className={`text-right font-semibold ${customer.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(customer.outstanding)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
