import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Eye, Pencil, Trash2, Truck, MapPin, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Turn {
  id: string;
  turn_no: string;
  turn_date: string;
  vehicle_number: string;
  route: string;
  expenses: number;
  notes?: string;
}

export default function Turns() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTurn, setSelectedTurn] = useState<Turn | null>(null);
  const [turnToDelete, setTurnToDelete] = useState<Turn | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    turn_date: new Date().toISOString().split("T")[0],
    vehicle_number: "",
    route: "",
    expenses: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchTurns = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      const { data, error } = await supabase
        .from("turns")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("turn_date", { ascending: false })
        .order("turn_no", { ascending: false });

      if (error) throw error;
      setTurns(data || []);
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

  useEffect(() => {
    fetchTurns();
  }, []);

  const handleOpenDialog = (turn?: Turn) => {
    if (turn) {
      setSelectedTurn(turn);
      setFormData({
        turn_date: turn.turn_date,
        vehicle_number: turn.vehicle_number,
        route: turn.route,
        expenses: turn.expenses.toString(),
        notes: turn.notes || "",
      });
    } else {
      setSelectedTurn(null);
      setFormData({
        turn_date: new Date().toISOString().split("T")[0],
        vehicle_number: "",
        route: "",
        expenses: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      let turnNo = selectedTurn?.turn_no;
      if (!selectedTurn) {
        const { data: lastTurn } = await supabase
          .from("turns")
          .select("turn_no")
          .eq("company_id", profile.company_id)
          .order("turn_no", { ascending: false })
          .limit(1)
          .single();

        if (lastTurn?.turn_no) {
          const lastNum = parseInt(lastTurn.turn_no.split("-")[1]) || 0;
          turnNo = `TRN-${String(lastNum + 1).padStart(4, "0")}`;
        } else {
          turnNo = "TRN-0001";
        }
      }

      const turnData = {
        company_id: profile.company_id,
        turn_no: turnNo,
        turn_date: formData.turn_date,
        vehicle_number: formData.vehicle_number,
        route: formData.route,
        expenses: parseFloat(formData.expenses) || 0,
        notes: formData.notes || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (selectedTurn) {
        const { error } = await supabase
          .from("turns")
          .update(turnData)
          .eq("id", selectedTurn.id);

        if (error) throw error;
        toast({ title: "Success", description: "Turn updated successfully" });
      } else {
        const { error } = await supabase
          .from("turns")
          .insert([{ ...turnData, created_by: user.id }]);

        if (error) throw error;
        toast({ title: "Success", description: "Turn created successfully" });
      }

      setIsDialogOpen(false);
      fetchTurns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (turn: Turn) => {
    setTurnToDelete(turn);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!turnToDelete) return;

    try {
      const { error } = await supabase
        .from("turns")
        .delete()
        .eq("id", turnToDelete.id);

      if (error) throw error;

      toast({ title: "Success", description: "Turn deleted successfully" });
      fetchTurns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTurnToDelete(null);
    }
  };

  const filteredTurns = turns.filter((t) =>
    t.turn_no.toLowerCase().includes(search.toLowerCase()) ||
    t.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    t.route.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = turns.reduce((sum, t) => sum + t.expenses, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Turns</h1>
          <p className="text-muted-foreground mt-2">
            Track vehicle trips with routes and expenses
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Turn
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Total Turns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{turns.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Unique Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {new Set(turns.map(t => t.vehicle_number)).size}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Unique Routes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {new Set(turns.map(t => t.route)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by turn no, vehicle, route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Turn No</TableHead>
                <TableHead className="font-semibold">Vehicle Number</TableHead>
                <TableHead className="font-semibold">Route</TableHead>
                <TableHead className="text-right font-semibold">Expenses</TableHead>
                <TableHead className="font-semibold">Notes</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTurns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No turns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTurns.map((turn) => (
                  <TableRow key={turn.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {new Date(turn.turn_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{turn.turn_no}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        {turn.vehicle_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {turn.route}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {turn.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {turn.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(turn)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(turn)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTurn ? "Edit Turn" : "Add Turn"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="turn_date">Date</Label>
                <Input
                  id="turn_date"
                  type="date"
                  value={formData.turn_date}
                  onChange={(e) => setFormData({ ...formData, turn_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_number">Vehicle Number</Label>
                <Input
                  id="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="e.g. ABC-1234"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route">Route</Label>
              <Input
                id="route"
                value={formData.route}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                placeholder="e.g. Colombo - Kandy"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenses">Expenses</Label>
              <Input
                id="expenses"
                type="number"
                step="0.01"
                value={formData.expenses}
                onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Turn</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {turnToDelete?.turn_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}