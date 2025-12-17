# Configuration Guide

## Backend Connection Error Fix

If you're getting `ERR_CONNECTION_REFUSED`, follow these steps:

### Step 1: Ensure Backend Server is Running

Your backend API server must be running before using the frontend.

**Check if backend is running:**
- Open a browser or use curl: `http://localhost:3000/api/auth/login`
- Or check if there's a backend process running

**Start your backend server** (if you have a separate backend project):
```bash
# Navigate to your backend directory
cd ../backend  # or wherever your backend is

# Start the backend server
npm start
# or
npm run dev
# or
node server.js
```

### Step 2: Configure Backend URL (if different from default)

Create a `.env` file in the project root:

```env
# Default backend URL
VITE_API_BASE_URL=http://localhost:3000/api

# Socket.IO URL (usually same host, different path)
VITE_SOCKET_URL=http://localhost:3000
```

**If your backend is on a different port:**
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_SOCKET_URL=http://localhost:8080
```

**If your backend is on a different host:**
```env
VITE_API_BASE_URL=http://192.168.1.100:3000/api
VITE_SOCKET_URL=http://192.168.1.100:3000
```

### Step 3: Restart Frontend Dev Server

After creating/updating `.env`, restart your frontend dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Verify Connection

1. Check browser console for connection errors
2. Try accessing backend directly: `http://localhost:3000/api/auth/login` (should return an error about missing credentials, not connection refused)
3. Check network tab in browser DevTools to see the actual request/response

### Troubleshooting

**Backend not starting?**
- Check if port 3000 is already in use
- Verify backend dependencies are installed
- Check backend logs for errors

**Still getting connection refused?**
- Verify backend is actually running: `curl http://localhost:3000/api/auth/login`
- Check firewall settings
- Verify the URL in `.env` matches your backend exactly
- Check if backend requires CORS configuration

**Different error?**
- 401 Unauthorized: Backend is running but credentials are wrong
- 404 Not Found: Backend is running but endpoint path is wrong
- CORS error: Backend needs CORS configuration to allow frontend origin


