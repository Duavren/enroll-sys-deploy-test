# Activity Logs & Notifications Audit

**Date:** March 10, 2026  
**Scope:** Backend Setup `/src/backend-setup/src` directory  
**Focus:** Activity logs with 'notification' action, entity_type, or description patterns

---

## Executive Summary

**Finding:** The codebase **does NOT use "notification" as an action value** in the `activity_logs` table. Instead:
- **Notifications** are stored separately in the `notifications` table
- **Activity logs** are stored in the `activity_logs` table for audit trail purposes
- These are two **independent systems** that operate in parallel
- When a notification is triggered, an activity log is created for the actual modification (e.g., PAYMENT_APPROVED), but NOT for the notification act itself

---

## Database Schema

### Activity Logs Table
```sql
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  description TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)
```

**Location:** [src/backend-setup/src/database/setup.ts](src/backend-setup/src/database/setup.ts#L446-L460)

### Notifications Table
```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
)
```

**Location:** [src/backend-setup/src/database/setup.ts](src/backend-setup/src/database/setup.ts#L463-L477)

**Schema Migration:** The notifications table was **migrated** from an old schema that used `user_id` + `activity_log_id` to the current schema with `student_id` + status fields.

---

## Activity Log Action Values Used

All INSERT statements into `activity_logs` use **descriptive action constants** (never "notification"):

| Controller | Action | Entity Type | Description |
|-----------|--------|-------------|-------------|
| auth.controller.ts | `LOGIN` | - | User login events |
| enrollment.controller.ts | `SUBMIT_FOR_ASSESSMENT` | enrollment | Enrollment submitted for assessment |
| enrollment.controller.ts | `ASSESS_ENROLLMENT` | enrollment | Enrollment assessed with fees |
| enrollment.controller.ts | `APPROVE_ENROLLMENT` | enrollment | Enrollment approved by dean |
| enrollment.controller.ts | `REJECT_ENROLLMENT` | enrollment | Enrollment rejected |
| enrollment.controller.ts | `CANCEL_ENROLLMENT` | enrollment | Enrollment cancelled |
| enrollment.controller.ts | `SELECT_SUBJECTS` | enrollment | Subjects selected |
| enrollment.controller.ts | `COMPLETE_ENROLLMENT_DOCS` | enrollment | Documentation completed |
| enrollment.controller.ts | `UPDATE_ENROLLMENT_REQUIREMENTS` | enrollment | Requirements updated |
| admin.controller.ts | `UPDATE_ENROLLMENT_STATUS` | enrollment | Admin updated enrollment status |
| cashier.controller.ts | `PAYMENT_APPROVED` | transaction | Payment approved (transaction) |
| cashier.controller.ts | `PAYMENT_REJECTED` | transaction | Payment rejected (transaction) |
| cashier.controller.ts | `APPROVE_TUITION_ASSESSMENT` | enrollment | Tuition assessment approved |
| cashier.controller.ts | `DISBURSE_SCHOLARSHIP` | scholarship | Scholarship disbursed |
| cashier.controller.ts | `PROCESS_INSTALLMENT` | transaction | Installment payment processed |
| cashier.controller.ts | `GENERATE_RECEIPT` | transaction | Receipt generated |
| cashier.controller.ts | `UPDATE_RECEIPT_PATH` | transaction | Receipt path updated |
| cashier.controller.ts | `APPROVE_INSTALLMENT_PLAN` | transaction | Installment plan approved |
| registrar.controller.ts | `APPROVE_ENROLLMENT` | enrollment | Registrar approved enrollment |
| registrar.controller.ts | `COMPLETE_ENROLLMENT_REVIEW` | enrollment | Enrollment review completed |
| registrar.controller.ts | `UPDATE_ENROLLMENT_REMARKS` | enrollment | Enrollment remarks updated |
| registrar.controller.ts | `GENERATE_COR` | cor | Certificate of Registration generated |
| grades.controller.ts | `UPDATE_GRADE` | enrollment_subject | Grade updated |
| grades.controller.ts | `BULK_UPDATE_GRADES` | enrollment_subject | Bulk grades updated and submitted |
| grades.controller.ts | `SUBMIT_GRADES_FOR_APPROVAL` | enrollment | Grades submitted for approval |
| transaction.controller.ts | `CREATE_TRANSACTION` | transaction | Transaction created |
| transaction.controller.ts | `UPDATE_TRANSACTION` | transaction | Transaction updated |
| superadmin.controller.ts | `DATABASE_BACKUP` | system | Database backup performed |

---

## Notification-Related Patterns Found

### 1. Notification Insertion Points
The `notifications` table is populated **independently** from activity logs:

#### A. Enrollment Status Notifications
**File:** [src/backend-setup/src/utils/notification.helper.ts](src/backend-setup/src/utils/notification.helper.ts)

```typescript
export const sendEnrollmentNotification = async (studentId: number, enrollmentId: number, newStatus: string) => {
  // Maps enrollment status to notification details
  const statusNotificationMap = {
    'Pending Assessment': { title: 'Enrollment Submitted', message: '...', type: 'info' },
    'For Payment': { title: 'Ready for Payment', message: '...', type: 'warning' },
    'For Registrar Assessment': { title: 'Ready for Registrar Review', ... },
    'Cashier Review': { title: 'Ready for Cashier Review', ... },
    'For Dean Approval': { title: 'Pending Dean Approval', ... },
    'For Subject Selection': { title: 'Select Your Subjects', ... },
    'Payment Verification': { title: 'Payment Received', ... },
    'Enrolled': { title: 'Enrollment Complete', ... },
    'Rejected': { title: 'Enrollment Rejected', ... },
    'Cancelled': { title: 'Enrollment Cancelled', ... }
  };

  // INSERT INTO notifications (student_id, title, message, type, is_read, created_at)
  // VALUES (?, ?, ?, ?, 0, datetime('now'))
}
```

**Called from:**
- [enrollment.controller.ts](src/backend-setup/src/controllers/enrollment.controller.ts#L87) - After creating enrollment
- [enrollment.controller.ts](src/backend-setup/src/controllers/enrollment.controller.ts#L469) - After submitting for assessment
- [cashier.controller.ts](src/backend-setup/src/controllers/cashier.controller.ts#L141) - After completing transaction
- [cashier.controller.ts](src/backend-setup/src/controllers/cashier.controller.ts#L214) - After rejecting transaction
- [registrar.controller.ts](src/backend-setup/src/controllers/registrar.controller.ts#L449) - After completing review

#### B. Login Notifications
**File:** [src/backend-setup/src/utils/notification.helper.ts](src/backend-setup/src/utils/notification.helper.ts#L114)

```typescript
export const sendLoginNotification = async (userId: number) => {
  // INSERT INTO notifications (student_id, title, message, type, is_read, created_at)
  // VALUES (?, ?, ?, ?, 0, datetime('now'))
  // Title: 'Welcome Back!'
  // Message: Contains current enrollment status
}
```

**Called from:**
- [auth.controller.ts](src/backend-setup/src/controllers/auth.controller.ts#L73) - On successful login

#### C. Direct Notification Insertions
**Files:** Various controller endpoints

- [cashier.controller.ts:193](src/backend-setup/src/controllers/cashier.controller.ts#L193) - Notification link (OLD SCHEMA - references activity_log_id)
- [cashier.controller.ts:228](src/backend-setup/src/controllers/cashier.controller.ts#L228) - Notification link (OLD SCHEMA - references activity_log_id)
- [cashier.controller.ts:544](src/backend-setup/src/controllers/cashier.controller.ts#L544) - Scholarship notification
- [cashier.controller.ts:920](src/backend-setup/src/controllers/cashier.controller.ts#L920) - Receipt notification
- [notifications.controller.ts:54](src/backend-setup/src/controllers/notifications.controller.ts#L54) - Auto-create status notification

### 2. Pattern: Activity Log Created THEN Notification Sent

**Critical Pattern Found:** When an event triggers both an activity log AND a notification, they happen **sequentially**:

#### Example 1: Payment Approval
[src/backend-setup/src/controllers/cashier.controller.ts#L186-L198](src/backend-setup/src/controllers/cashier.controller.ts#L186-L198)

```typescript
// Step 1: Log activity
const logRes = await run(
  'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
  [userId, 'PAYMENT_APPROVED', 'transaction', id, `Payment approved for transaction ${id}`]
);
const logId = logRes.lastInsertRowid;

// Step 2: Create notification (NOTE: Still trying to use OLD schema with activity_log_id)
try {
  const studentUserId = txInfo?.student_user_id;
  if (studentUserId) {
    await run('INSERT INTO notifications (user_id, activity_log_id, is_read) VALUES (?, ?, 0)', 
      [studentUserId, logId]);  // ⚠️ OLD SCHEMA - will FAIL
  }
} catch (notifErr) {
  console.warn('Failed to create notification...', notifErr);
}
```

#### Example 2: Payment Rejection
[src/backend-setup/src/controllers/cashier.controller.ts#L221-L233](src/backend-setup/src/controllers/cashier.controller.ts#L221-L233)

```typescript
// Step 1: Log activity
const logRes = await run(
  'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
  [userId, 'PAYMENT_REJECTED', 'transaction', id, `Payment rejected for transaction ${id}`]
);
const logId = logRes.lastInsertRowid;

// Step 2: Attempt to create notification (OLD SCHEMA)
try {
  const studentUserId = txInfo?.student_user_id;
  if (studentUserId) {
    await run('INSERT INTO notifications (user_id, activity_log_id, is_read) VALUES (?, ?, 0)',
      [studentUserId, logId]);  // ⚠️ OLD SCHEMA - will FAIL
  }
} catch (notifErr) {
  console.warn('Failed to create notification...', notifErr);
}
```

---

## Schema Mismatch Issues Found

### Issue 1: Old Notification Schema References
**Severity:** HIGH - These queries will FAIL

**Affected Code Locations:**
1. [src/backend-setup/src/controllers/cashier.controller.ts:193](src/backend-setup/src/controllers/cashier.controller.ts#L193)
2. [src/backend-setup/src/controllers/cashier.controller.ts:228](src/backend-setup/src/controllers/cashier.controller.ts#L228)

**Problem:**
```typescript
// These queries reference NON-EXISTENT columns
INSERT INTO notifications (user_id, activity_log_id, is_read) VALUES (?, ?, 0)
```

**Current Notifications Table Schema:**
```sql
-- Columns that EXIST:
id, student_id, title, message, type, is_read, created_at

-- Columns that DON'T EXIST:
user_id  ❌
activity_log_id  ❌
```

**Error:** Will throw constraint violation or column not found error

---

## Seed Files Analysis

### seed-notifications.js
**Location:** [src/backend-setup/seed-notifications.js](src/backend-setup/seed-notifications.js)

**Purpose:** Creates generic welcome notifications for all students

```javascript
INSERT OR IGNORE INTO notifications (student_id, title, message, type, is_read, created_at)
VALUES (?, ?, ?, ?, 0, datetime('now'))
```

**Notifications Created:**
- "Welcome to Online Enrollment"
- "Payment Portal Available"
- "Check Your Enrollment Status"

**Schema:** Uses correct NEW schema (student_id, title, message, type)

### seed-enrollment-notifications.js
**Location:** [src/backend-setup/seed-enrollment-notifications.js](src/backend-setup/seed-enrollment-notifications.js)

**Purpose:** Creates enrollment status-based notifications for existing students

```javascript
const statusToNotification = (status: string) => {
  const map: Record<string, { title: string; message: string; type: string }> = {
    'Pending Assessment': { title: 'Enrollment Submitted', ... },
    'For Payment': { title: 'Ready for Payment', ... },
    'Enrolled': { title: 'Enrollment Complete', ... },
    'Rejected': { title: 'Enrollment Rejected', ... },
    ...
  };
}

insertStmt = db.prepare(`
  INSERT OR IGNORE INTO notifications (student_id, title, message, type, is_read, created_at)
  VALUES (?, ?, ?, ?, 0, datetime('now'))
`);
```

**Schema:** Uses correct NEW schema

### seed-sections-and-years.js
**Location:** [src/backend-setup/seed-sections-and-years.js](src/backend-setup/seed-sections-and-years.js)

**Analysis:** Does NOT contain any activity_logs or notifications references

---

## Code Paths Where Notification Logic Occurs

### Path 1: Enrollment Creation → Notification
```
POST /api/enrollment/create
  ↓
createEnrollment() [enrollment.controller.ts]
  ↓
INSERT enrollments
  ↓
sendEnrollmentNotification(studentId, enrollmentId, 'Pending Assessment')
  ↓
INSERT notifications (student_id, title, message, type, ...)
```

### Path 2: Transaction Completion → Activity Log + Notification Attempt
```
PUT /api/cashier/transactions/{id}/process (action=complete)
  ↓
processTransaction() [cashier.controller.ts]
  ↓
UPDATE transactions SET status='Completed'
  ↓
sendEnrollmentNotification() → INSERT notifications
  ↓
INSERT activity_logs (action='PAYMENT_APPROVED', ...)
  ↓
Attempt INSERT notifications (user_id, activity_log_id, ...) ⚠️ FAILS
```

### Path 3: Login → Activity Log + Notification
```
POST /api/auth/login
  ↓
handleLogin() [auth.controller.ts]
  ↓
INSERT activity_logs (action='LOGIN', ...)
  ↓
sendLoginNotification(userId)
  ↓
INSERT notifications (student_id, title, message, type, ...)
```

---

## Summary of Findings

| Finding | Details |
|---------|---------|
| **"notification" as action value** | ❌ NOT FOUND - No activity logs use "notification" as action |
| **"notification" as entity_type** | ❌ NOT FOUND in activity_logs (exists as separate table) |
| **Separate notification system** | ✅ YES - Notifications stored independently in notifications table |
| **Activity log action types** | ✅ YES - 23+ distinct action types found (LOGIN, PAYMENT_APPROVED, etc.) |
| **Parallel logging pattern** | ✅ YES - Activity logs and notifications created separately |
| **Schema mismatch issues** | ⚠️ YES - 2 locations still reference old notifications schema with activity_log_id |
| **Seed files** | ✅ Correct - All seed files use current notifications schema |

---

## Recommendations

1. **Fix Schema Mismatch:** Update cashier.controller.ts lines 193 and 228 to use correct notifications schema
   - Remove `user_id, activity_log_id` columns
   - Use `student_id, title, message, type` columns instead

2. **Document Separation:** Clearly document that activity_logs and notifications are SEPARATE systems:
   - activity_logs = Audit trail of actions
   - notifications = User-facing messages

3. **Consistency:** All notification insertions should use the consistent NEW schema:
   ```typescript
   INSERT INTO notifications (student_id, title, message, type, is_read, created_at)
   VALUES (?, ?, ?, ?, 0, datetime('now'))
   ```

4. **Testing:** Add tests to verify:
   - Payment approval creates activity log AND notification
   - Notification insertions don't fail due to schema mismatch
   - All enrollment status changes trigger proper notifications

---

## Appendix: File Locations

### Controllers with Activity Logs
- [auth.controller.ts](src/backend-setup/src/controllers/auth.controller.ts#L68) - LOGIN
- [admin.controller.ts](src/backend-setup/src/controllers/admin.controller.ts#L525) - UPDATE_ENROLLMENT_STATUS
- [enrollment.controller.ts](src/backend-setup/src/controllers/enrollment.controller.ts) - Multiple actions (SUBMIT_FOR_ASSESSMENT, ASSESS_ENROLLMENT, etc.)
- [cashier.controller.ts](src/backend-setup/src/controllers/cashier.controller.ts) - Payment-related actions (PAYMENT_APPROVED, PAYMENT_REJECTED, etc.)
- [registrar.controller.ts](src/backend-setup/src/controllers/registrar.controller.ts) - GENERATE_COR, APPROVE_ENROLLMENT
- [grades.controller.ts](src/backend-setup/src/controllers/grades.controller.ts) - UPDATE_GRADE, BULK_UPDATE_GRADES
- [transaction.controller.ts](src/backend-setup/src/controllers/transaction.controller.ts) - CREATE_TRANSACTION, UPDATE_TRANSACTION
- [superadmin.controller.ts](src/backend-setup/src/controllers/superadmin.controller.ts) - DATABASE_BACKUP

### Notification Helpers
- [src/backend-setup/src/utils/notification.helper.ts](src/backend-setup/src/utils/notification.helper.ts) - sendEnrollmentNotification, sendLoginNotification

### Database Setup
- [src/backend-setup/src/database/setup.ts](src/backend-setup/src/database/setup.ts#L440-L500) - Table definitions and migrations

### Seed Files
- [src/backend-setup/seed-notifications.js](src/backend-setup/seed-notifications.js)
- [src/backend-setup/seed-enrollment-notifications.js](src/backend-setup/seed-enrollment-notifications.js)
