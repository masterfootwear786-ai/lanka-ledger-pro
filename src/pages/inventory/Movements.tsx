import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function Movements() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const movements = [
    { id: "MOV001", date: "2024-01-15", item: "Product A", location: "Main Warehouse", type: "in", quantity: 50 },
    { id: "MOV002", date: "2024-01-16", item: "Product B", location: "Branch Store", type: "out", quantity: 20 },
    { id: "MOV003", date: "2024-01-18", item: "Product C", location: "Main Warehouse", type: "in", quantity: 100 },
    { id: "MOV004", date: "2024-01-20", item: "Product A", location: "Distribution Center", type: "out", quantity: 15 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('inventory.movements')}</h1>
          <p className="text-muted-foreground mt-2">Track stock movements</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Record Movement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Movements</CardTitle>
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
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movement #</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="font-mono">{movement.id}</TableCell>
                  <TableCell>{movement.date}</TableCell>
                  <TableCell>{movement.item}</TableCell>
                  <TableCell>{movement.location}</TableCell>
                  <TableCell>
                    <Badge variant={movement.type === "in" ? "default" : "secondary"}>
                      {movement.type === "in" ? (
                        <ArrowUpCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownCircle className="h-3 w-3 mr-1" />
                      )}
                      {movement.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{movement.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
