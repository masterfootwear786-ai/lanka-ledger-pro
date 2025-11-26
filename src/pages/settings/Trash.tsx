import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

export default function Trash() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trash2 className="h-8 w-8" />
          Trash
        </h1>
        <p className="text-muted-foreground mt-2">
          View and restore deleted items
        </p>
      </div>

      <div className="border rounded-lg p-8 text-center">
        <Trash2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Trash Management</h2>
        <p className="text-muted-foreground">
          Trash functionality will be implemented here
        </p>
      </div>
    </div>
  );
}
