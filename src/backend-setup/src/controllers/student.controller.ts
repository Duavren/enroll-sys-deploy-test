import { Response } from 'express';
import { query, run, get } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';

const resolveStudentId = async (userId?: number) => {
  if (userId) {
    const students = await query('SELECT id FROM students WHERE user_id = ?', [userId]);
    if (students.length > 0) return students[0].id as number;
  }
  const fallback = await query('SELECT id FROM students ORDER BY id ASC LIMIT 1');
  return fallback.length > 0 ? (fallback[0].id as number) : null;
};

export const getStudentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get student and user info
    const results = await query(
      `SELECT s.*, u.username, u.email 
       FROM students s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );

    let studentRow = results[0];

    // Fallback for dev/bypass mode: if no student for this user, return the first student record
    if (!studentRow) {
      const fallback = await query(
        `SELECT s.*, u.username, u.email 
         FROM students s
         LEFT JOIN users u ON s.user_id = u.id
         ORDER BY s.id ASC
         LIMIT 1`
      );

      if (fallback.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      studentRow = fallback[0];
    }

    // Ensure student_type always has a value to drive UI defaults
    if (!studentRow.student_type) {
      studentRow.student_type = 'New';
    }

    res.json({
      success: true,
      student: studentRow
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const updateStudentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      contact_number,
      address,
      birth_date,
      gender,
      username,
      course,
      year_level,
      section
    } = req.body;

    // Update student info
    await run(
      `UPDATE students SET 
        first_name = ?,
        middle_name = ?,
        last_name = ?,
        suffix = ?,
        contact_number = ?,
        address = ?,
        birth_date = ?,
        gender = ?,
        course = COALESCE(?, course),
        year_level = COALESCE(?, year_level),
        section = COALESCE(?, section),
        updated_at = datetime('now')
      WHERE user_id = ?`,
      [first_name, middle_name, last_name, suffix, contact_number, address, birth_date, gender, course || null, year_level || null, section || null, userId]
    );

    // Update email if provided
    if (email) {
      // Check if email is already taken by another user
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }

      await run(
        'UPDATE users SET email = ? WHERE id = ?',
        [email, userId]
      );
    }

    // Update username if provided
    if (username) {
      // Check if username is already taken by another user
      const existingUsers = await query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }

      await run(
        'UPDATE users SET username = ? WHERE id = ?',
        [username, userId]
      );
    }

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const getStudentEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const studentId = await resolveStudentId(userId);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get enrollments
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
    console.error('Get student enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Debug: list enrollment_subjects for current student (joins enrollments -> enrollment_subjects -> subjects -> subject_schedules)
export const getEnrollmentSubjectsDebug = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const studentId = await resolveStudentId(userId);
    if (!studentId) return res.status(404).json({ success: false, message: 'Student not found' });

    const rows = await query(
      `SELECT e.id as enrollment_id, e.school_year, e.semester, es.id as enrollment_subject_id, es.subject_id, es.schedule_id as assigned_schedule_id, es.schedule as assigned_schedule_text, s.subject_code, s.subject_name,
              ss.day_time as schedule_day_time, ss.room as schedule_room, ss.instructor as schedule_instructor
       FROM enrollments e
       JOIN enrollment_subjects es ON es.enrollment_id = e.id
       JOIN subjects s ON s.id = es.subject_id
       LEFT JOIN subject_schedules ss ON ss.id = es.schedule_id
       WHERE e.student_id = ?
       ORDER BY e.id, es.id`,
      [studentId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get enrollment subjects debug error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { document_type, enrollment_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

      // Log file details for debugging
      console.log('Upload received:', {
        originalname: file.originalname,
        fieldname: file.fieldname,
        path: file.path,
        size: file.size
      });

      // Check file exists on disk (multer should have written it)
      try {
        const exists = fs.existsSync(file.path);
        console.log('File exists on disk?', exists, file.path);
        if (!exists) {
          return res.status(500).json({ success: false, message: 'Uploaded file not found on server' });
        }
      } catch (err) {
        console.error('Error checking uploaded file:', err);
      }

    // Resolve student id (fall back to first student in dev/bypass mode)
    const studentId = await resolveStudentId(userId);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Insert document record
    const result = await run(
      `INSERT INTO documents 
        (student_id, enrollment_id, document_type, file_name, file_path, file_size) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, enrollment_id || null, document_type, file.originalname, `/uploads/documents/${file.filename}`, file.size]
    );

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        id: result.lastInsertRowid,
        file_name: file.originalname,
        file_path: `/uploads/documents/${file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

export const downloadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const docs = await query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const doc = docs[0];
    const filePath = doc.file_path;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    // Set content disposition for download
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDocumentByPath = async (req: AuthRequest, res: Response) => {
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'File path required' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    // Get filename from path
    const fileName = path.basename(filePath);
    
    // Set content disposition for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Get document by path error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
export const getEnrollmentDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { enrollmentId } = req.params;

    // First get the student_id from the enrollment
    const enrollment = await get(
      'SELECT student_id FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    // Fetch documents linked to this enrollment OR to the student (for pre-existing documents)
    const documents = await query(
      `SELECT id, student_id, enrollment_id, document_type, file_name, file_path, file_size, upload_date, status 
       FROM documents 
       WHERE enrollment_id = ? ${enrollment ? 'OR (student_id = ? AND enrollment_id IS NULL)' : ''}
       ORDER BY document_type ASC`,
      enrollment ? [enrollmentId, enrollment.student_id] : [enrollmentId]
    );

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get enrollment documents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Download enrollment form (PDF)
 */
export const downloadEnrollmentForm = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get student info
    const student = await get(
      `SELECT * FROM students WHERE user_id = ?`,
      [userId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get latest enrollment
    const enrollment = await get(
      `SELECT * FROM enrollments WHERE student_id = ? AND status = 'Enrolled' ORDER BY created_at DESC LIMIT 1`,
      [student.id]
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'No active enrollment found' });
    }

    // Get enrolled subjects
    const subjects = await query(
      `SELECT s.* FROM subjects s
       JOIN enrollment_subjects es ON s.id = es.subject_id
       WHERE es.enrollment_id = ?`,
      [enrollment.id]
    );

    // Generate simple HTML/text response (can be converted to PDF by frontend or use a library)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Enrollment Form</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .info { margin: 20px 0; }
          .info-row { display: flex; margin: 8px 0; }
          .label { font-weight: bold; width: 150px; }
          .value { flex: 1; }
          .subjects { margin-top: 30px; }
          .subject-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .subject-table th, .subject-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
          .subject-table th { background-color: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ENROLLMENT FORM</h1>
          <p style="margin: 10px 0;">Informatics North Gate University</p>
          <p style="margin: 0;">Academic Year ${enrollment.school_year}</p>
        </div>

        <div class="info">
          <div class="info-row">
            <span class="label">Student Name:</span>
            <span class="value">${student.first_name} ${student.middle_name || ''} ${student.last_name}</span>
          </div>
          <div class="info-row">
            <span class="label">Student ID:</span>
            <span class="value">${student.student_id}</span>
          </div>
          <div class="info-row">
            <span class="label">Course:</span>
            <span class="value">${student.course}</span>
          </div>
          <div class="info-row">
            <span class="label">Year Level:</span>
            <span class="value">${student.year_level}</span>
          </div>
          <div class="info-row">
            <span class="label">Semester:</span>
            <span class="value">${enrollment.semester} Semester</span>
          </div>
        </div>

        <div class="subjects">
          <h3>Enrolled Subjects</h3>
          <table class="subject-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject Name</th>
                <th>Units</th>
                <th>Year Level</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(s => `
                <tr>
                  <td>${s.subject_code}</td>
                  <td>${s.subject_name}</td>
                  <td>${s.units}</td>
                  <td>${s.year_level || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>This is an official enrollment document.</p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Enrollment_Form.html"');
    res.send(html);
  } catch (error) {
    console.error('Download enrollment form error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Download COR - Certificate of Registration (PDF)
 */
export const downloadCOR = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get student info
    const student = await get(
      `SELECT * FROM students WHERE user_id = ?`,
      [userId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get latest enrollment
    const enrollment = await get(
      `SELECT * FROM enrollments WHERE student_id = ? AND status = 'Enrolled' ORDER BY created_at DESC LIMIT 1`,
      [student.id]
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'No active enrollment found' });
    }

    // Get enrolled subjects
    const subjects = await query(
      `SELECT s.* FROM subjects s
       JOIN enrollment_subjects es ON s.id = es.subject_id
       WHERE es.enrollment_id = ?`,
      [enrollment.id]
    );

    // Calculate total units
    const totalUnits = subjects.reduce((sum, s) => sum + (s.units || 0), 0);

    // Generate COR HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificate of Registration</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .header-subtitle { margin: 10px 0 5px 0; font-size: 14px; }
          .university { font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; }
          .info { margin: 30px 0; }
          .info-row { display: flex; margin: 12px 0; font-size: 14px; }
          .label { font-weight: bold; width: 180px; }
          .value { flex: 1; border-bottom: 1px dotted #333; padding-bottom: 2px; }
          .subjects { margin-top: 40px; }
          .subjects h3 { text-decoration: underline; font-size: 14px; margin-bottom: 15px; }
          .subject-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .subject-table th, .subject-table td { padding: 10px; border: 1px solid #333; text-align: left; font-size: 12px; }
          .subject-table th { background-color: #f9f9f9; font-weight: bold; }
          .total-units { text-align: right; font-weight: bold; margin-top: 15px; font-size: 14px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; line-height: 1.8; }
          .signature-line { display: flex; justify-content: space-around; margin-top: 60px; }
          .signature { text-align: center; width: 30%; }
          .line { border-top: 1px solid #333; margin-bottom: 5px; height: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="university">Informatics North Gate University</div>
          <h1>CERTIFICATE OF REGISTRATION</h1>
          <div class="header-subtitle">COR</div>
        </div>

        <div class="info">
          <div class="info-row">
            <span class="label">Student Name:</span>
            <span class="value">${student.first_name} ${student.middle_name || ''} ${student.last_name}</span>
          </div>
          <div class="info-row">
            <span class="label">Student ID:</span>
            <span class="value">${student.student_id}</span>
          </div>
          <div class="info-row">
            <span class="label">Course:</span>
            <span class="value">${student.course}</span>
          </div>
          <div class="info-row">
            <span class="label">Year Level:</span>
            <span class="value">${student.year_level}</span>
          </div>
          <div class="info-row">
            <span class="label">Academic Year:</span>
            <span class="value">${enrollment.school_year}</span>
          </div>
          <div class="info-row">
            <span class="label">Semester:</span>
            <span class="value">${enrollment.semester} Semester</span>
          </div>
        </div>

        <div class="subjects">
          <h3>Enrolled Subjects</h3>
          <table class="subject-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Units</th>
                <th>Year Level</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map((s, idx) => `
                <tr>
                  <td>${s.subject_code}</td>
                  <td>${s.subject_name}</td>
                  <td style="text-align: center;">${s.units}</td>
                  <td>${s.year_level || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-units">Total Units: ${totalUnits}</div>
        </div>

        <div class="footer">
          <p>This certifies that the above-named student is officially registered for the current academic term</p>
          <p>and is authorized to attend all courses listed above.</p>
          <p style="margin-top: 30px;">Date Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="signature-line">
          <div class="signature">
            <div class="line"></div>
            <span>Registrar</span>
          </div>
          <div class="signature">
            <div class="line"></div>
            <span>Dean</span>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Certificate_of_Registration.html"');
    res.send(html);
  } catch (error) {
    console.error('Download COR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};