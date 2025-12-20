import axios from 'axios';
import type { LoginRequest, LoginResponse, SitesResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const TOKEN_KEY = 'auth_token';
const SITE_ID_KEY = 'site_id';

/**
 * Decode JWT token to extract payload
 * JWT tokens have format: header.payload.signature
 */
function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null; // Not a valid JWT format
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(paddedPayload);
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to decode JWT token:', error);
    return null;
  }
}

class AuthService {
  private token: string | null = null;
  private siteId: string | null = null;

  constructor() {
    // Load token and siteId from localStorage on initialization
    this.token = localStorage.getItem(TOKEN_KEY);
    this.siteId = localStorage.getItem(SITE_ID_KEY);
    
    // Fallback to environment variable if siteId not in storage
    const envSiteId = import.meta.env.VITE_SITE_ID;
    if (!this.siteId && envSiteId && typeof envSiteId === 'string') {
      this.siteId = envSiteId;
      localStorage.setItem(SITE_ID_KEY, this.siteId);
    }
  }

  /**
   * Fetch sites from /api/sites endpoint
   * Returns the first site ID if available
   */
  private async fetchSiteIdFromSites(): Promise<string | null> {
    try {
      const token = this.getToken();
      if (!token) {
        console.warn('Cannot fetch sites: No authentication token');
        return null;
      }

      const response = await axios.get<SitesResponse>(
        `${API_BASE_URL}/sites`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Handle response - API returns Site[] array directly
      let siteId: string | null = null;
      
      console.log('AuthService: Sites response data:', response.data);
      console.log('AuthService: Response data type:', typeof response.data, Array.isArray(response.data));
      
      // Case 1: Response is an array (most common - API returns Site[])
      if (Array.isArray(response.data) && response.data.length > 0) {
        const firstSite = response.data[0];
        console.log('AuthService: First site from array:', firstSite);
        
        // Check for siteId property (API uses siteId according to documentation)
        if (firstSite && typeof firstSite === 'object') {
          if ('siteId' in firstSite && typeof (firstSite as any).siteId === 'string') {
            siteId = (firstSite as any).siteId;
          } else if ('id' in firstSite && typeof (firstSite as any).id === 'string') {
            // Fallback to id if siteId not present (for backward compatibility)
            siteId = (firstSite as any).id;
          }
        }
      }
      // Case 2: Response is a single site object (fallback)
      else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        console.log('AuthService: Single site object detected');
        if ('siteId' in response.data && typeof (response.data as any).siteId === 'string') {
          siteId = (response.data as any).siteId;
        } else if ('id' in response.data && typeof (response.data as any).id === 'string') {
          siteId = (response.data as any).id;
        }
      }
      // Case 3: Response has sites array (fallback)
      else if (response.data && typeof response.data === 'object' && 'sites' in response.data) {
        console.log('AuthService: Sites array in response.data.sites');
        const sitesArray = (response.data as any).sites;
        if (Array.isArray(sitesArray) && sitesArray.length > 0) {
          const firstSite = sitesArray[0];
          if (firstSite && typeof firstSite === 'object') {
            siteId = (firstSite as any).siteId || (firstSite as any).id || null;
          }
        }
      }
      // Case 4: Response has data array (fallback)
      else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        console.log('AuthService: Data array in response.data.data');
        const dataArray = (response.data as any).data;
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const firstSite = dataArray[0];
          if (firstSite && typeof firstSite === 'object') {
            siteId = (firstSite as any).siteId || (firstSite as any).id || null;
          }
        }
      }
      
      console.log('AuthService: Extracted siteId:', siteId);
      
      if (siteId) {
        console.log('SiteId fetched from /api/sites:', siteId);
        return siteId;
      }

