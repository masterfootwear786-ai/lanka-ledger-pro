import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, PieChart, BarChart3, FileSpreadsheet, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Reports() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const reportModules = [
    {
      title: t("reports.profitLoss"),
      description: "Profit and loss statement",
      icon: TrendingUp,
      path: "/reports/profit-loss",
      color: "text-blue-500"
    },
    {
      title: t("reports.balanceSheet"),
      description: "Balance sheet report",
      icon: FileSpreadsheet,
      path: "/reports/balance-sheet",
      color: "text-green-500"
    },
    {
      title: t("reports.cashFlow"),
      description: "Cash flow statement",
      icon: DollarSign,
      path: "/reports/cash-flow",
      color: "text-purple-500"
    },
    {
      title: "Aged Receivables",
      description: "Customer outstanding report",
      icon: FileText,
      path: "/reports/aged-receivables",
      color: "text-pink-500"
    },
    {
      title: "Aged Payables",
      description: "Supplier outstanding report",
      icon: PieChart,
      path: "/reports/aged-payables",
      color: "text-indigo-500"
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
