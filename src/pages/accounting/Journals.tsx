import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { JournalDialog } from "@/components/accounting/JournalDialog";
import { JournalViewDialog } from "@/components/accounting/JournalViewDialog";

export default function Journals() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState<any>(null);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewJournal, setViewJournal] = useState<any>(null);

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .order('journal_date', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
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

  const handleDeleteRequest = (journal: any) => {
    setJournalToDelete(journal);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!journalToDelete) return;

    try {
      // First delete journal lines
      const { error: linesError } = await supabase
        .from('journal_lines')
        .delete()
        .eq('journal_id', journalToDelete.id);

      if (linesError) {
        console.error('Delete lines error:', linesError);
        throw linesError;
      }

      // Then delete the journal
      const { error } = await supabase
        .from('journals')
        .delete()
        .eq('id', journalToDelete.id);

      if (error) {
        console.error('Delete journal error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Journal entry deleted successfully",
      });

      setDeleteDialogOpen(false);
      setJournalToDelete(null);
      fetchJournals();
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete journal entry",
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setJournalToDelete(null);
    }
  };

  const filteredJournals = journals.filter(journal =>
    journal.journal_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    journal.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.journals')}</h1>
          <p className="text-muted-foreground mt-2">Manage journal entries</p>
        </div>
        <Button onClick={() => {
          setSelectedJournal(null);
          setJournalDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Journal Entry
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Journals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entry List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Journal #</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredJournals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No journal entries found</TableCell>
                </TableRow>
              ) : (
                filteredJournals.map((journal) => (
                  <TableRow key={journal.id}>
                    <TableCell className="font-mono font-medium">{journal.journal_no}</TableCell>
                    <TableCell>{new Date(journal.journal_date).toLocaleDateString()}</TableCell>
                    <TableCell>{journal.description}</TableCell>
                    <TableCell>
                      <Badge variant={journal.posted ? "default" : "secondary"}>
                        {journal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setViewJournal(journal);
                          setViewDialogOpen(true);
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedJournal(journal);
                          setJournalDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRequest(journal)}>
                          <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete journal entry {journalToDelete?.journal_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <JournalDialog
        open={journalDialogOpen}
        onOpenChange={setJournalDialogOpen}
        journal={selectedJournal}
        onSuccess={fetchJournals}
      />

      <JournalViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        journal={viewJournal}
      />
    </div>
  );
}
