// =================================================================
// VALIDATION SCHEMAS FOR HUNTER PACE APP
// =================================================================
// Runtime type validation using Zod

import { z } from 'zod';

// =================================================================
// BASIC VALIDATION UTILITIES
// =================================================================

// Custom validation helpers
const timeStringSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format');
const phoneNumberSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional();
const emailSchema = z.string().email('Invalid email format');

// =================================================================
// EVENT SCHEMAS
// =================================================================

export const EventDetailsSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long'),
  date: z.date().optional(),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  organizer: z.string().min(1, 'Organizer name is required').max(100, 'Organizer name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  rules: z.string().max(2000, 'Rules too long').optional(),
  contactEmail: emailSchema.optional(),
  contactPhone: phoneNumberSchema,
  maxTeams: z.number().int().positive().max(1000, 'Too many teams').optional(),
  registrationFee: z.number().nonnegative('Registration fee cannot be negative').optional(),
  startTime: timeStringSchema.optional(),
  weatherConditions: z.string().max(200, 'Weather conditions too long').optional(),
});

export const DivisionSchema = z.object({
  id: z.string().min(1, 'Division ID is required'),
  name: z.string().min(1, 'Division name is required').max(50, 'Division name too long'),
  optimalTime: z.number().positive('Optimal time must be positive'),
  description: z.string().max(500, 'Description too long').optional(),
  minRiders: z.number().int().positive().max(10, 'Too many minimum riders').optional(),
  maxRiders: z.number().int().positive().max(10, 'Too many maximum riders').optional(),
  ageRestrictions: z.string().max(200, 'Age restrictions too long').optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'open']).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// =================================================================
// TEAM SCHEMAS
// =================================================================

export const TeamSchema = z.object({
  id: z.string().min(1, 'Team ID is required'),
  number: z.number().int().positive('Team number must be positive'),
  name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
  riders: z.string().min(1, 'Riders list is required').max(500, 'Riders list too long'),
  divisionId: z.string().optional(),
  status: z.enum(['waiting', 'running', 'finished', 'disqualified', 'withdrawn']),
  startTime: z.date().optional(),
  finishTime: z.date().optional(),
  elapsedTime: z.number().nonnegative('Elapsed time cannot be negative').optional(),
  penalties: z.number().nonnegative('Penalties cannot be negative').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  contactEmail: emailSchema.optional(),
  contactPhone: phoneNumberSchema,
  emergencyContact: z.string().max(100, 'Emergency contact name too long').optional(),
  emergencyPhone: phoneNumberSchema,
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
}).refine((data) => {
  // Ensure finish time is after start time
  if (data.startTime && data.finishTime) {
    return data.finishTime >= data.startTime;
  }
  return true;
}, {
  message: 'Finish time must be after start time',
  path: ['finishTime']
});

export const SavedEventSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  lastModified: z.date(),
  eventDetails: EventDetailsSchema,
  divisions: z.array(DivisionSchema),
  teams: z.array(TeamSchema),
  organizerId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isPublic: z.boolean().optional(),
  maxTeams: z.number().int().positive().optional(),
  registrationDeadline: z.date().optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  rules: z.string().max(5000, 'Rules too long').optional(),
  contactInfo: z.string().max(500, 'Contact info too long').optional(),
});

// =================================================================
// USER SCHEMAS
// =================================================================

export const UserProfileSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: emailSchema,
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name too long'),
  photoURL: z.string().url('Invalid photo URL').optional(),
  role: z.enum(['user', 'admin', 'organizer']),
  createdAt: z.date(),
  updatedAt: z.date(),
  phoneNumber: phoneNumberSchema,
  organization: z.string().max(200, 'Organization name too long').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  preferences: z.object({
    notifications: z.boolean(),
    emailUpdates: z.boolean(),
    theme: z.enum(['light', 'dark', 'auto']),
  }).optional(),
});

export const LoginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignUpCredentialsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
  organizationName: z.string().max(200, 'Organization name too long').optional(),
  businessType: z.string().max(100, 'Business type too long').optional(),
  phone: phoneNumberSchema,
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  location: z.string().max(200, 'Location too long').optional(),
  state: z.string().max(100, 'State too long').optional(),
  country: z.string().max(100, 'Country too long').optional(),
  terms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
  marketing: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// =================================================================
// API RESPONSE SCHEMAS
// =================================================================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    success: z.boolean(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      hasMore: z.boolean(),
      lastDoc: z.any().optional(),
    }),
  });

// =================================================================
// FORM VALIDATION SCHEMAS
// =================================================================

export const TimeEntrySchema = z.object({
  timestamp: z.date(),
  teamId: z.string().min(1, 'Team ID is required'),
  type: z.enum(['start', 'finish']),
  recordedBy: z.string().min(1, 'Recorder name is required'),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const ExportOptionsSchema = z.object({
  format: z.enum(['csv', 'pdf', 'excel']),
  includeFields: z.array(z.string()).min(1, 'At least one field must be included'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filterBy: z.object({
    division: z.string().optional(),
    status: z.array(z.enum(['waiting', 'running', 'finished', 'disqualified', 'withdrawn'])).optional(),
    dateRange: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
  }).optional(),
});

// =================================================================
// VALIDATION UTILITY FUNCTIONS
// =================================================================

export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Unknown validation error'],
    };
  }
}

export function validatePartialData<T>(schema: z.ZodObject<any>, data: unknown): ValidationResult<Partial<T>> {
  try {
    const result = schema.partial().parse(data) as Partial<T>;
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      success: false,
      errors: ['Unknown validation error'],
    };
  }
}

// =================================================================
// TYPE INFERENCE FROM SCHEMAS
// =================================================================
// These types are automatically inferred from the Zod schemas above
// and ensure perfect sync between runtime validation and TypeScript types

export type ValidatedEventDetails = z.infer<typeof EventDetailsSchema>;
export type ValidatedDivision = z.infer<typeof DivisionSchema>;
export type ValidatedTeam = z.infer<typeof TeamSchema>;
export type ValidatedSavedEvent = z.infer<typeof SavedEventSchema>;
export type ValidatedUserProfile = z.infer<typeof UserProfileSchema>;
export type ValidatedLoginCredentials = z.infer<typeof LoginCredentialsSchema>;
export type ValidatedSignUpCredentials = z.infer<typeof SignUpCredentialsSchema>;
export type ValidatedTimeEntry = z.infer<typeof TimeEntrySchema>;
export type ValidatedExportOptions = z.infer<typeof ExportOptionsSchema>;

// Helper to create validated API response types
export type ValidatedApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<z.ZodSchema<T>>>>;
export type ValidatedPaginatedResponse<T> = z.infer<ReturnType<typeof PaginatedResponseSchema<z.ZodSchema<T>>>>;