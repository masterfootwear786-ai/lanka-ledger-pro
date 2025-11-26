import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, Check, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const appUrl = window.location.origin + '/install';

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl);
    toast({
      title: "Link Copied",
      description: "Installation link copied to clipboard",
    });
  };

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
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
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-medium">App is already installed!</p>
              <Button onClick={() => navigate('/')} className="w-full">
                Open App
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">Installation Link:</p>
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
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Works on Mobile</h3>
                    <p className="text-sm text-muted-foreground">
                      Install on your phone for easy access anywhere
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Monitor className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Works on Desktop</h3>
                    <p className="text-sm text-muted-foreground">
                      Use offline on your computer without internet
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">No App Store Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Install directly from your browser
                    </p>
                  </div>
                </div>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Install Now
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">How to install:</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <strong>Mobile:</strong> Tap the Share button and select "Add to Home Screen"</li>
                      <li>• <strong>Desktop:</strong> Look for the install icon in your browser's address bar</li>
                    </ul>
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
