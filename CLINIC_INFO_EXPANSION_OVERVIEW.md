# Clinic Information Display - Implementation Overview

**Status:** ✅ Ready for Data Entry  
**Date:** April 28, 2026  
**Type:** Admin-Only Configuration (View-Only in Frontend)

---

## Summary

Expandable clinic information section in sidebar showing clinic contact details and metadata. Admin configures via MongoDB, DMS users view (read-only) in the sidebar.

---

## New Fields to Add to Analytics Database

### MongoDB Collection: `tenants`

Add these fields to the existing tenant document:

```javascript
db.tenants.updateOne(
  { _id: ObjectId("69df8bcbf951c03063572728") },  // Your tenant ID
  {
    $set: {
      // Contact Information
      address: "123 Dental Street, New Delhi",
      phone: "9876543210",
      email: "info@dentalclinic.com",
      website: "https://www.dentalclinic.com",
      
      // Location Details
      city: "New Delhi",
      state: "Delhi",
      zipCode: "110001",
      country: "India",
      
      // System Configuration
      timezone: "Asia/Kolkata",          // Used for scheduling
      currency: "INR"                    // Used for invoices
    }
  }
)
```

### Field Descriptions

| Field | Type | Example | Purpose | Required |
|-------|------|---------|---------|----------|
| `address` | String | "123 Dental Street, New Delhi" | Clinic physical address | ❌ No |
| `phone` | String | "9876543210" | Clinic contact number | ❌ No |
| `email` | String | "info@clinic.com" | Clinic email | ❌ No |
| `website` | String | "https://www.clinic.com" | Clinic website URL | ❌ No |
| `city` | String | "New Delhi" | City | ❌ No |
| `state` | String | "Delhi" | State/Province | ❌ No |
| `zipCode` | String | "110001" | Postal code | ❌ No |
| `country` | String | "India" | Country | ❌ No |
| `timezone` | String | "Asia/Kolkata" | Timezone for scheduling | ✅ Yes (default) |
| `currency` | String | "INR" | Currency code for invoices | ✅ Yes (default) |

---

## User Interface Design

### Sidebar - Collapsed State
```
┌─────────────────────────────────┐
│ 🦷 Dental_Demo              ▼   │  ← Click to expand
│    Management System            │
│                                 │
│ 📅 Appointments                 │
│ 👥 Patients                     │
│ 💳 Transactions                 │
│ ... (other menu items)          │
└─────────────────────────────────┘
```

### Sidebar - Expanded State (on hover)
```
┌─────────────────────────────────┐
│ 🦷 Dental_Demo              ▲   │  ← Click to collapse
│    Management System            │
│                                 │
│ 📍 123 Dental Street            │
│    New Delhi, Delhi 110001      │
│ 📞 9876543210                   │
│ 📧 info@clinic.com              │
│ 🌐 www.clinic.com               │
│ ⏰ Asia/Kolkata                 │
│ 💵 INR                          │
│                                 │
│ 📅 Appointments                 │
│ 👥 Patients                     │
│ 💳 Transactions                 │
│ ... (other menu items)          │
└─────────────────────────────────┘
```

### Features
- ✅ Expandable/Collapsible via dropdown arrow
- ✅ Shows when hovering over sidebar
- ✅ Clickable phone (tel: link)
- ✅ Clickable email (mailto: link)
- ✅ Clickable website (opens in new tab)
- ✅ Icons for each field (location, phone, email, web, clock, currency)
- ✅ Dark mode support
- ✅ Smooth transitions and animations

---

## Backend Implementation

### Endpoint: `GET /api/users/profile`

**Location:** `dms_backend/controllers/user.controller.js`

**Response Format:**
```json
{
  "user": {
    "id": "69df84bd727d127608a00284",
    "firstName": "N",
    "lastName": "Kapoor",
    "email": "nkapoor@dentalcare.com",
    "role": "Doctor",
    "phone": "9999999990"
  },
  "tenant": {
    "id": "69df8bcbf951c03063572728",
    "name": "Dental_Demo",
    "slug": "dd",
    "status": "active",
    "address": "123 Dental Street, New Delhi",
    "phone": "9876543210",
    "email": "info@dentalclinic.com",
    "website": "https://www.dentalclinic.com",
    "city": "New Delhi",
    "state": "Delhi",
    "zipCode": "110001",
    "country": "India",
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "googleDriveFolderId": "1OLeSemy3LmTBN7jO7HbrFW5UmEjsq6ON"
  }
}
```

**Authentication:** Required (JWT token in Authorization header)

**Protected By:** 
- `authenticate` middleware (verifies JWT)
- `resolveTenant` middleware (loads tenant context)

---

## Frontend Implementation

### Context: `UserContext`

**Location:** `frontend/src/Context/UserContext.jsx`

**Provides:**
```javascript
const { user, tenant, loading, reload } = useUser();

// tenant object includes all new fields
tenant.address
tenant.phone
tenant.email
tenant.website
tenant.city
tenant.state
tenant.zipCode
tenant.country
tenant.timezone
tenant.currency
```

### Component: `NavigationLayout`

**Location:** `frontend/src/Components/NavigationLayout.jsx`

