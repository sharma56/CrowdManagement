# How to Find Your API URL

## Quick Steps:

### Step 1: Check Your API Documentation/Swagger
- Look for the **base URL** or **server URL**
- Example: `https://api.example.com` or `http://localhost:8080`

### Step 2: Common API URL Formats:

**If API is on same machine:**
- `http://localhost:3000/api`
- `http://localhost:8080/api`
- `http://localhost:5000/api`

**If API is on a remote server:**
- `https://api.yourdomain.com/api`
- `https://api.example.com/api`
- `http://192.168.1.100:3000/api`

### Step 3: Check Your Swagger/API Docs

Your API documentation should show:
```
Base URL: https://api.example.com
```

OR

```
Server: http://localhost:3000
Base Path: /api
```

**Full URL = Base URL + Base Path**

### Step 4: Test the URL

Try accessing in browser:
- `http://your-api-url/api/auth/login`
- You should get an error (not connection refused)

### Step 5: Update .env File

Once you know the URL, update `.env`:

```env
VITE_API_BASE_URL=https://api.example.com/api
VITE_SOCKET_URL=https://api.example.com
```

**Note:** Remove `/api` from `VITE_SOCKET_URL` if Socket.IO is on root

### Step 6: Restart Dev Server

```bash
npm run dev
```


