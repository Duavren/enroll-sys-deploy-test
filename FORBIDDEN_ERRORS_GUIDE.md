# 403 Forbidden Errors - Diagnosis & Fix

## Problem
Some dashboards show "Forbidden" errors when accessing certain endpoints.

## Root Cause
Dashboards call API endpoints that have strict role-based authorization:
- Some endpoints require `admin` + `superadmin` only
- Some require `dean` only
- Some require specific role combinations

When a user with a different role tries to access these, they get **403 Forbidden**.

## Examples of Restrictive Endpoints

| Endpoint | Allowed Roles | Used By |
|----------|--------------|---------|
| `/admin/students` | admin, superadmin, dean, registrar | Admin Dashboard (view students) |
| `/faculty` | admin, superadmin, dean | Admin Dashboard (manage faculty) |
| `/maintenance/subjects` | admin, superadmin, dean | Admin Dashboard (manage subjects) |
| `/grades/student/:id` | admin, superadmin, registrar, dean | Registrar Dashboard |

## Solution Applied

### 1. Better Error Logging
✅ Updated API interceptor to log:
- Which endpoint caused 403
- Which HTTP method
- Clear message about insufficient permissions

This helps identify which specific calls are failing.

### 2. Authorization Fixes Needed
For each dashboard, endpoints should be expanded to include viewing permissions:

**Admin Dashboard reading data:**
- `GET /admin/students` → Include `cashier, registrar` for read-only
- `GET /faculty` → More permissive reads
- `GET /maintenance/subjects` → More permissive reads

**Registrar Dashboard:**
- `GET /grades` → Already includes registrar ✓
- `GET /enrollments` → Check if registrar can read

**Cashier Dashboard:**
- `GET /payments` → Add cashier to payments endpoints ✓
- `GET /installments` → Add cashier

**Dean Dashboard:**
- `GET /students` → Add dean ✓
- `GET /grades` → Add dean ✓

## How to Check Which Dashboard is Failing

1. Open browser console (F12)
2. Look for 403 errors in Network tab
3. Check console logs for:
   ```
   Authorization error: {
     endpoint: "/api/...",
     method: "GET",
     message: "Forbidden"
   }
   ```

## Recommended Quick Fixes

If you want some dashboards to see all data (view-only):

### Option A: Allow Read Access for More Roles
Edit the relevant route files and change:
```typescript
// Before (admin only)
router.get('/students', authenticate, authorize('admin', 'superadmin'), getStudents);

// After (all roles can view, but only admin can modify)
router.get('/students', authenticate, getStudents); // Remove authorize for GET
router.post('/students', authenticate, authorize('admin', 'superadmin'), createStudent); // Keep for POST
```

### Option B: Add Current Role to Authorization
```typescript
// Allow all authenticated users to read, specific roles to modify
router.get('/students', authenticate, getStudents);
```

## Which Dashboards Have Issues?

Based on route configuration:
- ⚠️ **Registrar Dashboard** - May not have access to all needed data
- ⚠️ **Cashier Dashboard** - May not have access to all payments endpoints
- ⚠️ **Dean Dashboard** - Limited access to student/grade data
- ✅ **Admin Dashboard** - Most routes available
- ✅ **Superadmin Dashboard** - All routes available

## Next Step

Tell me which specific dashboard is showing 403 errors, and I'll fix the authorization for that dashboard's endpoints.
