import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, MapPin, TrendingUp, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Inventory() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const inventoryModules = [
    {
      title: t("inventory.items"),
      description: "Manage inventory items",
      icon: Package,
      path: "/inventory/items",
      color: "text-blue-500"
    },
    {
      title: t("inventory.stockLocations"),
      description: "Manage warehouse locations",
      icon: MapPin,
      path: "/inventory/locations",
      color: "text-green-500"
    },
    {
      title: t("inventory.stockMovements"),
      description: "Track stock movements",
      icon: TrendingUp,
      path: "/inventory/movements",
      color: "text-purple-500"
    },
    {
      title: "Stock Reports",
      description: "View inventory reports",
      icon: BarChart3,
      path: "/inventory/reports",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("app.inventory")}</h1>
        <p className="text-muted-foreground mt-2">
          Manage your inventory and stock levels
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {inventoryModules.map((module) => (
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
