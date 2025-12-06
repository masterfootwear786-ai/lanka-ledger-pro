import { useState, useEffect } from "react";
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, Download, Smartphone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AppUpdate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
    offlineReady: [offlineReady],
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Check for updates periodically
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // Check every hour
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      // Force service worker to check for updates
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          setLastChecked(new Date());
          
          // Wait a bit for the update check to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (!needRefresh) {
            toast({
              title: "App is up to date",
              description: "You are running the latest version.",
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      toast({
        title: "Error",
        description: "Failed to check for updates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
      toast({
        title: "Update Complete",
        description: "The app has been updated to the latest version.",
      });
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: "Error",
        description: "Failed to update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Auto-check on mount
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RefreshCw className="h-8 w-8 text-primary" />
            App Update
          </h1>
          <p className="text-muted-foreground mt-1">
            Check and install the latest app updates
          </p>
        </div>
      </div>

      {/* Update Status Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${needRefresh ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
                {needRefresh ? (
                  <Download className="h-8 w-8 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {needRefresh ? 'Update Available' : 'App is Up to Date'}
                </CardTitle>
                <CardDescription>
                  {needRefresh 
                    ? 'A new version is ready to install' 
                    : 'You are running the latest version'}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={needRefresh ? "default" : "secondary"}
              className={needRefresh ? 'bg-amber-500' : 'bg-green-500/20 text-green-600'}
            >
              {needRefresh ? 'Update Ready' : 'Latest'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {needRefresh ? (
            <div className="space-y-4">
              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <p className="text-sm">
                  A new version of the app is available. Click the button below to update now. 
                  The app will refresh automatically after the update.
                </p>
              </div>
              <Button 
                onClick={handleUpdate} 
                disabled={isUpdating}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                size="lg"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Install Update Now
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your app is running the latest version. Updates are checked automatically in the background.
                </p>
              </div>
              <Button 
                onClick={checkForUpdates} 
                disabled={isChecking}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Checking for Updates...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Check for Updates
                  </>
                )}
              </Button>
            </div>
          )}

          {lastChecked && (
            <p className="text-xs text-muted-foreground text-center">
              Last checked: {lastChecked.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Offline Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Offline Mode</CardTitle>
              <CardDescription>App is ready to work offline</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {offlineReady ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  All app resources are cached. You can use the app offline.
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Caching app resources for offline use...
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Update Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <h4 className="font-semibold text-foreground">Auto-Update Information</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Updates are checked automatically every hour</li>
              <li>When an update is available, you'll see a notification</li>
              <li>Updates include bug fixes, new features, and security improvements</li>
              <li>Your data is preserved during updates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
