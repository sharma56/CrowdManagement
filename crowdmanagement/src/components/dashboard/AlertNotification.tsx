import { useState, useEffect } from "react";
import type { SocketAlertEvent } from "../../types/api";
import { authService } from "../../services/auth.service";
import axios from "axios";
import type { Site } from "../../types/api";

interface AlertNotificationProps {
  alert: SocketAlertEvent;
  onClose: () => void;
}

const severityColors: Record<string, string> = {
  low: "#4caf50",
  medium: "#ff9800",
  high: "#f44336",
  critical: "#d32f2f",
};

export function AlertNotification({ alert, onClose }: AlertNotificationProps) {
  const [siteName, setSiteName] = useState<string>("");
  const [zoneName, setZoneName] = useState<string>("");

  // Safety checks for alert data
  if (!alert) {
    return null;
  }

  // Log alert structure for debugging
  console.log("AlertNotification: Received alert data:", alert);

  const severity = alert?.severity || "low";
  const severityColor = severityColors[severity] || "#666";
  const message = alert?.message || "";

  // Extract action from alert - try multiple possible field names
  let action = "";
  if (alert?.action) {
    action = alert.action;
  } else if ((alert as any).type) {
    action = (alert as any).type;
  } else if ((alert as any).event) {
    action = (alert as any).event;
  } else if ((alert as any).eventType) {
    action = (alert as any).eventType;
  }

  // Format action for display
  const actionDisplay = action
    ? typeof action === "string"
      ? action.replace(/_/g, " ").toUpperCase()
      : "ALERT"
    : severity.charAt(0).toUpperCase() + severity.slice(1) + " ALERT";

  // Extract zone name from alert data
  useEffect(() => {
    let extractedZoneName = "";
    if (alert.zone?.name) {
      extractedZoneName = alert.zone.name;
    } else if ((alert as any).zoneName) {
      extractedZoneName = (alert as any).zoneName;
    } else if (alert.zone && typeof alert.zone === "object") {
      extractedZoneName =
        (alert.zone as any).name || (alert.zone as any).zoneName || "";
    }
    setZoneName(extractedZoneName);
  }, [alert]);

  // Extract site name from alert data or fetch from API
  useEffect(() => {
    let extractedSiteName = "";

    // First, try to get from alert data
    if (alert.site?.name) {
      extractedSiteName = alert.site.name;
      setSiteName(extractedSiteName);
    } else if ((alert as any).siteName) {
      extractedSiteName = (alert as any).siteName;
      setSiteName(extractedSiteName);
    } else if (alert.site && typeof alert.site === "object") {
      extractedSiteName =
        (alert.site as any).name || (alert.site as any).siteName || "";
      if (extractedSiteName) {
        setSiteName(extractedSiteName);
      }
    }

    // If not found in alert, try to fetch from sites API
    if (!extractedSiteName) {
      const siteId =
        alert.site?.id || (alert as any).siteId || authService.getSiteId();
      if (siteId) {
        fetchSiteName(siteId);
      }
    }
  }, [alert]);

  const fetchSiteName = async (siteId: string) => {
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

      // Find the site with matching siteId
      const sites = Array.isArray(response.data)
        ? response.data
        : [response.data];
      const site = sites.find(
        (s) => s.siteId === siteId || s.siteId === siteId
      );

      if (site?.name) {
        setSiteName(site.name);
      } else if (sites.length > 0 && sites[0].name) {
        // Fallback to first site name
        setSiteName(sites[0].name);
      }
    } catch (error) {
      console.warn("AlertNotification: Failed to fetch site name:", error);
      // Keep siteName empty if fetch fails
    }
  };

  return (
    <div
      className="alert-notification"
      style={{ borderLeftColor: severityColor }}
    >
      <div className="alert-content">
        <div className="alert-header">
          <div
            className="alert-severity-badge"
            style={{ backgroundColor: severityColor }}
          >
            {severity.charAt(0).toUpperCase()}
          </div>
          <div className="alert-text-content">
            <div className="alert-title">{actionDisplay}</div>
            {(zoneName || siteName) && (
              <div className="alert-subtitle">
                {zoneName && siteName
                  ? `${zoneName} • ${siteName}`
                  : zoneName || siteName}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="alert-close"
            aria-label="Close alert"
          >
            ×
          </button>
        </div>
        {message && <div className="alert-message">{message}</div>}
      </div>
    </div>
  );
}
