// =================================================================
// TYPED API SERVICE LAYER FOR HUNTER PACE APP
// =================================================================

import { z } from 'zod';
import { 
  SavedEvent, 
  Team, 
  Division, 
  UserProfile, 
  EventResult,
  ApiResponse,
  PaginatedResponse,
  AppError
} from './types';

import { 
  SavedEventSchema,
  TeamSchema,
  DivisionSchema,
  UserProfileSchema,
  ApiResponseSchema,
  PaginatedResponseSchema,
  validateData,
  type ValidationResult
} from './validation';

// =================================================================
// API CONFIGURATION
// =================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 'http://localhost:5001';
const API_TIMEOUT = 10000; // 10 seconds

// =================================================================
// ERROR HANDLING
// =================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =================================================================
// BASE API CLIENT
// =================================================================

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    expectedSchema?: any
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.code || 'HTTP_ERROR',
          errorData
        );
      }

      const data = await response.json();

      // Validate response if schema provided
      if (expectedSchema) {
        const validation = validateData(expectedSchema, data);
        if (!validation.success) {
          throw new ApiError(
            'Invalid response format',
            500,
            'VALIDATION_ERROR',
            validation.errors
          );
        }
        return validation.data as T;
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  // Helper methods for different HTTP verbs
  async get<T>(endpoint: string, schema?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, schema);
  }

  async post<T>(endpoint: string, data: any, schema?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, schema);
  }

  async put<T>(endpoint: string, data: any, schema?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, schema);
  }

  async delete<T>(endpoint: string, schema?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, schema);
  }

  // Add authorization header
  setAuthToken(token: string) {
    this.request = this.request.bind(this);
    const originalRequest = this.request;
    
    this.request = async function<T>(endpoint: string, options: RequestInit = {}, schema?: any): Promise<T> {
      return originalRequest<T>(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        },
      }, schema);
    };
  }
}

// =================================================================
// API SERVICES
// =================================================================

export class EventsApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  async getEvents(params?: {
    limit?: number;
    offset?: number;
    organizerId?: string;
  }): Promise<ApiResponse<SavedEvent[]>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.organizerId) queryParams.set('organizerId', params.organizerId);

    const endpoint = `/api/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.client.get<ApiResponse<SavedEvent[]>>(
      endpoint,
      ApiResponseSchema(SavedEventSchema.array())
    );
  }

  async getEvent(eventId: string): Promise<ApiResponse<SavedEvent>> {
    return this.client.get<ApiResponse<SavedEvent>>(
      `/api/events/${eventId}`,
      ApiResponseSchema(SavedEventSchema)
    );
  }

  async createEvent(eventData: Omit<SavedEvent, 'id' | 'lastModified'>): Promise<ApiResponse<{ id: string }>> {
    return this.client.post<ApiResponse<{ id: string }>>(
      '/api/events',
      eventData,
      ApiResponseSchema(z.object({ id: z.string() }))
    );
  }

  async updateEvent(eventData: SavedEvent): Promise<ApiResponse<{ id: string }>> {
    return this.client.put<ApiResponse<{ id: string }>>(
      '/api/events',
      eventData,
      ApiResponseSchema(z.object({ id: z.string() }))
    );
  }

  async deleteEvent(eventId: string): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(
      `/api/events/${eventId}`,
      ApiResponseSchema(z.void())
    );
  }

  async getEventDivisions(eventId: string): Promise<ApiResponse<Division[]>> {
    return this.client.get<ApiResponse<Division[]>>(
      `/api/events/${eventId}/divisions`,
      ApiResponseSchema(DivisionSchema.array())
    );
  }

  async getEventTeams(eventId: string): Promise<ApiResponse<Team[]>> {
    return this.client.get<ApiResponse<Team[]>>(
      `/api/events/${eventId}/teams`,
      ApiResponseSchema(TeamSchema.array())
    );
  }

  async getEventResults(eventId: string, divisionId?: string): Promise<ApiResponse<EventResult[]>> {
    const queryParams = divisionId ? `?divisionId=${divisionId}` : '';
    return this.client.get<ApiResponse<EventResult[]>>(
      `/api/events/${eventId}/results${queryParams}`
    );
  }

  async exportEventResults(eventId: string, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/export?format=${format}`);
    if (!response.ok) {
      throw new ApiError('Export failed', response.status, 'EXPORT_ERROR');
    }
    return response.blob();
  }
}

export class UsersApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    return this.client.get<ApiResponse<UserProfile>>(
      '/api/user/profile',
      ApiResponseSchema(UserProfileSchema)
    );
  }

  async updateUserProfile(profileData: Partial<UserProfile>): Promise<ApiResponse<void>> {
    return this.client.put<ApiResponse<void>>(
      '/api/user/profile',
      profileData,
      ApiResponseSchema(z.void())
    );
  }
}

export class UploadApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  async uploadFile(
    type: string,
    id: string,
    file: File
  ): Promise<ApiResponse<{ url: string; fileName: string; size: number }>> {
    const formData = new FormData();
    formData.append('file', file);

    // Override content type for file upload
    const response = await fetch(`${API_BASE_URL}/api/upload/${type}/${id}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || 'Upload failed',
        response.status,
        'UPLOAD_ERROR'
      );
    }

    return response.json();
  }
}

// =================================================================
// MAIN API INSTANCE
// =================================================================

export class HunterPaceApi {
  private client: ApiClient;
  
  public events: EventsApi;
  public users: UsersApi;
  public upload: UploadApi;

  constructor(baseUrl?: string, timeout?: number) {
    this.client = new ApiClient(baseUrl, timeout);
    
    this.events = new EventsApi(this.client);
    this.users = new UsersApi(this.client);
    this.upload = new UploadApi(this.client);
  }

  setAuthToken(token: string) {
    this.client.setAuthToken(token);
  }

  // Health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { status: 'error', timestamp: new Date().toISOString() };
    }
  }
}

// =================================================================
// SINGLETON INSTANCE
// =================================================================

export const api = new HunterPaceApi();

// =================================================================
// HOOK FOR REACT COMPONENTS
// =================================================================

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export function useApi() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      // Set auth token when user is available
      // You'd need to get the actual token from Firebase Auth
      // api.setAuthToken(userToken);
    }
  }, [user]);

  return api;
}

// =================================================================
// UTILITIES
// =================================================================

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function handleApiError(error: unknown): AppError {
  if (isApiError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date(),
      recoverable: error.status >= 400 && error.status < 500,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    timestamp: new Date(),
    recoverable: false,
  };
}