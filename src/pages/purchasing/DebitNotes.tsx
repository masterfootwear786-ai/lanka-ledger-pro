import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Edit, Trash2, Printer, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DebitNoteDialog } from "@/components/debitNotes/DebitNoteDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

export default function DebitNotes() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debitNotes, setDebitNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDebitNote, setSelectedDebitNote] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [debitNoteToDelete, setDebitNoteToDelete] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const handlePrintList = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Debit Notes List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Debit Notes List</h1>
          <p>Total: ${filteredDebitNotes.length} debit notes</p>
          <table>
            <thead>
              <tr>
                <th>Debit Note #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDebitNotes.map(n => `
                <tr>
                  <td>${n.debit_note_no || '-'}</td>
                  <td>${n.debit_date || '-'}</td>
                  <td>${n.supplier?.name || '-'}</td>
                  <td>${n.reason || '-'}</td>
                  <td style="text-align: right;">${n.grand_total?.toLocaleString() || '-'}</td>
                  <td>${n.status || 'draft'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDownloadListPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Debit Notes List", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${filteredDebitNotes.length} debit notes`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    const tableData = filteredDebitNotes.map(n => [
      n.debit_note_no || '-',
      n.debit_date || '-',
      n.supplier?.name || '-',
      n.reason || '-',
      n.grand_total?.toLocaleString() || '-',
      n.status || 'draft'
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Debit Note #', 'Date', 'Supplier', 'Reason', 'Amount', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save('debit-notes-list.pdf');
    toast.success("PDF downloaded successfully");
  };

  useEffect(() => {
    fetchDebitNotes();
  }, []);

  const fetchDebitNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("debit_notes")
        .select(`
          *,
          supplier:contacts(name)
        `)
        .order("debit_date", { ascending: false });
      
      if (error) throw error;
      setDebitNotes(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (debitNote: any) => {
    setSelectedDebitNote(debitNote);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!debitNoteToDelete) return;
    
    try {
      const { error } = await supabase
        .from("debit_notes")
        .delete()
        .eq("id", debitNoteToDelete.id);
      
      if (error) throw error;
      toast.success("Debit note deleted successfully");
      fetchDebitNotes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setDebitNoteToDelete(null);
    }
  };

  const filteredDebitNotes = debitNotes.filter(note =>
    note.debit_note_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('purchasing.debitNotes')}</h1>
          <p className="text-muted-foreground mt-2">Manage supplier debit notes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewDialogOpen(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadListPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => {
            setSelectedDebitNote(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Debit Note
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Debit Notes</CardTitle>
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
          <CardTitle>Debit Note List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debit Note #</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebitNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No debit notes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebitNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-mono font-medium">{note.debit_note_no}</TableCell>
                      <TableCell>{note.debit_date}</TableCell>
                      <TableCell>{note.supplier?.name || '-'}</TableCell>
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
                              setDebitNoteToDelete(note);
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

      <DebitNoteDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedDebitNote(null);
        }}
        debitNote={selectedDebitNote}
        onSuccess={fetchDebitNotes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debit Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {debitNoteToDelete?.debit_note_no}? This action cannot be undone.
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
