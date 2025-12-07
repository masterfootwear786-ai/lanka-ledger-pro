import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import masterLogo from '@/assets/master-logo.png';

export const WaitingPermissions = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="text-center space-y-8 max-w-md relative z-10">
        {/* Animated Logo */}
        <div className="relative">
          {/* Glow ring behind logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-gradient-to-r from-red-500/20 via-red-600/30 to-red-500/20 blur-xl animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          
          {/* Pulsing ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-44 h-44 rounded-full border-2 border-red-500/30 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          
          {/* Logo container with animations */}
          <div className="relative mx-auto w-48 h-48 flex items-center justify-center animate-fade-in">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm" />
            <img 
              src={masterLogo} 
              alt="Master Footwear Logo" 
              className="h-40 w-auto object-contain relative z-10 drop-shadow-2xl animate-float"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.4))',
              }}
            />
          </div>
        </div>

        {/* Welcome Text with staggered animation */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
          <h1 className="text-3xl md:text-4xl font-bold text-white/90 tracking-wider">
            WELCOME TO
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide">
            <span className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent animate-pulse">
              MASTER FOOTWEAR (PVT) LTD
            </span>
          </h2>
          <p className="text-sm text-white/50 font-medium tracking-[0.3em] mt-2">
            COMFORT, POWER, STYLE
          </p>
        </div>

        {/* Waiting Message with loader */}
        <div className="flex items-center justify-center gap-3 text-white/60 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }}>
          <div className="relative">
            <Loader2 className="h-5 w-5 animate-spin text-red-500" />
            <div className="absolute inset-0 blur-sm">
              <Loader2 className="h-5 w-5 animate-spin text-red-500" />
            </div>
          </div>
          <p className="text-lg">Please wait for the permissions</p>
        </div>

        {/* Sign Out Button */}
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-8 border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300 animate-fade-in"
          style={{ animationDelay: '0.9s', animationFillMode: 'backwards' }}
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Sign Out
        </Button>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
    </div>
  );
};
