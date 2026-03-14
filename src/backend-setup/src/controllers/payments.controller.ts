import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query, run } from '../database/connection';

const dataDir = path.join(__dirname, '../../data');
try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) {}
const paymentsFile = path.join(dataDir, 'payments.json');

function readPayments() { try { return JSON.parse(fs.readFileSync(paymentsFile, 'utf8') || '[]'); } catch (e) { return []; } }
function writePayments(items: any[]) { fs.writeFileSync(paymentsFile, JSON.stringify(items, null, 2)); }

export const getAssessment = async (req: Request, res: Response) => {
  const { studentId } = req.params;
  try {
    // Try to find the latest enrollment for this student (by student.student_id)
    const rows = await query(
      `SELECT e.* FROM enrollments e JOIN students s ON e.student_id = s.id WHERE s.student_id = ? ORDER BY e.created_at DESC LIMIT 1`,
      [studentId]
    );

    const enrollment = rows && rows[0] ? rows[0] : null;

    // Compute assessment from enrollment if available, otherwise fallback to zeros
    let assessmentTotal = 0;
    let breakdown: any = { tuition: 0, misc: 0 };

    if (enrollment) {
      const tuition = Number(enrollment.tuition || 0);
      const registration = Number(enrollment.registration || 0);
      const library = Number(enrollment.library || 0);
      const lab = Number(enrollment.lab || 0);
      const id_fee = Number(enrollment.id_fee || 0);
      const others = Number(enrollment.others || 0);

      assessmentTotal = Number(enrollment.total_amount || tuition + registration + library + lab + id_fee + others);
      breakdown = { tuition, misc: registration + library + lab + id_fee + others };
    }

    // Calculate paid amount from database transactions for this student
    const studentRows = await query(
      `SELECT id FROM students WHERE student_id = ? LIMIT 1`,
      [studentId]
    );

    let paid = 0;
    if (studentRows && studentRows[0]) {
      const paymentRows = await query(
        `SELECT SUM(amount) as total_paid FROM transactions t
         JOIN enrollments e ON t.enrollment_id = e.id
         WHERE e.student_id = ? AND t.status IN ('Completed', 'Pending')`,
        [studentRows[0].id]
      );
      if (paymentRows && paymentRows[0] && paymentRows[0].total_paid) {
        paid = Number(paymentRows[0].total_paid);
      }
    }

    const due = Math.max(assessmentTotal - paid, 0);
    const assessment = { studentId, total: assessmentTotal, paid, due, breakdown };
    res.json({ success: true, data: assessment });
  } catch (err) {
    console.error('Failed to compute assessment:', err);
    res.status(500).json({ success: false, message: 'Failed to compute assessment' });
  }
};

export const listPayments = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    // Get the student's internal ID
    const studentRows = await query(
      `SELECT id FROM students WHERE student_id = ? LIMIT 1`,
      [studentId]
    );

    if (!studentRows || !studentRows[0]) {
      return res.json({ success: true, data: [] });
    }

    const student = studentRows[0];

    // Get all payments from transactions table for this student's enrollments
    const payments = await query(
      `SELECT t.*, e.student_id, s.student_id as sid,
              (SELECT username FROM users WHERE id = t.processed_by) as cashier_name
       FROM transactions t
       JOIN enrollments e ON t.enrollment_id = e.id
       JOIN students s ON e.student_id = s.id
       WHERE s.student_id = ?
       ORDER BY t.created_at DESC`,
      [studentId]
    );

    // Map to match the expected format
    const mappedPayments = (payments || []).map((p: any) => ({
      id: p.id,
      studentId: studentId,
      amount: p.amount,
      method: p.payment_method,
      reference: p.reference_number,
      ts: p.created_at,
      status: p.status,
      enrollment_id: p.enrollment_id,
      receipt_path: p.receipt_path || null,
      remarks: p.remarks || null,
      approved_at: p.status === 'Completed' ? p.updated_at : null,
      approved_by: p.cashier_name || null
    }));

    res.json({ success: true, data: mappedPayments });
  } catch (err: any) {
    console.error('Failed to list payments:', err);
    res.status(500).json({ success: false, message: 'Failed to list payments' });
  }
};

export const getApprovedPayments = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    // Get the student's internal ID
    const studentRows = await query(`SELECT id FROM students WHERE student_id = ? LIMIT 1`, [studentId]);
    const student = studentRows && studentRows[0] ? studentRows[0] : null;
    
    if (!student) {
      return res.json({ success: true, data: [] });
    }

    // Get approved installment payments from the database
    const approvedPayments = await query(
      `SELECT ip.*, s.student_id, e.total_amount
       FROM installment_payments ip
       LEFT JOIN students s ON ip.student_id = s.id
       LEFT JOIN enrollments e ON ip.enrollment_id = e.id
       WHERE ip.student_id = ? AND ip.status = 'Approved'
       ORDER BY ip.created_at DESC`,
      [student.id]
    );

    res.json({ success: true, data: approvedPayments || [] });
  } catch (err) {
    console.error('Failed to get approved payments:', err);
    res.status(500).json({ success: false, message: 'Failed to get approved payments' });
  }
};

