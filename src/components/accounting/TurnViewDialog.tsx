import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Truck, MapPin, Fuel, UtensilsCrossed, Hotel, MoreHorizontal, User, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TurnViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turn: any;
}

export function TurnViewDialog({ open, onOpenChange, turn }: TurnViewDialogProps) {
  if (!turn) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Turn Details - {turn.turn_no}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Turn No</Label>
              <p className="font-mono font-semibold">{turn.turn_no}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Vehicle Number</Label>
              <p className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                {turn.vehicle_number}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Start Date</Label>
              <p>{turn.turn_start_date ? new Date(turn.turn_start_date).toLocaleDateString() : new Date(turn.turn_date).toLocaleDateString()}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">End Date</Label>
              <p>{turn.turn_end_date ? new Date(turn.turn_end_date).toLocaleDateString() : '-'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Driver</Label>
              <p className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {turn.driver || '-'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Sales Rep(s)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-4 w-4 text-muted-foreground" />
                {turn.sales_reps && turn.sales_reps.length > 0 ? (
                  turn.sales_reps.map((rep: string, index: number) => (
                    <Badge key={index} variant="secondary">{rep}</Badge>
                  ))
                ) : '-'}
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-muted-foreground">Route</Label>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {turn.route || '-'}
              </p>
            </div>
          </div>

          {/* Expense Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Fuel className="h-4 w-4" />
                  Fuel
                </div>
                <p className="text-lg font-bold text-amber-600">
                  {(turn.expense_fuel || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {turn.km > 0 && (
                  <p className="text-xs text-muted-foreground">{turn.km} km</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <UtensilsCrossed className="h-4 w-4" />
                  Food
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {(turn.expense_food || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Hotel className="h-4 w-4" />
                  Accommodation
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {(turn.expense_accommodation || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {turn.accommodation_city && (
                  <p className="text-xs text-muted-foreground">{turn.accommodation_city}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-gray-500">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MoreHorizontal className="h-4 w-4" />
                  Other
                </div>
                <p className="text-lg font-bold text-gray-600">
                  {(turn.expense_other || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Total */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total Expenses</span>
                <span className="text-2xl font-bold text-primary">
                  {(turn.expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {turn.notes && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Notes</Label>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{turn.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
