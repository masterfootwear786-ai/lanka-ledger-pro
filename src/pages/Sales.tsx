import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Receipt, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Sales() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const salesModules = [
    {
      title: t("sales.invoices"),
      description: "Create and manage sales invoices",
      icon: FileText,
      path: "/sales/invoices",
      color: "text-blue-500"
    },
    {
      title: t("sales.receipts"),
      description: "Record customer payments",
      icon: Receipt,
      path: "/sales/receipts",
      color: "text-purple-500"
    },
    {
      title: "Cheques",
      description: "View and manage cheque payments",
      icon: CreditCard,
      path: "/sales/cheques",
      color: "text-orange-500"
    },
    {
      title: t("sales.customers"),
      description: "Manage customer information",
      icon: Users,
      path: "/sales/customers",
      color: "text-green-500"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("app.sales")}</h1>
        <p className="text-muted-foreground mt-2">
          Manage your sales operations and customer relationships
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {salesModules.map((module) => (
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
