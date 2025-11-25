import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, CreditCard, Receipt, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Purchasing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const purchasingModules = [
    {
      title: t("purchasing.bills"),
      description: "Record and manage supplier bills",
      icon: FileText,
      path: "/purchasing/bills",
      color: "text-red-500"
    },
    {
      title: t("purchasing.suppliers"),
      description: "Manage supplier information",
      icon: Users,
      path: "/purchasing/suppliers",
      color: "text-green-500"
    },
    {
      title: t("purchasing.payments"),
      description: "Record payments to suppliers",
      icon: CreditCard,
      path: "/purchasing/payments",
      color: "text-blue-500"
    },
    {
      title: "Supplier Cheques",
      description: "Track and manage supplier cheque payments",
      icon: Banknote,
      path: "/purchasing/cheques",
      color: "text-purple-500"
    },
    {
      title: t("purchasing.debitNotes"),
      description: "Issue debit notes to suppliers",
      icon: Receipt,
      path: "/purchasing/debit-notes",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("app.purchasing")}</h1>
        <p className="text-muted-foreground mt-2">
          Manage your purchasing operations and supplier relationships
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {purchasingModules.map((module) => (
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
