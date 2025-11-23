import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditNoteDialog } from "@/components/creditNotes/CreditNoteDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CreditNotes() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [creditNoteToDelete, setCreditNoteToDelete] = useState<any>(null);

  useEffect(() => {
    fetchCreditNotes();
  }, []);

  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("credit_notes")
        .select(`
          *,
          customer:contacts(name)
        `)
        .order("credit_date", { ascending: false });
      
      if (error) throw error;
      setCreditNotes(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (creditNote: any) => {
    setSelectedCreditNote(creditNote);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!creditNoteToDelete) return;
    
    try {
      const { error } = await supabase
        .from("credit_notes")
        .delete()
        .eq("id", creditNoteToDelete.id);
      
      if (error) throw error;
      toast.success("Credit note deleted successfully");
      fetchCreditNotes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setCreditNoteToDelete(null);
    }
  };

  const filteredCreditNotes = creditNotes.filter(note =>
    note.credit_note_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('sales.creditNotes')}</h1>
          <p className="text-muted-foreground mt-2">Manage customer credit notes</p>
        </div>
        <Button onClick={() => {
          setSelectedCreditNote(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Credit Note
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Credit Notes</CardTitle>
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
          <CardTitle>Credit Note List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit Note #</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCreditNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No credit notes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCreditNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-mono font-medium">{note.credit_note_no}</TableCell>
                      <TableCell>{note.credit_date}</TableCell>
                      <TableCell>{note.customer?.name || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{note.reason || '-'}</TableCell>
                      <TableCell className="text-right">
                        {note.grand_total?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={note.status === "approved" ? "default" : "secondary"}>
                          {note.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(note)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setCreditNoteToDelete(note);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreditNoteDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedCreditNote(null);
        }}
        creditNote={selectedCreditNote}
        onSuccess={fetchCreditNotes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {creditNoteToDelete?.credit_note_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
