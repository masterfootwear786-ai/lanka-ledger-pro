import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";

export default function Journals() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const journals = [
    { id: "JE-001", date: "2024-01-15", description: "Opening Balance", status: "posted" },
    { id: "JE-002", date: "2024-01-20", description: "Depreciation Entry", status: "posted" },
    { id: "JE-003", date: "2024-01-25", description: "Accrual Entry", status: "draft" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.journals')}</h1>
          <p className="text-muted-foreground mt-2">Manage journal entries</p>
        </div>
        <Button>
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
              {journals.map((journal) => (
                <TableRow key={journal.id}>
                  <TableCell className="font-mono font-medium">{journal.id}</TableCell>
                  <TableCell>{journal.date}</TableCell>
                  <TableCell>{journal.description}</TableCell>
                  <TableCell>
                    <Badge variant={journal.status === "posted" ? "default" : "secondary"}>
                      {journal.status}
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
                      <Button variant="ghost" size="sm">
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
    </div>
  );
}
