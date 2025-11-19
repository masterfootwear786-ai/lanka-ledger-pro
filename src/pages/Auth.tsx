import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{t('app.title')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            
            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
            
            {(mode === 'login' || mode === 'signup') && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {mode === 'update' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : t(`auth.${mode}Button`)}
            </Button>
            
            {mode === 'login' && (
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-primary hover:underline"
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
                  className="text-primary hover:underline"
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
