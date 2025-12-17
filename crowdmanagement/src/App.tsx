import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/auth/Login';
import { Dashboard } from './components/dashboard/Dashboard';
import { CrowdEntries } from './components/entries/CrowdEntries';
import { AuthGuard } from './guards/AuthGuard';
import { authService } from './services/auth.service';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={authService.isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/entries"
          element={
            <AuthGuard>
              <CrowdEntries />
            </AuthGuard>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
