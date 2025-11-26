import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BillDialog } from "@/components/bills/BillDialog";
import { PasswordPromptDialog } from "@/components/PasswordPromptDialog";
import { useActionPassword } from "@/hooks/useActionPassword";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Bills() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useActionPassword('bills');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bills")
        .select(`
          *,
          supplier:contacts(name)
        `)
        .is('deleted_at', null)
        .order("bill_date", { ascending: false });
      
      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bill: any) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const handlePrint = async (bill: any) => {
    try {
      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .single();

      const printWindow = window.open("", "", "width=800,height=600");
      if (!printWindow) return;

      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bill ${bill.bill_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>${company?.name || 'Company Name'}</h2>
              ${company?.address ? `<p>${company.address}</p>` : ''}
            </div>
            <div>
              <h1>BILL</h1>
              <p>Bill #: ${bill.bill_no}</p>
            </div>
          </div>
          <div class="info">
            <p><strong>Date:</strong> ${new Date(bill.bill_date).toLocaleDateString()}</p>
            <p><strong>Supplier:</strong> ${bill.supplier?.name || "N/A"}</p>
            <p><strong>Amount:</strong> ${bill.grand_total?.toLocaleString() || "0"}</p>
            ${bill.due_date ? `<p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>` : ''}
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!billToDelete) return;
    
    requirePassword(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from("bills")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id
          })
          .eq("id", billToDelete.id);
        
        if (error) throw error;
        toast.success("Bill moved to trash");
        fetchBills();
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setDeleteDialogOpen(false);
        setBillToDelete(null);
      }
    });
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.supplier_ref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('purchasing.bills')}</h1>
          <p className="text-muted-foreground mt-2">Manage supplier bills</p>
        </div>
        <Button onClick={() => {
          setSelectedBill(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Bills</CardTitle>
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
          <CardTitle>Bill List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-mono font-medium">{bill.bill_no}</TableCell>
                      <TableCell>{bill.bill_date}</TableCell>
                      <TableCell>{bill.supplier?.name || '-'}</TableCell>
                      <TableCell>{bill.due_date || '-'}</TableCell>
                      <TableCell className="text-right">
                        {bill.grand_total?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bill.status === "paid" ? "default" : "secondary"}>
                          {bill.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(bill)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePrint(bill)} title="Print">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setBillToDelete(bill);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete"
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
          )}
        </CardContent>
      </Card>

      <BillDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedBill(null);
        }}
        bill={selectedBill}
        onSuccess={fetchBills}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {billToDelete?.bill_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordPromptDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onConfirm={handlePasswordConfirm}
        onPasswordVerify={verifyPassword}
        title="Delete Bill"
        description="Please enter the action password to delete this bill."
      />
    </div>
  );
}
