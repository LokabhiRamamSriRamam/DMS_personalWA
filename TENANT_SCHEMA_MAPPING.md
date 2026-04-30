# Tenant & User Schema Mapping

**Status:** ✅ Verified  
**Date:** April 28, 2026

---

## Current Schema: Analytics Database

### Tenants Collection

**Current Fields (Verified):**
```javascript
{
  _id: ObjectId,
  name: String,                           // e.g., "Dental_Demo"
  slug: String,                           // e.g., "dd"
  mongoUri: String,                       // Connection string to tenant DB
  mongoDbName: String,                    // e.g., "test"
  
  // Google Drive Integration
  googleClientId: String,
  googleClientSecret: String,
  googleRefreshToken: String,
  googleDriveFolderId: String,
  
  // API Keys
  nvidiaApiKey: String,
  sarvamApiKey: String,
  
  // Cloudinary
  cloudinaryCloudName: String,
  cloudinaryApiKey: String,
  cloudinaryApiSecret: String,
  
  // Metadata
  status: String,                         // "active", "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

**Missing Fields (To Be Added Later):**
```javascript
{
  address: String,                        // Clinic physical address
  phone: String,                          // Clinic phone number
  email: String,                          // Clinic email
  website: String,                        // Clinic website URL
  logoUrl: String,                        // Clinic logo image URL
  city: String,                           // Clinic city
  state: String,                          // Clinic state
  zipCode: String,                        // Clinic postal code
  country: String,                        // Clinic country
  currency: String,                       // e.g., "INR", "USD"
  timezone: String,                       // e.g., "Asia/Kolkata"
}
```

---

### DMS Users Collection

**Current Fields (Verified):**
```javascript
{
  _id: ObjectId,
  firstName: String,                      // e.g., "N"
  lastName: String,                       // e.g., "Kapoor"
  email: String,                          // e.g., "nkapoor@dentalcare.com"
  password: String,                       // Bcrypt hashed
  role: String,                           // "Doctor", "Receptionist", "Assistant"
  phone: String,                          // e.g., "9999999990"
  status: String,                         // "active", "pending", "inactive", "rejected"
  product: String,                        // "dms"
  tenantId: ObjectId,                     // Reference to tenants collection
  createdAt: Date,
  updatedAt: Date
}
```

**Missing Fields (To Be Added Later):**
```javascript
{
  specialization: String,                 // For doctors: "Orthodontist", "Pediatric Dentist", etc.
  licenseNumber: String,                  // For doctors: License number
  profileImageUrl: String,                // User avatar/profile picture
  isActive: Boolean,                      // Soft delete flag
  lastLogin: Date,                        // Track user activity
  permissions: [String],                  // Fine-grained permissions (optional)
}
```

---

## Endpoint Response Mapping

### Current Implementation: GET /api/users/profile

**Backend Response:**
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
    "googleDriveFolderId": "1OLeSemy3LmTBN7jO7HbrFW5UmEjsq6ON"
  }
}
```

**Fields Used in Frontend:**
```javascript
// From user
user.firstName              // "N"
user.lastName               // "Kapoor"
user.email                  // "nkapoor@dentalcare.com"
user.role                   // "Doctor"
user.phone                  // "9999999990"

// From tenant
tenant.name                 // "Dental_Demo"
tenant.slug                 // "dd"
```

---

## How to Add New Fields

### Step 1: Add to Tenant Document (MongoDB)

```javascript
// Update existing tenant document
db.tenants.updateOne(
  { _id: ObjectId("69df8bcbf951c03063572728") },
  {
    $set: {
      address: "123 Dental Street, Delhi",
      phone: "9876543210",
      email: "info@dental-demo.com",
      website: "https://dental-demo.com",
      city: "Delhi",
      state: "Delhi",
      zipCode: "110001",
      country: "India",
      currency: "INR",
      timezone: "Asia/Kolkata"
    }
  }
)
```

### Step 2: Update Backend Endpoint

**File:** `dms_backend/controllers/user.controller.js`

```javascript
res.json({
  user: {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    phone: user.phone,
  },
  tenant: {
    id: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    website: tenant.website,
    city: tenant.city,
    state: tenant.state,
    zipCode: tenant.zipCode,
    country: tenant.country,
    currency: tenant.currency,
    timezone: tenant.timezone,
    googleDriveFolderId: tenant.googleDriveFolderId,
  },
});
```

### Step 3: Use in Frontend

```javascript
import { useUser } from '../Context/UserContext';

function MyComponent() {
  const { tenant } = useUser();

  return (
    <div>
      <h1>{tenant?.name}</h1>
      <p>{tenant?.address}</p>
      <p>Phone: {tenant?.phone}</p>
      <p>Email: {tenant?.email}</p>
      <p>Website: {tenant?.website}</p>
      <p>Currency: {tenant?.currency}</p>
      <p>Timezone: {tenant?.timezone}</p>
    </div>
  );
}
```

---

## Current Status

✅ **User fields** — Fully mapped  
✅ **Tenant basic fields** — Mapped (name, slug, status)  
⚠️ **Tenant address/contact** — Missing from DB schema  
⚠️ **Tenant branding** — Missing from DB schema  

---

## Recommended Migration

### Option 1: Add Fields Now

```javascript
// Add missing fields to existing tenant
db.tenants.updateOne(
  { _id: ObjectId("69df8bcbf951c03063572728") },
  {
    $set: {
      address: "",
      phone: "",
      email: "",
      website: "",
      logoUrl: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      currency: "INR",
      timezone: "Asia/Kolkata"
    }
  }
)
```

### Option 2: Create Settings Collection

Instead of adding all fields to `tenants`, create a separate `tenantSettings` collection:

```javascript
// tenantSettings collection
{
  _id: ObjectId,
  tenantId: ObjectId,           // Reference to tenants
  address: String,
  phone: String,
  email: String,
  website: String,
  logoUrl: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  currency: String,             // "INR", "USD"
  timezone: String,             // "Asia/Kolkata"
  workingHours: {
    monday: { open: "09:00", close: "18:00" },
    // ...
  },
  holidays: [Date],
}
```

Then fetch both in endpoint:
```javascript
const tenant = await analyticsDb.collection('tenants').findOne({ _id: ... });
const settings = await analyticsDb.collection('tenantSettings').findOne({ tenantId: ... });

res.json({
  user: { ... },
  tenant: { ...tenant, ...settings }
});
```

---

## Summary

**Current Mapping:** ✅ Correct
- User fields match the dms_users schema
- Tenant fields match the tenants schema (basic info only)

**Future Enhancement:** Add address/contact/branding fields
- Option 1: Add to tenants collection (simpler)
- Option 2: Separate tenantSettings collection (cleaner)

**Next Step:** Decide which approach and add remaining fields to MongoDB
