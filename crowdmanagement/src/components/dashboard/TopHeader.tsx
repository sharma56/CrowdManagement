import { useState, useEffect, useRef } from "react";
import "./TopHeader.css";

interface TopHeaderProps {
  siteName?: string;
  alertsCount?: number;
  onNotificationClick?: () => void;
}

export function TopHeader({
  siteName = "Dubai Mall",
  alertsCount = 0,
  onNotificationClick,
}: TopHeaderProps) {
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const locations = [
    "Dubai Mall",
    "San Francisco International Airport",
    "Phoenix Marketcity Bengaluru",
    "Tokyo Station",
    "Marina Bay Sands",
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLocationDropdown(false);
      }
    };

    if (showLocationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLocationDropdown]);

  return (
    <div className="top-header">
      <div className="top-header-left">
        <span className="crowd-solutions-text">Crowd Solutions</span>
        <div className="header-separator"></div>

        <div className="location-dropdown-wrapper" ref={locationDropdownRef}>
          <button
            className="location-button"
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="10"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span>{siteName}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showLocationDropdown && (
            <div className="location-dropdown">
              {locations.map((location) => (
                <button
                  key={location}
                  className={`location-item ${
                    location === siteName ? "active" : ""
                  }`}
                  onClick={() => {
                    setShowLocationDropdown(false);
                  }}
                >
                  {location}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="top-header-center"></div>

      <div className="top-header-right">
        <div className="notification-icon-wrapper">
          <button
            className="notification-button"
            aria-label="Notifications"
            onClick={onNotificationClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {alertsCount > 0 && (
              <span className="notification-badge">
                {alertsCount > 99 ? "99+" : alertsCount}
              </span>
            )}
          </button>
        </div>
        <div className="user-avatar">
          <span>P</span>
        </div>
      </div>
    </div>
  );
}
