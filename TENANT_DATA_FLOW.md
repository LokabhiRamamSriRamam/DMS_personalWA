# Tenant & User Data Flow

**Status:** ✅ Implemented  
**Date:** April 28, 2026

---

## Architecture

```
┌─────────────────────────────────────┐
│  Analytics Database (Shared)        │
├─────────────────────────────────────┤
│ • dms_users collection              │
│   - firstName, lastName, email      │
│   - role, phone, status, tenantId   │
│                                     │
│ • tenants collection                │
│   - name, address, phone, email     │
│   - mongoUri, mongoDbName           │
│   - googleClientId, etc.            │
└─────────────────────────────────────┘
         ↓
    (JWT Token)  ← userId, tenantId
         ↓
┌─────────────────────────────────────┐
│  Backend Middleware                 │
├─────────────────────────────────────┤
│ 1. authenticate (auth.js)           │
│    → Verifies JWT                   │
│    → Sets req.user (id, role, name) │
│                                     │
│ 2. resolveTenant (resolveTenant.js) │
│    → Fetches tenant from analytics  │
│    → Connects to tenant DB          │
│    → Sets req.tenantModels          │
│    → Sets req.tenantConfig (creds)  │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  New Endpoint: GET /api/users/profile│
├─────────────────────────────────────┤
│ Response:                           │
│ {                                   │
│   user: {                           │
│     id, firstName, lastName,        │
│     email, role, phone              │
│   },                                │
│   tenant: {                         │
│     id, name, address, phone, email │
│   }                                 │
│ }                                   │
└─────────────────────────────────────┘
         ↓
    (HTTP Request)
         ↓
┌─────────────────────────────────────┐
│  Frontend - UserContext             │
├─────────────────────────────────────┤
│ • useUser() hook provides:          │
│   - user (from API)                 │
│   - tenant (from API)               │
│   - loading state                   │
│   - reload() function               │
└─────────────────────────────────────┘
         ↓
    (Consumed by Components)
         ↓
┌─────────────────────────────────────┐
│  Sidebar (NavigationLayout)         │
├─────────────────────────────────────┤
│ • Clinic Name: {tenant.name}        │
│ • User Name: {user.name}            │
│ • User Role: {user.role}            │
└─────────────────────────────────────┘
```

---

## Data Flow: User Registration to Sidebar Display

### Step 1: User Registration
```javascript
// POST /api/users/register
{
  firstName: "John",
  lastName: "Doe",
  email: "john@clinic.com",
  password: "...",
  role: "Doctor"
}
// Stored in analytics.dms_users (status: pending, tenantId: null)
```

### Step 2: Admin Approves & Assigns Tenant
```javascript
// Admin assigns tenantId to user in analytics.dms_users
// User now has: tenantId = ObjectId("...")
```

### Step 3: User Login
```javascript
// POST /api/users/login
// JWT Token created with:
{
  id: user._id,
  role: user.role,
  name: "John Doe",
  tenantId: user.tenantId
}
```

### Step 4: Frontend Receives Token
```javascript
// Stored in localStorage as 'dms_token'
// AuthContext provides to app
```

### Step 5: Protected Route Access
```javascript
// ProtectedRoute verifies isAuthenticated
// Wraps NavigationLayout
// UserProvider loads data on mount
```

### Step 6: UserContext Loads Profile
```javascript
// On useUser() in NavigationLayout:
// GET /api/users/profile (authenticated)
//
// Backend:
// 1. Gets req.user.id, req.user.tenantId from JWT
// 2. Fetches full user record from analytics.dms_users
// 3. Fetches tenant record from analytics.tenants
// 4. Returns { user, tenant }
//
// Frontend:
// setUser(response.user)
// setTenant(response.tenant)
```

### Step 7: Sidebar Displays Dynamic Data
```jsx
<h1>{tenant?.name || 'Clinic'}</h1>        // "John's Dental Clinic"
<p>{user?.firstName} {user?.lastName}</p>  // "John Doe"
<p>{user?.role}</p>                        // "Doctor"
```

