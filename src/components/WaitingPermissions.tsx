import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WaitingPermissions = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        const { data } = await supabase
          .from('companies')
          .select('logo_url')
          .limit(1)
          .single();
        
        if (data?.logo_url) {
          setLogoUrl(data.logo_url);
        }
      } catch (error) {
        console.error('Error fetching company logo:', error);
      }
    };

    fetchCompanyLogo();
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const defaultLogoUrl = "https://fmwbtytzecwneovwerrx.supabase.co/storage/v1/object/public/company-logos/master-footwear-logo.png";
  const displayLogoUrl = logoUrl || defaultLogoUrl;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="text-center space-y-8 max-w-md">
        {/* Logo */}
        <div className="h-32 w-32 mx-auto flex items-center justify-center">
          {!logoLoaded && (
            <div className="rounded-full bg-primary/10 flex items-center justify-center h-32 w-32">
              <span className="text-4xl font-bold text-primary">MF</span>
            </div>
          )}
          <img 
            src={displayLogoUrl} 
            alt="Master Footwear Logo" 
            className={`h-32 w-auto object-contain ${logoLoaded ? 'block' : 'hidden'}`}
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoLoaded(false)}
          />
        </div>

        {/* Welcome Text */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            WELCOME TO
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            MASTER FOOTWEAR (PVT) LTD
          </h2>
        </div>

        {/* Waiting Message */}
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-lg">Please wait for the permissions</p>
        </div>

        {/* Sign Out Button */}
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-8"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Sign Out
        </Button>
      </div>
    </div>
  );
};
