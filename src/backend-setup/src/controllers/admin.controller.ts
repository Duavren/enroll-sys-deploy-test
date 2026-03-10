import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query, run, get } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { student_type, status, search } = req.query;

    let sql = `
      SELECT s.*, u.username, u.email 
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (student_type) {
      sql += ' AND s.student_type = ?';
      params.push(student_type);
    }

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ` AND (s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.created_at DESC';

    const students = await query(sql, params);

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const students = await query(
      `SELECT s.*, u.username, u.email 
       FROM students s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ? OR s.student_id = ? LIMIT 1`,
      [id, id]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get student's enrollments
    const enrollments = await query(
      `SELECT e.*, 
        COUNT(es.id) as subject_count,
        SUM(sub.units) as total_units
       FROM enrollments e
       LEFT JOIN enrollment_subjects es ON e.id = es.enrollment_id
       LEFT JOIN subjects sub ON es.subject_id = sub.id
       WHERE e.student_id = ?
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [id]
    );

    // Get student's documents
    const documents = await query(
      'SELECT * FROM documents WHERE student_id = ? ORDER BY upload_date DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        student: students[0],
        enrollments,
        documents
      }
    });
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      username,
      password,
      email,
      student_id,
      first_name,
      middle_name,
      last_name,
      suffix,
      student_type,
      course,
      year_level,
      contact_number,
      address,
      birth_date,
      gender
    } = req.body;

    // Create user account - default password is 'password'
    const hashedPassword = await bcrypt.hash(password || 'password', 10);
    
    const userResult = await run(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      [username || student_id, hashedPassword, email, 'student']
    );

    const userId = userResult.lastInsertRowid;

    // Create student record
    const studentResult = await run(
      `INSERT INTO students 
        (user_id, student_id, first_name, middle_name, last_name, suffix, 
         student_type, course, year_level, contact_number, address, birth_date, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, student_id, first_name, middle_name, last_name, suffix,
       student_type, course, year_level, contact_number, address, birth_date, gender]
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        id: studentResult.lastInsertRowid,
        student_id
      }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get current student data first
    const currentStudent = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (currentStudent.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = currentStudent[0];

    // Build update fields dynamically - only update fields that are provided
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updateData.student_id !== undefined) {
      updateFields.push('student_id = ?');
      values.push(updateData.student_id);
    }
    if (updateData.first_name !== undefined) {
      updateFields.push('first_name = ?');
      values.push(updateData.first_name);
    }
    if (updateData.middle_name !== undefined) {
      updateFields.push('middle_name = ?');
      values.push(updateData.middle_name);
    }
    if (updateData.last_name !== undefined) {
      updateFields.push('last_name = ?');
      values.push(updateData.last_name);
    }
    if (updateData.suffix !== undefined) {
      updateFields.push('suffix = ?');
      values.push(updateData.suffix);
    }
    if (updateData.student_type !== undefined) {
      updateFields.push('student_type = ?');
      // Normalize student type for backend constraint
      const normalized = updateData.student_type?.charAt(0).toUpperCase() + updateData.student_type?.slice(1).toLowerCase();
      values.push(normalized);
    }
    if (updateData.course !== undefined) {
      updateFields.push('course = ?');
      values.push(updateData.course);
    }
    if (updateData.year_level !== undefined) {
      updateFields.push('year_level = ?');
      values.push(updateData.year_level);
    }
    if (updateData.contact_number !== undefined) {
      updateFields.push('contact_number = ?');
      values.push(updateData.contact_number);
    }
    if (updateData.address !== undefined) {
      updateFields.push('address = ?');
      values.push(updateData.address);
    }
    if (updateData.birth_date !== undefined) {
      updateFields.push('birth_date = ?');
      values.push(updateData.birth_date);
    }
    if (updateData.gender !== undefined) {
      updateFields.push('gender = ?');
      values.push(updateData.gender);
    }
    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updateData.status);
    }
    if (updateData.cor_status !== undefined) {
      updateFields.push('cor_status = ?');
      values.push(updateData.cor_status);
    }
    if (updateData.grades_complete !== undefined) {
      updateFields.push('grades_complete = ?');
      values.push(updateData.grades_complete ? 1 : 0);
    }
    if (updateData.clearance_status !== undefined) {
      updateFields.push('clearance_status = ?');
      values.push(updateData.clearance_status);
    }
    
    // Requirement status fields for New students
    if (updateData.form137_status !== undefined) {
      updateFields.push('form137_status = ?');
      values.push(updateData.form137_status);
    }
    if (updateData.form138_status !== undefined) {
      updateFields.push('form138_status = ?');
      values.push(updateData.form138_status);
    }
    
    // Requirement status fields for Transferee students
    if (updateData.tor_status !== undefined) {
      updateFields.push('tor_status = ?');
      values.push(updateData.tor_status);
    }
    if (updateData.certificate_transfer_status !== undefined) {
      updateFields.push('certificate_transfer_status = ?');
      values.push(updateData.certificate_transfer_status);
    }
    
    // Common requirement status fields for all types
    if (updateData.birth_certificate_status !== undefined) {
      updateFields.push('birth_certificate_status = ?');
      values.push(updateData.birth_certificate_status);
    }
    if (updateData.moral_certificate_status !== undefined) {
      updateFields.push('moral_certificate_status = ?');
      values.push(updateData.moral_certificate_status);
    }
    
    // Student classification (Regular/Irregular)
    if (updateData.student_classification !== undefined) {
      updateFields.push('student_classification = ?');
      values.push(updateData.student_classification);
    }

    // Always update updated_at
    updateFields.push('updated_at = datetime(\'now\')');

    if (updateFields.length === 1) {
      // Only updated_at would be updated, which means no actual fields to update
      return res.json({
        success: true,
        message: 'No fields to update'
      });
    }

    values.push(id);

    await run(
      `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    // Log activity - track that an admin edited this student
    const changedFields = updateFields
      .filter(f => !f.includes('updated_at'))
      .map(f => f.split(' = ')[0])
      .join(', ');
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id, 'UPDATE_STUDENT', 'student', id, `Updated student ${student.student_id} (${studentName}): ${changedFields}`]
    );

    res.json({
      success: true,
      message: 'Student updated successfully'
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get user_id first
    const students = await query(
      'SELECT user_id FROM students WHERE id = ?',
      [id]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Delete user (cascade will delete student)
    await run('DELETE FROM users WHERE id = ?', [students[0].user_id]);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Create user accounts for existing students who don't have user accounts yet
export const createAccountsForExistingStudents = async (req: AuthRequest, res: Response) => {
  try {
    // Find students without user_id
    const students = await query('SELECT * FROM students WHERE user_id IS NULL OR user_id = 0');
    const created: any[] = [];

    for (const s of students) {
      const username = s.student_id || `s${s.id}`;
      const password = (process.env.DEFAULT_STUDENT_PASSWORD || 'password');
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash(password, 10);

      const userResult: any = await run('INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)', [username, hashed, 'student', s.email || null]);
      const userId = userResult.lastInsertRowid;

      await run('UPDATE students SET user_id = ? WHERE id = ?', [userId, s.id]);

      created.push({ student_id: s.student_id, user_id: userId, username, password });
    }

    res.json({ success: true, message: `Created ${created.length} accounts`, data: created });
  } catch (error) {
    console.error('Create accounts for existing students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    const { status, school_year, semester } = req.query;

    let sql = `
      SELECT e.*, 
        s.student_id, s.first_name, s.middle_name, s.last_name,
        s.course, s.year_level, s.section,
        (SELECT COUNT(*) FROM enrollment_subjects es WHERE es.enrollment_id = e.id) as subject_count,
        (SELECT SUM(sub.units) FROM enrollment_subjects es2 JOIN subjects sub ON es2.subject_id = sub.id WHERE es2.enrollment_id = e.id) as total_units,
        (SELECT COUNT(*) FROM documents d WHERE d.enrollment_id = e.id) as documents_count
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }

    if (school_year) {
      sql += ' AND e.school_year = ?';
      params.push(school_year);
    }

    if (semester) {
      sql += ' AND e.semester = ?';
      params.push(semester);
    }

    sql += ' ORDER BY e.created_at DESC';

    const enrollments = await query(sql, params);

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get all enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getEnrollmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollments = await query(
      `SELECT e.*, 
        s.student_id, s.first_name, s.middle_name, s.last_name,
        s.course, s.year_level, s.section, s.student_type
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.id = ?`,
      [id]
    );

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Get enrolled subjects
    const subjects = await query(
      `SELECT es.*, sub.subject_code, sub.subject_name, sub.units
       FROM enrollment_subjects es
       JOIN subjects sub ON es.subject_id = sub.id
       WHERE es.enrollment_id = ?`,
      [id]
    );

    // Get transactions
    const transactions = await query(
      'SELECT * FROM transactions WHERE enrollment_id = ? ORDER BY payment_date DESC',
      [id]
    );

    // Get documents for this enrollment
    const documents = await query(
      'SELECT * FROM documents WHERE enrollment_id = ? ORDER BY upload_date DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        enrollment: enrollments[0],
        subjects,
        transactions,
        documents
      }
    });
  } catch (error) {
    console.error('Get enrollment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const updateEnrollmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const userId = req.user?.id;

    const updateFields: any = { status, remarks };

    if (status === 'Assessed') {
      updateFields.assessed_by = userId;
      updateFields.assessed_at = new Date().toISOString();
    } else if (status === 'Approved') {
      updateFields.approved_by = userId;
      updateFields.approved_at = new Date().toISOString();
    }

    // Remove undefined values so we don't bind unexpected undefineds
    const entries = Object.entries(updateFields).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const keys = entries.map(([k]) => k);
    const values = entries.map(([_, v]) => v);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    // Log SQL for easier debugging
    console.log('Update enrollment SQL:', `UPDATE enrollments SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, 'values:', [...values, id]);

    await run(
      `UPDATE enrollments SET ${setClause}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'UPDATE_ENROLLMENT_STATUS', 'enrollment', id, `Changed status to ${status}`]
    );

    res.json({
      success: true,
      message: 'Enrollment status updated successfully'
    });
  } catch (error) {
    console.error('Update enrollment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Total students
    const totalStudents = await query(
      'SELECT COUNT(*) as count FROM students WHERE status = ?',
      ['Active']
    );

    // Total enrollments by status
    const enrollmentStats = await query(
      'SELECT status, COUNT(*) as count FROM enrollments GROUP BY status'
    );

    // Recent enrollments
    const recentEnrollments = await query(
      `SELECT e.*, s.student_id, s.first_name, s.last_name
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       ORDER BY e.created_at DESC
       LIMIT 10`
    );

    // Transaction summary
    const transactionStats = await query(
      `SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'Completed' THEN amount ELSE 0 END) as completed_amount
       FROM transactions
       WHERE strftime('%Y', payment_date) = strftime('%Y', 'now')`
    );

    res.json({
      success: true,
      data: {
        totalStudents: totalStudents[0]?.count || 0,
        enrollmentStats,
        recentEnrollments,
        transactionStats: transactionStats[0] || { total_count: 0, total_amount: 0, completed_amount: 0 }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getEnrollmentDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // First get the student_id from the enrollment
    const enrollment = await get(
      'SELECT student_id FROM enrollments WHERE id = ?',
      [id]
    );

    // Get documents for this enrollment OR pre-existing student documents (no enrollment_id)
    const documents = await query(
      `SELECT * FROM documents WHERE enrollment_id = ? ${enrollment ? 'OR (student_id = ? AND enrollment_id IS NULL)' : ''} ORDER BY upload_date DESC`,
      enrollment ? [id, enrollment.student_id] : [id]
    );

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get enrollment documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const downloadEnrollmentDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { docId } = req.params;

    // Get document by ID
    const docs = await query('SELECT * FROM documents WHERE id = ?', [docId]);
    
    if (docs.length === 0) {
      return res.status(404).send('Document not found');
    }

    const document = docs[0];
    const fileName = path.basename(document.file_path);
    const filePath = path.join(__dirname, '../../uploads/documents', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found on server');
    }

    res.download(filePath, fileName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).send('Server error');
  }
};

export const getPendingAccountRequests = async (req: AuthRequest, res: Response) => {
  try {
    const students = await query(
      `SELECT s.*, u.username, u.email 
       FROM students s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.status = 'Pending'
       ORDER BY s.created_at DESC`
    );

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get pending account requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const approveAccountRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get the student
    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update status to Active
    await run('UPDATE students SET status = ? WHERE id = ?', ['Active', id]);

    res.json({
      success: true,
      message: 'Account request approved',
      data: { id, status: 'Active' }
    });
  } catch (error) {
    console.error('Approve account request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const rejectAccountRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the student
    const students = await query('SELECT * FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = students[0];

    // Update status to Inactive (rejected)
    await run('UPDATE students SET status = ? WHERE id = ?', ['Inactive', id]);

    res.json({
      success: true,
      message: 'Account request rejected',
      data: { id, status: 'Inactive', reason }
    });
  } catch (error) {
    console.error('Reject account request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get audit trail - all modifications by non-student roles
 */
export const getAuditTrail = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '25'), 10)));
    const search = (req.query.search || '').toString().toLowerCase();
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : null;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : null;

    let sql = `
      SELECT al.*, u.username, u.role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE u.role IS NOT NULL AND u.role != 'student' 
      AND al.entity_type != 'notification'
      AND al.action NOT LIKE '%notification%'
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (al.action LIKE ? OR al.description LIKE ? OR u.username LIKE ? OR u.role LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (startDate && !isNaN(startDate.getTime())) {
      sql += ` AND al.created_at >= ?`;
      params.push(startDate.toISOString());
    }

    if (endDate && !isNaN(endDate.getTime())) {
      sql += ` AND al.created_at <= ?`;
      params.push(endDate.toISOString());
    }

    // Get total count
    const countResult = await query(
      sql.replace('SELECT al.*, u.username, u.role', 'SELECT COUNT(*) as total'),
      params
    );
    const total = countResult[0]?.total || 0;

    // Get paginated data
    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const logs = await query(sql, params);

    res.json({
      success: true,
      data: logs,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
