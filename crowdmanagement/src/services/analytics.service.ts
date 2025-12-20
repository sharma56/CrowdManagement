import axios from 'axios';
import { authService } from './auth.service';
import type {
  AnalyticsDwellRequest,
  AnalyticsDwellResponse,
  AnalyticsFootfallRequest,
  AnalyticsFootfallResponse,
  AnalyticsOccupancyRequest,
  AnalyticsOccupancyResponse,
  AnalyticsDemographicsRequest,
  AnalyticsDemographicsResponse,
  EntryExitRequest,
  EntryExitResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Log API base URL on service initialization
console.log('AnalyticsService: API Base URL configured as:', API_BASE_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout (reduced for faster failure detection)
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and provide better error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.location.href = '/login';
    }
    
    // Provide better error messages for common issues
    if (error.response?.status === 502) {
      console.error('502 Bad Gateway Error:', {
        message: 'The backend server is not responding or the gateway cannot reach it.',
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        suggestions: [
          '1. Check if the backend server is running',
          '2. Verify the API URL in .env file (VITE_API_BASE_URL)',
          '3. Check backend server logs for errors',
          '4. Ensure the backend is accessible at the configured URL',
          '5. If using a proxy/gateway, check its configuration'
        ]
      });
    }
    
    return Promise.reject(error);
  }
);

/**
 * Retry a promise with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 401 (unauthorized) or 404 (not found) errors
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 404) {
          throw error; // Don't retry auth or not found errors
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

class AnalyticsService {

  private async makeRequest<T>(
    endpoint: string,
    data: any,
    endpointName: string
  ): Promise<T> {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log(`AnalyticsService: Calling ${endpointName} at:`, fullUrl);
    console.log(`AnalyticsService: Request payload:`, JSON.stringify(data, null, 2));
    
    return retryWithBackoff(
      async () => {
        const startTime = Date.now();
        const response = await apiClient.post<T>(endpoint, data);
        const duration = Date.now() - startTime;
        console.log(`AnalyticsService: ${endpointName} response received in ${duration}ms`);
        return response.data;
      },
      1, // Reduce retries to 1 (total 2 attempts) for faster failure
      1000 // 1 second base delay
    ).catch((error) => {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          console.error(`AnalyticsService: ${endpointName} timed out - server not responding at ${fullUrl}`);
          throw new Error(`${endpointName} timed out. Server may be unreachable at ${API_BASE_URL}. Check if API server is running.`);
        } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
          console.error(`AnalyticsService: ${endpointName} connection refused - server unreachable at ${fullUrl}`);
          throw new Error(`Cannot connect to API server at ${API_BASE_URL}. Please ensure the server is running and check VITE_API_BASE_URL in .env file.`);
        } else if (error.response) {
          console.error(`AnalyticsService: ${endpointName} error response:`, error.response.status, error.response.data);
          const errorMsg = error.response.data?.message || error.response.data?.error || `${error.response.status} ${error.response.statusText}`;
          throw new Error(`${endpointName} failed: ${errorMsg}`);
        }
      }
      console.error(`AnalyticsService: ${endpointName} failed:`, error);
      throw error;
    });
  }

  async getDwellTime(request: AnalyticsDwellRequest): Promise<AnalyticsDwellResponse> {
    // Ensure required fields are present
    if (!request.siteId || !request.fromUtc || !request.toUtc) {
      throw new Error('Dwell Time request requires siteId, fromUtc, and toUtc');
    }
    return this.makeRequest<AnalyticsDwellResponse>(
      '/analytics/dwell',
      request,
      'Dwell Time'
    );
  }

  async getFootfall(request: AnalyticsFootfallRequest): Promise<AnalyticsFootfallResponse> {
    // Ensure required fields are present
    if (!request.siteId || !request.fromUtc || !request.toUtc) {
      throw new Error('Footfall request requires siteId, fromUtc, and toUtc');
    }
    return this.makeRequest<AnalyticsFootfallResponse>(
      '/analytics/footfall',
      request,
      'Footfall'
    );
  }

  async getOccupancy(request: AnalyticsOccupancyRequest): Promise<AnalyticsOccupancyResponse> {
    // Ensure required fields are present
    if (!request.siteId || !request.fromUtc || !request.toUtc) {
      throw new Error('Occupancy request requires siteId, fromUtc, and toUtc');
    }
    return this.makeRequest<AnalyticsOccupancyResponse>(
      '/analytics/occupancy',
      request,
      'Occupancy'
    );
  }

  async getDemographics(
    request: AnalyticsDemographicsRequest
  ): Promise<AnalyticsDemographicsResponse> {
    // Ensure required fields are present
    if (!request.siteId || !request.fromUtc || !request.toUtc) {
      throw new Error('Demographics request requires siteId, fromUtc, and toUtc');
    }
    return this.makeRequest<AnalyticsDemographicsResponse>(
      '/analytics/demographics',
      request,
      'Demographics'
    );
  }

  async getEntryExit(request: EntryExitRequest): Promise<EntryExitResponse> {
    const response = await apiClient.post<EntryExitResponse>('/analytics/entry-exit', request);
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();

