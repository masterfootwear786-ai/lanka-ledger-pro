import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Building2, Users, DollarSign, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const settingsModules = [
    {
      title: t('settings.company'),
      description: "Manage company information and settings",
      icon: Building2,
      path: "/settings/company",
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      title: t('settings.users'),
      description: "Manage user accounts and permissions",
      icon: Users,
      path: "/settings/users",
      color: "text-green-600 dark:text-green-400"
    },
    {
      title: t('settings.taxRates'),
      description: "Configure tax rates and rules",
      icon: DollarSign,
      path: "/settings/tax-rates",
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      title: t('settings.currencies'),
      description: "Manage currency settings",
      icon: DollarSign,
      path: "/settings/currencies",
      color: "text-orange-600 dark:text-orange-400"
    },
    {
      title: t('settings.customFields'),
      description: "Define custom fields for entities",
      icon: Tag,
      path: "/settings/custom-fields",
      color: "text-pink-600 dark:text-pink-400"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          {t('app.settings')}
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure system settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsModules.map((module) => (
          <Card 
            key={module.path} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(module.path)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <module.icon className={`h-6 w-6 ${module.color}`} />
                {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{module.description}</p>
              <Button variant="outline" className="w-full">
                Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
