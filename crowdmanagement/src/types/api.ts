// API Request/Response Types
// These should match Swagger documentation exactly

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    siteId?: string; // May come from login response
  };
  siteId?: string; // May be at top level
}

export interface Zone {
  zoneId: string;
  name: string;
  securityLevel: string;
}

export interface Site {
  siteId: string;
  name: string;
  timezone: string;
  country: string;
  city: string;
  zones: Zone[];
}

export type SitesResponse = Site[]; // API returns array directly

export interface AnalyticsDwellRequest {
  siteId: string; // Required
  fromUtc: number; // UTC timestamp (milliseconds) - Required
  toUtc: number; // UTC timestamp (milliseconds) - Required
  zoneId?: string; // Optional
}

export interface AnalyticsDwellResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  avgDwellMinutes: number; // Average dwell time in minutes
  dwellRecords: number; // Number of dwell records
}

export interface AnalyticsFootfallRequest {
  siteId: string; // Required
  fromUtc: number; // UTC timestamp (milliseconds) - Required
  toUtc: number; // UTC timestamp (milliseconds) - Required
  zoneId?: string; // Optional
  startTime?: string; // Deprecated, use fromUtc instead
  endTime?: string; // Deprecated, use toUtc instead
}

export interface AnalyticsFootfallResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  footfall: number; // Total number of entries
}

export interface AnalyticsOccupancyRequest {
  siteId: string;
  fromUtc: number; // UTC timestamp (milliseconds)
  toUtc: number; // UTC timestamp (milliseconds)
}

export interface OccupancyBucket {
  utc: number; // UTC timestamp in epoch-millis
  local: string; // Local time string
  avg: number; // Average occupancy for this hour
}

export interface AnalyticsOccupancyResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  timezone: string;
  buckets: OccupancyBucket[];
}

export interface AnalyticsDemographicsRequest {
  siteId: string;
  fromUtc: number; // UTC timestamp (milliseconds)
  toUtc: number; // UTC timestamp (milliseconds)
}

export interface DemographicsBucket {
  utc: number; // UTC timestamp in epoch-millis
  local: string; // Local time string
  male: number;
  female: number;
}

export interface AnalyticsDemographicsResponse {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  timezone: string;
  buckets: DemographicsBucket[];
}

export interface EntryExitRequest {
  siteId: string;
  fromUtc: number;
  toUtc: number;
  pageSize: number;
  pageNumber: number;
}

export interface CrowdEntry {
  personId: string;
  personName: string;
  zoneId: string;
  zoneName: string;
  severity: string;
  entryUtc: number; // UTC timestamp in epoch-millis
  entryLocal: string; // Local time string
  exitUtc: number | null; // UTC timestamp in epoch-millis (null if still active)
  exitLocal: string | null; // Local time string (null if still active)
  dwellMinutes: number; // Dwell time in minutes
  gender?: string; // Optional gender field (may not be in API response)
}

export interface EntryExitResponse {
  siteId: string;
  totalRecords: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  records: CrowdEntry[];
}

// Socket.IO Event Types
export interface SocketAlertEvent {
  action: 'entry' | 'exit' | 'zone_activity';
  zone: {
    id: string;
    name: string;
  };
  site: {
    id: string;
    name: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  message?: string;
}

export interface SocketLiveOccupancyEvent {
  occupancy: number;
  zoneId?: string;
  zoneName?: string;
  siteId?: string;
  siteName?: string;
  timestamp: string;
  maxCapacity?: number;
}

