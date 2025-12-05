import { Moon, Sun, LogOut, Globe, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const TopBar = () => {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hover:bg-primary/10 transition-colors" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-premium">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-display font-bold tracking-tight">{t('app.title')}</h1>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 md:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
            >
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-xl border-border/50">
            <DropdownMenuItem 
              onClick={() => handleLanguageChange('en')}
              className="cursor-pointer hover:bg-primary/10"
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleLanguageChange('si')}
              className="cursor-pointer hover:bg-primary/10"
            >
              සිංහල
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {user && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSignOut}
            className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
};