**Features:**
- Expandable clinic info section (click clinic name)
- Shows all tenant fields with icons
- Responsive design (hidden on mobile, shown on hover on desktop)
- Dark mode support
- Clickable links (phone, email, website)

**State:**
```javascript
const [clinicInfoExpanded, setClinicInfoExpanded] = React.useState(false);
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│ Analytics MongoDB (dms database)                    │
│ tenants collection                                  │
├─────────────────────────────────────────────────────┤
│ {                                                   │
│   _id: ObjectId("69df8bcbf951c03063572728"),       │
│   name: "Dental_Demo",                              │
│   address: "123 Dental Street, New Delhi",    ← NEW│
│   phone: "9876543210",                         ← NEW│
│   email: "info@clinic.com",                   ← NEW│
│   website: "https://...",                     ← NEW│
│   city: "New Delhi",                          ← NEW│
│   state: "Delhi",                             ← NEW│
│   zipCode: "110001",                          ← NEW│
│   country: "India",                           ← NEW│
│   timezone: "Asia/Kolkata",                   ← NEW│
│   currency: "INR"                             ← NEW│
│ }                                                   │
└─────────────────────────────────────────────────────┘
           ↓
    Backend Endpoint
    GET /api/users/profile
           ↓
┌─────────────────────────────────────────────────────┐
│ Frontend - UserContext                              │
│ Fetches & stores tenant data                        │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ NavigationLayout Component                          │
│ Displays expandable clinic info in sidebar          │
└─────────────────────────────────────────────────────┘
```

---

## Configuration Instructions for Connect Desk Claude

### Step 1: Update Tenant Document

Run this in MongoDB Atlas or MongoDB Compass:

```javascript
// Use: dms database
// Collection: tenants
// Update one document with your clinic details

db.tenants.updateOne(
  { _id: ObjectId("69df8bcbf951c03063572728") },  // Replace with actual tenant ID
  {
    $set: {
      address: "YOUR_CLINIC_ADDRESS",
      phone: "YOUR_CLINIC_PHONE",
      email: "YOUR_CLINIC_EMAIL",
      website: "YOUR_CLINIC_WEBSITE",
      city: "CITY_NAME",
      state: "STATE_NAME",
      zipCode: "POSTAL_CODE",
      country: "COUNTRY_NAME",
      timezone: "Asia/Kolkata",              // or appropriate timezone
      currency: "INR"                        // or appropriate currency code
    }
  }
)
```

### Step 2: Verify in Frontend

1. Login to DMS as any user
2. Hover over sidebar to expand it
3. Click clinic name (with dropdown arrow) to expand clinic info
4. Verify all fields display correctly

### Step 3: Test Interactions

- Click phone number → Should open phone dialer (tel: link)
- Click email → Should open email client (mailto: link)
- Click website → Should open in new browser tab
- Collapse and expand → Should toggle smoothly

---

## Common Timezone Values

```
Asia/Kolkata          → India
Asia/Kolkata          → IST (UTC+5:30)
Asia/Bangkok          → Thailand
America/New_York      → Eastern
America/Chicago       → Central
Europe/London         → GMT
Europe/Paris          → CET
```

## Common Currency Codes

```
INR → Indian Rupee
USD → US Dollar
EUR → Euro
GBP → British Pound
JPY → Japanese Yen
AUD → Australian Dollar
CAD → Canadian Dollar
CHF → Swiss Franc
```

---

## Testing Checklist

- [ ] Tenant document updated with all new fields
- [ ] Backend returns all fields in `/api/users/profile` response
- [ ] Frontend loads UserContext without errors
- [ ] Sidebar clinic name clickable with dropdown arrow
- [ ] Expanded view shows all populated fields
- [ ] Icons display correctly for each field
- [ ] Phone number is clickable (tel: link works)
- [ ] Email is clickable (mailto: link works)
- [ ] Website opens in new tab
- [ ] Expand/collapse animation is smooth
- [ ] Dark mode displays correctly
- [ ] Mobile view hides clinic info (sidebar hidden on mobile)
- [ ] Reload page preserves expanded/collapsed state from context

---

## Files Modified/Created

### Backend
- ✅ `dms_backend/controllers/user.controller.js` — Updated `getUserProfile` endpoint

### Frontend
- ✅ `frontend/src/Context/UserContext.jsx` — Already created (no changes)
- ✅ `frontend/src/Components/NavigationLayout.jsx` — Updated sidebar UI

### Database
- ⏳ `analytics/dms/tenants` — Ready to add new fields

---

## Rollback Instructions (if needed)

If you need to remove these fields:

```javascript
// Remove fields from tenant document
db.tenants.updateOne(
  { _id: ObjectId("69df8bcbf951c03063572728") },
  {
    $unset: {
      address: "",
      phone: "",
      email: "",
      website: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      timezone: "",
      currency: ""
    }
  }
)
```

Then revert the frontend sidebar UI changes (simple Git revert).

---

## Support

For questions or issues:
1. Check that all fields were added to MongoDB document
2. Verify the tenant ID in MongoDB matches the logged-in user's tenantId
3. Check browser console for any errors
4. Check backend logs for API response

---

**Status: Ready for Data Entry** ✅

Next step: Connect Desk Claude to add clinic details to MongoDB tenants collection.
