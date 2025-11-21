import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle } from "lucide-react";

export default function Stock() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const stockItems = [
    { item: "Product A", location: "Main Warehouse", quantity: 50, reorderLevel: 20, value: 750000 },
    { item: "Product B", location: "Branch Store", quantity: 30, reorderLevel: 25, value: 750000 },
    { item: "Product C", location: "Main Warehouse", quantity: 100, reorderLevel: 50, value: 500000 },
    { item: "Product D", location: "Distribution Center", quantity: 5, reorderLevel: 15, value: 175000 },
  ];

  const totalValue = stockItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('inventory.stockOnHand')}</h1>
        <p className="text-muted-foreground mt-2">View current stock levels</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Stock Value</div>
            <div className="text-2xl font-bold">{totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold">{stockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Low Stock Items</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stockItems.filter(item => item.quantity < item.reorderLevel).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Stock</CardTitle>
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
          <CardTitle>Stock on Hand</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockItems.map((stock, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{stock.item}</TableCell>
                  <TableCell>{stock.location}</TableCell>
                  <TableCell className="text-right">
                    <span className={stock.quantity < stock.reorderLevel ? "text-red-600 dark:text-red-400 font-bold" : ""}>
                      {stock.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{stock.reorderLevel}</TableCell>
                  <TableCell className="text-right">{stock.value.toLocaleString()}</TableCell>
                  <TableCell>
                    {stock.quantity < stock.reorderLevel && (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">Low Stock</span>
                      </div>
                    )}
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
