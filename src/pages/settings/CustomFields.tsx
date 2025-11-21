import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const customFieldSchema = z.object({
  entity: z.string().min(1, "Entity is required"),
  field_key: z.string().min(1, "Field key is required"),
  label: z.string().min(1, "Label is required"),
  field_type: z.enum(["text", "number", "date", "boolean"]),
  required: z.boolean().default(false),
  active: z.boolean().default(true),
});

type CustomFieldFormData = z.infer<typeof customFieldSchema>;

export default function CustomFields() {
  const { toast } = useToast();
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string>("");

  const form = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      required: false,
      active: true,
      field_type: "text",
    },
  });

  useEffect(() => {
    fetchCompanyAndFields();
  }, []);

  const fetchCompanyAndFields = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profile?.company_id) {
      setCompanyId(profile.company_id);
      fetchCustomFields(profile.company_id);
    }
  };

  const fetchCustomFields = async (compId: string) => {
    const { data, error } = await supabase
      .from('custom_field_defs')
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
      setCustomFields(data || []);
    }
  };

  const onSubmit = async (data: CustomFieldFormData) => {
    try {
      setLoading(true);

      if (editingField) {
        const { error } = await supabase
          .from('custom_field_defs')
          .update(data)
          .eq('id', editingField.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Custom field updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('custom_field_defs')
          .insert([{
            entity: data.entity,
            field_key: data.field_key,
            label: data.label,
            field_type: data.field_type,
            required: data.required,
            active: data.active,
            company_id: companyId,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Custom field created successfully",
        });
      }

      setDialogOpen(false);
      setEditingField(null);
      form.reset();
      fetchCustomFields(companyId);
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

  const handleEdit = (field: any) => {
    setEditingField(field);
    form.reset(field);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingField(null);
    form.reset({
      required: false,
      active: true,
      field_type: "text",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tag className="h-8 w-8" />
            Custom Fields
          </h1>
          <p className="text-muted-foreground mt-2">
            Define custom fields for various entities
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Custom Field
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customFields.map((field) => (
          <Card key={field.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{field.label}</span>
                <Badge variant={field.active ? "default" : "secondary"}>
                  {field.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">Entity:</span> {field.entity}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Key:</span> {field.field_key}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Type:</span> {field.field_type}
              </div>
              {field.required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => handleEdit(field)}
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
              {editingField ? "Edit Custom Field" : "New Custom Field"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entity">Entity *</Label>
              <Input {...form.register("entity")} placeholder="invoice, customer, etc." />
              {form.formState.errors.entity && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.entity.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field_key">Field Key *</Label>
                <Input {...form.register("field_key")} placeholder="custom_field_1" />
                {form.formState.errors.field_key && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.field_key.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input {...form.register("label")} placeholder="Custom Field" />
                {form.formState.errors.label && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.label.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type">Field Type *</Label>
              <Select
                value={form.watch("field_type")}
                onValueChange={(value) => form.setValue("field_type", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch("required")}
                onCheckedChange={(checked) => form.setValue("required", checked)}
              />
              <Label>Required Field</Label>
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
