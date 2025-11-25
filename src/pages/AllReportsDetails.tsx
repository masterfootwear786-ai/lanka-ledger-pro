import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SalesReport from "./reports/SalesReport";
import PurchasingReport from "./reports/PurchasingReport";
import InventoryReport from "./reports/InventoryReport";
import ExpensesReport from "./reports/ExpensesReport";

export default function AllReportsDetails() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Reports Details</h1>
        <p className="text-muted-foreground mt-2">
          View, export, and print all business reports
        </p>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="purchasing">Purchasing Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="expenses">Expenses Report</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <SalesReport />
        </TabsContent>

        <TabsContent value="purchasing" className="mt-6">
          <PurchasingReport />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryReport />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <ExpensesReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
