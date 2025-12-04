import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, Fuel, UtensilsCrossed, Hotel, MoreHorizontal, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DailyExpense {
  id?: string;
  expense_date: string;
  expense_fuel: number;
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
          data.map((d) => ({
            id: d.id,
            expense_date: d.expense_date,
            expense_fuel: d.expense_fuel || 0,
            km: d.km || 0,
            expense_food: d.expense_food || 0,
            expense_accommodation: d.expense_accommodation || 0,
            accommodation_city: d.accommodation_city || "",
            expense_other: d.expense_other || 0,
            notes: d.notes || "",
          }))
        );
      } else {
        // Generate empty rows for date range
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
        expense_fuel: 0,
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
    }
  }, [open, turn]);

  const handleAddDay = () => {
    const lastDate = dailyExpenses.length > 0 
      ? new Date(dailyExpenses[dailyExpenses.length - 1].expense_date)
      : new Date();
    lastDate.setDate(lastDate.getDate() + 1);
    
    setDailyExpenses([
      ...dailyExpenses,
      {
        expense_date: lastDate.toISOString().split("T")[0],
        expense_fuel: 0,
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
          expense_fuel: exp.expense_fuel || 0,
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

      // Calculate totals and update turn
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
    food: dailyExpenses.reduce((sum, e) => sum + (e.expense_food || 0), 0),
    accommodation: dailyExpenses.reduce((sum, e) => sum + (e.expense_accommodation || 0), 0),
    other: dailyExpenses.reduce((sum, e) => sum + (e.expense_other || 0), 0),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Expenses - {turn?.turn_no}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="text-right w-[100px]">
                    <span className="flex items-center justify-end gap-1">
                      <Fuel className="h-4 w-4 text-amber-500" /> Fuel
                    </span>
                  </TableHead>
                  <TableHead className="text-right w-[80px]">
                    <span className="flex items-center justify-end gap-1">
                      <MapPin className="h-4 w-4" /> KM
                    </span>
                  </TableHead>
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
                  <TableHead className="w-[50px]"></TableHead>
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
                        value={expense.expense_fuel || ""}
                        onChange={(e) => handleUpdateExpense(index, "expense_fuel", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={expense.km || ""}
                        onChange={(e) => handleUpdateExpense(index, "km", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-8 text-sm text-right"
                      />
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDay(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{totals.fuel.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{totals.km.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{totals.food.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{totals.accommodation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{totals.other.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleAddDay}>
            <Plus className="mr-2 h-4 w-4" />
            Add Day
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
