import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, UserCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import masterLogo from '@/assets/master-logo.png';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'update'>('login');
  const [loginType, setLoginType] = useState<'email' | 'username'>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signUp, user, resetPassword, updatePassword } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const type = params.get('type') ?? hashParams.get('type');
    const errorDescription = params.get('error_description');

    const hasRecoveryToken = Boolean(hashParams.get('access_token')) || Boolean(params.get('code'));
    const isRecovery = type === 'recovery' || hasRecoveryToken || params.get('mode') === 'reset';

    if (errorDescription) {
      const msg = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
      toast.error(msg);
      setMode('reset');

      // Prevent repeated toasts on refresh/back
      params.delete('error');
      params.delete('error_code');
      params.delete('error_description');
      const newSearch = params.toString();
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`
      );
      return;
    }

    if (isRecovery) {
      setMode('update');
      return;
    }

    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleUsernameLogin = async () => {
    // Lookup email by username
    const { data, error } = await supabase.rpc('get_user_by_username', {
      p_username: username.toLowerCase().trim()
    });

    if (error || !data || data.length === 0) {
      toast.error('Invalid username');
      return null;
    }

    return data[0].email;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        let loginEmail = email;

        // If using username login, lookup the email first
        if (loginType === 'username') {
          const foundEmail = await handleUsernameLogin();
          if (!foundEmail) {
            setLoading(false);
            return;
          }
          loginEmail = foundEmail;
        }

        const { error } = await signIn(loginEmail, password);
        if (error) {
          console.error('Login error:', error);
          toast.error(error.message || t('auth.loginError'));
        } else {
          // Log login activity
          const { data: { user: loggedInUser } } = await supabase.auth.getUser();
          if (loggedInUser) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('company_id')
              .eq('id', loggedInUser.id)
              .single();

            if (profile?.company_id) {
              await supabase.from('login_history').insert({
                user_id: loggedInUser.id,
                company_id: profile.company_id,
                user_agent: navigator.userAgent,
              });
            }
          }

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
          {/* Animated Logo with rotate and water ripple shine */}
          <div className="mx-auto mb-4 relative">
            {/* Ripple rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border border-primary/30 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            </div>
            
            {/* Rotating glow behind logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500/30 via-transparent to-red-500/30 blur-md"
                style={{ 
                  animation: 'spin 4s linear infinite',
                }}
              />
            </div>
            
            {/* Water shine effect overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full"
              style={{ width: '80px', height: '80px', margin: 'auto' }}
            >
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                style={{
                  animation: 'shimmer 3s ease-in-out infinite',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
            
            {/* Logo container - static */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <img 
                src={masterLogo} 
                alt="Master Footwear Logo" 
                className="h-16 w-auto object-contain drop-shadow-lg"
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.3))',
                }}
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">{getTitle()}</CardTitle>
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
            
            {mode === 'login' && (
              <Tabs value={loginType} onValueChange={(v) => setLoginType(v as 'email' | 'username')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="username" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Username
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="email" className="space-y-2 mt-0">
                  <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required={loginType === 'email'}
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
                      placeholder="Enter your email"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="username" className="space-y-2 mt-0">
                  <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={loginType === 'username'}
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20"
                      placeholder="Enter your username"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
            
            {(mode === 'signup' || mode === 'reset') && (
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
