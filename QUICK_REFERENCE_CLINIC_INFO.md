# Quick Reference: Clinic Information Setup

## What Was Done
✅ Backend endpoint updated to return clinic details  
✅ Frontend UI created for expandable clinic info in sidebar  
✅ All fields ready to be populated in MongoDB  

---

## What You Need to Do (Connect Desk)

### Add These Fields to MongoDB

**Database:** `dms` (Analytics)  
**Collection:** `tenants`  
**Document:** The one with your clinic details

**Fields to add:**
```javascript
{
  address: "123 Dental Street, New Delhi",
  phone: "9876543210",
  email: "info@dentalclinic.com",
  website: "https://www.dentalclinic.com",
  city: "New Delhi",
  state: "Delhi",
  zipCode: "110001",
  country: "India",
  timezone: "Asia/Kolkata",
  currency: "INR"
}
```

### Data Types

| Field | Type | Example |
|-------|------|---------|
| address | String | "123 Dental Street, New Delhi" |
| phone | String | "9876543210" |
| email | String | "info@clinic.com" |
| website | String | "https://www.clinic.com" |
| city | String | "New Delhi" |
| state | String | "Delhi" |
| zipCode | String | "110001" |
| country | String | "India" |
| timezone | String | "Asia/Kolkata" |
| currency | String | "INR" |

---

## How It Works in Frontend

1. **Sidebar shows clinic name** with dropdown arrow
2. **Click to expand** → Shows all clinic details below
3. **View-only** → Users cannot edit (admin only in MongoDB)
4. **Clickable links** → Phone, email, website are interactive

---

## MongoDB Update Command

```javascript
db.tenants.updateOne(
  { name: "Dental_Demo" },  // or use _id: ObjectId("...")
  {
    $set: {
      address: "123 Dental Street, New Delhi",
      phone: "9876543210",
      email: "info@dentalclinic.com",
      website: "https://www.dentalclinic.com",
      city: "New Delhi",
      state: "Delhi",
      zipCode: "110001",
      country: "India",
      timezone: "Asia/Kolkata",
      currency: "INR"
    }
  }
)
```

---

## Verification

After adding fields:

1. **Check MongoDB** - Run `db.tenants.findOne()` to verify fields exist
2. **Check API** - Call `GET /api/users/profile` and verify response includes all fields
3. **Check UI** - Login to DMS, hover sidebar, click clinic name to expand

---

## Files for Reference

- **Full Details:** `CLINIC_INFO_EXPANSION_OVERVIEW.md`
- **Schema Mapping:** `TENANT_SCHEMA_MAPPING.md`
- **Code Changes:**
  - Backend: `dms_backend/controllers/user.controller.js`
  - Frontend: `frontend/src/Components/NavigationLayout.jsx`

---

## Timeline

- ⏳ **Now:** Add fields to MongoDB
- ⏳ **Then:** Verify in frontend (should auto-load via UserContext)
- ✅ **Done:** Clinic info visible in sidebar

---

**Status:** Waiting for MongoDB data entry ⏳
