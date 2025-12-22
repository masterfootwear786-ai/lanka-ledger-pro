import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TopBar } from '@/components/TopBar';
import { IncomingCallDialog } from '@/components/IncomingCallDialog';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsAnimating(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto scrollbar-thin">
            <div 
              className={cn(
                "page-transition",
                isAnimating ? "page-exit" : "page-enter"
              )}
            >
              {displayChildren}
            </div>
          </main>
        </div>
      </div>
      <IncomingCallDialog />
    </SidebarProvider>
  );
};