---

## Backend Implementation

### 1. New Endpoint: GET /api/users/profile

**File:** `dms_backend/controllers/user.controller.js`

```javascript
export async function getUserProfile(req, res) {
  try {
    const { id: userId, tenantId } = req.user;
    
    if (!tenantId) {
      return res.status(403).json({ message: 'User not assigned to a clinic.' });
    }

    const analyticsDb = getAnalyticsDb();

    // Fetch tenant
    const tenant = await analyticsDb.collection('tenants').findOne({
      _id: new mongoose.Types.ObjectId(tenantId)
    });

    // Fetch user
    const user = await analyticsDb.collection('dms_users').findOne({
      _id: new mongoose.Types.ObjectId(userId)
    });

    res.json({
      user: { id, firstName, lastName, email, role, phone },
      tenant: { id, name, address, phone, email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**Route:** `dms_backend/routes/user.routes.js`

```javascript
router.get('/profile', [authenticate, resolveTenant], getUserProfile);
```

---

## Frontend Implementation

### 1. UserContext

**File:** `frontend/src/Context/UserContext.jsx`

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get('/users/profile');
      setUser(res.data.user);
      setTenant(res.data.tenant);
    } catch (err) {
      console.error('Failed to load user profile:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, tenant, loading, reload: loadProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
```

### 2. App Wrapper

**File:** `frontend/src/App.jsx`

```javascript
function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <TreatmentProvider>
          <RouterProvider router={router} />
        </TreatmentProvider>
      </UserProvider>
    </AuthProvider>
  );
}
```

### 3. NavigationLayout Usage

**File:** `frontend/src/Components/NavigationLayout.jsx`

```javascript
import { useUser } from '../Context/UserContext';

export default function NavigationLayout({ children }) {
  const { user, tenant, loading } = useUser();

  return (
    <>
      {/* Clinic Name */}
      <h1>{tenant?.name || 'Clinic'}</h1>

      {/* User Profile */}
      <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
      <p className="text-xs text-slate-500">{user?.role}</p>
    </>
  );
}
```

---

## Usage: Access Tenant/User Data Anywhere

```javascript
// Any component inside App
import { useUser } from '../Context/UserContext';

function MyComponent() {
  const { user, tenant, loading, reload } = useUser();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome {user?.firstName}</h1>
      <p>Clinic: {tenant?.name}</p>
      <p>Role: {user?.role}</p>
    </div>
  );
}
```

---

## To Add More Fields to Sidebar

### Backend:
1. Add field to `tenants` collection in analytics database:
   ```javascript
   {
     name: "John's Dental Clinic",
     address: "123 Main St, City",
     phone: "555-1234",
     email: "info@clinic.com",
     logoUrl: "https://...",
     website: "https://..."
   }
   ```

2. Return field from `getUserProfile`:
   ```javascript
   tenant: { 
     id, 
     name, 
     address, 
     phone, 
     email,
     logoUrl    // ← add this
   }
   ```

### Frontend:
1. Use in component:
   ```jsx
   <img src={tenant?.logoUrl} alt="Clinic Logo" />
   <a href={tenant?.website}>{tenant?.name}</a>
   ```

---

## Testing

1. **Create user:**
   - POST /api/users/register
   - Admin assigns tenantId

2. **Login:**
   - POST /api/users/login → get JWT token

3. **Verify sidebar:**
   - Should show clinic name from tenant.name
   - Should show user name from user.firstName + user.lastName
   - Should show user role from user.role

4. **Reload test:**
   - Refresh page → UserContext reloads profile
   - Data should persist from localStorage (JWT)

---

## Summary

✅ **Multi-tenant system with tenant data**  
✅ **User profile data from analytics DB**  
✅ **UserContext provides to entire app**  
✅ **Sidebar displays dynamic clinic name & user info**  
✅ **Easy to extend with more fields**  
✅ **No hardcoded values** 

To add new tenant fields:
1. Add to `tenants` collection
2. Return from `getUserProfile`
3. Use `tenant.fieldName` in components