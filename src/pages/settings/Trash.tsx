import { useTranslation } from "react-i18next";
import { Trash2, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

type DeletedItem = {
  id: string;
  type: string;
  name: string;
  deleted_at: string;
  deleted_by: string | null;
};

export default function Trash() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Fetch deleted items from all tables
  const { data: deletedItems = [], isLoading } = useQuery({
    queryKey: ["trash-items"],
    queryFn: async () => {
      const items: DeletedItem[] = [];

      // Fetch deleted invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_no, deleted_at, deleted_by")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (invoices) {
        items.push(
          ...invoices.map((inv) => ({
            id: inv.id,
            type: "invoice",
            name: inv.invoice_no,
            deleted_at: inv.deleted_at!,
            deleted_by: inv.deleted_by,
          }))
        );
      }

      // Fetch deleted orders
      const { data: orders } = await supabase
        .from("sales_orders")
        .select("id, order_no, deleted_at, deleted_by")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (orders) {
        items.push(
          ...orders.map((order) => ({
            id: order.id,
            type: "order",
            name: order.order_no,
            deleted_at: order.deleted_at!,
            deleted_by: order.deleted_by,
          }))
        );
      }

      // Fetch deleted contacts (customers/suppliers)
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, contact_type, deleted_at, deleted_by")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (contacts) {
        items.push(
          ...contacts.map((contact) => ({
            id: contact.id,
            type: contact.contact_type,
            name: contact.name,
            deleted_at: contact.deleted_at!,
            deleted_by: contact.deleted_by,
          }))
        );
      }

      // Fetch deleted bills
      const { data: bills } = await supabase
        .from("bills")
        .select("id, bill_no, deleted_at, deleted_by")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (bills) {
        items.push(
          ...bills.map((bill) => ({
            id: bill.id,
            type: "bill",
            name: bill.bill_no,
            deleted_at: bill.deleted_at!,
            deleted_by: bill.deleted_by,
          }))
        );
      }

      // Fetch deleted items
      const { data: itemsData } = await supabase
        .from("items")
        .select("id, name, deleted_at, deleted_by")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (itemsData) {
        items.push(
          ...itemsData.map((item) => ({
            id: item.id,
            type: "item",
            name: item.name,
            deleted_at: item.deleted_at!,
            deleted_by: item.deleted_by,
          }))
        );
      }

      // Fetch deleted receipts
      const { data: receipts } = await supabase
        .from("receipts")
        .select("id, receipt_no, deleted_at, deleted_by")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (receipts) {
        items.push(
          ...receipts.map((receipt) => ({
            id: receipt.id,
            type: "receipt",
            name: receipt.receipt_no,
            deleted_at: receipt.deleted_at!,
            deleted_by: receipt.deleted_by,
          }))
        );
      }

      // Fetch deleted payments
      const { data: payments } = await supabase
        .from("bill_payments")
        .select("id, payment_no, deleted_at, deleted_by")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (payments) {
        items.push(
          ...payments.map((payment) => ({
            id: payment.id,
            type: "payment",
            name: payment.payment_no,
            deleted_at: payment.deleted_at!,
            deleted_by: payment.deleted_by,
          }))
        );
      }

      // Sort by deleted_at descending
      return items.sort((a, b) => 
        new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      );
    },
  });

  // Restore item mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const tableMap: Record<string, string> = {
        invoice: "invoices",
        order: "sales_orders",
        customer: "contacts",
        supplier: "contacts",
        bill: "bills",
        item: "items",
        receipt: "receipts",
        payment: "bill_payments",
      };

      const table = tableMap[type];
      if (!table) throw new Error("Invalid item type");

      const { error } = await supabase
        .from(table as any)
        .update({ deleted_at: null, deleted_by: null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item restored successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["trash-items"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore item: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Permanently delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const tableMap: Record<string, string> = {
        invoice: "invoices",
        order: "sales_orders",
        customer: "contacts",
        supplier: "contacts",
        bill: "bills",
        item: "items",
        receipt: "receipts",
        payment: "bill_payments",
      };

      const table = tableMap[type];
      if (!table) throw new Error("Invalid item type");

      const { error } = await supabase.from(table as any).delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["trash-items"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete item: " + error.message,
        variant: "destructive",
      });
    },
  });

  const filteredItems = deletedItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedItems = filteredItems.reduce<Record<string, DeletedItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: "Invoices",
      order: "Orders",
      customer: "Customers",
      supplier: "Suppliers",
      bill: "Bills",
      item: "Items",
      receipt: "Receipts",
      payment: "Payments",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      invoice: "bg-blue-500",
      order: "bg-purple-500",
      customer: "bg-green-500",
      supplier: "bg-orange-500",
      bill: "bg-red-500",
      item: "bg-yellow-500",
      receipt: "bg-cyan-500",
      payment: "bg-pink-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredItems.map(item => `${item.type}-${item.id}`));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemKey: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemKey);
    } else {
      newSelected.delete(itemKey);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkRestore = async () => {
    const items = Array.from(selectedItems).map(key => {
      const [type, id] = key.split('-');
      return { type, id };
    });

    for (const item of items) {
      await restoreMutation.mutateAsync(item);
    }
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedItems.size} items? This action cannot be undone.`)) {
      return;
    }

    const items = Array.from(selectedItems).map(key => {
      const [type, id] = key.split('-');
      return { type, id };
    });

    for (const item of items) {
      await deleteMutation.mutateAsync(item);
    }
    setSelectedItems(new Set());
  };

  const allSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trash2 className="h-8 w-8" />
          Trash
        </h1>
        <p className="text-muted-foreground mt-2">
          View and restore deleted items
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deleted items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredItems.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 border rounded-md">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All
              </label>
            </div>
            {selectedItems.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRestore}
                  disabled={restoreMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Selected ({selectedItems.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedItems.size})
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Trash is Empty</h2>
            <p className="text-muted-foreground">
              No deleted items found
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({filteredItems.length})</TabsTrigger>
            {Object.keys(groupedItems).map((type) => (
              <TabsTrigger key={type} value={type}>
                {getTypeLabel(type)} ({groupedItems[type].length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredItems.map((item) => {
              const itemKey = `${item.type}-${item.id}`;
              return (
                <Card key={itemKey}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedItems.has(itemKey)}
                        onCheckedChange={(checked) => handleSelectItem(itemKey, checked as boolean)}
                      />
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeBadgeColor(item.type)}>
                            {getTypeLabel(item.type)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Deleted {format(new Date(item.deleted_at), "PPp")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          restoreMutation.mutate({ id: item.id, type: item.type })
                        }
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to permanently delete this item? This action cannot be undone."
                            )
                          ) {
                            deleteMutation.mutate({ id: item.id, type: item.type });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Permanently
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </TabsContent>

          {Object.keys(groupedItems).map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {groupedItems[type].map((item) => {
                const itemKey = `${item.type}-${item.id}`;
                return (
                  <Card key={item.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedItems.has(itemKey)}
                          onCheckedChange={(checked) => handleSelectItem(itemKey, checked as boolean)}
                        />
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <span className="text-sm text-muted-foreground">
                            Deleted {format(new Date(item.deleted_at), "PPp")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            restoreMutation.mutate({ id: item.id, type: item.type })
                          }
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to permanently delete this item? This action cannot be undone."
                              )
                            ) {
                              deleteMutation.mutate({ id: item.id, type: item.type });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
