import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, ShoppingCart, Package, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Reports() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const reportModules = [
    {
      title: "Sales Report",
      description: "Comprehensive sales transactions and revenue analysis",
      icon: TrendingUp,
      path: "/reports/sales",
      color: "text-blue-500"
    },
    {
      title: "Purchasing Report",
      description: "Complete purchasing transactions and supplier analysis",
      icon: ShoppingCart,
      path: "/reports/purchasing",
      color: "text-purple-500"
    },
    {
      title: "Inventory Stock Report",
      description: "Current stock levels, values and low stock alerts",
      icon: Package,
      path: "/reports/inventory",
      color: "text-green-500"
    },
    {
      title: "Expenses Report",
      description: "All expenses and transaction details",
      icon: DollarSign,
      path: "/reports/expenses",
      color: "text-orange-500"
    },
    {
      title: t("reports.profitLoss"),
      description: "Profit and loss statement",
      icon: FileText,
      path: "/reports/profit-loss",
      color: "text-pink-500"
    },
    {
      title: t("reports.arAging"),
      description: "Accounts receivable aging analysis",
      icon: FileText,
      path: "/reports/ar-aging",
      color: "text-indigo-500"
    },
    {
      title: t("reports.apAging"),
      description: "Accounts payable aging analysis",
      icon: FileText,
      path: "/reports/ap-aging",
      color: "text-red-500"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("app.reports")}</h1>
        <p className="text-muted-foreground mt-2">
          View financial reports and analytics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportModules.map((module) => (
          <Card key={module.path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(module.path)}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-muted ${module.color}`}>
                  <module.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </div>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
