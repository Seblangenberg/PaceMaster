import { z } from 'zod';

/**
 * Validation rules for Hunter Pace Events
 */

// Common patterns
const PHONE_REGEX = /^(\+1[-.s]?)?(([0-9]{3})|[0-9]{3})[-.s]?[0-9]{3}[-.s]?[0-9]{4}$/;
const EVENT_NAME_REGEX = /^[a-zA-Z0-9\s\-'.,&()]+$/;
const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Made optional for better UX
};

// Custom validation functions
export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
};

export const isStrongPassword = (password: string): boolean => {
  return validatePassword(password).length === 0;
};

export const validateEventName = (name: string): boolean => {
  if (name.length < 2 || name.length > 100) return false;
  if (!EVENT_NAME_REGEX.test(name)) return false;
  
  // Check for common inappropriate words (basic filter)
  const inappropriateWords = ['test', 'fake', 'demo', 'untitled'];
  const lowerName = name.toLowerCase();
  
  return !inappropriateWords.some(word => lowerName.includes(word));
};

export const validateTimeFormat = (time: string): boolean => {
  return TIME_REGEX.test(time);
};

export const validateTeamNumber = (number: number, existingNumbers: number[] = []): string[] => {
  const errors: string[] = [];
  
  if (number <= 0) {
    errors.push('Team number must be positive');
  }
  
  if (number > 9999) {
    errors.push('Team number too large');
  }
  
  if (existingNumbers.includes(number)) {
    errors.push('Team number already exists');
  }
  
  return errors;
};

// Zod schemas for authentication forms
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(320, 'Email is too long'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  // Personal Information
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(320, 'Email is too long'),
  
  password: z
    .string()
    .min(PASSWORD_REQUIREMENTS.minLength, `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
    .refine(isStrongPassword, {
      message: 'Password must contain uppercase, lowercase, and numbers',
    }),
  
  confirmPassword: z.string(),
  
  // Organization Information
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name is too long')
    .optional(),
  
  businessType: z
    .enum(['riding_club', 'hunt_club', 'equestrian_center', 'stable', 'ranch', 'training_facility', 'individual', 'other'])
    .default('individual')
    .optional(),
  
  // Contact Information (Optional but recommended)
  phone: z
    .string()
    .optional()
    .refine(
      (phone) => !phone || PHONE_REGEX.test(phone),
      'Please enter a valid phone number (e.g., (555) 123-4567)'
    ),
  
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  
  // Location (Optional)
  state: z.string().optional(),
  country: z.string().default('US'),
  
  // Legal
  terms: z
    .boolean()
    .refine(val => val === true, 'You must accept the terms of service'),
  
  marketing: z.boolean().optional(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_REQUIREMENTS.minLength, `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
    .refine(isStrongPassword, {
      message: 'Password must contain uppercase, lowercase, and numbers',
    }),
  
  confirmPassword: z.string(),
  
  code: z.string().min(1, 'Reset code is required'),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Organization type options for Hunter Pace participants  
export const businessTypeOptions = [
  { value: 'individual', label: 'Individual Rider' },
  { value: 'riding_club', label: 'Riding Club' },
  { value: 'hunt_club', label: 'Hunt Club' },
  { value: 'equestrian_center', label: 'Equestrian Center' },
  { value: 'stable', label: 'Boarding Stable' },
  { value: 'ranch', label: 'Ranch/Farm' },
  { value: 'training_facility', label: 'Training Facility' },
  { value: 'other', label: 'Other' },
];

// US states for dropdown
export const stateOptions = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

// Password strength indicator
export const getPasswordStrength = (password: string): {
  score: number;
  text: string;
  color: string;
} => {
  if (!password) {
    return { score: 0, text: 'Enter a password', color: 'gray' };
  }

  const errors = validatePassword(password);
  const score = Math.max(0, 4 - errors.length);

  const scoreData = {
    0: { text: 'Very Weak', color: 'red' },
    1: { text: 'Weak', color: 'red' },
    2: { text: 'Fair', color: 'yellow' },
    3: { text: 'Good', color: 'blue' },
    4: { text: 'Strong', color: 'green' },
  };

  return {
    score,
    ...scoreData[score as keyof typeof scoreData],
  };
};