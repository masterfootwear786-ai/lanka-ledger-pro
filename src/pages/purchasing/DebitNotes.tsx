import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit } from "lucide-react";

export default function DebitNotes() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const debitNotes = [
    { id: "DN-001", date: "2024-01-16", supplier: "Tech Supplies Ltd", amount: 3000, reason: "Item return", status: "approved" },
    { id: "DN-002", date: "2024-01-19", supplier: "Office Equipment Co", amount: 2500, reason: "Price adjustment", status: "draft" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('purchasing.debitNotes')}</h1>
          <p className="text-muted-foreground mt-2">Manage supplier debit notes</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Debit Note
        </Button>
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
              {debitNotes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-mono font-medium">{note.id}</TableCell>
                  <TableCell>{note.date}</TableCell>
                  <TableCell>{note.supplier}</TableCell>
                  <TableCell>{note.reason}</TableCell>
                  <TableCell className="text-right">{note.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={note.status === "approved" ? "default" : "secondary"}>
                      {t(`status.${note.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
