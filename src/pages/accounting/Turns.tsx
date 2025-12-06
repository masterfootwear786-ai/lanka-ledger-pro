import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Pencil, Trash2, Truck, MapPin, DollarSign, Fuel, UtensilsCrossed, Hotel, MoreHorizontal, Calendar, Eye } from "lucide-react";
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
import { TurnDailyExpensesDialog } from "@/components/accounting/TurnDailyExpensesDialog";
import { TurnViewDialog } from "@/components/accounting/TurnViewDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Route {
  id: string;
  name: string;
  active: boolean;
}

interface Turn {
  id: string;
  turn_no: string;
  turn_date: string;
  turn_start_date: string | null;
  turn_end_date: string | null;
  vehicle_number: string;
  route: string;
  driver: string | null;
  sales_reps: string[] | null;
  expenses: number;
  expense_fuel: number | null;
  km: number | null;
  expense_food: number | null;
  expense_accommodation: number | null;
  accommodation_city: string | null;
  expense_other: number | null;
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
    turn_start_date: new Date().toISOString().split("T")[0],
    turn_end_date: "",
    vehicle_number: "",
    route: "",
    driver: "",
    sales_reps: "",
    expense_fuel: "",
    km: "",
    expense_food: "",
    expense_accommodation: "",
    accommodation_city: "",
    expense_other: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [isDailyExpensesOpen, setIsDailyExpensesOpen] = useState(false);
  const [turnForDailyExpenses, setTurnForDailyExpenses] = useState<Turn | null>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [turnToView, setTurnToView] = useState<Turn | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isAddRouteDialogOpen, setIsAddRouteDialogOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);
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
      setCompanyId(profile.company_id);

      const [turnsResult, routesResult] = await Promise.all([
        supabase
          .from("turns")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("turn_date", { ascending: false })
          .order("turn_no", { ascending: false }),
        supabase
          .from("routes")
          .select("id, name, active")
          .eq("company_id", profile.company_id)
          .eq("active", true)
          .order("name", { ascending: true })
      ]);

      if (turnsResult.error) throw turnsResult.error;
      setTurns(turnsResult.data || []);
      setRoutes(routesResult.data || []);
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

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchTurns();
  }, []);

  // Handle view query parameter from Expenses page
  useEffect(() => {
    const viewTurnId = searchParams.get('view');
    if (viewTurnId && turns.length > 0) {
      const turnToOpen = turns.find(t => t.id === viewTurnId);
      if (turnToOpen) {
        setTurnToView(turnToOpen);
        setIsViewDialogOpen(true);
        // Clear the query parameter after opening
        setSearchParams({});
      }
    }
  }, [searchParams, turns]);

  const handleOpenDialog = (turn?: Turn) => {
    if (turn) {
      setSelectedTurn(turn);
      setFormData({
        turn_start_date: turn.turn_start_date || turn.turn_date,
        turn_end_date: turn.turn_end_date || "",
        vehicle_number: turn.vehicle_number,
        route: turn.route,
        driver: turn.driver || "",
        sales_reps: turn.sales_reps?.join(", ") || "",
        expense_fuel: (turn.expense_fuel || 0).toString(),
        km: (turn.km || 0).toString(),
        expense_food: (turn.expense_food || 0).toString(),
        expense_accommodation: (turn.expense_accommodation || 0).toString(),
        accommodation_city: turn.accommodation_city || "",
        expense_other: (turn.expense_other || 0).toString(),
        notes: turn.notes || "",
      });
    } else {
      setSelectedTurn(null);
      setFormData({
        turn_start_date: new Date().toISOString().split("T")[0],
        turn_end_date: "",
        vehicle_number: "",
        route: "",
        driver: "",
        sales_reps: "",
        expense_fuel: "",
        km: "",
        expense_food: "",
        expense_accommodation: "",
        accommodation_city: "",
        expense_other: "",
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
        turn_date: formData.turn_start_date,
        turn_start_date: formData.turn_start_date,
        turn_end_date: formData.turn_end_date || null,
        vehicle_number: formData.vehicle_number,
        route: formData.route,
        driver: formData.driver || null,
        sales_reps: formData.sales_reps ? formData.sales_reps.split(",").map(s => s.trim()).filter(s => s) : null,
        expense_fuel: parseFloat(formData.expense_fuel) || 0,
        km: parseFloat(formData.km) || 0,
        expense_food: parseFloat(formData.expense_food) || 0,
        expense_accommodation: parseFloat(formData.expense_accommodation) || 0,
        accommodation_city: formData.accommodation_city || null,
        expense_other: parseFloat(formData.expense_other) || 0,
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

  const handleAddRoute = async () => {
    if (!newRouteName.trim()) return;
    setSavingRoute(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("routes")
        .insert([{ 
          name: newRouteName.trim(),
          company_id: companyId,
          created_by: user.id,
          active: true
        }]);

      if (error) throw error;

      toast({ title: "Success", description: "Route added successfully" });
      
      // Refresh routes
      const { data: newRoutes } = await supabase
        .from("routes")
        .select("id, name, active")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name", { ascending: true });
      
      setRoutes(newRoutes || []);
      setFormData({ ...formData, route: newRouteName.trim() });
      setNewRouteName("");
      setIsAddRouteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingRoute(false);
    }
  };

  const filteredTurns = turns.filter((t) =>
    t.turn_no.toLowerCase().includes(search.toLowerCase()) ||
    t.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    t.route.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = turns.reduce((sum, t) => sum + t.expenses, 0);
  const totalFuel = turns.reduce((sum, t) => sum + (t.expense_fuel || 0), 0);
  const totalFood = turns.reduce((sum, t) => sum + (t.expense_food || 0), 0);
  const totalAccommodation = turns.reduce((sum, t) => sum + (t.expense_accommodation || 0), 0);
  const totalOther = turns.reduce((sum, t) => sum + (t.expense_other || 0), 0);

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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Fuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {totalFuel.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Food
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalFood.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Hotel className="h-4 w-4" />
              Accommodation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalAccommodation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MoreHorizontal className="h-4 w-4" />
              Other
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {totalOther.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                <TableHead className="font-semibold">Start Date</TableHead>
                <TableHead className="font-semibold">End Date</TableHead>
                <TableHead className="font-semibold">Turn No</TableHead>
                <TableHead className="font-semibold">Vehicle</TableHead>
                <TableHead className="font-semibold">Route</TableHead>
                <TableHead className="text-right font-semibold">Fuel</TableHead>
                <TableHead className="text-right font-semibold">Food</TableHead>
                <TableHead className="text-right font-semibold">Accom.</TableHead>
                <TableHead className="text-right font-semibold">Other</TableHead>
                <TableHead className="text-right font-semibold">Total</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTurns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No turns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTurns.map((turn) => (
                  <TableRow key={turn.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {turn.turn_start_date ? new Date(turn.turn_start_date).toLocaleDateString() : new Date(turn.turn_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {turn.turn_end_date ? new Date(turn.turn_end_date).toLocaleDateString() : '-'}
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
                    <TableCell className="text-right">
                      {(turn.expense_fuel || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {(turn.expense_food || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {(turn.expense_accommodation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {(turn.expense_other || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {turn.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTurnToView(turn);
                            setIsViewDialogOpen(true);
                          }}
                          title="View"
                        >
                          <Eye className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTurnForDailyExpenses(turn);
                            setIsDailyExpensesOpen(true);
                          }}
                          title="Daily Expenses"
                        >
                          <Calendar className="h-4 w-4 text-blue-500" />
                        </Button>
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
                <Label htmlFor="turn_start_date">Start Date</Label>
                <Input
                  id="turn_start_date"
                  type="date"
                  value={formData.turn_start_date}
                  onChange={(e) => setFormData({ ...formData, turn_start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turn_end_date">End Date</Label>
                <Input
                  id="turn_end_date"
                  type="date"
                  value={formData.turn_end_date}
                  onChange={(e) => setFormData({ ...formData, turn_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="route">Route</Label>
                <Select
                  value={formData.route}
                  onValueChange={(value) => setFormData({ ...formData, route: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.name}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button 
                  type="button"
                  onClick={() => setIsAddRouteDialogOpen(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Route
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driver">Driver</Label>
                <Input
                  id="driver"
                  value={formData.driver}
                  onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                  placeholder="Driver name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_reps">Sales Rep(s)</Label>
              <Input
                id="sales_reps"
                value={formData.sales_reps}
                onChange={(e) => setFormData({ ...formData, sales_reps: e.target.value })}
                placeholder="Comma-separated names (e.g. John, Jane)"
              />
              <p className="text-xs text-muted-foreground">Enter multiple names separated by commas</p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Expenses</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense_fuel" className="text-sm flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-amber-500" />
                    Fuel
                  </Label>
                  <Input
                    id="expense_fuel"
                    type="number"
                    step="0.01"
                    value={formData.expense_fuel}
                    onChange={(e) => setFormData({ ...formData, expense_fuel: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="km" className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    KM
                  </Label>
                  <Input
                    id="km"
                    type="number"
                    step="0.01"
                    value={formData.km}
                    onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_food" className="text-sm flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-orange-500" />
                    Food
                  </Label>
                  <Input
                    id="expense_food"
                    type="number"
                    step="0.01"
                    value={formData.expense_food}
                    onChange={(e) => setFormData({ ...formData, expense_food: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_accommodation" className="text-sm flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-purple-500" />
                    Accommodation
                  </Label>
                  <Input
                    id="expense_accommodation"
                    type="number"
                    step="0.01"
                    value={formData.expense_accommodation}
                    onChange={(e) => setFormData({ ...formData, expense_accommodation: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accommodation_city" className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    Accommodation City
                  </Label>
                  <Input
                    id="accommodation_city"
                    value={formData.accommodation_city}
                    onChange={(e) => setFormData({ ...formData, accommodation_city: e.target.value })}
                    placeholder="e.g. Colombo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_other" className="text-sm flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    Other
                  </Label>
                  <Input
                    id="expense_other"
                    type="number"
                    step="0.01"
                    value={formData.expense_other}
                    onChange={(e) => setFormData({ ...formData, expense_other: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
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

      {/* Daily Expenses Dialog */}
      <TurnDailyExpensesDialog
        open={isDailyExpensesOpen}
        onOpenChange={setIsDailyExpensesOpen}
        turn={turnForDailyExpenses}
        companyId={companyId}
        onExpensesUpdated={fetchTurns}
      />

      {/* View Dialog */}
      <TurnViewDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        turn={turnToView}
      />

      {/* Add Route Dialog */}
      <Dialog open={isAddRouteDialogOpen} onOpenChange={setIsAddRouteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Add New Route
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_route_name">Route Name</Label>
              <Input
                id="new_route_name"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="e.g., Colombo - Kandy"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddRouteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoute} disabled={savingRoute || !newRouteName.trim()}>
              {savingRoute ? "Adding..." : "Add Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
