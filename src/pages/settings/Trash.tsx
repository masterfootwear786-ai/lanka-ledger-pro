import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, RefreshCw, Trash } from "lucide-react";
import { format } from "date-fns";
import { useActionPassword } from "@/hooks/useActionPassword";
import { PasswordPromptDialog } from "@/components/PasswordPromptDialog";
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

type DeletedItem = {
  id: string;
  type: string;
  name: string;
  deletedAt: string;
  deletedBy: string;
};

export default function TrashPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreItem, setRestoreItem] = useState<DeletedItem | null>(null);
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<DeletedItem | null>(null);

  const [pendingDeleteItem, setPendingDeleteItem] = useState<DeletedItem | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const checkPasswordRequired = async (itemType: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return false;

      const { data: company } = await supabase
        .from('companies')
        .select('password_protection_enabled, protect_invoice_delete, protect_order_delete, protect_customer_delete, protect_bill_delete, protect_supplier_delete, protect_item_delete, protect_tax_rate_delete')
        .eq('id', profile.company_id)
        .single();

      if (!company?.password_protection_enabled) return false;

      const moduleMap: Record<string, boolean> = {
        'Invoice': company.protect_invoice_delete || false,
        'Order': company.protect_order_delete || false,
        'Customer': company.protect_customer_delete || false,
        'Supplier': company.protect_supplier_delete || false,
        'Bill': company.protect_bill_delete || false,
        'Item': company.protect_item_delete || false,
        'Tax Rate': company.protect_tax_rate_delete || false,
      };

      return moduleMap[itemType] || false;
    } catch (error) {
      console.error('Error checking password requirement:', error);
      return false;
    }
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return false;

      const { data: company } = await supabase
        .from('companies')
        .select('action_password')
        .eq('id', profile.company_id)
        .single();

      return company?.action_password === password;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const fetchDeletedItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const items: DeletedItem[] = [];

      // Fetch deleted invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_no, deleted_at, deleted_by:profiles!invoices_updated_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (invoices) {
        items.push(...invoices.map(inv => ({
          id: inv.id,
          type: 'Invoice',
          name: inv.invoice_no,
          deletedAt: inv.deleted_at!,
          deletedBy: (inv.deleted_by as any)?.full_name || 'Unknown'
        })));
      }

      // Fetch deleted orders
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, order_no, deleted_at, deleted_by:profiles!sales_orders_updated_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (orders) {
        items.push(...orders.map(ord => ({
          id: ord.id,
          type: 'Order',
          name: ord.order_no,
          deletedAt: ord.deleted_at!,
          deletedBy: (ord.deleted_by as any)?.full_name || 'Unknown'
        })));
      }

      // Fetch deleted customers
      const { data: customers } = await supabase
        .from('contacts')
        .select('id, name, deleted_at, deleted_by:profiles!contacts_updated_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .eq('contact_type', 'customer')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (customers) {
        items.push(...customers.map(cust => ({
          id: cust.id,
          type: 'Customer',
          name: cust.name,
          deletedAt: cust.deleted_at!,
          deletedBy: (cust.deleted_by as any)?.full_name || 'Unknown'
        })));
      }

      // Fetch deleted suppliers
      const { data: suppliers } = await supabase
        .from('contacts')
        .select('id, name, deleted_at, deleted_by:profiles!contacts_updated_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .eq('contact_type', 'supplier')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (suppliers) {
        items.push(...suppliers.map(supp => ({
          id: supp.id,
          type: 'Supplier',
          name: supp.name,
          deletedAt: supp.deleted_at!,
          deletedBy: (supp.deleted_by as any)?.full_name || 'Unknown'
        })));
      }

      // Fetch deleted bills
      const { data: bills } = await supabase
        .from('bills')
        .select('id, bill_no, deleted_at, deleted_by:profiles!bills_updated_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (bills) {
        items.push(...bills.map(bill => ({
          id: bill.id,
          type: 'Bill',
          name: bill.bill_no,
          deletedAt: bill.deleted_at!,
          deletedBy: (bill.deleted_by as any)?.full_name || 'Unknown'
        })));
      }

      // Fetch deleted items
      const { data: itemsList } = await supabase
        .from('items')
        .select('id, name, deleted_at, deleted_by:profiles!items_updated_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (itemsList) {
        items.push(...itemsList.map(item => ({
          id: item.id,
          type: 'Item',
          name: item.name,
          deletedAt: item.deleted_at!,
          deletedBy: (item.deleted_by as any)?.full_name || 'Unknown'
        })));
      }

      // Fetch deleted tax rates
      const { data: taxRatesList } = await supabase
        .from('tax_rates')
        .select('id, name, deleted_at, deleted_by:profiles!tax_rates_updated_by_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (taxRatesList) {
        items.push(...taxRatesList.map(rate => ({
          id: rate.id,
          type: 'Tax Rate',
          name: rate.name,
          deletedAt: rate.deleted_at!,
          deletedBy: (rate.deleted_by as any)?.full_name || 'Unknown'
        })));
      }

      setDeletedItems(items.sort((a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      ));
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

  const handleRestore = async (item: DeletedItem) => {
    try {
      const tableMap: Record<string, string> = {
        'Invoice': 'invoices',
        'Order': 'sales_orders',
        'Customer': 'contacts',
        'Supplier': 'contacts',
        'Bill': 'bills',
        'Item': 'items',
        'Tax Rate': 'tax_rates',
      };

      const { error } = await supabase
        .from(tableMap[item.type] as any)
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${item.type} restored successfully`,
      });

      fetchDeletedItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePermanentDeleteClick = async (item: DeletedItem) => {
    const isRequired = await checkPasswordRequired(item.type);
    if (!isRequired) {
      setPermanentDeleteItem(item);
      return;
    }
    setPendingDeleteItem(item);
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordConfirm = () => {
    if (pendingDeleteItem) {
      setPermanentDeleteItem(pendingDeleteItem);
      setPendingDeleteItem(null);
    }
    setIsPasswordDialogOpen(false);
  };

  const handlePasswordCancel = () => {
    setPendingDeleteItem(null);
    setIsPasswordDialogOpen(false);
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    try {
      const tableMap: Record<string, string> = {
        'Invoice': 'invoices',
        'Order': 'sales_orders',
        'Customer': 'contacts',
        'Supplier': 'contacts',
        'Bill': 'bills',
        'Item': 'items',
        'Tax Rate': 'tax_rates',
      };

      const { error } = await supabase
        .from(tableMap[item.type] as any)
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${item.type} permanently deleted`,
      });

      fetchDeletedItems();
      setPermanentDeleteItem(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Invoice': 'bg-blue-500',
      'Order': 'bg-green-500',
      'Customer': 'bg-purple-500',
      'Supplier': 'bg-orange-500',
      'Bill': 'bg-red-500',
      'Item': 'bg-yellow-500',
      'Tax Rate': 'bg-pink-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trash2 className="h-8 w-8" />
          Trash
        </h1>
        <p className="text-muted-foreground mt-2">
          Restore or permanently delete items
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deleted Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : deletedItems.length === 0 ? (
            <p className="text-muted-foreground">Trash is empty</p>
          ) : (
            <div className="space-y-3">
              {deletedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getTypeBadgeColor(item.type)}>
                        {item.type}
                      </Badge>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Deleted {format(new Date(item.deletedAt), 'PPp')} by {item.deletedBy}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRestoreItem(item)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handlePermanentDeleteClick(item)}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!restoreItem} onOpenChange={() => setRestoreItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore {restoreItem?.name}? This will make it visible again in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreItem && handleRestore(restoreItem)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!permanentDeleteItem} onOpenChange={() => setPermanentDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {permanentDeleteItem?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => permanentDeleteItem && handlePermanentDelete(permanentDeleteItem)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordPromptDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onConfirm={handlePasswordConfirm}
        onPasswordVerify={verifyPassword}
        title="Confirm Permanent Delete"
        description="Enter your action password to permanently delete this item."
      />
    </div>
  );
}
