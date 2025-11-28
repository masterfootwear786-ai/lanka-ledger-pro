import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Database, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createBackup, exportBackupAsJSON, exportBackupAsExcel } from '@/lib/backup';
import { supabase } from '@/integrations/supabase/client';

export default function Backup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'excel' | 'both'>('both');

  const handleBackup = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

      // Create backup
      const backupData = await createBackup(profile.company_id);

      // Export in selected format(s)
      if (exportFormat === 'json' || exportFormat === 'both') {
        exportBackupAsJSON(backupData);
      }
      
      if (exportFormat === 'excel' || exportFormat === 'both') {
        exportBackupAsExcel(backupData);
      }

      toast({
        title: "Backup Created",
        description: `Successfully exported all system data as ${exportFormat === 'both' ? 'JSON and Excel' : exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: "Backup Failed",
        description: error instanceof Error ? error.message : "Failed to create backup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backup & Restore</h1>
        <p className="text-muted-foreground mt-2">
          Create backups of all your system data and restore when needed
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Create Backup
            </CardTitle>
            <CardDescription>
              Export all your business data including invoices, orders, bills, payments, contacts, inventory, and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <div className="flex flex-col gap-2">
                <Button
                  variant={exportFormat === 'json' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setExportFormat('json')}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON (Single File)
                </Button>
                <Button
                  variant={exportFormat === 'excel' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setExportFormat('excel')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel Workbook
                </Button>
                <Button
                  variant={exportFormat === 'both' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setExportFormat('both')}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Both Formats
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleBackup} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create Backup Now
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ All invoices and orders</p>
              <p>✓ Bills and payments</p>
              <p>✓ Customers and suppliers</p>
              <p>✓ Inventory items and stock</p>
              <p>✓ Transactions and settings</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore from Backup
            </CardTitle>
            <CardDescription>
              Restore your system data from a previous backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Restore feature coming soon
              </p>
              <Button disabled variant="outline">
                Select Backup File
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">⚠️ Important Notes:</p>
              <p>• Restoring will overwrite current data</p>
              <p>• Create a backup before restoring</p>
              <p>• Verify backup file before proceeding</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Offline Data Protection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✓ <strong>Auto-save enabled:</strong> All changes are automatically saved as you work</p>
          <p>✓ <strong>Offline support:</strong> Work without internet, data syncs when back online</p>
          <p>✓ <strong>Power protection:</strong> Data is saved continuously, even during power cuts</p>
          <p>✓ <strong>Draft recovery:</strong> Unsaved work is stored locally and recovered automatically</p>
        </CardContent>
      </Card>
    </div>
  );
}
