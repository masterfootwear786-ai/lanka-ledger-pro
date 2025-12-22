import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Building2, Users, DollarSign, Tag, Shield, Trash2, Download, Database, MapPin, Activity, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canView, isAdmin, loading } = useUserPermissions();

  const allSettingsModules = [
    {
      title: "Install App",
      description: "Install the app on your device for offline access",
      icon: Download,
      path: "/install",
      color: "text-primary",
      subModule: null, // Always visible
    },
    {
      title: "App Update",
      description: "Check and install the latest app updates",
      icon: RefreshCw,
      path: "/settings/app-update",
      color: "text-amber-600 dark:text-amber-400",
      subModule: "app_update",
    },
    {
      title: "Backup & Restore",
      description: "Create backups and restore your system data",
      icon: Database,
      path: "/settings/backup",
      color: "text-green-600 dark:text-green-400",
      subModule: "backup",
    },
    {
      title: t('settings.company'),
      description: "Manage company information and settings",
      icon: Building2,
      path: "/settings/company",
      color: "text-blue-600 dark:text-blue-400",
      subModule: "company",
    },
    {
      title: "Security",
      description: "Configure action passwords and security settings",
      icon: Shield,
      path: "/settings/security",
      color: "text-red-600 dark:text-red-400",
      subModule: "security",
    },
    {
      title: t('settings.users'),
      description: "Manage user accounts and permissions",
      icon: Users,
      path: "/settings/users",
      color: "text-green-600 dark:text-green-400",
      subModule: "users",
    },
    {
      title: "Sales Rep Activity",
      description: "Monitor sales rep performance and activity",
      icon: Activity,
      path: "/settings/sales-rep-activity",
      color: "text-purple-600 dark:text-purple-400",
      subModule: "sales_rep_activity",
    },
    {
      title: t('settings.taxRates'),
      description: "Configure tax rates and rules",
      icon: DollarSign,
      path: "/settings/tax-rates",
      color: "text-purple-600 dark:text-purple-400",
      subModule: "tax_rates",
    },
    {
      title: t('settings.currencies'),
      description: "Manage currency settings",
      icon: DollarSign,
      path: "/settings/currencies",
      color: "text-orange-600 dark:text-orange-400",
      subModule: "currencies",
    },
    {
      title: t('settings.customFields'),
      description: "Define custom fields for entities",
      icon: Tag,
      path: "/settings/custom-fields",
      color: "text-pink-600 dark:text-pink-400",
      subModule: "custom_fields",
    },
    {
      title: "Routes",
      description: "Manage trip routes for turns",
      icon: MapPin,
      path: "/settings/routes",
      color: "text-teal-600 dark:text-teal-400",
      subModule: "routes",
    },
    {
      title: "Trash",
      description: "View and restore deleted items",
      icon: Trash2,
      path: "/settings/trash",
      color: "text-gray-600 dark:text-gray-400",
      subModule: "trash",
    },
  ];

  // Filter settings based on user permissions
  const settingsModules = useMemo(() => {
    if (loading) return [];
    // Admin sees everything
    if (isAdmin) return allSettingsModules;
    
    return allSettingsModules.filter(module => {
      // Always show items without subModule (like Install App)
      if (module.subModule === null) return true;
      // Check specific permission for the sub-module
      return canView('settings', module.subModule);
    });
  }, [loading, isAdmin, canView, t]);

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