export const addPayment = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { amount, method, reference } = req.body;
    
    // Validate required fields
    if (!studentId || !amount || !method) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: studentId, amount, method' 
      });
    }

    // Get the student's ID and their latest enrollment
    const studentRows = await query(
      `SELECT id FROM students WHERE student_id = ? LIMIT 1`,
      [studentId]
    );

    if (!studentRows || !studentRows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    const student = studentRows[0];

    // Get the student's latest enrollment
    const enrollmentRows = await query(
      `SELECT id FROM enrollments WHERE student_id = ? ORDER BY created_at DESC LIMIT 1`,
      [student.id]
    );

    if (!enrollmentRows || !enrollmentRows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'No enrollment found for this student' 
      });
    }

    const enrollmentId = enrollmentRows[0].id;

    // Insert payment into transactions table
    const result = await run(
      `INSERT INTO transactions (enrollment_id, transaction_type, amount, payment_method, reference_number, status, created_at, updated_at)
       VALUES (?, 'Tuition', ?, ?, ?, 'Pending', datetime('now'), datetime('now'))`,
      [enrollmentId, amount, method, reference]
    );

    const entry = { 
      id: result.lastInsertRowid, 
      studentId, 
      amount, 
      method, 
      reference, 
      ts: new Date().toISOString(),
      status: 'Pending',
      enrollment_id: enrollmentId
    };

    res.json({ success: true, data: entry });
  } catch (err: any) {
    console.error('Failed to add payment:', err);
    res.status(500).json({ success: false, message: 'Failed to add payment' });
  }
};

