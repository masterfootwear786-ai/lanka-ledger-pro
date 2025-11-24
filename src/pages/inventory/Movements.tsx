import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { StockMovementDialog } from "@/components/inventory/StockMovementDialog";

export default function Movements() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          items(code, name, color),
          stock_locations(name)
        `)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(movement => {
    const itemName = movement.items?.name || "";
    const itemCode = movement.items?.code || "";
    const locationName = movement.stock_locations?.name || "";
    const search = searchTerm.toLowerCase();
    
    return (
      itemName.toLowerCase().includes(search) ||
      itemCode.toLowerCase().includes(search) ||
      locationName.toLowerCase().includes(search) ||
      movement.notes?.toLowerCase().includes(search)
    );
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in":
      case "purchase":
        return <ArrowUpCircle className="h-3 w-3 mr-1" />;
      case "out":
      case "sale":
        return <ArrowDownCircle className="h-3 w-3 mr-1" />;
      case "adjustment":
        return <Settings className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  const getMovementBadgeVariant = (type: string) => {
    switch (type) {
      case "in":
      case "purchase":
        return "default";
      case "out":
      case "sale":
        return "secondary";
      case "adjustment":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('inventory.movements')}</h1>
          <p className="text-muted-foreground mt-2">Track and manage stock movements</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Movement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Movements</CardTitle>
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
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading movements...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Design No</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No stock movements found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {format(new Date(movement.movement_date), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="font-mono">
                        {movement.items?.code || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.items?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {movement.items?.color || "-"}
                      </TableCell>
                      <TableCell>
                        {movement.stock_locations?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getMovementBadgeVariant(movement.movement_type)}>
                          {getMovementIcon(movement.movement_type)}
                          {movement.movement_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.unit_cost ? movement.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                      </TableCell>
                      <TableCell>
                        {movement.ref_type && movement.ref_id ? (
                          <span className="text-xs text-muted-foreground">
                            {movement.ref_type}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {movement.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StockMovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchMovements}
      />
    </div>
  );
}
