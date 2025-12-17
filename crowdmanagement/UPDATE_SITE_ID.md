# How to Update Site ID in .env File

## Step 1: Find Your Actual Site ID

Your Site ID can be found in one of these places:

1. **From Login Response** (Browser DevTools):
   - Press F12 → Network tab
   - Login again
   - Click on `/api/auth/login` request
   - Check Response → Look for `siteId` field

2. **From Swagger Documentation**:
   - Check the login endpoint response schema
   - Look for `siteId` in the response structure

3. **Ask Your Backend Team**:
   - They should know what Site ID to use

## Step 2: Update .env File

Open `.env` file in your project root and replace:

```env
VITE_SITE_ID=your-site-id-here
```

With your actual Site ID, for example:

```env
VITE_SITE_ID=SITE_001
```

OR

```env
VITE_SITE_ID=abc123xyz
```

## Step 3: Restart Dev Server

After updating `.env`:
```bash
npm run dev
```

## Alternative: Use Dashboard UI

If you don't want to edit .env file, you can enter Site ID directly in the Dashboard when the error appears.


