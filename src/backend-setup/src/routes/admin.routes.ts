import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getAllEnrollments,
  getEnrollmentById,
  getEnrollmentDocuments,
  downloadEnrollmentDocument,
  updateEnrollmentStatus,
  getDashboardStats,
  getPendingAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
  getAuditTrail
} from '../controllers/admin.controller';
import {
  getAllFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty
} from '../controllers/faculty.controller';
import { approveEnrollmentAssessment } from '../controllers/enrollment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// Dashboard
router.get('/dashboard/stats', authenticate, authorize('admin', 'superadmin', 'dean', 'registrar'), getDashboardStats);

// Audit Trail
router.get('/audit-trail', authenticate, authorize('admin', 'superadmin'), getAuditTrail);

// Students
router.get('/students', authenticate, authorize('admin', 'superadmin', 'dean', 'registrar'), getAllStudents);
router.get('/students/:id', authenticate, authorize('admin', 'superadmin', 'dean', 'registrar'), getStudentById);
router.post('/students', authenticate, authorize('admin', 'superadmin'), createStudent);
router.put('/students/:id', authenticate, authorize('admin', 'superadmin', 'registrar'), updateStudent);
router.delete('/students/:id', authenticate, authorize('admin', 'superadmin'), deleteStudent);

// Account Requests
router.get('/account-requests', authenticate, authorize('admin', 'superadmin'), getPendingAccountRequests);
router.put('/account-requests/:id/approve', authenticate, authorize('admin', 'superadmin'), approveAccountRequest);
router.put('/account-requests/:id/reject', authenticate, authorize('admin', 'superadmin'), rejectAccountRequest);

// Teachers (Faculty)
router.get('/teachers', authenticate, authorize('admin', 'superadmin'), getAllFaculty);
router.get('/teachers/:id', authenticate, authorize('admin', 'superadmin'), getFacultyById);
router.post('/teachers', authenticate, authorize('admin', 'superadmin'), createFaculty);
router.put('/teachers/:id', authenticate, authorize('admin', 'superadmin'), updateFaculty);
router.delete('/teachers/:id', authenticate, authorize('admin', 'superadmin'), deleteFaculty);

// Enrollments
router.get('/enrollments', authenticate, authorize('admin', 'superadmin', 'dean', 'registrar'), getAllEnrollments);
router.get('/enrollments/:id', authenticate, authorize('admin', 'superadmin', 'dean', 'registrar'), getEnrollmentById);
router.get('/enrollments/:id/documents', authenticate, authorize('admin', 'superadmin', 'registrar', 'dean'), getEnrollmentDocuments);
router.get('/documents/:docId/download', authenticate, authorize('admin', 'superadmin', 'registrar', 'dean'), downloadEnrollmentDocument);
router.put('/enrollments/:id/status', authenticate, authorize('admin', 'superadmin', 'registrar'), updateEnrollmentStatus);
router.put('/enrollments/:id/approve-assessment', authenticate, authorize('admin', 'superadmin'), approveEnrollmentAssessment);

// Create accounts for existing students (admin only)
import { createAccountsForExistingStudents } from '../controllers/admin.controller';
router.post('/students/create-accounts', authenticate, authorize('admin', 'superadmin'), createAccountsForExistingStudents);

export default router;
