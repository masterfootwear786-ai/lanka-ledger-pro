import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Percent, DollarSign, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Accounting() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const accountingModules = [
    {
      title: "Expenses",
      description: "Record expenses, cash in/out, and other expenses",
      icon: Plus,
      path: "/accounting/expenses",
      color: "text-green-500"
    },
    {
      title: t("accounting.taxRates"),
      description: "Manage tax rates",
      icon: Percent,
      path: "/settings/tax-rates",
      color: "text-purple-500"
    },
    {
      title: "Exchange Rates",
      description: "Manage currency exchange rates",
      icon: DollarSign,
      path: "/accounting/fx-rates",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("app.accounting")}</h1>
        <p className="text-muted-foreground mt-2">
          Manage your accounting and financial records
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accountingModules.map((module) => (
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
                Open {module.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
