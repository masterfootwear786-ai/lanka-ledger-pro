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
import { useToast } from "@/hooks/use-toast";

interface JournalLine {
  id?: string;
  line_no: number;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal?: any;
  onSuccess: () => void;
}

export function JournalDialog({ open, onOpenChange, journal, onSuccess }: JournalDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journalNo, setJournalNo] = useState("");
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { line_no: 1, account_id: "", description: "", debit: 0, credit: 0 }
  ]);

  useEffect(() => {
    if (open) {
      fetchAccounts();
      if (journal) {
        loadJournalData();
      } else {
        generateJournalNo();
      }
    }
  }, [open, journal]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('active', true)
      .order('code');
    setAccounts(data || []);
  };

  const generateJournalNo = async () => {
    const { data } = await supabase
      .from('journals')
      .select('journal_no')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const lastNo = data[0].journal_no;
      const match = lastNo.match(/JE-(\d+)/);
      if (match) {
        const nextNo = parseInt(match[1]) + 1;
        setJournalNo(`JE-${String(nextNo).padStart(3, '0')}`);
      }
    } else {
      setJournalNo('JE-001');
    }
  };

  const loadJournalData = async () => {
    setJournalNo(journal.journal_no);
    setJournalDate(journal.journal_date);
    setDescription(journal.description || "");

    const { data: journalLines } = await supabase
      .from('journal_lines')
      .select('*')
      .eq('journal_id', journal.id)
      .order('line_no');

    if (journalLines) {
      setLines(journalLines.map(line => ({
        id: line.id,
        line_no: line.line_no,
        account_id: line.account_id,
        description: line.description || "",
        debit: line.debit || 0,
        credit: line.credit || 0
      })));
    }
  };

  const addLine = () => {
    setLines([...lines, {
      line_no: lines.length + 1,
      account_id: "",
      description: "",
      debit: 0,
      credit: 0
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const calculateTotals = () => {
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(String(line.debit)) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(String(line.credit)) || 0), 0);
    return { totalDebit, totalCredit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { totalDebit, totalCredit } = calculateTotals();
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast({
        title: "Error",
        description: "Debits and credits must be balanced",
        variant: "destructive",
      });
      return;
    }

    if (lines.some(line => !line.account_id)) {
      toast({
        title: "Error",
        description: "Please select an account for all lines",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) {
        throw new Error("Company not found");
      }

      if (journal) {
        // Update existing journal
        const { error: journalError } = await supabase
          .from('journals')
          .update({
            journal_date: journalDate,
            description: description,
            updated_at: new Date().toISOString()
          })
          .eq('id', journal.id);

        if (journalError) throw journalError;

        // Delete existing lines and insert new ones
        await supabase.from('journal_lines').delete().eq('journal_id', journal.id);

        const { error: linesError } = await supabase
          .from('journal_lines')
          .insert(lines.map(line => ({
            journal_id: journal.id,
            line_no: line.line_no,
            account_id: line.account_id,
            description: line.description,
            debit: line.debit,
            credit: line.credit
          })));

        if (linesError) throw linesError;

        toast({
          title: "Success",
          description: "Journal entry updated successfully",
        });
      } else {
        // Create new journal
        const { data: newJournal, error: journalError } = await supabase
          .from('journals')
          .insert({
            company_id: profile.company_id,
            journal_no: journalNo,
            journal_date: journalDate,
            description: description,
            status: 'draft'
          })
          .select()
          .single();

        if (journalError) throw journalError;

        const { error: linesError } = await supabase
          .from('journal_lines')
          .insert(lines.map(line => ({
            journal_id: newJournal.id,
            line_no: line.line_no,
            account_id: line.account_id,
            description: line.description,
            debit: line.debit,
            credit: line.credit
          })));

        if (linesError) throw linesError;

        toast({
          title: "Success",
          description: "Journal entry created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
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

  const resetForm = () => {
    setJournalNo("");
    setJournalDate(new Date().toISOString().split('T')[0]);
    setDescription("");
    setLines([{ line_no: 1, account_id: "", description: "", debit: 0, credit: 0 }]);
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{journal ? 'Edit' : 'Create'} Journal Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Journal #</Label>
              <Input value={journalNo} disabled />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
                required
              />
            </div>
            <div className="col-span-1">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Journal description"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Debit</TableHead>
                  <TableHead className="w-[120px]">Credit</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={line.account_id}
                        onValueChange={(value) => updateLine(index, 'account_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        placeholder="Line description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={addLine}>
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
            
            <div className="flex gap-8 items-center">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Debit</div>
                <div className="font-semibold">{totalDebit.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Credit</div>
                <div className="font-semibold">{totalCredit.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Difference</div>
                <div className={`font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(totalDebit - totalCredit).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isBalanced}>
              {loading ? "Saving..." : (journal ? "Update" : "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
