import { useEffect, useState } from "react";
import type { SocketAlertEvent, Site } from "../../types/api";
import moment from "moment";
import { authService } from "../../services/auth.service";
import axios from "axios";
import "./AlertsPanel.css";

interface AlertsPanelProps {
  alerts: SocketAlertEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export function AlertsPanel({ alerts, isOpen, onClose }: AlertsPanelProps) {
  const [sitesCache, setSitesCache] = useState<Map<string, string>>(new Map());

  // Fetch sites when panel opens
  useEffect(() => {
    if (isOpen && sitesCache.size === 0) {
      fetchSites();
    }
  }, [isOpen]);

  const fetchSites = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
      const response = await axios.get<Site[]>(`${API_BASE_URL}/sites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const sites = Array.isArray(response.data)
        ? response.data
        : [response.data];
      const cache = new Map<string, string>();

      sites.forEach((site) => {
        if (site.siteId && site.name) {
          cache.set(site.siteId, site.name);
        }
      });

      setSitesCache(cache);
    } catch (error) {
      console.warn("AlertsPanel: Failed to fetch sites:", error);
    }
  };

  const getSiteName = (alert: SocketAlertEvent): string => {
    // Try multiple ways to get site name
    if (alert.site?.name) {
      return alert.site.name;
    }

    const siteId = alert.site?.id || (alert as any).siteId;
    if (siteId && sitesCache.has(siteId)) {
      return sitesCache.get(siteId) || "Unknown Site";
    }

    // Fallback to stored siteId from authService
    const storedSiteId = authService.getSiteId();
    if (storedSiteId && sitesCache.has(storedSiteId)) {
      return sitesCache.get(storedSiteId) || "Unknown Site";
    }

    return "Unknown Site";
  };

  const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return "";
    try {
      return moment(timestamp).format("DD MMM YYYY, hh:mm a");
    } catch (error) {
      return "";
    }
  };

  const formatEventName = (alert: SocketAlertEvent): string => {
    // First, try to use personName if available
    if (alert.personName) {
      const actionFormatted = (alert.action || "activity").replace("_", "-");
      return `${alert.personName} ${actionFormatted}`;
    }

    const message = alert.message || "";
    const action = alert.action || "activity";

    // Try multiple patterns to extract person name from message
    // Pattern 1: "Name action" (e.g., "John Doe exit", "Amelia Halvorson Sr. exit")
    let nameMatch = message.match(
      /^([A-Za-z\s\.]+?)\s+(entry|exit|zone-entry|zone-exit|zone_activity)/i
    );

    // Pattern 2: "action by Name" (e.g., "exit by John Doe")
    if (!nameMatch) {
      nameMatch = message.match(
        /(entry|exit|zone-entry|zone-exit|zone_activity)\s+by\s+([A-Za-z\s\.]+)/i
      );
      if (nameMatch && nameMatch[2]) {
        const personName = nameMatch[2].trim();
        const actionFormatted = action.replace("_", "-");
        return `${personName} ${actionFormatted}`;
      }
    }

    // Pattern 3: Check if message starts with a name (capitalized words, may include titles like "Sr.", "Jr.")
    if (!nameMatch) {
      nameMatch = message.match(
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Sr\.|Jr\.|II|III|IV))?)/
      );
    }

    if (nameMatch && nameMatch[1]) {
      const personName = nameMatch[1].trim();
      const actionFormatted = action.replace("_", "-");
      return `${personName} ${actionFormatted}`;
    }

    // Fallback: use action with generic name
    const actionFormatted = action.replace("_", "-");
    return `Person ${actionFormatted}`;
  };

  const getSeverityClass = (severity: string): string => {
    switch (severity?.toLowerCase()) {
      case "high":
      case "critical":
        return "severity-high";
      case "medium":
        return "severity-medium";
      case "low":
      default:
        return "severity-low";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="alerts-panel-overlay" onClick={onClose}></div>
      <div className="alerts-panel">
        <div className="alerts-panel-header">
          <h2 className="alerts-panel-title">Alerts</h2>
          <button
            className="alerts-panel-close"
            onClick={onClose}
            aria-label="Close alerts"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="alerts-panel-content">
          {alerts.length === 0 ? (
            <div className="alerts-empty">
              <p>No alerts yet</p>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert, index) => {
                const siteName = getSiteName(alert);
                const securityLevel = alert.zone?.securityLevel || "LOW";
                const location = `${siteName} ${securityLevel} Zone · ${siteName}`;
                const eventName = formatEventName(alert);
                const timestamp = formatTimestamp(alert.timestamp);
                const severity = alert.severity || "low";

                return (
                  <div
                    key={`${alert.timestamp}-${index}`}
                    className="alert-card"
                  >
                    <div className="alert-card-timestamp">{timestamp}</div>
                    <div className="alert-card-event">{eventName}</div>
                    <div className="alert-card-location">{location}</div>
                    <div
                      className={`alert-card-severity ${getSeverityClass(
                        severity
                      )}`}
                    >
                      {severity}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
