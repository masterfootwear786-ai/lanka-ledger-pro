import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TopBar } from '@/components/TopBar';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <SidebarProvider>
      {isOffline && (
        <div className="offline-indicator flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode - Changes will sync when online</span>
        </div>
      )}
      <div className={`min-h-screen flex w-full ${isOffline ? 'pt-10' : ''}`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-auto safe-bottom">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
