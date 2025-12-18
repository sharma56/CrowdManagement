import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { analyticsService } from "../../services/analytics.service";
import { authService } from "../../services/auth.service";
import type { CrowdEntry } from "../../types/api";
import { format } from "date-fns";
import "./CrowdEntries.css";

export function CrowdEntries() {
  const [entries, setEntries] = useState<CrowdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);

      // Get siteId and calculate date range
      const siteId = authService.getSiteId();
      if (!siteId) {
        console.error("No siteId found for entries");
        setEntries([]);
        setTotalRecords(0);
        setTotalPages(0);
        return;
      }

      // Calculate UTC timestamps for today (start and end of day) using moment.js
      const fromUtc = moment.utc().startOf("day").valueOf();
      const toUtc = moment.utc().endOf("day").valueOf();

      const response = await analyticsService.getEntryExit({
        siteId,
        fromUtc,
        toUtc,
        pageNumber: page,
        pageSize,
      });

      // Safety checks for response data - using records instead of entries
      setEntries(Array.isArray(response?.records) ? response.records : []);
      setTotalRecords(
        typeof response?.totalRecords === "number" &&
          !isNaN(response.totalRecords)
          ? response.totalRecords
          : 0
      );
      setTotalPages(
        typeof response?.totalPages === "number" && !isNaN(response.totalPages)
          ? response.totalPages
          : 0
      );
    } catch (error) {
      console.error("Failed to load entries:", error);
      // Set safe defaults on error
      setEntries([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Format time as HH:MM AM/PM (for Entry/Exit columns)
  const formatTime = (
    dateString: string | null | undefined,
    utcTimestamp?: number | null
  ): string => {
    // Try UTC timestamp first (new API format)
    if (
      utcTimestamp &&
      typeof utcTimestamp === "number" &&
      !isNaN(utcTimestamp)
    ) {
      try {
        return format(new Date(utcTimestamp), "hh:mm a");
      } catch {
        // Fall through to dateString
      }
    }

    // Fallback to dateString (old format or local time)
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "--";
      return format(date, "hh:mm a");
    } catch {
      return "--";
    }
  };

  // Format dwell time as MM:SS
  const formatDwellTime = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined || isNaN(minutes))
      return "--";

    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Generate initials for avatar
  const getInitials = (name: string): string => {
    if (!name || name === "Unknown") return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get avatar color based on name
  const getAvatarColor = (name: string): string => {
    const colors = [
      "#667eea",
      "#f093fb",
      "#4facfe",
      "#43e97b",
      "#fa709a",
      "#fee140",
      "#30cfd0",
      "#a8edea",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Generate pagination page numbers
  const getPaginationPages = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page <= 3) {
        // Near the start
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        // Near the end
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push("...");
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="entries-container">
      <header className="entries-header">
        <h1>Crowd Entries</h1>
        <div className="header-actions">
          <button onClick={() => navigate("/dashboard")} className="nav-button">
            Dashboard
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="entries-content">
        {loading ? (
          <div className="loading">Loading entries...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Sex</th>
                    <th>Entry</th>
                    <th>Exit</th>
                    <th>Dwell Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="no-data">
                        No entries found
                      </td>
                    </tr>
                  ) : (
                    entries
                      .filter((entry) => entry && typeof entry === "object")
                      .map((entry, index) => {
                        // Handle API format
                        const personName = entry?.personName || "Unknown";
                        const gender = entry?.gender || "other";
                        const entryTime = entry?.entryLocal || "";
                        const entryUtc = entry?.entryUtc || null;
                        const exitTime = entry?.exitLocal || null;
                        const exitUtc = entry?.exitUtc || null;
                        const dwellTime = entry?.dwellMinutes || null;
                        const hasExited = exitTime || exitUtc;

                        return (
                          <tr key={entry?.personId || index}>
                            <td>
                              <div className="name-cell">
                                <div
                                  className="avatar"
                                  style={{
                                    backgroundColor: getAvatarColor(personName),
                                  }}
                                >
                                  {getInitials(personName)}
                                </div>
                                <span className="name-text">{personName}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`gender-badge gender-${gender}`}>
                                {gender === "male"
                                  ? "Male"
                                  : gender === "female"
                                  ? "Female"
                                  : "Other"}
                              </span>
                            </td>
                            <td>{formatTime(entryTime, entryUtc)}</td>
                            <td>
                              {hasExited ? formatTime(exitTime, exitUtc) : "--"}
                            </td>
                            <td>
                              {hasExited ? formatDwellTime(dwellTime) : "--"}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 0 && (
              <div className="pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="pagination-arrow"
                  aria-label="Previous page"
                >
                  &lt;
                </button>
                <div className="pagination-numbers">
                  {getPaginationPages().map((pageNum, idx) => {
                    if (pageNum === "...") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="pagination-ellipsis"
                        >
                          ...
                        </span>
                      );
                    }
                    const pageNumber = pageNum as number;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        disabled={loading}
                        className={`pagination-number ${
                          page === pageNumber ? "active" : ""
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="pagination-arrow"
                  aria-label="Next page"
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
