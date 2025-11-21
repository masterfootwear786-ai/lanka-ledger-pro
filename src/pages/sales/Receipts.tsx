import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Edit } from "lucide-react";

export default function Receipts() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const receipts = [
    { id: "REC-001", date: "2024-01-17", customer: "ABC Company", amount: 120000, paymentMethod: "Bank Transfer" },
    { id: "REC-002", date: "2024-01-21", customer: "Smith & Sons", amount: 95000, paymentMethod: "Cash" },
    { id: "REC-003", date: "2024-01-23", customer: "Global Trading", amount: 150000, paymentMethod: "Cheque" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('sales.receipts')}</h1>
          <p className="text-muted-foreground mt-2">Manage customer payments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Receipt
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Receipts</CardTitle>
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
          <CardTitle>Receipt List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-mono font-medium">{receipt.id}</TableCell>
                  <TableCell>{receipt.date}</TableCell>
                  <TableCell>{receipt.customer}</TableCell>
                  <TableCell>{receipt.paymentMethod}</TableCell>
                  <TableCell className="text-right">{receipt.amount.toLocaleString()}</TableCell>
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
