import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Fuel, UtensilsCrossed, Hotel, MoreHorizontal, Copy, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface DailyExpense {
  id?: string;
  expense_date: string;
  start_km: number;
  end_km: number;
  expense_fuel: number;
  fuel_km: number;
  km: number;
  expense_food: number;
  expense_accommodation: number;
  accommodation_city: string;
  expense_other: number;
  notes: string;
}

interface TurnDailyExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turn: {
    id: string;
    turn_no: string;
    turn_start_date: string | null;
    turn_end_date: string | null;
    turn_date: string;
    route?: string;
  } | null;
  companyId: string;
  onExpensesUpdated: () => void;
}

export function TurnDailyExpensesDialog({
  open,
  onOpenChange,
  turn,
  companyId,
  onExpensesUpdated,
}: TurnDailyExpensesDialogProps) {
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExpenseDate, setNewExpenseDate] = useState("");
  const { toast } = useToast();

  const fetchDailyExpenses = async () => {
    if (!turn) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("turn_daily_expenses")
        .select("*")
        .eq("turn_id", turn.id)
        .order("expense_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setDailyExpenses(
          data.map((d: any) => ({
            id: d.id,
            expense_date: d.expense_date,
            start_km: d.start_km || 0,
            end_km: d.end_km || 0,
            expense_fuel: d.expense_fuel || 0,
            fuel_km: d.fuel_km || 0,
            km: d.km || 0,
            expense_food: d.expense_food || 0,
            expense_accommodation: d.expense_accommodation || 0,
            accommodation_city: d.accommodation_city || "",
            expense_other: d.expense_other || 0,
            notes: d.notes || "",
          }))
        );
      } else {
        generateDateRows();
      }
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

  const generateDateRows = () => {
    if (!turn) return;
    
    const startDate = new Date(turn.turn_start_date || turn.turn_date);
    const endDate = turn.turn_end_date ? new Date(turn.turn_end_date) : startDate;
    
    const rows: DailyExpense[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      rows.push({
        expense_date: currentDate.toISOString().split("T")[0],
        start_km: 0,
        end_km: 0,
        expense_fuel: 0,
        fuel_km: 0,
        km: 0,
        expense_food: 0,
        expense_accommodation: 0,
        accommodation_city: "",
        expense_other: 0,
        notes: "",
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setDailyExpenses(rows);
  };

  useEffect(() => {
    if (open && turn) {
      fetchDailyExpenses();
      setNewExpenseDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, turn]);

  // Add new row for same date (for multiple fuel entries)
  const handleDuplicateRow = (index: number) => {
    const sourceRow = dailyExpenses[index];
    const newRow: DailyExpense = {
      expense_date: sourceRow.expense_date,
      start_km: 0,
      end_km: 0,
      expense_fuel: 0,
      fuel_km: 0,
      km: 0,
      expense_food: 0,
      expense_accommodation: 0,
      accommodation_city: "",
      expense_other: 0,
      notes: "",
    };
    
    const updated = [...dailyExpenses];
    updated.splice(index + 1, 0, newRow);
    setDailyExpenses(updated);
  };

  // Add new expense entry with specific date
  const handleAddExpenseByDate = () => {
    if (!newExpenseDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    const newRow: DailyExpense = {
      expense_date: newExpenseDate,
      start_km: 0,
      end_km: 0,
      expense_fuel: 0,
      fuel_km: 0,
      km: 0,
      expense_food: 0,
      expense_accommodation: 0,
      accommodation_city: "",
      expense_other: 0,
      notes: "",
    };

    // Insert at correct position to maintain date order
    const updated = [...dailyExpenses];
    let insertIndex = updated.findIndex(e => e.expense_date > newExpenseDate);
    if (insertIndex === -1) {
      insertIndex = updated.length;
    }
    updated.splice(insertIndex, 0, newRow);
    setDailyExpenses(updated);

    toast({
      title: "Row Added",
      description: `Expense row added for ${newExpenseDate}`,
    });
  };

  const handleAddNextDay = () => {
    const lastDate = dailyExpenses.length > 0 
      ? new Date(dailyExpenses[dailyExpenses.length - 1].expense_date)
      : new Date();
    lastDate.setDate(lastDate.getDate() + 1);
    
    setDailyExpenses([
      ...dailyExpenses,
      {
        expense_date: lastDate.toISOString().split("T")[0],
        start_km: 0,
        end_km: 0,
        expense_fuel: 0,
        fuel_km: 0,
        km: 0,
        expense_food: 0,
        expense_accommodation: 0,
        accommodation_city: "",
        expense_other: 0,
        notes: "",
      },
    ]);
  };

  const handleRemoveDay = (index: number) => {
    setDailyExpenses(dailyExpenses.filter((_, i) => i !== index));
  };

  const handleUpdateExpense = (index: number, field: keyof DailyExpense, value: string | number) => {
    const updated = [...dailyExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setDailyExpenses(updated);
  };

  const handleSave = async () => {
    if (!turn) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate new date range from expenses
      let minDate = turn.turn_start_date || turn.turn_date;
      let maxDate = turn.turn_end_date || turn.turn_date;
      
      if (dailyExpenses.length > 0) {
        const dates = dailyExpenses.map(e => e.expense_date).sort();
        minDate = dates[0];
        maxDate = dates[dates.length - 1];
      }

      // Delete existing daily expenses for this turn
      await supabase
        .from("turn_daily_expenses")
        .delete()
        .eq("turn_id", turn.id);

      // Insert new daily expenses
      if (dailyExpenses.length > 0) {
        const expensesToInsert = dailyExpenses.map((exp) => ({
          turn_id: turn.id,
          company_id: companyId,
          expense_date: exp.expense_date,
          start_km: exp.start_km || 0,
          end_km: exp.end_km || 0,
          expense_fuel: exp.expense_fuel || 0,
          fuel_km: exp.fuel_km || 0,
          km: exp.km || 0,
          expense_food: exp.expense_food || 0,
          expense_accommodation: exp.expense_accommodation || 0,
          accommodation_city: exp.accommodation_city || null,
          expense_other: exp.expense_other || 0,
          notes: exp.notes || null,
          created_by: user.id,
        }));

        const { error } = await supabase
          .from("turn_daily_expenses")
          .insert(expensesToInsert);

        if (error) throw error;
      }

      // Calculate totals and update turn (including date range)
      const totalFuel = dailyExpenses.reduce((sum, e) => sum + (e.expense_fuel || 0), 0);
      const totalKm = dailyExpenses.reduce((sum, e) => sum + (e.km || 0), 0);
      const totalFood = dailyExpenses.reduce((sum, e) => sum + (e.expense_food || 0), 0);
      const totalAccommodation = dailyExpenses.reduce((sum, e) => sum + (e.expense_accommodation || 0), 0);
      const totalOther = dailyExpenses.reduce((sum, e) => sum + (e.expense_other || 0), 0);

      await supabase
        .from("turns")
        .update({
          expense_fuel: totalFuel,
          km: totalKm,
          expense_food: totalFood,
          expense_accommodation: totalAccommodation,
          expense_other: totalOther,
          turn_start_date: minDate,
          turn_end_date: maxDate,
        })
        .eq("id", turn.id);

      toast({ title: "Success", description: "Daily expenses saved successfully" });
      onExpensesUpdated();
      onOpenChange(false);
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

  const totals = {
    fuel: dailyExpenses.reduce((sum, e) => sum + (e.expense_fuel || 0), 0),
    km: dailyExpenses.reduce((sum, e) => sum + (e.km || 0), 0),
    dayKm: dailyExpenses.reduce((sum, e) => sum + ((e.end_km || 0) - (e.start_km || 0)), 0),
    food: dailyExpenses.reduce((sum, e) => sum + (e.expense_food || 0), 0),
    accommodation: dailyExpenses.reduce((sum, e) => sum + (e.expense_accommodation || 0), 0),
    other: dailyExpenses.reduce((sum, e) => sum + (e.expense_other || 0), 0),
  };

  const grandTotal = totals.fuel + totals.food + totals.accommodation + totals.other;
  const totalDays = new Set(dailyExpenses.map(e => e.expense_date)).size;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-full p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-6 w-6" />
              Daily Expenses - {turn?.turn_no}
              {turn?.route && <span className="text-muted-foreground font-normal text-base">({turn.route})</span>}
            </SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-3">
              <div className="text-xs text-primary">Total KM</div>
              <div className="text-lg font-bold text-primary">
                {totals.dayKm.toLocaleString()} km
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <CardContent className="p-3">
              <div className="text-xs text-amber-700 dark:text-amber-300">Total Fuel</div>
              <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                {totals.fuel.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
            <CardContent className="p-3">
              <div className="text-xs text-orange-700 dark:text-orange-300">Total Food</div>
              <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {totals.food.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
            <CardContent className="p-3">
              <div className="text-xs text-purple-700 dark:text-purple-300">Total Accommodation</div>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {totals.accommodation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 dark:bg-slate-950/30 border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-slate-700 dark:text-slate-300">Total Other</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {totals.other.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-3">
              <div className="text-xs text-primary">Grand Total ({totalDays} days)</div>
              <div className="text-lg font-bold text-primary">
                {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Expense by Date */}
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Add Expense:</span>
          <Input
            type="date"
            value={newExpenseDate}
            onChange={(e) => setNewExpenseDate(e.target.value)}
            className="w-40 h-8"
          />
          <Button variant="outline" size="sm" onClick={handleAddExpenseByDate}>
            <Plus className="mr-1 h-4 w-4" />
            Add for Date
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddNextDay}>
            <Plus className="mr-1 h-4 w-4" />
            Add Next Day
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="text-right w-[80px]">Start KM</TableHead>
                  <TableHead className="text-right w-[80px]">End KM</TableHead>
                  <TableHead className="text-right w-[80px] bg-primary/10">Day KM</TableHead>
                  <TableHead className="text-right w-[100px]">
                    <span className="flex items-center justify-end gap-1">
                      <Fuel className="h-4 w-4 text-amber-500" /> Fuel
                    </span>
                  </TableHead>
                  <TableHead className="text-right w-[80px]">Fuel KM</TableHead>
                  <TableHead className="text-right w-[80px] bg-amber-50 dark:bg-amber-950/30">Fuel Trip</TableHead>
                  <TableHead className="text-right w-[100px]">
                    <span className="flex items-center justify-end gap-1">
                      <UtensilsCrossed className="h-4 w-4 text-orange-500" /> Food
                    </span>
                  </TableHead>
                  <TableHead className="text-right w-[100px]">
                    <span className="flex items-center justify-end gap-1">
                      <Hotel className="h-4 w-4 text-purple-500" /> Accom.
                    </span>
                  </TableHead>
                  <TableHead className="w-[100px]">City</TableHead>
                  <TableHead className="text-right w-[100px]">
                    <span className="flex items-center justify-end gap-1">
                      <MoreHorizontal className="h-4 w-4" /> Other
                    </span>
                  </TableHead>
                  <TableHead className="w-[150px]">Notes</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyExpenses.map((expense, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="date"
                        value={expense.expense_date}
                        onChange={(e) => handleUpdateExpense(index, "expense_date", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.start_km || ""}
                        onChange={(e) => handleUpdateExpense(index, "start_km", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.end_km || ""}
                        onChange={(e) => handleUpdateExpense(index, "end_km", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right bg-primary/5 font-semibold">
                      {((expense.end_km || 0) - (expense.start_km || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.expense_fuel || ""}
                        onChange={(e) => handleUpdateExpense(index, "expense_fuel", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        value={expense.fuel_km || ""}
                        onChange={(e) => handleUpdateExpense(index, "fuel_km", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right bg-amber-50 dark:bg-amber-950/30 font-semibold text-amber-700 dark:text-amber-300">
                      {(() => {
                        if (!expense.fuel_km || expense.fuel_km === 0) return '-';
                        // Find previous fuel entry with fuel_km > 0
                        let prevFuelKm = 0;
                        for (let i = index - 1; i >= 0; i--) {
                          if (dailyExpenses[i].fuel_km && dailyExpenses[i].fuel_km > 0) {
                            prevFuelKm = dailyExpenses[i].fuel_km;
                            break;
                          }
                        }
                        if (prevFuelKm === 0) return '-';
                        return (expense.fuel_km - prevFuelKm).toLocaleString() + ' km';
                      })()}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.expense_food || ""}
                        onChange={(e) => handleUpdateExpense(index, "expense_food", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.expense_accommodation || ""}
                        onChange={(e) => handleUpdateExpense(index, "expense_accommodation", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={expense.accommodation_city}
                        onChange={(e) => handleUpdateExpense(index, "accommodation_city", e.target.value)}
                        placeholder="City"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.expense_other || ""}
                        onChange={(e) => handleUpdateExpense(index, "expense_other", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={expense.notes}
                        onChange={(e) => handleUpdateExpense(index, "notes", e.target.value)}
                        placeholder="Station, location..."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateRow(index)}
                          className="h-7 w-7"
                          title="Add another entry for same date"
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDay(index)}
                          className="h-7 w-7"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total ({totalDays} days)</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right bg-primary/10 font-bold">{totals.dayKm.toLocaleString()} km</TableCell>
                  <TableCell className="text-right">{totals.fuel.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right bg-amber-50 dark:bg-amber-950/30 font-bold text-amber-700 dark:text-amber-300">
                    {(() => {
                      const fuelEntries = dailyExpenses.filter(e => e.fuel_km && e.fuel_km > 0).map(e => e.fuel_km);
                      if (fuelEntries.length < 2) return '-';
                      const totalFuelKm = Math.max(...fuelEntries) - Math.min(...fuelEntries);
                      return totalFuelKm.toLocaleString() + ' km';
                    })()}
                  </TableCell>
                  <TableCell className="text-right">{totals.food.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{totals.accommodation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{totals.other.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        </div>

        <div className="flex justify-end items-center gap-4 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
