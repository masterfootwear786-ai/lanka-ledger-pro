import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Edit, Trash2, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { PasswordPromptDialog } from "@/components/PasswordPromptDialog";
import { useActionPassword } from "@/hooks/useActionPassword";
import { useToast } from "@/hooks/use-toast";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReturnNoteDialog } from "@/components/returnNotes/ReturnNoteDialog";

type StatusFilter = "all" | "draft" | "approved";

export default function ReturnNotes() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [returnNotes, setReturnNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<any>(null);
  const [noteLines, setNoteLines] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useActionPassword('sales');

  useEffect(() => {
    fetchReturnNotes();
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: profile } = await supabase.from('profiles').select('company_id').single();
      if (profile?.company_id) {
        const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
        setCompanyData(company);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const fetchReturnNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("return_notes")
        .select(`*, customer:contacts(name, area, phone)`)
        .is('deleted_at', null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReturnNotes(data || []);
    } catch (error) {
      console.error("Error fetching return notes:", error);
      toast({ title: "Error", description: "Failed to load return notes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500";
      case "draft": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredNotes = returnNotes.filter(note => {
    const matchesSearch = 
      note.return_note_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = async (note: any) => {
    setSelectedNote(note);
    try {
      const { data: lines } = await supabase
        .from("return_note_lines")
        .select(`*, item:items(code, color, name)`)
        .eq("return_note_id", note.id)
        .order("line_no");
      setNoteLines(lines || []);
    } catch (error) {
      console.error("Error fetching lines:", error);
    }
    setViewDialogOpen(true);
  };

  const handleEdit = async (note: any) => {
    setSelectedNote(note);
    try {
      const { data: lines } = await supabase
        .from("return_note_lines")
        .select(`*, item:items(code, color, name)`)
        .eq("return_note_id", note.id)
        .order("line_no");
      setNoteLines(lines || []);
    } catch (error) {
      console.error("Error fetching lines:", error);
    }
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (note: any) => {
    setNoteToDelete(note);
    await requirePassword(() => {
      setDeleteDialogOpen(true);
    });
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("return_notes")
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id || null
        })
        .eq("id", noteToDelete.id);

      if (error) throw error;
      toast({ title: "Success", description: "Return note moved to trash." });
      fetchReturnNotes();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Error", description: "Failed to delete return note.", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const handlePasswordSuccess = () => {
    setIsPasswordDialogOpen(false);
    setDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedNote(null);
    setNoteLines([]);
    setEditMode(false);
    setDialogOpen(true);
  };

  const handlePrint = () => {
    if (!selectedNote) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const groupedLines = noteLines.reduce((acc: any[], line: any) => {
      const artNo = line.item?.code || line.description;
      const color = line.item?.color || '';
      const key = `${artNo}-${color}`;
      const existing = acc.find(l => `${l.item?.code || l.description}-${l.item?.color || ''}` === key);
      if (existing) {
        existing.size_39 = (existing.size_39 || 0) + (line.size_39 || 0);
        existing.size_40 = (existing.size_40 || 0) + (line.size_40 || 0);
        existing.size_41 = (existing.size_41 || 0) + (line.size_41 || 0);
        existing.size_42 = (existing.size_42 || 0) + (line.size_42 || 0);
        existing.size_43 = (existing.size_43 || 0) + (line.size_43 || 0);
        existing.size_44 = (existing.size_44 || 0) + (line.size_44 || 0);
        existing.size_45 = (existing.size_45 || 0) + (line.size_45 || 0);
        existing.quantity = (existing.quantity || 0) + (line.quantity || 0);
        existing.line_total = (existing.line_total || 0) + (line.line_total || 0);
      } else {
        acc.push({ ...line });
      }
      return acc;
    }, []);

    printWindow.document.write(`
      <html>
        <head>
          <title>Return Note - ${selectedNote.return_note_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-left { display: flex; align-items: flex-start; gap: 15px; }
            .company-logo { width: 60px; height: 60px; object-fit: contain; }
            .company-info h1 { margin: 0 0 5px 0; font-size: 24px; }
            .company-info p { margin: 2px 0; font-size: 12px; color: #666; }
            .document-info { text-align: right; }
            .document-info h2 { margin: 0 0 10px 0; color: #d32f2f; font-size: 20px; }
            .customer-section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 4px; }
            .customer-section h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #333; color: white; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; text-align: right; }
            .totals table { width: 300px; margin-left: auto; }
            .grand-total { font-size: 16px; font-weight: bold; background: #f5f5f5; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 80px; padding-top: 20px; }
            .signature-box { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-left">
              ${companyData?.logo_url ? `<img src="${companyData.logo_url}" alt="Company Logo" class="company-logo" />` : ''}
              <div class="company-info">
                <h1>${companyData?.name || 'Company Name'}</h1>
                <p>${companyData?.address || ''}</p>
                <p>Tel: ${companyData?.phone || ''} | Email: ${companyData?.email || ''}</p>
              </div>
            </div>
            <div class="document-info">
              <h2>RETURN NOTE</h2>
              <p><strong>No:</strong> ${selectedNote.return_note_no}</p>
              <p><strong>Date:</strong> ${formatDate(selectedNote.return_date)}</p>
            </div>
          </div>
          <div class="customer-section">
            <h3>Customer Details</h3>
            <p><strong>${selectedNote.customer?.name || ''}</strong></p>
            <p>${selectedNote.customer?.area || ''}</p>
            <p>Phone: ${selectedNote.customer?.phone || ''}</p>
          </div>
          ${selectedNote.reason ? `<p><strong>Reason:</strong> ${selectedNote.reason}</p>` : ''}
          <table>
            <thead>
              <tr>
                <th class="text-left">Art No</th>
                <th class="text-left">Color</th>
                <th>39</th><th>40</th><th>41</th><th>42</th><th>43</th><th>44</th><th>45</th>
                <th>Total Prs</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${groupedLines.map((line: any) => `
                <tr>
                  <td class="text-left">${line.item?.code || line.description || ''}</td>
                  <td class="text-left">${line.item?.color || ''}</td>
                  <td>${line.size_39 || '-'}</td>
                  <td>${line.size_40 || '-'}</td>
                  <td>${line.size_41 || '-'}</td>
                  <td>${line.size_42 || '-'}</td>
                  <td>${line.size_43 || '-'}</td>
                  <td>${line.size_44 || '-'}</td>
                  <td>${line.size_45 || '-'}</td>
                  <td>${line.quantity || 0}</td>
                  <td class="text-right">${formatCurrency(line.unit_price || 0)}</td>
                  <td class="text-right">${formatCurrency(line.line_total || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <table>
              <tr class="grand-total"><td>Grand Total</td><td class="text-right">${formatCurrency(selectedNote.grand_total || 0)}</td></tr>
            </table>
          </div>
          ${selectedNote.notes ? `<p><strong>Notes:</strong> ${selectedNote.notes}</p>` : ''}
          <div class="signature-section">
            <div class="signature-box"><div class="signature-line">Customer Signature</div></div>
            <div class="signature-box"><div class="signature-line">Sales Rep Signature</div></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    if (!selectedNote) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    let headerStartX = 14;
    
    // Add company logo if available
    if (companyData?.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            doc.addImage(img, "PNG", 14, 12, 20, 20);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = companyData.logo_url;
        });
        headerStartX = 38;
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    }
    
    // Company Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyData?.name || "Company Name", headerStartX, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companyData?.address || "", headerStartX, 27);
    doc.text(`Tel: ${companyData?.phone || ""} | Email: ${companyData?.email || ""}`, headerStartX, 32);
    
    // Return Note Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(211, 47, 47);
    doc.text("RETURN NOTE", pageWidth - 14, 20, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`No: ${selectedNote.return_note_no}`, pageWidth - 14, 27, { align: "right" });
    doc.text(`Date: ${formatDate(selectedNote.return_date)}`, pageWidth - 14, 32, { align: "right" });
    
    // Line under header
    doc.setLineWidth(0.5);
    doc.line(14, 38, pageWidth - 14, 38);
    
    // Customer Section
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 42, pageWidth - 28, 25, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Details", 18, 50);
    doc.setFont("helvetica", "normal");
    doc.text(selectedNote.customer?.name || "", 18, 57);
    doc.text(selectedNote.customer?.area || "", 18, 62);
    
    let yPos = 75;
    
    // Reason
    if (selectedNote.reason) {
      doc.setFont("helvetica", "bold");
      doc.text("Reason: ", 14, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(selectedNote.reason, 35, yPos);
      yPos += 10;
    }
    
    // Group lines
    const groupedLines = noteLines.reduce((acc: any[], line: any) => {
      const key = `${line.item?.code || line.description}-${line.item?.color || ''}`;
      const existing = acc.find(l => `${l.item?.code || l.description}-${l.item?.color || ''}` === key);
      if (existing) {
        existing.size_39 = (existing.size_39 || 0) + (line.size_39 || 0);
        existing.size_40 = (existing.size_40 || 0) + (line.size_40 || 0);
        existing.size_41 = (existing.size_41 || 0) + (line.size_41 || 0);
        existing.size_42 = (existing.size_42 || 0) + (line.size_42 || 0);
        existing.size_43 = (existing.size_43 || 0) + (line.size_43 || 0);
        existing.size_44 = (existing.size_44 || 0) + (line.size_44 || 0);
        existing.size_45 = (existing.size_45 || 0) + (line.size_45 || 0);
        existing.quantity = (existing.quantity || 0) + (line.quantity || 0);
        existing.line_total = (existing.line_total || 0) + (line.line_total || 0);
      } else {
        acc.push({ ...line });
      }
      return acc;
    }, []);
    
    // Table
    const tableData = groupedLines.map((line: any) => [
      line.item?.code || line.description || "",
      line.item?.color || "",
      line.size_39 || "-",
      line.size_40 || "-",
      line.size_41 || "-",
      line.size_42 || "-",
      line.size_43 || "-",
      line.size_44 || "-",
      line.size_45 || "-",
      line.quantity || 0,
      formatCurrency(line.unit_price || 0),
      formatCurrency(line.line_total || 0),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["Art No", "Color", "39", "40", "41", "42", "43", "44", "45", "Qty", "Price", "Total"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [51, 51, 51], textColor: 255 },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "left" },
        10: { halign: "right" },
        11: { halign: "right" },
      },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Grand Total
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Grand Total:", pageWidth - 70, finalY);
    doc.text(formatCurrency(selectedNote.grand_total || 0), pageWidth - 14, finalY, { align: "right" });
    
    // Notes
    if (selectedNote.notes) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 14, finalY + 15);
      doc.setFont("helvetica", "normal");
      doc.text(selectedNote.notes, 14, finalY + 22);
    }
    
    // Signatures
    const sigY = finalY + 50;
    doc.setFontSize(10);
    doc.line(14, sigY, 80, sigY);
    doc.text("Customer Signature", 30, sigY + 7);
    doc.line(pageWidth - 80, sigY, pageWidth - 14, sigY);
    doc.text("Sales Rep Signature", pageWidth - 65, sigY + 7);
    
    doc.save(`ReturnNote-${selectedNote.return_note_no}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Return Notes</h1>
        <Button onClick={handleAddNew}><Plus className="h-4 w-4 mr-2" />Add Return Note</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return Notes List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by return note no or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return Note No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.return_note_no}</TableCell>
                    <TableCell>{formatDate(note.return_date)}</TableCell>
                    <TableCell>{note.customer?.name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{note.reason || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(note.grand_total || 0)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(note.status)}>{note.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(note)}>
                            <Eye className="h-4 w-4 mr-2" />View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(note)}>
                            <Edit className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(note)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredNotes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No return notes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Return Note - {selectedNote?.return_note_no}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedNote.customer?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(selectedNote.return_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedNote.status)}>{selectedNote.status}</Badge>
                </div>
                {selectedNote.reason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedNote.reason}</p>
                  </div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Art No</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-center">39</TableHead>
                    <TableHead className="text-center">40</TableHead>
                    <TableHead className="text-center">41</TableHead>
                    <TableHead className="text-center">42</TableHead>
                    <TableHead className="text-center">43</TableHead>
                    <TableHead className="text-center">44</TableHead>
                    <TableHead className="text-center">45</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noteLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.item?.code || line.description}</TableCell>
                      <TableCell>{line.item?.color || '-'}</TableCell>
                      <TableCell className="text-center">{line.size_39 || '-'}</TableCell>
                      <TableCell className="text-center">{line.size_40 || '-'}</TableCell>
                      <TableCell className="text-center">{line.size_41 || '-'}</TableCell>
                      <TableCell className="text-center">{line.size_42 || '-'}</TableCell>
                      <TableCell className="text-center">{line.size_43 || '-'}</TableCell>
                      <TableCell className="text-center">{line.size_44 || '-'}</TableCell>
                      <TableCell className="text-center">{line.size_45 || '-'}</TableCell>
                      <TableCell className="text-center">{line.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(selectedNote.grand_total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <ReturnNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        returnNote={editMode ? selectedNote : null}
        existingLines={editMode ? noteLines : []}
        onSuccess={() => {
          fetchReturnNotes();
          setDialogOpen(false);
          setEditMode(false);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete return note {noteToDelete?.return_note_no}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordPromptDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onConfirm={handlePasswordConfirm}
        onPasswordVerify={verifyPassword}
        title="Password Required"
        description="Please enter the action password to delete this return note."
      />
    </div>
  );
}