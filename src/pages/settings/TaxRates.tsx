import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const taxRateSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  rate_percent: z.number().min(0).max(100),
  is_inclusive: z.boolean().default(false),
  active: z.boolean().default(true),
});

type TaxRateFormData = z.infer<typeof taxRateSchema>;

export default function TaxRates() {
  const { toast } = useToast();
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string>("");

  const form = useForm<TaxRateFormData>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: {
      is_inclusive: false,
      active: true,
      rate_percent: 0,
    },
  });

  useEffect(() => {
    fetchCompanyAndTaxRates();
  }, []);

  const fetchCompanyAndTaxRates = async () => {
    // Get user's company
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profile?.company_id) {
      setCompanyId(profile.company_id);
      fetchTaxRates(profile.company_id);
    }
  };

  const fetchTaxRates = async (compId: string) => {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('company_id', compId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTaxRates(data || []);
    }
  };

  const onSubmit = async (data: TaxRateFormData) => {
    try {
      setLoading(true);

      if (editingRate) {
        const { error } = await supabase
          .from('tax_rates')
          .update(data)
          .eq('id', editingRate.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Tax rate updated successfully",
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase
          .from('tax_rates')
          .insert([{
            code: data.code,
            name: data.name,
            rate_percent: data.rate_percent,
            is_inclusive: data.is_inclusive,
            active: data.active,
            company_id: companyId,
            created_by: user.id,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Tax rate created successfully",
        });
      }

      setDialogOpen(false);
      setEditingRate(null);
      form.reset();
      fetchTaxRates(companyId);
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

  const handleEdit = (rate: any) => {
    setEditingRate(rate);
    form.reset(rate);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingRate(null);
    form.reset({
      is_inclusive: false,
      active: true,
      rate_percent: 0,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Tax Rates
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure tax rates for your transactions
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Tax Rate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {taxRates.map((rate) => (
          <Card key={rate.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{rate.name}</span>
                <span className={rate.active ? "text-green-600" : "text-muted-foreground"}>
                  {rate.active ? "Active" : "Inactive"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">Code:</span> {rate.code}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Rate:</span> {rate.rate_percent}%
              </div>
              <div className="text-sm">
                <span className="font-semibold">Type:</span>{" "}
                {rate.is_inclusive ? "Inclusive" : "Exclusive"}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => handleEdit(rate)}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Tax Rate" : "New Tax Rate"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input {...form.register("code")} placeholder="VAT" />
                {form.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input {...form.register("name")} placeholder="Value Added Tax" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate_percent">Rate (%) *</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("rate_percent", { valueAsNumber: true })}
                placeholder="15"
              />
              {form.formState.errors.rate_percent && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.rate_percent.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch("is_inclusive")}
                onCheckedChange={(checked) => form.setValue("is_inclusive", checked)}
              />
              <Label>Tax Inclusive</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch("active")}
                onCheckedChange={(checked) => form.setValue("active", checked)}
              />
              <Label>Active</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
