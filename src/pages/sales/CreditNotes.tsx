import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CreditNoteStatus = "approved" | "draft";

type CreditNote = {
  id: string;
  date: string;
  customer: string;
  amount: number;
  reason: string;
  status: CreditNoteStatus;
};

export default function CreditNotes() {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([
    {
      id: "CN-001",
      date: "2024-01-16",
      customer: "ABC Company",
      amount: 5000,
      reason: "Product return",
      status: "approved",
    },
    {
      id: "CN-002",
      date: "2024-01-19",
      customer: "XYZ Corporation",
      amount: 3000,
      reason: "Price adjustment",
      status: "draft",
    },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newAmount, setNewAmount] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newStatus, setNewStatus] = useState<CreditNoteStatus>("draft");

  const filteredCreditNotes = useMemo(
    () =>
      creditNotes.filter((note) => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        return (
          note.id.toLowerCase().includes(term) ||
          note.customer.toLowerCase().includes(term) ||
          note.reason.toLowerCase().includes(term) ||
          note.date.toLowerCase().includes(term)
        );
      }),
    [creditNotes, searchTerm],
  );

  const getStatusVariant = (status: CreditNoteStatus) => (status === "approved" ? "default" : "secondary");

  const getNextId = () => {
    if (creditNotes.length === 0) return "CN-001";
    const last = creditNotes[creditNotes.length - 1];
    const num = parseInt(last.id.replace("CN-", ""), 10) || 0;
    const next = (num + 1).toString().padStart(3, "0");
    return `CN-${next}`;
  };

  const handleCreateCreditNote = () => {
    if (!newCustomer.trim() || !newAmount.trim()) {
      alert("Customer name සහ amount දාන්න.");
      return;
    }

    const amountNumber = Number(newAmount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      alert("Valid amount value එකක් දාන්න.");
      return;
    }

    const newNote: CreditNote = {
      id: getNextId(),
      date: newDate || new Date().toISOString().slice(0, 10),
      customer: newCustomer.trim(),
      amount: amountNumber,
      reason: newReason.trim() || "N/A",
      status: newStatus,
    };

    setCreditNotes((prev) => [...prev, newNote]);

    // reset + close
    setNewCustomer("");
    setNewAmount("");
    setNewReason("");
    setNewStatus("draft");
    setNewDate(new Date().toISOString().slice(0, 10));
    setIsCreateOpen(false);
  };

  const handleDelete = (id: string) => {
    const confirm = window.confirm("මේ Credit Note එක ඉවත් කරන්නද?");
    if (!confirm) return;
    setCreditNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handlePrint = (note: CreditNote) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Credit Note ${note.id}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; }
            .header { text-align: center; margin-bottom: 24px; }
            .title { font-size: 20px; font-weight: 600; }
            .sub { color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .amount { text-align: right; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Master Footwear</div>
            <div class="sub">Customer Credit Note</div>
          </div>

          <table>
            <tr><th>Credit Note #</th><td>${note.id}</td></tr>
            <tr><th>Date</th><td>${note.date}</td></tr>
            <tr><th>Customer</th><td>${note.customer}</td></tr>
            <tr><th>Reason</th><td>${note.reason}</td></tr>
            <tr><th>Status</th><td>${note.status}</td></tr>
            <tr><th>Amount</th><td class="amount">${note.amount.toLocaleString()}</td></tr>
          </table>

          <p style="margin-top: 32px;">බැංකු / ගෙවීම් සටහන් සමඟ credit note එක අගය verify කරගන්න.</p>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("sales.creditNotes")}</h1>
          <p className="mt-2 text-muted-foreground">Manage customer credit notes</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("sales.createCreditNote") ?? "Create Credit Note"}
        </Button>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sales.searchCreditNotes") ?? "Search Credit Notes"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-3 h-4 w-4" />
            <Input
              placeholder={t("common.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* List Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sales.creditNoteList") ?? "Credit Note List"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credit Note #</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.customer") ?? "Customer"}</TableHead>
                <TableHead>{t("sales.reason") ?? "Reason"}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCreditNotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    {t("common.noResults") ?? "No credit notes found"}
                  </TableCell>
                </TableRow>
              )}

              {filteredCreditNotes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-mono font-medium">{note.id}</TableCell>
                  <TableCell>{note.date}</TableCell>
                  <TableCell>{note.customer}</TableCell>
                  <TableCell>{note.reason}</TableCell>
                  <TableCell className="text-right">{note.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(note.status)}>{t(`status.${note.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View"
                        // TODO: view modal / drawer
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Edit"
                        // TODO: reuse create dialog as edit
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Print" onClick={() => handlePrint(note)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Delete"
                        className={cn("text-red-600 hover:text-red-700")}
                        onClick={() => handleDelete(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Credit Note Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sales.createCreditNote") ?? "Create Credit Note"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Input value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="Customer name" />
            </div>

            <div className="space-y-2">
              <Label>{t("common.date")}</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t("common.amount")}</Label>
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("sales.reason") ?? "Reason"}</Label>
              <Textarea
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Reason for credit note (return, discount, adjustment...)"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={newStatus === "draft" ? "default" : "outline"}
                  onClick={() => setNewStatus("draft")}
                  size="sm"
                >
                  {t("status.draft") ?? "Draft"}
                </Button>
                <Button
                  type="button"
                  variant={newStatus === "approved" ? "default" : "outline"}
                  onClick={() => setNewStatus("approved")}
                  size="sm"
                >
                  {t("status.approved") ?? "Approved"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t("common.cancel") ?? "Cancel"}
            </Button>
            <Button onClick={handleCreateCreditNote}>{t("common.save") ?? "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
