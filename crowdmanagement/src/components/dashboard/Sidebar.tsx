import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const toggleSidebar = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-logo">
            <svg
              width="32"
              height="32"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 12V36H20C26.6274 36 32 30.6274 32 24C32 17.3726 26.6274 12 20 12H14Z"
                fill="white"
              />
              <path
                d="M18 16H20C23.3137 16 26 18.6863 26 22C26 25.3137 23.3137 28 20 28H18V16Z"
                fill="#1a6b6c"
              />
              <path
                d="M8 16C8 16 10 14 12 14C14 14 16 16 16 16"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M6 12C6 12 9 9 12 9C15 9 18 12 18 12"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M4 8C4 8 8 4 12 4C16 4 20 8 20 8"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="sidebar-brand">Kloudspot</span>
          </div>
        )}
        <button
          className="sidebar-menu-toggle"
          aria-label="Toggle menu"
          onClick={toggleSidebar}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 12H21M3 6H21M3 18H21"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${
            isActive("/dashboard") ? "active" : ""
          }`}
          onClick={() =>
            navigate("/dashboard", {
              state: {
                collapsed: isCollapsed,
              },
            })
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={isActive("/dashboard") ? "currentColor" : "none"}
            />
          </svg>
          <span>Overview</span>
        </button>

        <button
          className={`sidebar-nav-item ${isActive("/entries") ? "active" : ""}`}
          onClick={() =>
            navigate("/entries", {
              state: {
                collapsed: isCollapsed,
              },
            })
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              stroke="currentColor"
              strokeWidth="2"
              fill={isActive("/entries") ? "currentColor" : "none"}
            />
            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span>Crowd Entries</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 17L21 12L16 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 12H9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
