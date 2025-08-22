'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormSteps } from '@/components/ui/FormSteps';
import { 
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  AlertCircle
} from 'lucide-react';
import { 
  passwordResetSchema, 
  resetPasswordSchema,
  getPasswordStrength,
  type PasswordResetFormData,
  type ResetPasswordFormData 
} from '@/utils/validation';

interface PasswordResetFormProps {
  onPasswordReset: (email: string) => Promise<void>;
  onPasswordChange: (data: { email: string; code: string; password: string }) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  error?: string;
}

type ResetStep = 'request' | 'verify' | 'reset' | 'success';

const steps = [
  { id: 'request', title: 'Email', description: 'Enter email' },
  { id: 'verify', title: 'Verify', description: 'Check email' },
  { id: 'reset', title: 'Reset', description: 'New password' },
  { id: 'success', title: 'Complete', description: 'All done' },
];

export function PasswordResetForm({
  onPasswordReset,
  onPasswordChange,
  onBack,
  isLoading = false,
  error
}: PasswordResetFormProps) {
  const [currentStep, setCurrentStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const requestForm = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = resetForm.watch('password');
  const passwordStrength = getPasswordStrength(password || '');

  const handleRequestReset = async (data: PasswordResetFormData) => {
    try {
      setEmail(data.email);
      await onPasswordReset(data.email);
      setCurrentStep('verify');
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handlePasswordChange = async (data: ResetPasswordFormData) => {
    try {
      await onPasswordChange({
        email,
        code: data.code,
        password: data.password,
      });
      setCurrentStep('success');
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'request':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
                  <Mail className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Your Password</h3>
              <p className="text-gray-600">
                Enter your business email address and we'll send you a reset code
              </p>
            </div>

            <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                  Business Email
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="admin@yourfacility.com"
                    className={`pl-10 ${requestForm.formState.errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...requestForm.register('email')}
                  />
                </div>
                {requestForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{requestForm.formState.errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !requestForm.formState.isValid}
                className="w-full bg-primary-600 hover:bg-primary-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Code...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Code
                  </>
                )}
              </Button>
            </form>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h3>
              <p className="text-gray-600">
                We've sent a reset code to <strong>{email}</strong>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Find the email from Hunter Pace Timer</li>
                    <li>Copy the reset code from the email</li>
                    <li>Return here and enter the code below</li>
                  </ol>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setCurrentStep('reset')}
              className="w-full bg-primary-600 hover:bg-primary-700"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              I Have the Reset Code
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCurrentStep('request')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Use a different email address
              </Button>
            </div>
          </div>
        );

      case 'reset':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Create New Password</h3>
              <p className="text-gray-600">
                Enter the reset code and your new password
              </p>
            </div>

            <form onSubmit={resetForm.handleSubmit(handlePasswordChange)} className="space-y-4">
              {/* Reset Code */}
              <div className="space-y-2">
                <Label htmlFor="reset-code" className="text-sm font-medium text-gray-700">
                  Reset Code
                </Label>
                <Input
                  id="reset-code"
                  placeholder="Enter the code from your email"
                  className={resetForm.formState.errors.code ? 'border-red-500 focus:ring-red-500' : ''}
                  disabled={isLoading}
                  {...resetForm.register('code')}
                />
                {resetForm.formState.errors.code && (
                  <p className="text-sm text-red-600">{resetForm.formState.errors.code.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Check your email for a code from Hunter Pace Timer
                </p>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                  New Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a secure password"
                    className={`pl-10 pr-10 ${resetForm.formState.errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...resetForm.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Password strength:</span>
                      <span className={`text-xs font-medium text-${passwordStrength.color}-600`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 bg-${passwordStrength.color}-500`}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {resetForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{resetForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium text-gray-700">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    className={`pl-10 pr-10 ${resetForm.formState.errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...resetForm.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600">{resetForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !resetForm.formState.isValid}
                className="w-full bg-primary-600 hover:bg-primary-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-700 shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Password Updated!</h3>
              <p className="text-gray-600">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Security tip:</p>
                  <p>Make sure to store your new password securely and don't share it with anyone.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={onBack}
              className="w-full bg-primary-600 hover:bg-primary-700"
            >
              <Shield className="mr-2 h-4 w-4" />
              Return to Sign In
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Steps Navigation */}
      <FormSteps
        steps={steps}
        currentStep={getCurrentStepIndex()}
        className="mb-8"
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form Content */}
      {renderStep()}

      {/* Back to Sign In */}
      {currentStep !== 'success' && (
        <div className="mt-8 text-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Sign In
          </Button>
        </div>
      )}
    </div>
  );
}