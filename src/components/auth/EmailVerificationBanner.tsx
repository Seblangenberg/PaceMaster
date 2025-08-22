'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ onDismiss }: EmailVerificationBannerProps) {
  const { user, sendEmailVerification, reloadUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  // Don't show banner if user doesn't exist, email is verified, or banner is dismissed
  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleSendVerification = async () => {
    setIsLoading(true);
    try {
      await sendEmailVerification();
      toast({
        title: 'Verification email sent!',
        description: 'Please check your email and click the verification link.',
      });
    } catch (error) {
      toast({
        title: 'Failed to send verification email',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsLoading(true);
    try {
      await reloadUser();
      if (user.emailVerified) {
        toast({
          title: 'Email verified!',
          description: 'Your email has been successfully verified.',
        });
      } else {
        toast({
          title: 'Email not yet verified',
          description: 'Please check your email and click the verification link.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to check verification status',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Mail className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-orange-800">
              <div className="font-medium mb-1">Verify your email address</div>
              <div className="text-sm">
                We've sent a verification email to <strong>{user.email}</strong>. 
                Please check your inbox and click the verification link to secure your account.
              </div>
            </AlertDescription>
            
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendVerification}
                disabled={isLoading}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-3 w-3" />
                )}
                Resend Email
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheckVerification}
                disabled={isLoading}
                className="text-orange-700 border-orange-300 hover:bg-orange-100"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-3 w-3" />
                )}
                I've Verified
              </Button>
            </div>
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}