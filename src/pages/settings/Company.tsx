import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const companySchema = z.object({
  code: z.string().min(1, "Company code is required"),
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  tax_number: z.string().optional(),
  base_currency: z.string().default("LKR"),
  fiscal_year_end: z.string().default("12-31"),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function Company() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      base_currency: "LKR",
      fiscal_year_end: "12-31",
    },
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCompanies(data || []);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setLoading(true);

      if (editingCompany) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', editingCompany.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Company updated successfully",
        });
      } else {
        // Create new company
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase
          .from('companies')
          .insert([{
            code: data.code,
            name: data.name,
            address: data.address,
            phone: data.phone,
            email: data.email,
            tax_number: data.tax_number,
            base_currency: data.base_currency,
            fiscal_year_end: data.fiscal_year_end,
            created_by: user.id,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Company created successfully",
        });
      }

      setDialogOpen(false);
      setEditingCompany(null);
      form.reset();
      fetchCompanies();
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

  const handleEdit = (company: any) => {
    setEditingCompany(company);
    form.reset(company);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingCompany(null);
    form.reset({
      base_currency: "LKR",
      fiscal_year_end: "12-31",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Company Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your company information and settings
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Company
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {companies.map((company) => (
          <Card key={company.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{company.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">Code:</span> {company.code}
              </div>
              {company.address && (
                <div className="text-sm">
                  <span className="font-semibold">Address:</span> {company.address}
                </div>
              )}
              {company.phone && (
                <div className="text-sm">
                  <span className="font-semibold">Phone:</span> {company.phone}
                </div>
              )}
              {company.email && (
                <div className="text-sm">
                  <span className="font-semibold">Email:</span> {company.email}
                </div>
              )}
              {company.tax_number && (
                <div className="text-sm">
                  <span className="font-semibold">Tax Number:</span> {company.tax_number}
                </div>
              )}
              <div className="text-sm">
                <span className="font-semibold">Currency:</span> {company.base_currency}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => handleEdit(company)}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Edit Company" : "New Company"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Company Code *</Label>
                <Input {...form.register("code")} placeholder="COMP001" />
                {form.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input {...form.register("name")} placeholder="ABC Company Ltd" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea {...form.register("address")} placeholder="Company address" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input {...form.register("phone")} placeholder="+94 11 234 5678" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input {...form.register("email")} type="email" placeholder="info@company.com" />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_number">Tax Number</Label>
                <Input {...form.register("tax_number")} placeholder="123456789V" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_currency">Base Currency</Label>
                <Input {...form.register("base_currency")} placeholder="LKR" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscal_year_end">Fiscal Year End (MM-DD)</Label>
              <Input {...form.register("fiscal_year_end")} placeholder="12-31" />
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
