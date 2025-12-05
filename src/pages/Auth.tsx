import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'update'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signUp, user, resetPassword, updatePassword } = useAuth();

  useEffect(() => {
    if (user && mode !== 'update') {
      navigate('/');
    }
    // Check for password reset mode in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'reset') {
      setMode('update');
    }
  }, [user, navigate, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          console.error('Login error:', error);
          toast.error(error.message || t('auth.loginError'));
        } else {
          toast.success(t('auth.welcomeBack'));
          navigate('/');
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          console.error('Signup error:', error);
          toast.error(error.message || t('auth.signupError'));
        } else {
          toast.success(t('auth.accountCreated'));
          navigate('/');
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error(t('auth.resetError'));
        } else {
          toast.success(t('auth.resetSuccess'));
          setMode('login');
        }
      } else if (mode === 'update') {
        if (newPassword !== confirmPassword) {
          toast.error(t('auth.passwordMismatch'));
          return;
        }
        if (newPassword.length < 6) {
          toast.error(t('auth.passwordTooShort'));
          return;
        }
        const { error } = await updatePassword(newPassword);
        if (error) {
          toast.error(t('auth.updateError'));
        } else {
          toast.success(t('auth.passwordUpdated'));
          navigate('/');
        }
      }
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return t('auth.loginTitle');
      case 'signup': return t('auth.signupTitle');
      case 'reset': return t('auth.resetTitle');
      case 'update': return t('auth.updateTitle');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-48 -translate-y-48" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-info/10 rounded-full blur-3xl translate-x-48 translate-y-48" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-success/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      {/* Floating decorative shapes */}
      <div className="absolute top-20 right-20 w-4 h-4 bg-primary/30 rounded-full animate-float" />
      <div className="absolute bottom-32 left-32 w-6 h-6 bg-info/30 rounded-full animate-float animation-delay-200" />
      <div className="absolute top-1/3 left-20 w-3 h-3 bg-success/30 rounded-full animate-float animation-delay-400" />
      
      <Card className="w-full max-w-md relative z-10 border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 animate-scale-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg animate-pulse-glow">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">{getTitle()}</CardTitle>
          <CardDescription className="text-base">{t('app.title')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">{t('auth.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}
            
            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            )}
            
            {(mode === 'login' || mode === 'signup') && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            )}

            {mode === 'update' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">{t('auth.newPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium group" 
              variant="premium"
              disabled={loading}
            >
              {loading ? t('common.loading') : t(`auth.${mode}Button`)}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {mode === 'login' && (
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-primary hover:text-primary/80 hover:underline transition-colors font-medium"
                >
                  {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
                </button>
              </div>
            )}

            {(mode === 'reset' || mode === 'update') && (
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
