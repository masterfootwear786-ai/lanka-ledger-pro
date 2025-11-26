import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Mail, Phone, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContactDialog } from "@/components/contacts/ContactDialog";
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

export default function Customers() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useActionPassword();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("contact_type", "customer")
        .order("code");
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    
    requirePassword(async () => {
      try {
        const { error } = await supabase
          .from("contacts")
          .delete()
          .eq("id", customerToDelete.id);
        
        if (error) {
          console.error("Delete error:", error);
          if (error.message.includes("row-level security")) {
            toast.error("You don't have permission to delete customers. Only admins can delete customers.");
          } else if (error.message.includes("foreign key")) {
            toast.error("Cannot delete customer with existing transactions. Please delete related invoices, receipts, and credit notes first.");
          } else {
            toast.error(`Failed to delete customer: ${error.message}`);
          }
          return;
        }
        
        toast.success("Customer deleted successfully");
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
      } catch (error: any) {
        console.error("Delete error:", error);
        toast.error(`Failed to delete customer: ${error.message}`);
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
      }
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('sales.customers')}</h1>
          <p className="text-muted-foreground mt-2">Manage customer information</p>
        </div>
        <Button onClick={() => {
          setSelectedCustomer(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('sales.addCustomer')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Customers</CardTitle>
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
            <Button variant="outline">{t('common.filter')}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Credit Limit</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono">{customer.code}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.credit_limit?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.active ? "default" : "secondary"}>
                          {customer.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.location.href = `/sales/customers/${customer.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setCustomerToDelete(customer);
                              setDeleteDialogOpen(true);
                            }}
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

      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedCustomer(null);
        }}
        contact={selectedCustomer}
        type="customer"
        onSuccess={fetchCustomers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customerToDelete?.name}? This action cannot be undone.
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
        title="Delete Customer"
        description="Please enter the action password to delete this customer."
      />
    </div>
  );
}
