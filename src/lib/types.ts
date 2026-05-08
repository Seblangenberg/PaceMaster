
// =================================================================
// HUNTER PACE APP TYPE DEFINITIONS
// =================================================================

// Core Event Types
export interface EventDetails {
  name: string;
  date: Date | undefined;
  location: string;
  organizer: string;
  description?: string;
  rules?: string;
  contactEmail?: string;
  contactPhone?: string;
  maxTeams?: number;
  registrationFee?: number;
  startTime?: string; // Format: "HH:MM"
  weatherConditions?: string;
}

export interface Division {
  id: string;
  name: string;
  optimalTime: number; // in minutes
  description?: string;
  minRiders?: number;
  maxRiders?: number;
  ageRestrictions?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'open';
  createdAt?: Date;
  updatedAt?: Date;
}

// Team and Timing Types
export type TeamStatus = 'waiting' | 'running' | 'finished' | 'disqualified' | 'withdrawn';

export interface Team {
  id: string;
  number: number;
  name?: string;
  riders: string; // Comma-separated rider names
  divisionId?: string;
  status: TeamStatus;
  startTime?: Date;
  finishTime?: Date;
  elapsedTime?: number; // in seconds
  penalties?: number; // in seconds
  notes?: string;
  contactEmail?: string;
  contactPhone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SavedEvent {
  id: string;
  lastModified: Date;
  eventDetails: EventDetails;
  divisions: Division[];
  teams: Team[];
  // Firebase fields
  organizerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isPublic?: boolean;
  publicSlug?: string;
  maxTeams?: number;
  registrationDeadline?: Date;
  description?: string;
  rules?: string;
  contactInfo?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin' | 'organizer';
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  phoneNumber?: string;
  organization?: string;
  bio?: string;
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

// Authentication credential types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName?: string;
  businessType?: string;
  phone?: string;
  website?: string;
  state?: string;
  country?: string;
  terms: boolean;
  marketing: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// New interfaces for enhanced functionality
export interface EventResult {
  id: string;
  eventId: string;
  teamId: string;
  teamName: string;
  divisionId: string;
  divisionName: string;
  startTime: Date;
  finishTime: Date;
  totalTime: number; // in seconds
  penalties: number;
  notes?: string;
  rank?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  divisionId: string;
  divisionName: string;
  totalTime: number;
  penalties: number;
  rank: number;
  lastUpdated: Date;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  teamId: string;
  teamName: string;
  divisionId: string;
  riders: string[];
  contactEmail: string;
  contactPhone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  specialRequests?: string;
  registrationDate: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionText?: string;
}

export interface AppSettings {
  id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: Date;
  updatedBy: string;
}

// Firebase-specific types
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    lastDoc?: any;
  };
}

// =================================================================
// VALIDATION AND UTILITY TYPES
// =================================================================

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

// Utility types for better type safety
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Database operation types
export type CreateEventData = Omit<SavedEvent, 'id' | 'lastModified' | 'createdAt' | 'updatedAt'>;
export type UpdateEventData = Partial<CreateEventData> & { id: string };
export type CreateTeamData = Omit<Team, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTeamData = Partial<CreateTeamData> & { id: string };
export type CreateDivisionData = Omit<Division, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDivisionData = Partial<CreateDivisionData> & { id: string };

// Event timing utilities
export interface TimeEntry {
  timestamp: Date;
  teamId: string;
  type: 'start' | 'finish';
  recordedBy: string;
  notes?: string;
}

export interface TimingStats {
  totalTeams: number;
  waitingTeams: number;
  runningTeams: number;
  finishedTeams: number;
  averageTime?: number;
  fastestTime?: number;
  slowestTime?: number;
}

// Export/Import types
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeFields: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filterBy?: {
    division?: string;
    status?: TeamStatus[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  warnings?: Array<{
    row: number;
    message: string;
  }>;
}

// PWA and Offline types
export interface OfflineAction {
  id: string;
  type: 'CREATE_TEAM' | 'UPDATE_TEAM' | 'UPDATE_TIME' | 'CREATE_EVENT' | 'UPDATE_EVENT';
  data: any;
  timestamp: Date;
  retry: boolean;
}

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Error handling types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  action?: string;
  recoverable: boolean;
}

export type ErrorCode = 
  | 'FIREBASE_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

// Component prop types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

// Configuration types
export interface AppConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  features: {
    offlineMode: boolean;
    pushNotifications: boolean;
    analytics: boolean;
    debugging: boolean;
  };
}
