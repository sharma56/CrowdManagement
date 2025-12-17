# Environment Variables in Vite

## What is `import.meta.env.VITE_API_BASE_URL`?

`import.meta.env` is a **Vite-specific feature** that gives you access to environment variables in your code.

### Breaking it down:

```
import.meta.env.VITE_API_BASE_URL
│            │    │
│            │    └─ Variable name (must start with VITE_)
│            └─ Vite's environment object
└─ JavaScript's import.meta (module metadata)
```

## How It Works

### 1. In Your Code

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
```

This means:
- **First**, try to get `VITE_API_BASE_URL` from environment variables
- **If not found**, use the default value: `'http://localhost:3000/api'`

### 2. Where the Value Comes From

Vite reads environment variables from `.env` files in your project root:

**`.env` file** (for all environments):
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

**`.env.local`** (local overrides, gitignored):
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

**`.env.development`** (only in development):
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

**`.env.production`** (only in production build):
```env
VITE_API_BASE_URL=https://api.production.com/api
```

### 3. Important Rules

#### ✅ MUST start with `VITE_`
Only variables starting with `VITE_` are exposed to your client code for security reasons.

**✅ Valid:**
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_APP_NAME=Crowd Management
```

**❌ Invalid (won't work):**
```env
API_BASE_URL=http://localhost:3000/api  # Missing VITE_ prefix
DATABASE_URL=xxx  # Won't be exposed (security)
```

#### ✅ Restart Required
After creating/updating `.env` file, **restart your dev server**:
```bash
npm run dev
```

## Example Usage in Your Project

Look at how it's used in `src/services/auth.service.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
```

**What happens:**
1. Vite checks for `VITE_API_BASE_URL` in `.env` files
2. If found, uses that value
3. If not found, uses the default `'http://localhost:3000/api'`
4. This value is then used to build API URLs

## How to Use

### Step 1: Create `.env` file in project root

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Step 2: Access in your code

```typescript
const url = import.meta.env.VITE_API_BASE_URL;
console.log(url); // "http://localhost:3000/api"
```

### Step 3: Use TypeScript types (optional)

You can add types for better autocomplete:

```typescript
// vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SOCKET_URL: string;
}
```

## Common Patterns

### Pattern 1: With Default Value
```typescript
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
```

### Pattern 2: Required Variable (throw if missing)
```typescript
const API_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_URL) {
  throw new Error('VITE_API_BASE_URL is not defined');
}
```

### Pattern 3: Type Assertion
```typescript
const API_URL = import.meta.env.VITE_API_BASE_URL as string;
```

## Debugging

Check what value is actually being used:

```typescript
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
console.log('All env vars:', import.meta.env);
```

## Summary

- `import.meta.env` = Vite's way to access environment variables
- `VITE_` prefix = Required for client-side variables
- `.env` file = Where you define the values
- Restart dev server = Required after changing `.env`
- Default values = Use `||` operator for fallbacks


