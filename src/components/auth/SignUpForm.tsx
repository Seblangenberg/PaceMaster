'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormSteps, StepIndicator } from '@/components/ui/FormSteps';
import { 
  Eye, 
  EyeOff, 
  UserPlus, 
  User, 
  Building, 
  Shield, 
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mail,
  Lock,
  Phone,
  Globe,
  MapPin,
  FileText
} from 'lucide-react';
import { 
  registerSchema, 
  businessTypeOptions, 
  stateOptions, 
  getPasswordStrength,
  type RegisterFormData 
} from '@/utils/validation';
import type { SignUpCredentials } from '@/lib/types';

interface SignUpFormProps {
  onSignUp: (credentials: SignUpCredentials) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
  error?: string;
}

const steps = [
  { id: 'personal', title: 'Personal', description: 'Your information' },
  { id: 'organization', title: 'Facility', description: 'Organization details' },
  { id: 'contact', title: 'Contact', description: 'Additional info' },
  { id: 'confirm', title: 'Confirm', description: 'Review & create' },
];

export default function SignUpForm({ 
  onSignUp, 
  onSwitchToLogin, 
  isLoading = false, 
  error 
}: SignUpFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    watch,
    setValue,
    trigger,
    getValues
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      organizationName: '',
      businessType: 'individual',
      phone: '',
      website: '',
      state: '',
      country: 'US',
      terms: false,
      marketing: false,
    },
  });

  // Custom validation function to bypass broken isValid state
  const isFormValid = () => {
    const formData = getValues();
    try {
      registerSchema.parse(formData);
      return true;
    } catch (error) {
      return false;
    }
  };

  const password = watch('password');
  const passwordStrength = getPasswordStrength(password || '');
  
  // Password validation helper
  const getPasswordValidation = (password: string) => {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return { hasUpper, hasLower, hasNumber };
  };
  
  const passwordValidation = getPasswordValidation(password || '');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Convert to the expected SignUpCredentials format
      const credentials: SignUpCredentials = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        organizationName: data.organizationName,
        businessType: data.businessType,
        phone: data.phone,
        website: data.website,
        state: data.state,
        country: data.country,
        terms: data.terms || false,
        marketing: data.marketing || false,
      };
      
      await onSignUp(credentials);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof RegisterFormData)[] => {
    switch (step) {
      case 0:
        return ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
      case 1:
        return ['organizationName', 'businessType'];
      case 2:
        return ['phone', 'website', 'state'];
      case 3:
        return ['terms'];
      default:
        return [];
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Personal Information</h3>
              <p className="text-gray-600">Let's start with your basic information</p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  className={errors.firstName ? 'border-red-500 focus:ring-red-500' : ''}
                  disabled={isLoading}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Smith"
                  className={errors.lastName ? 'border-red-500 focus:ring-red-500' : ''}
                  disabled={isLoading}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={`pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={isLoading}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Use any email address - personal or business
              </p>
            </div>

            {/* Password Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a secure password"
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...register('password')}
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
                
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                    {...register('confirmPassword')}
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
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
                  <Building className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Facility Information</h3>
              <p className="text-gray-600">Tell us about your equestrian facility</p>
            </div>

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
                Facility Name
              </Label>
              <Input
                id="organizationName"
                placeholder="Sunset Equestrian Center"
                className={errors.organizationName ? 'border-red-500 focus:ring-red-500' : ''}
                disabled={isLoading}
                {...register('organizationName')}
              />
              {errors.organizationName && (
                <p className="text-sm text-red-600">{errors.organizationName.message}</p>
              )}
            </div>

            {/* Business Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Facility Type
              </Label>
              <Select 
                key={`business-select-${watch('businessType') || 'empty'}`}
                value={watch('businessType') || 'equestrian'} 
                onValueChange={(value) => setValue('businessType', value as any)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.businessType ? 'border-red-500 focus:ring-red-500' : ''}>
                  <SelectValue placeholder="Select facility type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypeOptions.map((option: { value: string; label: string }) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.businessType && (
                <p className="text-sm text-red-600">{errors.businessType.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
                  <Phone className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Contact Information</h3>
              <p className="text-gray-600">Help customers find and contact you (optional)</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  className={`pl-10 ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={isLoading}
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                Website (Optional)
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourfacility.com"
                  className={`pl-10 ${errors.website ? 'border-red-500 focus:ring-red-500' : ''}`}
                  disabled={isLoading}
                  {...register('website')}
                />
              </div>
              {errors.website && (
                <p className="text-sm text-red-600">{errors.website.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                State (Optional)
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <Select 
                  key={`state-select-${watch('state') || 'empty'}`}
                  value={watch('state') || undefined} 
                  onValueChange={(value) => setValue('state', value || '')}
                  disabled={isLoading}
                >
                  <SelectTrigger className={`pl-10 ${errors.state ? 'border-red-500 focus:ring-red-500' : ''}`}>
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((option: { value: string; label: string }) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.state && (
                <p className="text-sm text-red-600">{errors.state.message}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Review & Confirm</h3>
              <p className="text-gray-600">Review your information and accept our terms</p>
            </div>

            {/* Review Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {getValues('firstName')} {getValues('lastName')}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-sm text-gray-900">{getValues('email')}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Facility:</span>
                <span className="ml-2 text-sm text-gray-900">{getValues('organizationName')}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {businessTypeOptions.find((option: { value: string; label: string }) => option.value === getValues('businessType'))?.label}
                </span>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={watch('terms')}
                  onCheckedChange={(checked) => setValue('terms', checked as boolean)}
                  disabled={isLoading}
                  className={errors.terms ? 'border-red-500' : ''}
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-700 underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-700 underline">
                      Privacy Policy
                    </a>
                  </Label>
                </div>
              </div>
              {errors.terms && (
                <p className="text-sm text-red-600 ml-6">{errors.terms.message}</p>
              )}

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="marketing"
                  checked={watch('marketing')}
                  onCheckedChange={(checked) => setValue('marketing', checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="marketing" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                  I would like to receive updates about new features and equestrian industry news
                </Label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <StepIndicator current={currentStep + 1} total={steps.length} />
      </div>

      {/* Steps Navigation */}
      <FormSteps
        steps={steps}
        currentStep={currentStep}
        className="mb-8"
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      


      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={isLoading}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onSwitchToLogin}
              disabled={isLoading}
              className="text-primary-600 hover:text-primary-700"
            >
              ← Already have an account? Sign in
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={isLoading}
              className="flex items-center bg-primary-600 hover:bg-primary-700"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="flex items-center bg-primary-600 hover:bg-primary-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Facility Account
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          By creating an account, you're joining the leading digital waiver management platform for equestrian facilities
        </p>
      </div>
    </div>
  );
}