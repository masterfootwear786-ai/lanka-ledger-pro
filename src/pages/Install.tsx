import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, Check, Copy, Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobile, setIsMobile] = useState(false);

  const appUrl = window.location.origin + '/install';

  useEffect(() => {
    // Detect mobile device
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl);
    toast({
      title: "Link Copied",
      description: "Installation link copied to clipboard",
    });
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Installation Not Available",
        description: "Please use your browser's menu to install this app",
        variant: "destructive",
      });
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast({
          title: "Installation Started",
          description: "App is being installed on your device",
        });
      }
    } catch (error) {
      console.error('Install error:', error);
      toast({
        title: "Installation Error",
        description: "Please try again or use your browser's install option",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-between items-start mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/settings')}
            >
              ← Back to Settings
            </Button>
            <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="mx-auto mb-4 w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Download className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">Install Lanka Ledger Pro</CardTitle>
          <CardDescription className="text-lg mt-2">
            Get the full app experience with offline access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium">App is already installed!</p>
              <p className="text-sm text-muted-foreground">
                You can now use the app offline. Your data will sync automatically when online.
              </p>
              <Button onClick={() => navigate('/')} className="w-full" size="lg">
                Open App
              </Button>
            </div>
          ) : (
            <>
              {/* Installation Link Section */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">Share Installation Link:</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={appUrl}
                    className="flex-1 px-3 py-2 text-sm bg-background border rounded-md"
                  />
                  <Button onClick={copyLink} variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Copy and share this link to install the app on other devices
                </p>
              </div>

              {/* Features Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">App Features:</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <WifiOff className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">Offline Access</h4>
                      <p className="text-xs text-muted-foreground">
                        Work without internet - all features available offline
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <RefreshCw className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">Auto Sync</h4>
                      <p className="text-xs text-muted-foreground">
                        Changes sync automatically when you're back online
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Smartphone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">Mobile & Desktop</h4>
                      <p className="text-xs text-muted-foreground">
                        Install on any device - phone, tablet, or computer
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">No App Store Needed</h4>
                      <p className="text-xs text-muted-foreground">
                        Install directly from your browser - no download required
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installation Options */}
              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Install Now
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-3">How to install:</p>
                    <div className="space-y-3">
                      {isMobile ? (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">1</div>
                            <p className="text-sm text-muted-foreground">
                              Tap the <strong>Share</strong> button (⎙ or ⋮) in your browser
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">2</div>
                            <p className="text-sm text-muted-foreground">
                              Select <strong>"Add to Home Screen"</strong>
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">3</div>
                            <p className="text-sm text-muted-foreground">
                              Tap <strong>"Add"</strong> to install
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">1</div>
                            <p className="text-sm text-muted-foreground">
                              Look for the <strong>install icon (⊕)</strong> in your browser's address bar
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">2</div>
                            <p className="text-sm text-muted-foreground">
                              Click the icon and select <strong>"Install"</strong>
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">3</div>
                            <p className="text-sm text-muted-foreground">
                              Or open browser menu (⋮) → <strong>"Install Lanka Ledger Pro"</strong>
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                    Continue in Browser
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
