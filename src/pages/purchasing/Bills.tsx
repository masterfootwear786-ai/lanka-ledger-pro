import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";

export default function Bills() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const bills = [
    { id: "BILL-001", date: "2024-01-15", supplier: "Tech Supplies Ltd", amount: 75000, dueDate: "2024-02-15", status: "approved" },
    { id: "BILL-002", date: "2024-01-18", supplier: "Office Equipment", amount: 42000, dueDate: "2024-02-18", status: "paid" },
    { id: "BILL-003", date: "2024-01-20", supplier: "Raw Materials Inc", amount: 98000, dueDate: "2024-02-20", status: "draft" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('purchasing.bills')}</h1>
          <p className="text-muted-foreground mt-2">Manage supplier bills</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Bills</CardTitle>
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
          <CardTitle>Bill List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono font-medium">{bill.id}</TableCell>
                  <TableCell>{bill.date}</TableCell>
                  <TableCell>{bill.supplier}</TableCell>
                  <TableCell>{bill.dueDate}</TableCell>
                  <TableCell className="text-right">{bill.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={bill.status === "paid" ? "default" : "secondary"}>
                      {t(`status.${bill.status}`)}
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
