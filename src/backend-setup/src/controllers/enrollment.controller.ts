import { Response } from 'express';
import { query, run, get } from '../database/connection';
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

// Helper: get student's course from enrollment id
const getEnrollmentCourse = async (enrollmentId: number | string): Promise<string> => {
  try {
    const row = await get(
      `SELECT s.course FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = ?`,
      [enrollmentId]
    );
    return row?.course || '';
  } catch {
    return '';
  }
};

const resolveStudentId = async (userId?: number) => {
  if (userId) {
    const students = await query('SELECT id FROM students WHERE user_id = ?', [userId]);
    if (students.length > 0) {
      return students[0].id as number;
    }
  }

  const fallback = await query('SELECT id FROM students ORDER BY id ASC LIMIT 1');
  return fallback.length > 0 ? (fallback[0].id as number) : null;
};

export const createEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { school_year, semester, scholarship_type, scholarship_letter_path } = req.body;

    // Validate input
    if (!school_year || !semester) {
      return res.status(400).json({ success: false, message: 'school_year and semester are required' });
    }

    const studentId = await resolveStudentId(userId);
    if (!studentId) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Check if enrollment already exists for this period
    const existingEnrollments = await query(
      `SELECT id FROM enrollments 
       WHERE student_id = ? AND school_year = ? AND semester = ?`,
      [studentId, school_year, semester]
    );

    if (existingEnrollments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment already exists for this period'
      });
    }

    // Create enrollment with status "Pending Assessment" when documents are submitted
    const result = await run(
      `INSERT INTO enrollments (student_id, school_year, semester, status, scholarship_type, scholarship_letter_path) 
       VALUES (?, ?, ?, 'Pending Assessment', ?, ?)`,
      [studentId, school_year, semester, scholarship_type || 'None', scholarship_letter_path || null]
    );

    // Send notification
    await sendEnrollmentNotification(studentId, result.lastInsertRowid as number, 'Pending Assessment');

    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully',
      data: {
        id: result.lastInsertRowid
      }
    });
  } catch (error) {
    console.error('Create enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getMyEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const studentId = await resolveStudentId(userId);
    if (!studentId) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get enrollments with subject count
    const enrollments = await query(
      `SELECT e.*, 
        COUNT(es.id) as subject_count,
        SUM(s.units) as total_units
       FROM enrollments e
       LEFT JOIN enrollment_subjects es ON e.id = es.enrollment_id
       LEFT JOIN subjects s ON es.subject_id = s.id
       WHERE e.student_id = ?
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get my enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getEnrollmentDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Get enrolled subjects
    // Ensure `schedule_id` column exists in enrollment_subjects (add if missing)
    try {
      const tableInfo = await query("PRAGMA table_info(enrollment_subjects)");
      const hasScheduleId = (tableInfo || []).some((c: any) => c.name === 'schedule_id');
      if (!hasScheduleId) {
        try {
          await run("ALTER TABLE enrollment_subjects ADD COLUMN schedule_id INTEGER");
          console.log('Added schedule_id column to enrollment_subjects');
        } catch (alterErr) {
          console.warn('Failed to add schedule_id column (may already exist):', alterErr);
        }
      }
    } catch (infoErr) {
      console.warn('Could not inspect enrollment_subjects table info:', infoErr);
    }

    // Now attempt to include schedule details via LEFT JOIN; this will work even if schedules table missing (LEFT JOIN)
    let subjects = await query(
      `SELECT es.*, s.subject_code, s.subject_name, s.units, s.description,
              ss.id as schedule_id, ss.day_time as schedule_day_time, ss.room as schedule_room, ss.instructor as schedule_instructor
       FROM enrollment_subjects es
       JOIN subjects s ON es.subject_id = s.id
       LEFT JOIN subject_schedules ss ON es.schedule_id = ss.id
       WHERE es.enrollment_id = ?`,
      [id]
    );

    // For each subject row, also load available schedules (if table exists)
    try {
      const subjectsWithSchedules = await Promise.all(subjects.map(async (es: any) => {
        try {
          const opts = await query('SELECT id, day_time, room, instructor FROM subject_schedules WHERE subject_id = ? AND is_active = 1 ORDER BY id', [es.subject_id || es.subject_id]);
          return { ...es, schedule_options: opts || [] };
        } catch (e) {
          // schedules table may not exist
          return { ...es, schedule_options: [] };
        }
      }));

      res.json({
        success: true,
        data: {
          enrollment: enrollments[0],
          subjects: subjectsWithSchedules
        }
      });
    } catch (outerErr) {
      console.warn('Failed to fetch schedule options, returning subjects without options', outerErr);
      res.json({ success: true, data: { enrollment: enrollments[0], subjects } });
    }
  } catch (error) {
    console.error('Get enrollment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const addSubjectToEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { subject_id, schedule, room, instructor, schedule_id } = req.body;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );
    
    // Get the subject being added to know its units
    const subjectInfo = await query(
      'SELECT units FROM subjects WHERE id = ?',
      [subject_id]
    );
    const addedSubjectUnits = subjectInfo[0]?.units || 0;

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Registrar can add subjects regardless of status; students can add during "For Subject Selection" or "Pending Assessment" (for Transferee/Irregular pre-assessment subject selection)
    const isRegistrar = req.user?.role === 'registrar';
    const allowedStatuses = ['For Subject Selection', 'Pending Assessment'];
    if (!isRegistrar && !allowedStatuses.includes(enrollments[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add subjects. Enrollment must be in "For Subject Selection" or "Pending Assessment" status.'
      });
    }

    // Check if subject already added
    const existingSubjects = await query(
      'SELECT id FROM enrollment_subjects WHERE enrollment_id = ? AND subject_id = ?',
      [id, subject_id]
    );

    if (existingSubjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Subject already added to enrollment'
      });
    }

    // If schedule_id provided, attempt to fetch its day_time
    let scheduleText = schedule || null;
    if (schedule_id) {
      try {
        const sch = await query('SELECT day_time FROM subject_schedules WHERE id = ? AND is_active = 1', [schedule_id]);
        if (sch.length > 0) scheduleText = sch[0].day_time;
      } catch (e) { console.warn('Failed to resolve schedule_id', e); }
    }

    // Add subject (store optional schedule_id for reference)
    await run(
      `INSERT INTO enrollment_subjects 
        (enrollment_id, subject_id, schedule, room, instructor, schedule_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, subject_id, scheduleText, room, instructor, schedule_id || null]
    );

    // Update total units in enrollment
    const subjects = await query(
      `SELECT SUM(s.units) as total_units
       FROM enrollment_subjects es
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.enrollment_id = ?`,
      [id]
    );

    const totalUnits = subjects[0]?.total_units || 0;
    
    // Get course fee rates from courses_fees table
    const course = await getEnrollmentCourse(id);
    const feeRates = await getCourseFeeRates(course);
    const perUnit = feeRates.tuition_per_unit;
    
    // Get current enrollment to preserve assessment fees
    const currentEnrollment = await query(
      'SELECT total_amount, assessed_at FROM enrollments WHERE id = ?',
      [id]
    );
    
    // Calculate subject fees using dynamic per-unit rate
    const subjectFees = totalUnits * perUnit;
    
    // Determine total amount: assessment fees + subject fees
    let totalAmount = subjectFees;
    
    if (currentEnrollment[0]?.assessed_at) {
      // Enrollment has been assessed
      const currentTotal = currentEnrollment[0].total_amount || 0;
      
      // If this is the first subject being added (totalUnits equals the units of subject just added),
      // then currentTotal contains only assessment fees
      if (totalUnits === addedSubjectUnits) {
        // First subject, currentTotal = assessment fees only
        totalAmount = currentTotal + subjectFees;
      } else {
        // Not first subject, need to extract assessment fees
        // Previous units before this addition
        const prevUnits = totalUnits - addedSubjectUnits;
        const prevSubjectFees = prevUnits * perUnit;
        const assessmentFees = currentTotal - prevSubjectFees;
        totalAmount = assessmentFees + subjectFees;
      }
    }

    await run(
      'UPDATE enrollments SET total_units = ?, total_amount = ? WHERE id = ?',
      [totalUnits, totalAmount, id]
    );

    res.json({
      success: true,
      message: 'Subject added successfully'
    });
  } catch (error) {
    console.error('Add subject to enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const removeSubjectFromEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const { id, subjectId } = req.params;

    // Check enrollment status and get subject info
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );
    
    // Get the subject being removed to know its units
    const subjectInfo = await query(
      'SELECT units FROM subjects WHERE id = ?',
      [subjectId]
    );
    const removedSubjectUnits = subjectInfo[0]?.units || 0;

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Registrar can remove subjects regardless of status; students can remove during "For Subject Selection" or "Pending Assessment" (for Transferee/Irregular pre-assessment subject selection)
    const isRegistrar = req.user?.role === 'registrar';
    const allowedStatuses = ['For Subject Selection', 'Pending Assessment'];
    if (!isRegistrar && !allowedStatuses.includes(enrollments[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove subjects. Enrollment must be in "For Subject Selection" or "Pending Assessment" status.'
      });
    }

    // Remove subject
    await run(
      'DELETE FROM enrollment_subjects WHERE enrollment_id = ? AND subject_id = ?',
      [id, subjectId]
    );

    // Update total units
    const subjects = await query(
      `SELECT SUM(s.units) as total_units
       FROM enrollment_subjects es
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.enrollment_id = ?`,
      [id]
    );

    const totalUnits = subjects[0]?.total_units || 0;
    
    // Get current enrollment to preserve assessment fees
    const currentEnrollment = await query(
      'SELECT total_amount, assessed_at FROM enrollments WHERE id = ?',
      [id]
    );
    
    // Get course fee rates from courses_fees table
    const course = await getEnrollmentCourse(id);
    const feeRates = await getCourseFeeRates(course);
    const perUnit = feeRates.tuition_per_unit;
    
    // Calculate subject fees using dynamic per-unit rate (after removal)
    const subjectFees = totalUnits * perUnit;
    
    // Determine total amount: assessment fees + subject fees
    let totalAmount = subjectFees;
    
    if (currentEnrollment[0]?.assessed_at) {
      // Enrollment has been assessed, preserve assessment fees
      const currentTotal = currentEnrollment[0].total_amount || 0;
      
      // Previous units before removal = current units + removed units
      const prevUnits = totalUnits + removedSubjectUnits;
      const prevSubjectFees = prevUnits * perUnit;
      
      // Extract assessment fees: current_total - previous_subject_fees
      const assessmentFees = currentTotal - prevSubjectFees;
      totalAmount = assessmentFees + subjectFees;
    }

    await run(
      'UPDATE enrollments SET total_units = ?, total_amount = ? WHERE id = ?',
      [totalUnits, totalAmount, id]
    );

    res.json({
      success: true,
      message: 'Subject removed successfully'
    });
  } catch (error) {
    console.error('Remove subject from enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const submitForAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if enrollment exists
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Update status to "Pending Assessment" when student submits documents
    await run(
      "UPDATE enrollments SET status = ?, updated_at = datetime('now') WHERE id = ?",
      ['Pending Assessment', id]
    );

    // Send notification to student
    await sendEnrollmentNotification(enrollments[0].student_id, Number(id), 'Pending Assessment');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id, 'SUBMIT_FOR_ASSESSMENT', 'enrollment', id, 'Enrollment submitted for assessment']
    );

    res.json({
      success: true,
      message: 'Enrollment submitted for assessment'
    });
  } catch (error) {
    console.error('Submit for assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Registrar: Assess enrollment and set fees
export const assessEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tuition, registration, library, lab, id_fee, others, remarks, scholarship_coverage } = req.body;
    const userId = req.user?.id;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollments[0].status !== 'Pending Assessment') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not in Pending Assessment status'
      });
    }

    // Calculate assessment fees (base fees before subject fees)
    const assessmentFees = (tuition || 0) + (registration || 0) + (library || 0) + 
                          (lab || 0) + (id_fee || 0) + (others || 0);

    // Get current subject fees if any subjects have been added
    const currentSubjects = await query(
      `SELECT SUM(s.units) as total_units
       FROM enrollment_subjects es
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.enrollment_id = ?`,
      [id]
    );
    const currentUnits = currentSubjects[0]?.total_units || 0;
    
    // Get course fee rates from courses_fees table
    const course = await getEnrollmentCourse(id);
    const feeRates = await getCourseFeeRates(course);
    const currentSubjectFees = currentUnits * feeRates.tuition_per_unit;
    
    // Total amount = assessment fees + subject fees (if any)
    const totalAmount = assessmentFees + currentSubjectFees;

    // Update enrollment with assessment and persist breakdown fees
    await run(
      `UPDATE enrollments SET 
        status = 'For Registrar Assessment',
        total_amount = ?,
        tuition = ?,
        registration = ?,
        library = ?,
        lab = ?,
        id_fee = ?,
        others = ?,
        assessed_by = ?,
        assessed_at = datetime('now'),
        remarks = ?,
        scholarship_coverage = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [totalAmount, tuition || 0, registration || 0, library || 0, lab || 0, id_fee || 0, others || 0, userId, remarks || null, scholarship_coverage || null, id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, Number(id), 'For Registrar Assessment');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'ASSESS_ENROLLMENT', 'enrollment', id, `Enrollment assessed: ₱${totalAmount.toFixed(2)}`]
    );

    res.json({
      success: true,
      message: 'Enrollment assessed successfully',
      data: {
        total_amount: totalAmount
      }
    });
  } catch (error) {
    console.error('Assess enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Admin: Approve enrollment assessment (moves to "For Subject Selection")
export const approveEnrollmentAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollments[0].status !== 'For Admin Approval') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not in For Admin Approval status'
      });
    }

    // Update enrollment status
    await run(
      `UPDATE enrollments SET 
        status = 'For Subject Selection',
        approved_by = ?,
        approved_at = datetime('now'),
        remarks = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [userId, remarks || null, id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'For Subject Selection');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'APPROVE_ENROLLMENT_ASSESSMENT', 'enrollment', id, 'Enrollment assessment approved']
    );

    res.json({
      success: true,
      message: 'Enrollment assessment approved. Student can now select subjects.'
    });
  } catch (error) {
    console.error('Approve enrollment assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Student: Submit subjects for Dean approval
export const submitSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollments[0].status !== 'For Subject Selection') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not in For Subject Selection status'
      });
    }

    // Check if enrollment has subjects
    const subjects = await query(
      'SELECT COUNT(*) as count FROM enrollment_subjects WHERE enrollment_id = ?',
      [id]
    );

    if (subjects[0]?.count === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit enrollment without subjects'
      });
    }

    // Calculate total units and update amount (assessment + subject fees)
    const subjTotals = await query(
      `SELECT SUM(s.units) as total_units
       FROM enrollment_subjects es
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.enrollment_id = ?`,
      [id]
    );

    const totalUnits = subjTotals[0]?.total_units || 0;
    
    // Get course fee rates from courses_fees table
    const course = await getEnrollmentCourse(id);
    const feeRates = await getCourseFeeRates(course);
    const subjectFees = totalUnits * feeRates.tuition_per_unit;
    const totalAmount = (enrollments[0].total_amount || 0) + subjectFees;

    await run(
      `UPDATE enrollments SET 
        status = 'For Registrar Assessment',
        total_units = ?,
        total_amount = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [totalUnits, totalAmount, id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'For Registrar Assessment');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id, 'SUBMIT_SUBJECTS', 'enrollment', id, `Subjects submitted: ${totalUnits} units`]
    );

    res.json({
      success: true,
      message: 'Subjects submitted for Registrar assessment',
      data: {
        total_units: totalUnits,
        subject_fees: subjectFees,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    console.error('Submit subjects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Dean: Approve subject selection (moves to "For Payment")
export const approveSubjectSelection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks, tuition, registration, library, lab, id_fee, others } = req.body;
    const userId = req.user?.id;

    const enrollments = await query('SELECT * FROM enrollments WHERE id = ?', [id]);

    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollments[0].status !== 'For Dean Approval') {
      return res.status(400).json({ success: false, message: 'Enrollment is not in For Dean Approval status' });
    }

    // Build update — only overwrite fees if dean explicitly provided them
    const hasFees = tuition !== undefined || registration !== undefined;
    let updateQuery: string;
    let updateParams: any[];

    if (hasFees) {
      const t = tuition ?? enrollments[0].tuition ?? 0;
      const r = registration ?? enrollments[0].registration ?? 0;
      const l = library ?? enrollments[0].library ?? 0;
      const lb = lab ?? enrollments[0].lab ?? 0;
      const i = id_fee ?? enrollments[0].id_fee ?? 0;
      const o = others ?? enrollments[0].others ?? 0;
      const total = t + r + l + lb + i + o;
      updateQuery = `UPDATE enrollments SET status = 'For Payment', tuition = ?, registration = ?, library = ?, lab = ?, id_fee = ?, others = ?, total_amount = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`;
      updateParams = [t, r, l, lb, i, o, total, remarks || null, id];
    } else {
      updateQuery = `UPDATE enrollments SET status = 'For Payment', remarks = ?, updated_at = datetime('now') WHERE id = ?`;
      updateParams = [remarks || null, id];
    }

    await run(updateQuery, updateParams);

    // Send notification to student
    await sendEnrollmentNotification(enrollments[0].student_id, Number(id), 'For Payment');

    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'DEAN_APPROVE_ENROLLMENT', 'enrollment', id, 'Dean approved enrollment. Forwarded to student for payment.']
    );

    res.json({ success: true, message: 'Enrollment approved. Student can now proceed to payment.' });
  } catch (error) {
    console.error('Approve subject selection error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const rejectEnrollmentByDean = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id;

    const enrollments = await query('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (enrollments.length === 0) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollments[0].status !== 'For Dean Approval') {
      return res.status(400).json({ success: false, message: 'Enrollment is not in For Dean Approval status' });
    }

    await run(
      `UPDATE enrollments SET status = 'Pending Assessment', remarks = ?, updated_at = datetime('now') WHERE id = ?`,
      [remarks || null, id]
    );

    // Send notification to student
    await sendEnrollmentNotification(enrollments[0].student_id, Number(id), 'Pending Assessment');

    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'DEAN_REJECT_ENROLLMENT', 'enrollment', id, `Dean returned enrollment to registrar: ${remarks || 'No reason given'}`]
    );

    res.json({ success: true, message: 'Enrollment returned to registrar for re-assessment.' });
  } catch (error) {
    console.error('Reject enrollment by dean error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Student: Submit payment (moves to "Payment Verification")
export const submitPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { payment_method, reference_number, receipt_path, amount } = req.body;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollments[0].status !== 'For Payment' && enrollments[0].status !== 'Ready for Payment') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not in For Payment status'
      });
    }

    // Create transaction record
    const transactionResult = await run(
      `INSERT INTO transactions 
        (enrollment_id, transaction_type, amount, payment_method, reference_number, receipt_path, status, remarks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'Enrollment Fee', amount || enrollments[0].total_amount, payment_method, reference_number, receipt_path || null, 'Pending', `Receipt: ${receipt_path || 'N/A'}`]
    );

    // Update enrollment status
    await run(
      `UPDATE enrollments SET 
        status = 'Payment Verification',
        updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'Payment Verification');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id, 'SUBMIT_PAYMENT', 'enrollment', id, `Payment submitted: ${payment_method} - ${reference_number}`]
    );

    res.json({
      success: true,
      message: 'Payment submitted for verification',
      data: {
        transaction_id: transactionResult.lastInsertRowid
      }
    });
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Registrar: Verify payment (moves to "Enrolled")
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { transaction_id, remarks } = req.body;
    const userId = req.user?.id;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollments[0].status !== 'Payment Verification') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not in Payment Verification status'
      });
    }

    // Update transaction status
    if (transaction_id) {
      await run(
        `UPDATE transactions SET 
          status = 'Completed',
          processed_by = ?,
          remarks = ?,
          updated_at = datetime('now')
         WHERE id = ?`,
        [userId, remarks || null, transaction_id]
      );
    }

    // Update enrollment status to Enrolled
    await run(
      `UPDATE enrollments SET 
        status = 'Enrolled',
        remarks = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [remarks || null, id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'Enrolled');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'VERIFY_PAYMENT', 'enrollment', id, 'Payment verified. Enrollment completed.']
    );

    res.json({
      success: true,
      message: 'Payment verified. Student is now enrolled.'
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
// Registrar: Approve enrollment (moves to "For Subject Selection")
export const approveEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollments[0].status !== 'For Admin Approval') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not in For Admin Approval status'
      });
    }

    // Update enrollment status
    await run(
      `UPDATE enrollments SET 
        status = 'For Subject Selection',
        approved_by = ?,
        approved_at = datetime('now'),
        remarks = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [userId, remarks || null, id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'For Subject Selection');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'APPROVE_ENROLLMENT', 'enrollment', id, 'Enrollment approved by registrar']
    );

    res.json({
      success: true,
      message: 'Enrollment approved. Student can now select subjects.'
    });
  } catch (error) {
    console.error('Approve enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Registrar: Reject enrollment
export const rejectEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id;

    // Check if enrollment exists and is in correct status
    const enrollments = await query(
      'SELECT * FROM enrollments WHERE id = ?',
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if enrollment is in Pending Assessment or For Admin Approval status
    const validStatuses = ['Pending Assessment', 'For Admin Approval'];
    if (!validStatuses.includes(enrollments[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment can only be rejected in Pending Assessment or For Admin Approval status'
      });
    }

    // Delete enrollment
    await run(
      'DELETE FROM enrollments WHERE id = ?',
      [id]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'REJECT_ENROLLMENT', 'enrollment', id, 'Enrollment rejected by registrar']
    );

    res.json({
      success: true,
      message: 'Enrollment rejected.'
    });
  } catch (error) {
    console.error('Reject enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};