export const submitInstallmentPayment = async (req: Request, res: Response) => {
  try {
    const { enrollmentId, studentId, amount, amountPaid, period, paymentMethod, referenceNumber, receiptPath } = req.body;

    console.log('submitInstallmentPayment received:', { enrollmentId, studentId, amount, amountPaid, period, paymentMethod, referenceNumber, receiptPath });

    // Validate required fields
    if (!enrollmentId || !studentId || !amount || !period || !paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // amount = installment amount for this period
    // amountPaid = actual amount student paid (may be different from amount)
    const actualAmountPaid = amountPaid || amount;
    console.log('actualAmountPaid to store:', actualAmountPaid);

    // --- Auto-apply penalty fee if payment is past due ---
    // Only apply to regular period payments, not to penalty fee payments themselves
    const isPenaltyFeePayment = period.includes('- Late Penalty Fee');
    let penaltyToApply = 0;

    if (!isPenaltyFeePayment) {
      // Get enrollment date to calculate due date
      const enrollmentRows = await query(
        `SELECT enrollment_date, created_at FROM enrollments WHERE id = ?`,
        [enrollmentId]
      );
      const enrollment = enrollmentRows && enrollmentRows[0] ? enrollmentRows[0] : null;

      if (enrollment) {
        const enrollDate = new Date(enrollment.enrollment_date || enrollment.created_at);
        const periodMonthOffset: Record<string, number> = {
          'Down Payment': 0,
          'Prelim Period': 1,
          'Midterm Period': 2,
          'Finals Period': 3
        };
        const offset = periodMonthOffset[period] ?? 1;
        const dueDate = new Date(enrollDate);
        dueDate.setMonth(dueDate.getMonth() + offset);
        const now = new Date();

        if (now > dueDate) {
          // Payment is past due - fetch the configured penalty fee
          const settingRows = await query(
            `SELECT setting_value FROM system_settings WHERE setting_key = 'installment_penalty_fee' LIMIT 1`
          );
          penaltyToApply = settingRows && settingRows[0] ? parseFloat(settingRows[0].setting_value) : 500.00;
          console.log(`Payment for ${period} is past due. Auto-applying penalty of ₱${penaltyToApply}`);
        }
      }
    }

    // Check if there's an existing rejected payment for this period that can be resubmitted
    const existingPayment = await query(
      `SELECT id FROM installment_payments 
       WHERE enrollment_id = ? AND student_id = ? AND period = ? AND status = 'Rejected'
       LIMIT 1`,
      [enrollmentId, studentId, period]
    );

    console.log(`[DEBUG] Looking for rejected payment - enrollmentId: ${enrollmentId}, studentId: ${studentId}, period: ${period}`);
    console.log(`[DEBUG] Found existing rejected payment:`, existingPayment);

    let paymentId: number;

    if (existingPayment && existingPayment.length > 0) {
      // Update the existing rejected payment instead of creating a duplicate
      console.log(`[DEBUG] Updating existing rejected payment ID: ${existingPayment[0].id}`);
      await run(
        `UPDATE installment_payments SET 
         amount = ?, amount_paid = ?, penalty_amount = ?, status = 'Pending', 
         payment_method = ?, reference_number = ?, receipt_path = ?,
         updated_at = datetime('now')
         WHERE id = ?`,
        [amount, actualAmountPaid, penaltyToApply, paymentMethod, referenceNumber || null, receiptPath || null, existingPayment[0].id]
      );
      paymentId = existingPayment[0].id;
    } else {
      // Create the installment payment record with both amount and amount_paid
      console.log(`[DEBUG] No existing rejected payment found, creating new record`);
      const result = await run(
        `INSERT INTO installment_payments 
         (enrollment_id, student_id, amount, amount_paid, penalty_amount, period, status, payment_method, reference_number, receipt_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [enrollmentId, studentId, amount, actualAmountPaid, penaltyToApply, period, 'Pending', paymentMethod, referenceNumber || null, receiptPath || null]
      );
      paymentId = result.lastInsertRowid;
    }

    // Update enrollment status to Payment Verification
    await run(
      `UPDATE enrollments SET 
        status = 'Payment Verification',
        updated_at = datetime('now')
       WHERE id = ?`,
      [enrollmentId]
    );

    // Send notification
    const { sendEnrollmentNotification } = require('../utils/notification.helper');
    await sendEnrollmentNotification(studentId, enrollmentId, 'Payment Verification');

    res.json({ 
      success: true, 
      message: 'Installment payment submitted for approval',
      paymentId: paymentId 
    });
  } catch (err) {
    console.error('Failed to submit installment payment:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit installment payment' 
    });
  }
};

export const getInstallmentSchedule = async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;

    // Fetch all installment payments for this enrollment
    const payments = await query(
      `SELECT * FROM installment_payments 
       WHERE enrollment_id = ? 
       ORDER BY CASE 
         WHEN period = 'Down Payment' THEN 1
         WHEN period = 'Prelim Period' THEN 2
         WHEN period = 'Midterm Period' THEN 3
         WHEN period = 'Finals Period' THEN 4
       END`,
      [enrollmentId]
    );

    // Fetch configured penalty fee so frontend can show it
    const settingRows = await query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'installment_penalty_fee' LIMIT 1`
    );
    const penaltyFee = settingRows && settingRows[0] ? parseFloat(settingRows[0].setting_value) : 500.00;

    if (!payments || payments.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        penalty_fee: penaltyFee,
        message: 'No installment schedule found'
      });
    }

    res.json({ 
      success: true, 
      data: payments || [],
      penalty_fee: penaltyFee
    });
  } catch (err) {
    console.error('Failed to get installment schedule:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get installment schedule' 
    });
  }
};

export const getAllInstallmentPayments = async (req: Request, res: Response) => {
  try {
    // Get all installment payments with student info
    const payments = await query(
      `SELECT ip.*, s.student_id, s.first_name, s.last_name, e.total_amount 
       FROM installment_payments ip 
       LEFT JOIN students s ON ip.student_id = s.id 
       LEFT JOIN enrollments e ON ip.enrollment_id = e.id 
       ORDER BY ip.created_at DESC`
    );

    // Normalize receipt paths - convert full file system paths to relative /uploads paths
    const normalizedPayments = payments?.map((payment: any) => {
      if (payment.receipt_path) {
        let normalizedPath = payment.receipt_path;
        // If it's a full file system path, extract the /uploads portion
        const uploadsIndex = normalizedPath.indexOf('/uploads');
        if (uploadsIndex !== -1) {
          normalizedPath = normalizedPath.substring(uploadsIndex);
        }
        return { ...payment, receipt_path: normalizedPath };
      }
      return payment;
    }) || [];

    res.json({
      success: true,
      data: normalizedPayments
    });
  } catch (err) {
    console.error('Failed to get all installment payments:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get all installment payments'
    });
  }
};

export const updateInstallmentPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Approved', 'Rejected', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update the installment payment status
    await run(
      `UPDATE installment_payments SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, id]
    );

    res.json({
      success: true,
      message: `Installment payment ${status.toLowerCase()}`
    });
  } catch (err) {
    console.error('Failed to update installment payment status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update installment payment status'
    });
  }
};

export default { getAssessment, listPayments, getApprovedPayments, addPayment, submitInstallmentPayment, getInstallmentSchedule, getAllInstallmentPayments, updateInstallmentPaymentStatus };
