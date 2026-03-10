import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import db, { query, run, get } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendEnrollmentNotification } from '../utils/notification.helper';

// Helper: get fee rates for a course from courses_fees table, with safe defaults
const getCourseFeeRates = async (course: string) => {
  const defaults = { tuition_per_unit: 700, registration: 1500, library: 500, lab: 2000, id_fee: 200, others: 300 };
  if (!course) return defaults;
  try {
    const row = await get(
      'SELECT tuition_per_unit, registration, library, lab, id_fee, others FROM courses_fees WHERE course = ?',
      [course]
    );
    return row ? { ...defaults, ...row } : defaults;
  } catch {
    return defaults;
  }
};

// COR Management
export const getAllCORs = async (req: AuthRequest, res: Response) => {
  try {
    const { status, studentId } = req.query;

    let sql = `
      SELECT 
        c.*,
        s.student_id,
        s.first_name || ' ' || s.last_name as student_name,
        s.course,
        e.school_year,
        e.semester
      FROM cors c
      JOIN students s ON c.student_id = s.id
      JOIN enrollments e ON c.enrollment_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    if (studentId) {
      sql += ' AND s.student_id = ?';
      params.push(studentId);
    }

    sql += ' ORDER BY c.created_at DESC';

    const cors = await query(sql, params);

    res.json({
      success: true,
      data: cors
    });
  } catch (error) {
    console.error('Get all CORs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const generateCOR = async (req: AuthRequest, res: Response) => {
  try {
    const { enrollmentId } = req.body;
    const userId = req.user?.id;

    // Get enrollment details
    const enrollments = await query(
      `SELECT e.*, s.id as student_id, s.student_id as student_number
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.id = ?`,
      [enrollmentId]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const enrollment = enrollments[0];

    // Generate COR number
    const corNumber = `COR-${enrollment.student_number}-${enrollment.school_year.replace('-', '')}-${Date.now()}`;

    // Check if COR already exists
    const existing = await query('SELECT * FROM cors WHERE enrollment_id = ?', [enrollmentId]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'COR already exists for this enrollment'
      });
    }

    const result = await run(
      `INSERT INTO cors 
        (student_id, enrollment_id, cor_number, status, generated_at, generated_by)
       VALUES (?, ?, ?, 'Generated', datetime('now'), ?)`,
      [enrollment.student_id, enrollmentId, corNumber, userId]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'GENERATE_COR', 'cor', result.lastInsertRowid, `Generated COR ${corNumber}`]
    );

    res.status(201).json({
      success: true,
      message: 'COR generated successfully',
      data: { id: result.lastInsertRowid, cor_number: corNumber }
    });
  } catch (error) {
    console.error('Generate COR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const approveCOR = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    await run(
      `UPDATE cors SET 
        status = 'Approved',
        updated_at = datetime('now')
      WHERE id = ?`,
      [id]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'APPROVE_COR', 'cor', id, 'Approved COR']
    );

    res.json({
      success: true,
      message: 'COR approved successfully'
    });
  } catch (error) {
    console.error('Approve COR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Clearances Management
export const getAllClearances = async (req: AuthRequest, res: Response) => {
  try {
    const { status, clearance_type, studentId } = req.query;

    let sql = `
      SELECT 
        c.*,
        s.student_id,
        s.first_name || ' ' || s.last_name as student_name,
        s.course,
        u.username as resolved_by_name
      FROM clearances c
      JOIN students s ON c.student_id = s.id
      LEFT JOIN users u ON c.resolved_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    if (clearance_type) {
      sql += ' AND c.clearance_type = ?';
      params.push(clearance_type);
    }
    if (studentId) {
      sql += ' AND s.student_id = ?';
      params.push(studentId);
    }

    sql += ' ORDER BY c.created_at DESC';

    const clearances = await query(sql, params);

    res.json({
      success: true,
      data: clearances
    });
  } catch (error) {
    console.error('Get all clearances error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const createClearance = async (req: AuthRequest, res: Response) => {
  try {
    const { student_id, clearance_type, issue_description } = req.body;

    const result = await run(
      `INSERT INTO clearances 
        (student_id, clearance_type, issue_description, status)
       VALUES (?, ?, ?, 'Pending')`,
      [student_id, clearance_type, issue_description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Clearance created successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Create clearance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const resolveClearance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id;

    await run(
      `UPDATE clearances SET 
        status = 'Cleared',
        resolved_at = datetime('now'),
        resolved_by = ?,
        remarks = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
      [userId, remarks || null, id]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'RESOLVE_CLEARANCE', 'clearance', id, 'Resolved clearance']
    );

    res.json({
      success: true,
      message: 'Clearance resolved successfully'
    });
  } catch (error) {
    console.error('Resolve clearance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get enrollments pending registrar assessment (after subject selection)
export const getPendingSubjectAssessments = async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await query(
      `SELECT e.*, 
        s.student_id, s.first_name || ' ' || s.last_name as student_name, s.course, s.year_level,
        (SELECT COUNT(*) FROM enrollment_subjects es WHERE es.enrollment_id = e.id) as subject_count
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.status = 'For Registrar Assessment'
       ORDER BY e.updated_at DESC`
    );

    res.json({ success: true, data: enrollments });
  } catch (error) {
    console.error('Get pending subject assessments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get enrollment details with subjects for assessment review
export const getEnrollmentForAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollments = await query(
      `SELECT e.*, 
        s.student_id, s.first_name || ' ' || s.last_name as student_name, s.course, s.year_level, s.student_classification
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.id = ?`,
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const enrollment = enrollments[0];

    // Get enrolled subjects
    let subjects = await query(
      `SELECT es.*, sub.subject_code, sub.subject_name, sub.units
       FROM enrollment_subjects es
       JOIN subjects sub ON es.subject_id = sub.id
       WHERE es.enrollment_id = ?`,
      [id]
    );

    // If no subjects assigned yet, get available subjects and auto-assign them
    // EXCEPT for Transferee or Irregular students — they select their own subjects during enrollment
    let availableSubjects = [];
    const isTransfereeOrIrregular = enrollment.student_classification === 'Irregular' ||
      (enrollment.student_type || '').toLowerCase() === 'transferee';

    // Fetch student_type if not on enrollment record
    let studentType = enrollment.student_type;
    if (!studentType) {
      const studentRow = await get('SELECT student_type FROM students WHERE id = ?', [enrollment.student_id]);
      studentType = studentRow?.student_type || '';
    }
    const isTransferee = studentType.toLowerCase() === 'transferee';
    const shouldAutoAssign = !isTransfereeOrIrregular && !isTransferee;

    if (subjects.length === 0) {
      availableSubjects = await query(
        `SELECT id, subject_code, subject_name, units, course, year_level, semester
         FROM subjects
         WHERE course = ? AND year_level = ? AND is_active = 1
         ORDER BY semester ASC, subject_code ASC`,
        [enrollment.course, enrollment.year_level]
      );

      // Only auto-assign for non-Transferee/non-Irregular students
      if (shouldAutoAssign && availableSubjects.length > 0) {
        const insertSubjectStmt = db.prepare(
          'INSERT OR IGNORE INTO enrollment_subjects (enrollment_id, subject_id, status) VALUES (?, ?, ?)'
        );
        
        const insertManySubjects = db.transaction((subjects: any[]) => {
          for (const subject of subjects) {
            insertSubjectStmt.run(enrollment.id, subject.id, 'Enrolled');
          }
        });

        insertManySubjects(availableSubjects);

        // Fetch the newly assigned subjects
        subjects = await query(
          `SELECT es.*, sub.subject_code, sub.subject_name, sub.units
           FROM enrollment_subjects es
           JOIN subjects sub ON es.subject_id = sub.id
           WHERE es.enrollment_id = ?`,
          [id]
        );
      }
    }

    res.json({ 
      success: true, 
      data: { 
        enrollment, 
        subjects,
        availableSubjects
      } 
    });
  } catch (error) {
    console.error('Get enrollment for assessment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Approve subject assessment and forward to dean
export const approveSubjectAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tuition, registration, library, lab, id_fee, others, remarks } = req.body;
    const userId = req.user?.id;

    // Check if enrollment exists and is in correct status
    const enrollments = await query('SELECT * FROM enrollments WHERE id = ?', [id]);

    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollments[0].status !== 'For Registrar Assessment') {
      return res.status(400).json({ success: false, message: 'Enrollment is not pending registrar assessment' });
    }

    // Calculate total based on units and fees
    const subjTotals = await query(
      `SELECT SUM(s.units) as total_units
       FROM enrollment_subjects es
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.enrollment_id = ?`,
      [id]
    );
    const totalUnits = subjTotals[0]?.total_units || 0;
    
    // Get course fee rates from courses_fees table
    const studentInfo = await get(
      'SELECT s.course FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = ?',
      [id]
    );
    const feeRates = await getCourseFeeRates(studentInfo?.course || '');
    
    // Calculate total amount using dynamic per-unit rate
    const tuitionFee = tuition || (totalUnits * feeRates.tuition_per_unit);
    const regFee = registration || 0;
    const libFee = library || 0;
    const labFee = lab || 0;
    const idFee = id_fee || 0;
    const otherFees = others || 0;
    const totalAmount = tuitionFee + regFee + libFee + labFee + idFee + otherFees;

    // Update enrollment with assessment and forward to cashier for review
    await run(
      `UPDATE enrollments SET 
        status = 'Cashier Review',
        tuition = ?,
        registration = ?,
        library = ?,
        lab = ?,
        id_fee = ?,
        others = ?,
        total_amount = ?,
        assessed_by = ?,
        assessed_at = ?,
        remarks = ?,
        updated_at = ?
       WHERE id = ?`,
      [tuitionFee, regFee, libFee, labFee, idFee, otherFees, totalAmount, userId, remarks || null, new Date().toISOString(), new Date().toISOString(), id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'Cashier Review');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'APPROVE_SUBJECT_ASSESSMENT', 'enrollment', id, `Subject assessment approved, total: ₱${totalAmount}. Forwarded to Cashier for review.`]
    );

    res.json({
      success: true,
      message: 'Subject assessment approved. Forwarded to Cashier for fee review.',
      data: { total_amount: totalAmount }
    });
  } catch (error) {
    console.error('Approve subject assessment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get registrar dashboard stats
export const getRegistrarDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Total student records
    const totalRecords = await query('SELECT COUNT(*) as count FROM students WHERE status = ?', ['Active']);
    // Pending grades (enrollment_subjects without grades)
    const pendingGrades = await query(
      `SELECT COUNT(*) as count 
       FROM enrollment_subjects es
       JOIN enrollments e ON es.enrollment_id = e.id
       WHERE es.grade IS NULL OR es.grade = ''
       AND e.status = 'Approved'`
    );

    // COR requests
    const corRequests = await query(
      "SELECT COUNT(*) as count FROM cors WHERE status = 'Pending'"
    );

    // Clearances
    const clearances = await query(
      "SELECT COUNT(*) as count FROM clearances WHERE status = 'Pending'"
    );

    res.json({
      success: true,
      data: {
        totalRecords: totalRecords[0]?.count || 0,
        pendingGrades: pendingGrades[0]?.count || 0,
        corRequests: corRequests[0]?.count || 0,
        clearances: clearances[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Get registrar dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Assign a student/enrollment to a section
export const assignStudentToSection = async (req: AuthRequest, res: Response) => {
  try {
    const { enrollment_id, section_id } = req.body;
    const userId = req.user?.id;

    if (!enrollment_id || !section_id) {
      return res.status(400).json({ success: false, message: 'enrollment_id and section_id are required' });
    }

    // Update enrollment record with section
    await run(
      `UPDATE enrollments SET section_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [section_id, enrollment_id]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'ASSIGN_SECTION', 'enrollment', enrollment_id, `Assigned to section ${section_id}`]
    );

    res.json({ success: true, message: 'Student assigned to section' });
  } catch (error) {
    console.error('Assign student to section error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Enrollment reports: totals per semester, per section, pending enrollments
export const getEnrollmentReport = async (req: AuthRequest, res: Response) => {
  try {
    // Total enrolled per semester
    const perSemester = await query(
      `SELECT school_year || ' ' || semester AS period, COUNT(*) as total
       FROM enrollments
       WHERE status = 'Enrolled'
       GROUP BY school_year, semester
       ORDER BY school_year DESC, semester`)
;

    // Number of students per section
    const perSection = await query(
      `SELECT sec.id as section_id, sec.section_name as section_name, COUNT(e.id) as total
       FROM enrollments e
       LEFT JOIN sections sec ON e.section_id = sec.id
       WHERE e.status = 'Enrolled'
       GROUP BY sec.id, sec.section_name`);

    // Pending enrollments
    const pending = await query(`SELECT COUNT(*) as total FROM enrollments WHERE status != 'Enrolled'`);

    res.json({ success: true, data: { perSemester, perSection, pending: pending[0]?.total || 0 } });
  } catch (error) {
    console.error('Get enrollment report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const downloadScholarshipLetter = async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/scholarships', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    res.download(filePath, (filename));
  } catch (error) {
    console.error('Download scholarship letter error:', error);
    res.status(500).send('Server error');
  }
};

// ───────────────────────────────────────────────────────────
// Adding / Dropping of Subjects (Registrar authority)
// ───────────────────────────────────────────────────────────

/** Helper: recalculate enrollment fees after subject change */
const recalcEnrollmentFees = async (enrollmentId: number | string) => {
  const enrollment = await get('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]);
  if (!enrollment) return;

  const subjectRows = await query(
    `SELECT SUM(s.units) as total_units
     FROM enrollment_subjects es
     JOIN subjects s ON es.subject_id = s.id
     WHERE es.enrollment_id = ? AND es.status = 'Enrolled'`,
    [enrollmentId]
  );
  const totalUnits = subjectRows[0]?.total_units || 0;

  // Get course via student
  const studentRow = await get(
    'SELECT s.course FROM students s JOIN enrollments e ON e.student_id = s.id WHERE e.id = ?',
    [enrollmentId]
  );
  const feeRates = await getCourseFeeRates(studentRow?.course || '');
  const subjectFees = totalUnits * feeRates.tuition_per_unit;

  // Preserve misc assessment fees (registration, library, lab, id_fee, others)
  const miscFees = (enrollment.registration || 0) + (enrollment.library || 0) +
    (enrollment.lab || 0) + (enrollment.id_fee || 0) + (enrollment.others || 0);
  const totalAmount = subjectFees + miscFees;

  await run(
    'UPDATE enrollments SET total_units = ?, tuition = ?, total_amount = ? WHERE id = ?',
    [totalUnits, subjectFees, totalAmount, enrollmentId]
  );

  return { totalUnits, totalAmount };
};

/** Search students with active enrollments (for the add/drop tab) */
export const searchEnrolledStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT e.id as enrollment_id, e.status as enrollment_status, e.school_year, e.semester,
             e.total_units, e.total_amount, e.tuition, e.registration, e.library, e.lab, e.id_fee, e.others,
             s.id as student_id, s.student_id as student_id_number, s.first_name, s.last_name,
             s.middle_name, s.suffix, s.course, s.year_level, s.student_type, s.student_classification
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ` AND (s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR (s.first_name || ' ' || s.last_name) LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY e.created_at DESC LIMIT 50';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Search enrolled students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Get subjects for a specific enrollment (enrolled + available for adding) */
export const getEnrollmentSubjectsForEdit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await get(
      'SELECT e.*, s.course, s.year_level FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = ?',
      [id]
    );
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const enrolled = await query(
      `SELECT es.id, es.enrollment_id, es.subject_id, es.schedule, es.room, es.instructor, es.status as es_status,
              sub.subject_code, sub.subject_name, sub.units, sub.year_level, sub.semester
       FROM enrollment_subjects es
       JOIN subjects sub ON es.subject_id = sub.id
       WHERE es.enrollment_id = ?
       ORDER BY sub.year_level, sub.semester, sub.subject_code`,
      [id]
    );

    const available = await query(
      `SELECT id, subject_code, subject_name, units, year_level, semester
       FROM subjects
       WHERE course = ? AND is_active = 1
       ORDER BY year_level, semester, subject_code`,
      [enrollment.course]
    );

    res.json({
      success: true,
      data: { enrollment, enrolledSubjects: enrolled, availableSubjects: available }
    });
  } catch (error) {
    console.error('Get enrollment subjects for edit error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Registrar adds a subject to an enrollment (with audit trail) */
export const registrarAddSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_id, reason } = req.body;

    const enrollment = await get('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const existing = await get(
      'SELECT id FROM enrollment_subjects WHERE enrollment_id = ? AND subject_id = ?',
      [id, subject_id]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: 'Subject already enrolled' });
    }

    const oldUnits = enrollment.total_units || 0;
    const oldAmount = enrollment.total_amount || 0;

    await run(
      `INSERT INTO enrollment_subjects (enrollment_id, subject_id, status) VALUES (?, ?, 'Enrolled')`,
      [id, subject_id]
    );

    const updated = await recalcEnrollmentFees(id);

    const user = await get('SELECT username FROM users WHERE id = ?', [req.user?.id]);
    await run(
      `INSERT INTO enrollment_subject_audit
        (enrollment_id, subject_id, action, reason, performed_by, performed_by_name,
         old_total_units, new_total_units, old_total_amount, new_total_amount)
       VALUES (?, ?, 'ADD', ?, ?, ?, ?, ?, ?, ?)`,
      [id, subject_id, reason || null, req.user?.id, user?.username || 'unknown',
       oldUnits, updated?.totalUnits || 0, oldAmount, updated?.totalAmount || 0]
    );

    // Log to activity logs for audit trail
    const subject = await get('SELECT subject_code, subject_name FROM subjects WHERE id = ?', [subject_id]);
    const student = await get('SELECT student_id, first_name, last_name FROM students WHERE id = ?', [enrollment.student_id]);
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id, 'ADD_SUBJECT', 'enrollment', id, `Added subject ${subject?.subject_code} (${subject?.subject_name}) to enrollment ${id} for ${student?.first_name} ${student?.last_name} (${student?.student_id})`]
    );

    res.json({ success: true, message: 'Subject added successfully' });
  } catch (error) {
    console.error('Registrar add subject error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Registrar drops a subject from an enrollment (with audit trail) */
export const registrarDropSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id, subjectId } = req.params;
    const { reason } = req.body;

    const enrollment = await get('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const existing = await get(
      'SELECT id FROM enrollment_subjects WHERE enrollment_id = ? AND subject_id = ?',
      [id, subjectId]
    );
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Subject not found in enrollment' });
    }

    const oldUnits = enrollment.total_units || 0;
    const oldAmount = enrollment.total_amount || 0;

    await run(
      'DELETE FROM enrollment_subjects WHERE enrollment_id = ? AND subject_id = ?',
      [id, subjectId]
    );

    const updated = await recalcEnrollmentFees(id);

    const user = await get('SELECT username FROM users WHERE id = ?', [req.user?.id]);
    const subject = await get('SELECT subject_code, subject_name FROM subjects WHERE id = ?', [subjectId]);
    
    await run(
      `INSERT INTO enrollment_subject_audit
        (enrollment_id, subject_id, action, reason, performed_by, performed_by_name,
         old_total_units, new_total_units, old_total_amount, new_total_amount)
       VALUES (?, ?, 'DROP', ?, ?, ?, ?, ?, ?, ?)`,
      [id, subjectId, reason || null, req.user?.id, user?.username || 'unknown',
       oldUnits, updated?.totalUnits || 0, oldAmount, updated?.totalAmount || 0]
    );

    // Log to activity logs for audit trail
    const dropStudent = await get('SELECT student_id, first_name, last_name FROM students WHERE id = ?', [enrollment.student_id]);
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id, 'DROP_SUBJECT', 'enrollment', id, `Dropped subject ${subject?.subject_code} (${subject?.subject_name}) from enrollment ${id} for ${dropStudent?.first_name} ${dropStudent?.last_name} (${dropStudent?.student_id})`]
    );

    res.json({ success: true, message: 'Subject dropped successfully' });
  } catch (error) {
    console.error('Registrar drop subject error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Get audit trail for an enrollment */
export const getSubjectAuditTrail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT a.*, sub.subject_code, sub.subject_name, sub.units
       FROM enrollment_subject_audit a
       JOIN subjects sub ON a.subject_id = sub.id
       WHERE a.enrollment_id = ?
       ORDER BY a.created_at DESC`,
      [id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get subject audit trail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
