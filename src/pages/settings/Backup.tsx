import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Database, FileJson, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createBackup, exportBackupAsJSON, exportBackupAsExcel, restoreFromBackup, parseBackupFile, BackupData } from '@/lib/backup';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Backup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'excel' | 'both'>('both');
  const [selectedBackup, setSelectedBackup] = useState<BackupData | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const backupData = parseBackupFile(fileContent);
      setSelectedBackup(backupData);
      setShowRestoreConfirm(true);
    } catch (error) {
      toast({
        title: "Invalid File",
        description: error instanceof Error ? error.message : "Failed to read backup file",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!user || !selectedBackup) return;

    setRestoreLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

      await restoreFromBackup(selectedBackup, profile.company_id);

      toast({
        title: "Restore Successful",
        description: "Your data has been restored from the backup file",
      });

      setShowRestoreConfirm(false);
      setSelectedBackup(null);
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore data",
        variant: "destructive",
      });
    } finally {
      setRestoreLoading(false);
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
              Restore your system data from a previous backup file (JSON format)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />
            <div 
              className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Click to select a JSON backup file
              </p>
              <Button variant="outline" type="button">
                Select Backup File
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">⚠️ Important Notes:</p>
              <p>• Restoring will merge with current data</p>
              <p>• Create a backup before restoring</p>
              <p>• Only JSON backup files are supported</p>
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

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Restore
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to restore data from a backup file.</p>
              {selectedBackup && (
                <div className="bg-muted p-3 rounded-lg text-sm mt-2">
                  <p><strong>Backup Date:</strong> {new Date(selectedBackup.timestamp).toLocaleString()}</p>
                  <p><strong>Version:</strong> {selectedBackup.version}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Records: {Object.entries(selectedBackup.data).filter(([_, v]) => Array.isArray(v) && v.length > 0).map(([k, v]) => `${k}: ${(v as any[]).length}`).join(', ')}
                  </p>
                </div>
              )}
              <p className="text-amber-600 font-medium mt-2">
                This will merge the backup data with your current data. Existing records with the same IDs will be updated.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoreLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {restoreLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
