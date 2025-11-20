import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, GitCompare, FileText, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Cashbook() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cashbookModules = [
    {
      title: "Bank Accounts",
      description: "Manage bank accounts",
      icon: Landmark,
      path: "/cashbook/accounts",
      color: "text-blue-500"
    },
    {
      title: "Bank Statements",
      description: "Import and view bank statements",
      icon: FileText,
      path: "/cashbook/statements",
      color: "text-green-500"
    },
    {
      title: "Reconciliation",
      description: "Reconcile bank transactions",
      icon: GitCompare,
      path: "/cashbook/reconciliation",
      color: "text-purple-500"
    },
    {
      title: "Cash Flow",
      description: "View cash flow reports",
      icon: TrendingUp,
      path: "/cashbook/cash-flow",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("app.cashbook")}</h1>
        <p className="text-muted-foreground mt-2">
          Manage your cash flow and bank reconciliations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cashbookModules.map((module) => (
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
