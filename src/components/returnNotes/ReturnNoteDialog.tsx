import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReturnNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnNote?: any;
  existingLines?: any[];
  onSuccess: () => void;
}

interface LineItem {
  id?: string;
  item_id: string | null;
  description: string;
  unit_price: number;
  size_39: number;
  size_40: number;
  size_41: number;
  size_42: number;
  size_43: number;
  size_44: number;
  size_45: number;
  quantity: number;
  line_total: number;
}

export function ReturnNoteDialog({ open, onOpenChange, returnNote, existingLines, onSuccess }: ReturnNoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    return_note_no: "",
    return_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    reason: "",
    notes: "",
    status: "draft" as "draft" | "approved" | "paid" | "void" | "cancelled",
  });
  const [lines, setLines] = useState<LineItem[]>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchItems();
      if (returnNote) {
        setFormData({
          return_note_no: returnNote.return_note_no || "",
          return_date: returnNote.return_date || new Date().toISOString().split("T")[0],
          customer_id: returnNote.customer_id || "",
          reason: returnNote.reason || "",
          notes: returnNote.notes || "",
          status: returnNote.status || "draft",
        });
        if (existingLines && existingLines.length > 0) {
          setLines(existingLines.map(line => ({
            id: line.id,
            item_id: line.item_id,
            description: line.description,
            unit_price: line.unit_price || 0,
            size_39: line.size_39 || 0,
            size_40: line.size_40 || 0,
            size_41: line.size_41 || 0,
            size_42: line.size_42 || 0,
            size_43: line.size_43 || 0,
            size_44: line.size_44 || 0,
            size_45: line.size_45 || 0,
            quantity: line.quantity || 0,
            line_total: line.line_total || 0,
          })));
        }
      } else {
        generateReturnNoteNo();
        setLines([createEmptyLine()]);
      }
    }
  }, [open, returnNote, existingLines]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, code, name")
      .eq("contact_type", "customer")
      .is("deleted_at", null)
      .order("name");
    setCustomers(data || []);
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("id, code, name, color, sale_price")
      .is("deleted_at", null)
      .order("code");
    setItems(data || []);
  };

  const generateReturnNoteNo = async () => {
    const { data } = await supabase
      .from("return_notes")
      .select("return_note_no")
      .order("created_at", { ascending: false })
      .limit(1);

    let nextNo = "RN-0001";
    if (data && data.length > 0) {
      const lastNo = data[0].return_note_no;
      const match = lastNo.match(/RN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        nextNo = `RN-${num.toString().padStart(4, "0")}`;
      }
    }
    setFormData(prev => ({ ...prev, return_note_no: nextNo }));
  };

  const createEmptyLine = (): LineItem => ({
    item_id: null,
    description: "",
    unit_price: 0,
    size_39: 0,
    size_40: 0,
    size_41: 0,
    size_42: 0,
    size_43: 0,
    size_44: 0,
    size_45: 0,
    quantity: 0,
    line_total: 0,
  });

  const handleItemSelect = (index: number, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      const updatedLines = [...lines];
      updatedLines[index] = {
        ...updatedLines[index],
        item_id: itemId,
        description: `${item.code} - ${item.name}`,
        unit_price: item.sale_price || 0,
      };
      setLines(updatedLines);
    }
  };

  const handleSizeChange = (index: number, size: string, value: number) => {
    const updatedLines = [...lines];
    (updatedLines[index] as any)[size] = value;
    
    const line = updatedLines[index];
    const totalQty = (line.size_39 || 0) + (line.size_40 || 0) + (line.size_41 || 0) +
                     (line.size_42 || 0) + (line.size_43 || 0) + (line.size_44 || 0) + (line.size_45 || 0);
    line.quantity = totalQty;
    line.line_total = totalQty * line.unit_price;
    
    setLines(updatedLines);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updatedLines = [...lines];
    updatedLines[index].unit_price = price;
    updatedLines[index].line_total = updatedLines[index].quantity * price;
    setLines(updatedLines);
  };

  const addLine = () => {
    setLines([...lines, createEmptyLine()]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateGrandTotal = () => {
    return lines.reduce((sum, line) => sum + (line.line_total || 0), 0);
  };

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast.error("Please select a customer");
      return;
    }
    if (!formData.return_note_no) {
      toast.error("Return note number is required");
      return;
    }
    if (lines.filter(l => l.quantity > 0).length === 0) {
      toast.error("Please add at least one line item with quantity");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (!profile?.company_id) throw new Error("No company found");

      const grandTotal = calculateGrandTotal();
      const noteData = {
        company_id: profile.company_id,
        customer_id: formData.customer_id,
        return_note_no: formData.return_note_no,
        return_date: formData.return_date,
        reason: formData.reason || null,
        notes: formData.notes || null,
        status: formData.status,
        grand_total: grandTotal,
        subtotal: grandTotal,
      };

      let noteId: string;

      if (returnNote?.id) {
        const { error } = await supabase
          .from("return_notes")
          .update(noteData)
          .eq("id", returnNote.id);
        if (error) throw error;
        noteId = returnNote.id;

        await supabase.from("return_note_lines").delete().eq("return_note_id", noteId);
      } else {
        const { data, error } = await supabase
          .from("return_notes")
          .insert(noteData)
          .select()
          .single();
        if (error) throw error;
        noteId = data.id;
      }

      const lineItems = lines
        .filter(l => l.quantity > 0)
        .map((line, index) => ({
          return_note_id: noteId,
          line_no: index + 1,
          item_id: line.item_id,
          description: line.description || "Item",
          quantity: line.quantity,
          unit_price: line.unit_price,
          size_39: line.size_39 || 0,
          size_40: line.size_40 || 0,
          size_41: line.size_41 || 0,
          size_42: line.size_42 || 0,
          size_43: line.size_43 || 0,
          size_44: line.size_44 || 0,
          size_45: line.size_45 || 0,
          line_total: line.line_total,
        }));

      const { error: linesError } = await supabase.from("return_note_lines").insert(lineItems);
      if (linesError) throw linesError;

      toast.success(returnNote ? "Return note updated successfully" : "Return note created successfully");
      onSuccess();
      resetForm();
    } catch (error: any) {
      console.error("Error saving return note:", error);
      toast.error(error.message || "Failed to save return note");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      return_note_no: "",
      return_date: new Date().toISOString().split("T")[0],
      customer_id: "",
      reason: "",
      notes: "",
      status: "draft",
    });
    setLines([createEmptyLine()]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{returnNote ? "Edit Return Note" : "Create Return Note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Return Note No</Label>
              <Input
                value={formData.return_note_no}
                onChange={(e) => setFormData({ ...formData, return_note_no: e.target.value })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Customer</Label>
              <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as "draft" | "approved" | "paid" | "void" | "cancelled" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Reason for Return</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter reason for return..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />Add Line
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Item</TableHead>
                    <TableHead className="text-center w-14">39</TableHead>
                    <TableHead className="text-center w-14">40</TableHead>
                    <TableHead className="text-center w-14">41</TableHead>
                    <TableHead className="text-center w-14">42</TableHead>
                    <TableHead className="text-center w-14">43</TableHead>
                    <TableHead className="text-center w-14">44</TableHead>
                    <TableHead className="text-center w-14">45</TableHead>
                    <TableHead className="text-center w-16">Qty</TableHead>
                    <TableHead className="text-right w-24">Price</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select value={line.item_id || ""} onValueChange={(v) => handleItemSelect(index, v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.code} - {item.color || 'N/A'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {["size_39", "size_40", "size_41", "size_42", "size_43", "size_44", "size_45"].map((size) => (
                        <TableCell key={size} className="p-1">
                          <Input
                            type="number"
                            min="0"
                            value={(line as any)[size] || ""}
                            onChange={(e) => handleSizeChange(index, size, parseInt(e.target.value) || 0)}
                            className="w-14 text-center p-1"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-medium">{line.quantity}</TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          min="0"
                          value={line.unit_price || ""}
                          onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right p-1"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(line.line_total)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Grand Total:</span>
                <span>{formatCurrency(calculateGrandTotal())}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : returnNote ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}