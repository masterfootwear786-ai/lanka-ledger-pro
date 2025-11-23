import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TemplateLine {
  id: string;
  art_no: string;
  description: string;
  color: string;
  size_39: number;
  size_40: number;
  size_41: number;
  size_42: number;
  size_43: number;
  size_44: number;
  size_45: number;
  total_pairs: number;
  unit_price: number;
  tax_rate: number;
}

interface OrderTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  onSuccess: () => void;
}

export function OrderTemplateDialog({ open, onOpenChange, template, onSuccess }: OrderTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    template_name: "",
    customer_id: "",
    notes: "",
    terms: "",
  });
  const [lines, setLines] = useState<TemplateLine[]>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      
      if (template) {
        loadTemplateData();
      } else {
        addNewLine();
      }
    } else {
      resetForm();
    }
  }, [open, template]);

  const fetchCustomers = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('company_id', profileData?.company_id)
        .eq('contact_type', 'customer')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error("Error fetching customers: " + error.message);
    }
  };

  const loadTemplateData = async () => {
    try {
      const { data: templateLines, error } = await supabase
        .from('order_template_lines')
        .select('*')
        .eq('template_id', template.id)
        .order('line_no');

      if (error) throw error;

      setFormData({
        template_name: template.template_name,
        customer_id: template.customer_id || "",
        notes: template.notes || "",
        terms: template.terms || "",
      });

      if (templateLines && templateLines.length > 0) {
        setLines(templateLines.map(line => ({
          id: line.id,
          art_no: line.art_no || "",
          description: line.description || "",
          color: line.color || "",
          size_39: Number(line.size_39),
          size_40: Number(line.size_40),
          size_41: Number(line.size_41),
          size_42: Number(line.size_42),
          size_43: Number(line.size_43),
          size_44: Number(line.size_44),
          size_45: Number(line.size_45),
          total_pairs: Number(line.size_39) + Number(line.size_40) + Number(line.size_41) + 
                      Number(line.size_42) + Number(line.size_43) + Number(line.size_44) + Number(line.size_45),
          unit_price: Number(line.unit_price),
          tax_rate: Number(line.tax_rate),
        })));
      }
    } catch (error: any) {
      toast.error("Error loading template: " + error.message);
    }
  };

  const addNewLine = () => {
    const newLine: TemplateLine = {
      id: crypto.randomUUID(),
      art_no: "",
      description: "",
      color: "",
      size_39: 0,
      size_40: 0,
      size_41: 0,
      size_42: 0,
      size_43: 0,
      size_44: 0,
      size_45: 0,
      total_pairs: 0,
      unit_price: 0,
      tax_rate: 0,
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof TemplateLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;

      const updated = { ...line, [field]: value };
      updated.total_pairs = 
        Number(updated.size_39) + Number(updated.size_40) + Number(updated.size_41) + 
        Number(updated.size_42) + Number(updated.size_43) + Number(updated.size_44) + Number(updated.size_45);

      return updated;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profileData?.company_id) {
        throw new Error("Company not found");
      }

      if (!formData.template_name.trim()) {
        throw new Error("Please enter a template name");
      }

      if (lines.length === 0 || lines.every(l => !l.art_no && l.total_pairs === 0)) {
        throw new Error("Please add at least one line item");
      }

      const templateData = {
        company_id: profileData.company_id,
        template_name: formData.template_name.trim(),
        customer_id: formData.customer_id || null,
        notes: formData.notes,
        terms: formData.terms,
      };

      let templateId: string;

      if (template) {
        // Update existing template
        const { error: templateError } = await supabase
          .from('order_templates')
          .update(templateData)
          .eq('id', template.id);

        if (templateError) throw templateError;
        templateId = template.id;

        // Delete existing lines
        const { error: deleteError } = await supabase
          .from('order_template_lines')
          .delete()
          .eq('template_id', template.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from('order_templates')
          .insert(templateData)
          .select()
          .single();

        if (templateError) throw templateError;
        templateId = newTemplate.id;
      }

      // Insert template lines
      const lineData = lines
        .filter(line => line.art_no || line.total_pairs > 0)
        .map((line, index) => ({
          template_id: templateId,
          line_no: index + 1,
          art_no: line.art_no,
          description: line.description,
          color: line.color,
          size_39: Number(line.size_39),
          size_40: Number(line.size_40),
          size_41: Number(line.size_41),
          size_42: Number(line.size_42),
          size_43: Number(line.size_43),
          size_44: Number(line.size_44),
          size_45: Number(line.size_45),
          unit_price: Number(line.unit_price),
          tax_rate: Number(line.tax_rate),
        }));

      if (lineData.length > 0) {
        const { error: linesError } = await supabase
          .from('order_template_lines')
          .insert(lineData);

        if (linesError) throw linesError;
      }

      toast.success(template ? "Template updated successfully" : "Template created successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      customer_id: "",
      notes: "",
      terms: "",
    });
    setLines([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'New Order Template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Standard Order, Weekly Order"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Default Customer (Optional)</Label>
              <Select
                value={formData.customer_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.code} - {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Template Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addNewLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Art No</TableHead>
                    <TableHead className="w-[150px]">Description</TableHead>
                    <TableHead className="w-[100px]">Color</TableHead>
                    <TableHead className="w-[70px]">39</TableHead>
                    <TableHead className="w-[70px]">40</TableHead>
                    <TableHead className="w-[70px]">41</TableHead>
                    <TableHead className="w-[70px]">42</TableHead>
                    <TableHead className="w-[70px]">43</TableHead>
                    <TableHead className="w-[70px]">44</TableHead>
                    <TableHead className="w-[70px]">45</TableHead>
                    <TableHead className="w-[80px]">Total</TableHead>
                    <TableHead className="w-[100px]">Price</TableHead>
                    <TableHead className="w-[80px]">Tax %</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Input
                          value={line.art_no}
                          onChange={(e) => updateLine(line.id, 'art_no', e.target.value)}
                          placeholder="Art No"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.color}
                          onChange={(e) => updateLine(line.id, 'color', e.target.value)}
                          placeholder="Color"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_39}
                          onChange={(e) => updateLine(line.id, 'size_39', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_40}
                          onChange={(e) => updateLine(line.id, 'size_40', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_41}
                          onChange={(e) => updateLine(line.id, 'size_41', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_42}
                          onChange={(e) => updateLine(line.id, 'size_42', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_43}
                          onChange={(e) => updateLine(line.id, 'size_43', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_44}
                          onChange={(e) => updateLine(line.id, 'size_44', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.size_45}
                          onChange={(e) => updateLine(line.id, 'size_45', e.target.value)}
                          min="0"
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {line.total_pairs}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.unit_price}
                          onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)}
                          min="0"
                          step="0.01"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.tax_rate}
                          onChange={(e) => updateLine(line.id, 'tax_rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms</Label>
              <Textarea
                id="terms"
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : template ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
