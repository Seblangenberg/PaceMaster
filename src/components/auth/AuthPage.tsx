'use client';

import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import { PasswordResetForm } from './PasswordResetForm';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { LoginCredentials, SignUpCredentials } from '@/lib/types';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string>('');
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (credentials: LoginCredentials & { rememberMe?: boolean }) => {
    try {
      setError('');
      await auth.login(credentials);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in to your facility account.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    }
  };

  const handleSignUp = async (credentials: SignUpCredentials) => {
    try {
      setError('');
      await auth.signUp(credentials);
      toast({
        title: 'Account created!',
        description: 'Welcome to Hunter Pace Timer. You are now signed in.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(''); // Clear any errors when switching modes
  };
  
  const handleForgotPassword = () => {
    switchMode('forgot-password');
  };
  
  const handlePasswordReset = async (email: string) => {
    try {
      setError('');
      await auth.sendPasswordReset(email);
      toast({
        title: 'Reset code sent!',
        description: `We've sent a password reset code to ${email}. Please check your email.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset code';
      setError(errorMessage);
    }
  };
  
  const handlePasswordChange = async (data: { email: string; code: string; password: string }) => {
    try {
      setError('');
      await auth.confirmPasswordReset(data.code, data.password);
      toast({
        title: 'Password updated!',
        description: 'Your password has been successfully updated. You can now sign in.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      setError(errorMessage);
    }
  };
  
  const handleBackToLogin = () => {
    switchMode('login');
  };

  // Get the appropriate title and subtitle based on mode
  const getPageContent = () => {
    switch (mode) {
      case 'login':
        return {
          title: 'Facility Admin Portal',
          subtitle: 'Secure access for equestrian facility management',
        };
      case 'signup':
        return {
          title: 'Join Hunter Pace Timer',
                      subtitle: 'Create your hunter pace event account',
        };
      case 'forgot-password':
        return {
          title: 'Reset Password',
          subtitle: 'We\'ll help you get back into your account',
        };
      default:
        return {
          title: 'Hunter Pace Timer',
                      subtitle: 'Professional hunter pace event timer and management system',
        };
    }
  };
  
  const { title, subtitle } = getPageContent();

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {/* Auth Forms */}
      {mode === 'login' && (
        <LoginForm
          onLogin={handleLogin}
          onSwitchToSignUp={() => switchMode('signup')}
          onForgotPassword={handleForgotPassword}
          isLoading={auth.isLoading}
          error={error}
        />
      )}
      
      {mode === 'signup' && (
        <SignUpForm
          onSignUp={handleSignUp}
          onSwitchToLogin={() => switchMode('login')}
          isLoading={auth.isLoading}
          error={error}
        />
      )}
      
      {mode === 'forgot-password' && (
        <PasswordResetForm
          onPasswordReset={handlePasswordReset}
          onPasswordChange={handlePasswordChange}
          onBack={handleBackToLogin}
          isLoading={auth.isLoading}
          error={error}
        />
      )}
    </AuthLayout>
  );
}