      console.warn('No site found in /api/sites response');
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.warn('Failed to fetch sites:', error.response?.status, error.response?.statusText);
      } else {
        console.warn('Failed to fetch sites:', error);
      }
      return null;
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('AuthService: Attempting login with email:', credentials.email);
      console.log('AuthService: API Base URL:', API_BASE_URL);
      
      const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/login`,
        credentials
      );

      console.log('AuthService: Login response received:', {
        hasToken: !!response.data.token,
        hasSiteId: !!response.data.siteId,
        hasUser: !!response.data.user,
      });

      if (!response.data.token) {
        throw new Error('Login failed: No token received from server');
      }

      this.setToken(response.data.token);
      console.log('AuthService: Token stored successfully');

      // Try to get siteId from multiple sources:
      // 1. Direct from login response (top-level)
      // 2. From user object in login response
      // 3. From JWT token payload
      // 4. From /api/sites endpoint (get first site)
      let siteId: string | null = null;
      
      // Check login response first
      if (response.data.siteId && typeof response.data.siteId === 'string') {
        siteId = response.data.siteId;
        console.log('AuthService: SiteId found in login response:', siteId);
      } else if (response.data.user?.siteId && typeof response.data.user.siteId === 'string') {
        siteId = response.data.user.siteId;
        console.log('AuthService: SiteId found in user object:', siteId);
      }
      
      // If not found in response, try to extract from JWT token
      if (!siteId && response.data.token) {
        const tokenPayload = decodeJWT(response.data.token);
        if (tokenPayload) {
          console.log('AuthService: JWT payload extracted, checking for siteId...');
          // Check common JWT claim names for siteId
          siteId = tokenPayload.siteId || 
                   tokenPayload.site_id || 
                   tokenPayload.siteID ||
                   tokenPayload.user?.siteId ||
                   tokenPayload.user?.site_id ||
                   null;
          
          if (siteId) {
            console.log('AuthService: SiteId found in JWT token:', siteId);
          }
        }
      }

      // If still not found, fetch from /api/sites endpoint
      if (!siteId && response.data.token) {
        console.log('AuthService: Fetching siteId from /api/sites endpoint...');
        try {
          siteId = await this.fetchSiteIdFromSites();
          if (siteId) {
            console.log('AuthService: SiteId fetched from /api/sites:', siteId);
          }
        } catch (sitesError) {
          console.warn('AuthService: Failed to fetch sites, but continuing login:', sitesError);
          // Don't throw - login should succeed even if sites fetch fails
        }
      }

      if (siteId && typeof siteId === 'string') {
        console.log('AuthService: SiteId set successfully:', siteId);
        this.setSiteId(siteId);
        // Add siteId to response data if it wasn't already there
        if (!response.data.siteId) {
          response.data.siteId = siteId;
        }
      } else {
        console.warn('AuthService: No siteId found. Login will continue, but dashboard may require manual siteId entry.');
        console.log('AuthService: Login response data:', response.data);
        if (response.data.token) {
          const tokenPayload = decodeJWT(response.data.token);
          console.log('AuthService: JWT token payload:', tokenPayload);
        }
      }

      console.log('AuthService: Login successful');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('AuthService: Login error details:', {
          message: error.message,
          code: error.code,
          response: error.response?.status,
          config: {
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            method: error.config?.method,
          }
        });

        // Connection refused - server not running
        if (error.code === 'ECONNREFUSED' || error.message.includes('ERR_CONNECTION_REFUSED')) {
          throw new Error(
            `Cannot connect to backend server at ${API_BASE_URL}. Please ensure the backend is running and check your VITE_API_BASE_URL environment variable.`
          );
        }

        // Network error - no response received
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
          throw new Error(
            `Network error: Cannot reach the backend server at ${API_BASE_URL}. Please check:\n` +
            `1. Is the backend server running?\n` +
            `2. Is the API URL correct in your .env file? (VITE_API_BASE_URL)\n` +
            `3. Check browser console for CORS errors\n` +
            `4. Try accessing the backend directly: ${API_BASE_URL}/auth/login`
          );
        }

        // CORS error
        if (error.message.includes('CORS') || error.code === 'ERR_CORS') {
          throw new Error(
            `CORS error: The backend server needs to allow requests from this origin. Please configure CORS on your backend server.`
          );
        }

        if (error.response) {
          // Server responded with error status
          throw new Error(error.response.data?.message || `Login failed: ${error.response.status} ${error.response.statusText}`);
        }

        // Other network errors
        throw new Error(`Network error: ${error.message || 'Please check your connection and ensure the backend server is running.'}`);
      }
      throw error;
    }
  }

  logout(): void {
    this.token = null;
    this.siteId = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SITE_ID_KEY);
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  }

  setSiteId(siteId: string): void {
    this.siteId = siteId;
    localStorage.setItem(SITE_ID_KEY, siteId);
  }

  getSiteId(): string | null {
    return this.siteId || localStorage.getItem(SITE_ID_KEY);
  }
}

export const authService = new AuthService();

