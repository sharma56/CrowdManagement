import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { analyticsService } from "../../services/analytics.service";
import { socketService } from "../../services/socket.service";
import { authService } from "../../services/auth.service";
import type {
  SocketLiveOccupancyEvent,
  SocketAlertEvent,
  AnalyticsDemographicsResponse,
} from "../../types/api";
import { SummaryCards } from "./SummaryCards";
import { OccupancyChart } from "./OccupancyChart";
import { DemographicsChart } from "./DemographicsChart";
import { AlertNotification } from "./AlertNotification";
import "./Dashboard.css";

export function Dashboard() {
  const [_loading, setLoading] = useState(true);
  const [liveOccupancy, setLiveOccupancy] = useState<number | null>(null);
  const [todayFootfall, setTodayFootfall] = useState<number | null>(null);
  const [avgDwellTime, setAvgDwellTime] = useState<number | null>(null);
  const [occupancyData, setOccupancyData] = useState<
    { timestamp: string; occupancy: number }[]
  >([]);
  const [demographicsData, setDemographicsData] =
    useState<AnalyticsDemographicsResponse | null>(null);
  const [alert, setAlert] = useState<SocketAlertEvent | null>(null);
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [failedCalls, setFailedCalls] = useState<string[]>([]);

  // SiteId input state for when siteId is missing (must be before any conditional returns)
  const [siteIdInput, setSiteIdInput] = useState("");
  const [showSiteIdInput, setShowSiteIdInput] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setFailedCalls([]);

      // Get siteId (required for dwell API)
      const siteId = authService.getSiteId();
      console.log("Dashboard: Loading data with siteId:", siteId);

      if (!siteId) {
        console.error("No siteId found. Please check:");
        console.error("1. Login response in browser DevTools -> Network tab");
        console.error("2. Or set VITE_SITE_ID in .env file");
        setError(
          "Site ID is required. Please check your login response (browser console for details) or set VITE_SITE_ID in .env file."
        );
        setLoading(false);
        return;
      }

      // Calculate UTC timestamps for today (start and end of day) using moment.js
      const fromUtc = moment.utc().startOf("day").valueOf();
      const toUtc = moment.utc().endOf("day").valueOf();

      console.log("Dashboard: Starting API calls...");
      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
      console.log("Dashboard: API Base URL:", apiBaseUrl);
      console.log("Dashboard: Site ID:", siteId);
      console.log(
        "Dashboard: Date range - fromUtc:",
        moment.utc(fromUtc).toISOString(),
        "toUtc:",
        moment.utc(toUtc).toISOString()
      );
      console.log(
        "Dashboard: UTC timestamps - fromUtc:",
        fromUtc,
        "toUtc:",
        toUtc
      );

      // Log API configuration for debugging
      console.log("Dashboard: API Configuration:", {
        baseUrl: apiBaseUrl,
        siteId: siteId,
        hasToken: !!authService.getToken(),
      });

      // Load all dashboard data in parallel with individual error handling
      const apiCalls = [
        {
          name: "Dwell Time",
          promise: analyticsService.getDwellTime({
            siteId,
            fromUtc,
            toUtc,
          }),
        },
        {
          name: "Footfall",
          promise: analyticsService.getFootfall({
            siteId,
            fromUtc,
            toUtc,
          }),
        },
        {
          name: "Occupancy",
          promise: analyticsService.getOccupancy({
            siteId,
            fromUtc,
            toUtc,
          }),
        },
        {
          name: "Demographics",
          promise: analyticsService.getDemographics({
            siteId,
            fromUtc,
            toUtc,
          }),
        },
      ];

      // Add timeout to each API call (30 seconds)
      const timeoutPromise = (promise: Promise<any>, name: string) => {
        return Promise.race([
          promise.then((data) => {
            console.log(`Dashboard: ${name} API call completed successfully`);
            return data;
          }),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `${name} API call timed out after 30 seconds. Server may be unreachable at ${apiBaseUrl}`
                  )
                ),
              30000
            )
          ),
        ]);
      };

      const results = await Promise.allSettled(
        apiCalls.map((call) => timeoutPromise(call.promise, call.name))
      );

      console.log("Dashboard: All API calls completed (some may have failed)");

      // Process results
      let hasError = false;
      const errors: string[] = [];
      const failedCallNames: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          hasError = true;
          const callName = apiCalls[index].name;
          failedCallNames.push(callName);
          const errorMsg = `${callName}: ${
            result.reason?.message || "Unknown error"
          }`;
          console.error(`Dashboard: ${errorMsg}`);
          errors.push(errorMsg);
        }
      });

      // Store failed call names for UI display
      setFailedCalls(failedCallNames);

      // Set data from successful calls with safety checks
      if (results[0].status === "fulfilled") {
        const dwellResponse = results[0].value as any;
        const dwellTime = dwellResponse?.avgDwellMinutes; // Updated field name
        if (
          typeof dwellTime === "number" &&
          !isNaN(dwellTime) &&
          dwellTime >= 0
        ) {
          setAvgDwellTime(dwellTime);
          console.log("Dashboard: Dwell time set:", dwellTime);
        } else {
          setAvgDwellTime(null);
          console.warn("Dashboard: Invalid dwell time value:", dwellTime);
        }
      }

      if (results[1].status === "fulfilled") {
        const footfallResponse = results[1].value as any;
        const footfall = footfallResponse?.footfall; // Updated field name
        if (typeof footfall === "number" && !isNaN(footfall) && footfall >= 0) {
          setTodayFootfall(footfall);
          console.log("Dashboard: Footfall set:", footfall);
        } else {
          setTodayFootfall(null);
          console.warn("Dashboard: Invalid footfall value:", footfall);
        }
      }

      if (results[2].status === "fulfilled") {
        const occupancyResponse = results[2].value as any;
        console.log("Dashboard: Occupancy API response:", occupancyResponse);

        // Safety checks for occupancy data - using buckets structure
        let occupancyValue: number | null = null;

        if (
          Array.isArray(occupancyResponse?.buckets) &&
          occupancyResponse.buckets.length > 0
        ) {
          // Get the last bucket's average as current occupancy
          const lastBucket =
            occupancyResponse.buckets[occupancyResponse.buckets.length - 1];
          console.log("Dashboard: Last occupancy bucket:", lastBucket);

          if (
            typeof lastBucket?.avg === "number" &&
            !isNaN(lastBucket.avg) &&
            lastBucket.avg >= 0
          ) {
            occupancyValue = lastBucket.avg;
            console.log(
              "Dashboard: Extracted occupancy value from API:",
              occupancyValue
            );
          }
        } else {
          console.warn(
            "Dashboard: No buckets found in occupancy response or buckets array is empty"
          );
        }

        // Only set if we have a valid value (including 0, but log it)
        if (occupancyValue !== null) {
          if (occupancyValue === 0) {
            console.warn(
              "Dashboard: Occupancy is 0 - this might be expected if no one is present, or check if simulation is running"
            );
          }
          setLiveOccupancy(occupancyValue);
        } else {
          console.warn(
            "Dashboard: Could not extract occupancy value from API response"
          );
          // Keep previous value or set to null
          setLiveOccupancy(null);
        }

        // Transform buckets to the format expected by OccupancyChart
        const transformedData = Array.isArray(occupancyResponse?.buckets)
          ? occupancyResponse.buckets.map((bucket: any) => ({
              timestamp: new Date(bucket.utc).toISOString(),
              occupancy: bucket.avg,
            }))
          : [];
        setOccupancyData(transformedData);
        console.log(
          "Dashboard: Occupancy data set, buckets count:",
          transformedData.length
        );
      }

      if (results[3].status === "fulfilled") {
        const demographicsResponse = results[3].value as any;
        // Safety check: ensure response is an object
        if (demographicsResponse && typeof demographicsResponse === "object") {
          setDemographicsData(demographicsResponse);
          console.log("Dashboard: Demographics set");
        } else {
          setDemographicsData(null);
          console.warn(
            "Dashboard: Invalid demographics response:",
            demographicsResponse
          );
        }
      }

      // Show error only if all calls failed, otherwise show partial data
      if (hasError && results.every((r) => r.status === "rejected")) {
        setError(
          `All API calls failed: ${errors.join(
            ", "
          )}. Please check your connection and try again.`
        );
      } else if (hasError) {
        console.warn(
          "Dashboard: Some API calls failed, but showing partial data:",
          errors
        );
        // Don't set error state if we have some data - just log warnings
        // The dashboard will show "N/A" for failed API calls
        // Show a subtle notification about partial failures
        if (errors.length > 0) {
          console.warn(
            `Dashboard: Failed to load: ${errors.join(
              ", "
            )}. Showing available data.`
          );
        }
      }
    } catch (error) {
      console.error("Dashboard: Failed to load dashboard data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data";
      setError(errorMessage);
    } finally {
      console.log("Dashboard: Setting loading to false");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Socket connection and event listeners
  useEffect(() => {
    console.log("Dashboard: Connecting to socket...");
    socketService.connect();

    // Check socket connection status after a short delay
    setTimeout(() => {
      const isConnected = socketService.isConnected();
      console.log("Dashboard: Socket connection status:", isConnected);
      if (!isConnected) {
        console.warn(
          "Dashboard: Socket is not connected. Live occupancy updates may not work."
        );
        console.warn("Dashboard: Make sure:");
        console.warn("1. VITE_SOCKET_URL is set correctly in .env file");
        console.warn("2. Socket.IO server is running");
        console.warn("3. Simulation is started (GET /api/sim/start)");
      }
    }, 1000);

    const unsubscribeOccupancy = socketService.onLiveOccupancy(
      (event: SocketLiveOccupancyEvent) => {
        console.log("Dashboard: Received live occupancy event:", event);
        // Safety check for event and occupancy value
        if (event && typeof event === "object") {
          // Try multiple possible field names for occupancy
          let occupancyValue: number | null = null;

          if (typeof event.occupancy === "number" && !isNaN(event.occupancy)) {
            occupancyValue = event.occupancy;
          } else if (
            typeof (event as any).count === "number" &&
            !isNaN((event as any).count)
          ) {
            occupancyValue = (event as any).count;
          } else if (
            typeof (event as any).current === "number" &&
            !isNaN((event as any).current)
          ) {
            occupancyValue = (event as any).current;
          } else if (
            typeof (event as any).value === "number" &&
            !isNaN((event as any).value)
          ) {
            occupancyValue = (event as any).value;
          }

          if (occupancyValue !== null && occupancyValue >= 0) {
            console.log(
              "Dashboard: Setting live occupancy from socket:",
              occupancyValue
            );
            setLiveOccupancy(occupancyValue);
          } else {
            console.warn(
              "Dashboard: Invalid occupancy value in socket event:",
              event
            );
          }
        } else {
          console.warn("Dashboard: Invalid socket event received:", event);
        }
      }
    );

    const unsubscribeAlert = socketService.onAlert(
      (event: SocketAlertEvent) => {
        // Safety check for event
        if (event && typeof event === "object") {
          setAlert(event);
          // Auto-dismiss alert after 6 seconds
          setTimeout(() => setAlert(null), 6000);
        }
      }
    );

    return () => {
      unsubscribeOccupancy();
      unsubscribeAlert();
      socketService.disconnect();
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleSetSiteId = () => {
    if (siteIdInput.trim()) {
      authService.setSiteId(siteIdInput.trim());
      setShowSiteIdInput(false);
      loadDashboardData();
    }
  };

  if (error && error.includes("Site ID is required")) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Crowd Management Dashboard</h1>
          <div className="header-actions">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>
        <div className="error-container">
          <div className="error-message-large">
            <h2>⚠️ Site ID Required</h2>
            <p>{error}</p>
            {!showSiteIdInput ? (
              <div>
                <p
                  style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}
                >
                  Please enter your Site ID to continue:
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={siteIdInput}
                    onChange={(e) => setSiteIdInput(e.target.value)}
                    placeholder="Enter Site ID"
                    style={{
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "14px",
                      flex: 1,
                      maxWidth: "300px",
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSetSiteId();
                      }
                    }}
                  />
                  <button onClick={handleSetSiteId} className="retry-button">
                    Set Site ID
                  </button>
                </div>
                <p
                  style={{
                    marginTop: "15px",
                    fontSize: "12px",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  Tip: You can also add VITE_SITE_ID to your .env file to set it
                  permanently
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (error && error.includes("All API calls failed")) {
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Crowd Management Dashboard</h1>
          <div className="header-actions">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>
        <div className="error-container">
          <div className="error-message-large">
            <h2>⚠️ Connection Error</h2>
            <p>{error}</p>
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#f8f9fa",
                borderRadius: "6px",
              }}
            >
              <p style={{ margin: "0 0 10px 0", fontWeight: "600" }}>
                Troubleshooting Steps:
              </p>
              <ol
                style={{
                  margin: "0",
                  paddingLeft: "20px",
                  fontSize: "14px",
                  lineHeight: "1.8",
                }}
              >
                <li>
                  Check if API server is running at:{" "}
                  <code
                    style={{
                      background: "#e9ecef",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    {apiBaseUrl}
                  </code>
                </li>
                <li>
                  Verify your{" "}
                  <code
                    style={{
                      background: "#e9ecef",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    VITE_API_BASE_URL
                  </code>{" "}
                  in{" "}
                  <code
                    style={{
                      background: "#e9ecef",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    .env
                  </code>{" "}
                  file
                </li>
                <li>Check browser console (F12) for detailed error messages</li>
                <li>Ensure you're connected to the internet</li>
                <li>
                  Try accessing the API directly in browser:{" "}
                  <code
                    style={{
                      background: "#e9ecef",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    {apiBaseUrl}/health
                  </code>
                </li>
              </ol>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={loadDashboardData} className="retry-button">
                Retry Now
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(false);
                }}
                className="retry-button"
                style={{ background: "#666" }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Crowd Management Dashboard</h1>
        <div className="header-actions">
          <button onClick={() => navigate("/entries")} className="nav-button">
            View Entries
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      {alert && (
        <AlertNotification alert={alert} onClose={() => setAlert(null)} />
      )}

      <div className="dashboard-content">
        {/* Retry button for failed API calls */}
        {failedCalls.length > 0 && (
          <div className="partial-error-banner">
            <span>
              ⚠️ Failed to load: {failedCalls.join(", ")}. Showing available
              data.
            </span>
            <button onClick={loadDashboardData} className="retry-link-button">
              Retry
            </button>
          </div>
        )}

        <SummaryCards
          liveOccupancy={liveOccupancy}
          todayFootfall={todayFootfall}
          avgDwellTime={avgDwellTime}
        />

        <div className="charts-section">
          <div className="chart-container chart-container-full">
            <h2>Overall Occupancy</h2>
            <OccupancyChart
              data={occupancyData}
              liveOccupancy={liveOccupancy}
            />
          </div>

          <div className="chart-container chart-container-full">
            <h2>Demographics</h2>
            <DemographicsChart data={demographicsData} />
          </div>
        </div>
      </div>
    </div>
  );
}
