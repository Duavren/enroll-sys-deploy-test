import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query, run } from '../database/connection';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendEnrollmentNotification } from '../utils/notification.helper';

export const listPendingTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, school_year, semester } = req.query;

    let sql =
      `SELECT t.*, 
        e.student_id as enrollment_student_id, 
        e.school_year,
        e.semester,
        e.total_amount,
        e.tuition,
        e.registration,
        e.library,
        e.lab,
        e.id_fee,
        e.others,
        e.remarks as enrollment_remarks,
        s.student_id, 
        s.first_name || ' ' || s.last_name as student_name,
        s.course,
        s.year_level,
        d.file_path as receipt_path,
        d.file_name as receipt_filename,
        (e.total_amount - IFNULL((SELECT SUM(amount) FROM transactions WHERE enrollment_id = e.id AND status = 'Completed'),0)) as outstanding_balance
       FROM transactions t
       JOIN enrollments e ON t.enrollment_id = e.id
       JOIN students s ON e.student_id = s.id
       LEFT JOIN documents d ON d.id = (
         SELECT d2.id FROM documents d2 
         WHERE d2.enrollment_id = e.id AND d2.document_type = 'payment_receipt' 
         ORDER BY d2.upload_date DESC LIMIT 1
       )
       WHERE 1=1
       AND NOT EXISTS (
         SELECT 1 FROM installment_payments ip 
         WHERE ip.enrollment_id = t.enrollment_id
       )`;
    const params: any[] = [];

    sql += ' AND t.status = ?';
    params.push(status || 'Pending');

    if (search) {
      sql += ' AND (s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (school_year) {
      sql += ' AND e.school_year = ?';
      params.push(school_year);
    }
    if (semester) {
      sql += ' AND e.semester = ?';
      params.push(semester);
    }

    sql += ' ORDER BY t.created_at DESC';

    const txs = await query(sql, params);
    res.json({ success: true, data: txs });
  } catch (error) {
    console.error('List pending transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// All transactions with filters for logs/history
export const listTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, school_year, semester } = req.query;

    let sql =
      `SELECT t.*, e.school_year, e.semester, e.total_amount,
              s.student_id, s.first_name || ' ' || s.last_name as student_name,
              s.course, s.year_level,
              (SELECT username FROM users WHERE id = t.processed_by) as processed_by_name
       FROM transactions t
       JOIN enrollments e ON t.enrollment_id = e.id
       JOIN students s ON e.student_id = s.id
       WHERE 1=1`;
    const params: any[] = [];

    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (search) {
      sql += ' AND (s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR t.reference_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (school_year) { sql += ' AND e.school_year = ?'; params.push(school_year); }
    if (semester) { sql += ' AND e.semester = ?'; params.push(semester); }

    sql += ' ORDER BY t.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const processTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // transaction id
    const { action, remarks } = req.body; // action: 'complete' | 'reject'
    const userId = req.user?.id;

    if (!id) return res.status(400).json({ success: false, message: 'Transaction id required' });

    if (action === 'complete') {
      await run(`UPDATE transactions SET status = 'Completed', processed_by = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`, [userId, remarks || null, id]);

      // Fetch transaction + enrollment + student info
      const txRows = await query(
        `SELECT t.*, e.id as enrollment_id, e.student_id as student_db_id, s.user_id as student_user_id, s.student_id as student_code, s.first_name, s.last_name
         FROM transactions t
         JOIN enrollments e ON t.enrollment_id = e.id
         JOIN students s ON e.student_id = s.id
         WHERE t.id = ?`,
        [id]
      );

      const txInfo = txRows[0] || null;

      // Mark enrollment as Enrolled if it's an enrollment transaction
      if (txInfo?.enrollment_id) {
        await run(`UPDATE enrollments SET status = 'Enrolled', updated_at = datetime('now') WHERE id = ?`, [txInfo.enrollment_id]);
        // Send notification to student
        await sendEnrollmentNotification(txInfo.student_id, txInfo.enrollment_id, 'Enrolled');
      }

      // Generate a simple official receipt file and save to uploads/documents
      try {
        const documentsDir = path.join(__dirname, '..', '..', 'uploads', 'documents');
        fs.mkdirSync(documentsDir, { recursive: true });
        const fileName = `official_receipt_tx_${id}.txt`;
        const filePath = path.join(documentsDir, fileName);
        const fileUrl = `/uploads/documents/${encodeURIComponent(fileName)}`;
        const content = [] as string[];
        content.push('OFFICIAL RECEIPT');
        content.push(`Transaction ID: ${id}`);
        if (txInfo) {
          content.push(`Student: ${txInfo.first_name} ${txInfo.last_name} (${txInfo.student_code})`);
          content.push(`Enrollment ID: ${txInfo.enrollment_id}`);
          content.push(`Amount: ₱${(txInfo.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
          content.push(`Payment Method: ${txInfo.payment_method || 'N/A'}`);
          content.push(`Reference: ${txInfo.reference_number || 'N/A'}`);
        }
        content.push(`Processed By (user id): ${userId}`);
        content.push(`Date: ${new Date().toLocaleString()}`);

        fs.writeFileSync(filePath, content.join('\n'), 'utf-8');
        const stats = fs.statSync(filePath);

        // Save receipt path back to the transaction record
        try {
          await run(
            `UPDATE transactions SET receipt_path = ?, updated_at = datetime('now') WHERE id = ?`,
            [fileUrl, id]
          );
        } catch (updateErr) {
          console.warn('Failed to update transaction receipt_path:', updateErr);
        }

        // Insert document record
        try {
          await run(
            `INSERT INTO documents (student_id, enrollment_id, document_type, file_name, file_path, file_size, status, verified_by, verified_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Verified', ?, datetime('now'))`,
            [txInfo?.student_db_id || null, txInfo?.enrollment_id || null, 'official_receipt', fileName, fileUrl, stats.size, userId]
          );
        } catch (docErr) {
          console.warn('Failed to insert official receipt document record:', docErr);
        }
      } catch (fsErr) {
        console.warn('Failed generating official receipt file:', fsErr);
      }

      // Log activity
      const logRes = await run('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)', [userId, 'PAYMENT_APPROVED', 'transaction', id, `Payment approved for transaction ${id}`]);
      const logId = logRes.lastInsertRowid;

      // Notify student if possible
      try {
        const studentUserId = txInfo?.student_user_id;
        if (studentUserId) {
          await run('INSERT INTO notifications (user_id, activity_log_id, is_read) VALUES (?, ?, 0)', [studentUserId, logId]);
        }
      } catch (notifErr) {
        console.warn('Failed to create notification for student after payment approval:', notifErr);
      }

    } else if (action === 'reject') {
      await run(`UPDATE transactions SET status = 'Rejected', processed_by = ?, remarks = ?, updated_at = datetime('now') WHERE id = ?`, [userId, remarks || null, id]);

      // Fetch transaction + student info for notification
      const txRows = await query(
        `SELECT t.*, e.id as enrollment_id, e.student_id as student_db_id, s.user_id as student_user_id
         FROM transactions t
         JOIN enrollments e ON t.enrollment_id = e.id
         JOIN students s ON e.student_id = s.id
         WHERE t.id = ?`,
        [id]
      );
      const txInfo = txRows[0] || null;

      // Update enrollment status back to "For Payment" so student can resubmit
      if (txInfo?.enrollment_id) {
        await run(`UPDATE enrollments SET status = 'For Payment', updated_at = datetime('now') WHERE id = ?`, [txInfo.enrollment_id]);
        // Send notification to student
        await sendEnrollmentNotification(txInfo.student_id, txInfo.enrollment_id, 'For Payment');
      }

      // Log activity
      const logRes = await run('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)', [userId, 'PAYMENT_REJECTED', 'transaction', id, `Payment rejected for transaction ${id}`]);
      const logId = logRes.lastInsertRowid;

      // Notify student if possible
      try {
        const studentUserId = txInfo?.student_user_id;
        if (studentUserId) {
          await run('INSERT INTO notifications (user_id, activity_log_id, is_read) VALUES (?, ?, 0)', [studentUserId, logId]);
        }
      } catch (notifErr) {
        console.warn('Failed to create notification for student after payment rejection:', notifErr);
      }

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    res.json({ success: true, message: 'Transaction processed' });
  } catch (error) {
    console.error('Process transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const cashierReport = async (req: AuthRequest, res: Response) => {
  try {
    const totalCollected = await query(`SELECT SUM(amount) as total FROM transactions WHERE status = 'Completed'`);
    const pending = await query(`SELECT COUNT(*) as total FROM transactions WHERE status = 'Pending'`);
    const outstanding = await query(
      `SELECT SUM(e.total_amount - IFNULL(p.paid,0)) as balance
       FROM enrollments e
       LEFT JOIN (
         SELECT enrollment_id, SUM(amount) as paid
         FROM transactions
         WHERE status = 'Completed'
         GROUP BY enrollment_id
       ) p ON p.enrollment_id = e.id
       WHERE e.status != 'Rejected'`
    );
    res.json({ success: true, data: { totalCollected: totalCollected[0]?.total || 0, pending: pending[0]?.total || 0, outstanding: outstanding[0]?.balance || 0 } });
  } catch (error) {
    console.error('Cashier report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// List enrollments ready for cashier assessment review (status = 'For Payment')
export const listTuitionAssessments = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await query(
      `SELECT e.*, s.student_id, s.first_name || ' ' || s.last_name as student_name,
         s.course, s.year_level
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.status = 'For Payment'
       ORDER BY e.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List tuition assessments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Cashier: Approve assessment -> lock and mark Ready for Payment
export const approveTuitionAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const enrollments = await query('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollments[0].status !== 'For Payment') {
      return res.status(400).json({ success: false, message: 'Enrollment is not in For Payment status' });
    }

    await run(
      `UPDATE enrollments SET status = 'Ready for Payment', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [userId, id]
    );

    // Send notification to student
    await sendEnrollmentNotification(enrollments[0].student_id, Number(id), 'Ready for Payment');

    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_APPROVE_ASSESSMENT', 'enrollment', id, 'Cashier approved tuition assessment']
    );

    res.json({ success: true, message: 'Tuition assessment approved and marked Ready for Payment' });
  } catch (error) {
    console.error('Approve tuition assessment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const listInstallmentPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, school_year, semester } = req.query;

    let sql = `
      SELECT ip.*, 
        s.student_id, 
        s.first_name || ' ' || s.last_name as student_name,
        s.course,
        s.year_level,
        e.school_year,
        e.semester,
        e.total_amount,
        e.enrollment_date,
        e.created_at as enrollment_created_at
      FROM installment_payments ip
      JOIN students s ON ip.student_id = s.id
      JOIN enrollments e ON ip.enrollment_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ' AND ip.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (school_year) {
      sql += ' AND e.school_year = ?';
      params.push(school_year);
    }

    if (semester) {
      sql += ' AND e.semester = ?';
      params.push(semester);
    }

    sql += ' ORDER BY ip.created_at DESC';

    const installmentPayments = await query(sql, params);

    res.json({
      success: true,
      data: installmentPayments || []
    });
  } catch (error) {
    console.error('List installment payments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const approveInstallmentPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get the installment payment to check if it's a down payment
    const paymentRows = await query(
      `SELECT * FROM installment_payments WHERE id = ?`,
      [paymentId]
    );
    const payment = paymentRows && paymentRows[0] ? paymentRows[0] : null;

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Update payment status to Approved
    await run(
      `UPDATE installment_payments 
       SET status = 'Approved', updated_at = datetime('now') 
       WHERE id = ?`,
      [paymentId]
    );

    // If this is a penalty fee payment, clear the penalty_amount on the original period record
    const isPenaltyPayment = payment.period && payment.period.includes('- Late Penalty Fee');
    if (isPenaltyPayment) {
      const originalPeriod = payment.period.replace(' - Late Penalty Fee', '');
      await run(
        `UPDATE installment_payments 
         SET penalty_amount = 0, updated_at = datetime('now') 
         WHERE enrollment_id = ? AND period = ? AND period NOT LIKE '%Late Penalty Fee%'`,
        [payment.enrollment_id, originalPeriod]
      );
    }

    // Check if there are any remaining unpaid installment periods
    const unpaidPayments = await query(
      `SELECT COUNT(*) as count FROM installment_payments 
       WHERE enrollment_id = ? AND status NOT IN ('Approved', 'Completed') AND period NOT LIKE '%Late Penalty Fee%'`,
      [payment.enrollment_id]
    );
    const hasUnpaidPeriods = unpaidPayments && unpaidPayments[0] ? unpaidPayments[0].count > 0 : false;

    // Only move to 'Enrolled' if all installments are paid; otherwise keep in 'For Payment'
    if (!hasUnpaidPeriods) {
      await run(
        `UPDATE enrollments 
         SET status = 'Enrolled', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        [userId, payment.enrollment_id]
      );
    } else {
      // Keep in 'For Payment' status if more installments remain
      await run(
        `UPDATE enrollments 
         SET status = 'For Payment', updated_at = datetime('now')
         WHERE id = ?`,
        [payment.enrollment_id]
      );
    }

    // Generate official receipt for the installment payment
    try {
      const studentRows = await query(
        `SELECT s.student_id as student_code, s.first_name, s.last_name FROM students s WHERE s.id = ?`,
        [payment.student_id]
      );
      const studentInfo = studentRows && studentRows[0] ? studentRows[0] : null;
      const documentsDir = path.join(__dirname, '..', '..', 'uploads', 'documents');
      fs.mkdirSync(documentsDir, { recursive: true });
      const fileName = `official_receipt_installment_${paymentId}.txt`;
      const receiptFilePath = path.join(documentsDir, fileName);
      const fileUrl = `/uploads/documents/${encodeURIComponent(fileName)}`;
      const content = [] as string[];
      content.push('OFFICIAL RECEIPT - INSTALLMENT PAYMENT');
      content.push(`Payment ID: ${paymentId}`);
      content.push(`Period: ${payment.period}`);
      if (studentInfo) {
        content.push(`Student: ${studentInfo.first_name} ${studentInfo.last_name} (${studentInfo.student_code})`);
      }
      content.push(`Amount: ₱${(payment.amount_paid || payment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      content.push(`Payment Method: ${payment.payment_method || 'N/A'}`);
      content.push(`Reference: ${payment.reference_number || 'N/A'}`);
      content.push(`Processed By (user id): ${userId}`);
      content.push(`Date: ${new Date().toLocaleString()}`);
      content.push(`Status: Approved`);
      fs.writeFileSync(receiptFilePath, content.join('\n'), 'utf-8');
      // Save receipt path to the installment_payments record
      await run(
        `UPDATE installment_payments SET receipt_path = ?, updated_at = datetime('now') WHERE id = ?`,
        [fileUrl, paymentId]
      );
    } catch (receiptErr) {
      console.warn('Failed generating installment receipt file:', receiptErr);
    }

    // Send notification to student about installment approval
    const notificationMsg = isPenaltyPayment
      ? `Your late penalty fee for ${payment.period.replace(' - Late Penalty Fee', '')} has been approved. You may now proceed with the next period payment.`
      : `Your ${payment.period} payment has been approved. Thank you!`;
    await sendEnrollmentNotification(
      payment.student_id, 
      payment.enrollment_id, 
      'Enrolled',
      notificationMsg
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_APPROVE_INSTALLMENT', 'installment_payment', paymentId, `Cashier approved installment payment: ${payment.period}`]
    );

    res.json({ success: true, message: 'Installment payment approved' });
  } catch (error) {
    console.error('Approve installment payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const rejectInstallmentPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get the payment details first
    const rows = await query(
      `SELECT ip.*, e.student_id, e.id as enrollment_id 
       FROM installment_payments ip
       JOIN enrollments e ON ip.enrollment_id = e.id
       WHERE ip.id = ?`,
      [paymentId]
    ) as any[];

    const payment = rows?.[0];

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Update payment status to Rejected with reason in notes
    await run(
      `UPDATE installment_payments 
       SET status = 'Rejected', notes = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      [reason || '', paymentId]
    );

    // Move enrollment back to 'For Payment' so student can resubmit
    await run(
      `UPDATE enrollments 
       SET status = 'For Payment', updated_at = datetime('now')
       WHERE id = ?`,
      [payment.enrollment_id]
    );

    // Notify the student
    await run(
      `INSERT INTO notifications (student_id, title, message, type) 
       VALUES (?, ?, ?, ?)`,
      [
        payment.student_id,
        'Installment Payment Rejected',
        `Your ${payment.period} payment has been rejected. Reason: ${reason || 'No reason provided'}. Please resubmit your payment.`,
        'warning'
      ]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_REJECT_INSTALLMENT', 'installment_payment', paymentId, `Cashier rejected installment payment: ${reason || 'No reason provided'}`]
    );

    res.json({ success: true, message: 'Installment payment rejected' });
  } catch (error) {
    console.error('Reject installment payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ========== Enrollment Review (Cashier reviews fees before Dean) ==========

// List enrollments pending cashier review (status = 'Cashier Review')
export const listEnrollmentsForReview = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await query(
      `SELECT e.*, 
        s.student_id, s.first_name || ' ' || s.last_name as student_name,
        s.course, s.year_level,
        (SELECT COUNT(*) FROM enrollment_subjects es WHERE es.enrollment_id = e.id) as subject_count
       FROM enrollments e
       JOIN students s ON e.student_id = s.id
       WHERE e.status = 'Cashier Review'
       ORDER BY e.updated_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List enrollments for cashier review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Cashier updates fees only (without changing status)
export const updateEnrollmentFees = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tuition, registration, library, lab, id_fee, others } = req.body;
    const userId = req.user?.id;

    const enrollments = await query('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollments[0].status !== 'Cashier Review') {
      return res.status(400).json({ success: false, message: 'Enrollment is not in Cashier Review status' });
    }

    // Calculate total with updated fees
    const t = tuition ?? enrollments[0].tuition ?? 0;
    const r = registration ?? enrollments[0].registration ?? 0;
    const l = library ?? enrollments[0].library ?? 0;
    const lb = lab ?? enrollments[0].lab ?? 0;
    const i = id_fee ?? enrollments[0].id_fee ?? 0;
    const o = others ?? enrollments[0].others ?? 0;
    const totalAmount = t + r + l + lb + i + o;

    // Update fees only, keep status as 'Cashier Review'
    await run(
      `UPDATE enrollments SET 
        tuition = ?,
        registration = ?,
        library = ?,
        lab = ?,
        id_fee = ?,
        others = ?,
        total_amount = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [t, r, l, lb, i, o, totalAmount, id]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_UPDATE_FEES', 'enrollment', id, `Cashier updated fees to ₱${totalAmount.toFixed(2)}`]
    );

    res.json({ success: true, message: 'Enrollment fees updated successfully.' });
  } catch (error) {
    console.error('Update enrollment fees error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Cashier approves enrollment review (optionally edits fees) -> forwards to Dean
export const approveEnrollmentReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { tuition, registration, library, lab, id_fee, others, remarks } = req.body;
    const userId = req.user?.id;

    const enrollments = await query('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollments[0].status !== 'Cashier Review') {
      return res.status(400).json({ success: false, message: 'Enrollment is not in Cashier Review status' });
    }

    // Use updated fees if provided, otherwise keep existing
    const t = tuition ?? enrollments[0].tuition ?? 0;
    const r = registration ?? enrollments[0].registration ?? 0;
    const l = library ?? enrollments[0].library ?? 0;
    const lb = lab ?? enrollments[0].lab ?? 0;
    const i = id_fee ?? enrollments[0].id_fee ?? 0;
    const o = others ?? enrollments[0].others ?? 0;
    const totalAmount = t + r + l + lb + i + o;

    await run(
      `UPDATE enrollments SET 
        status = 'For Dean Approval',
        tuition = ?,
        registration = ?,
        library = ?,
        lab = ?,
        id_fee = ?,
        others = ?,
        total_amount = ?,
        remarks = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [t, r, l, lb, i, o, totalAmount, remarks || enrollments[0].remarks || null, id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'For Dean Approval');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_APPROVE_ENROLLMENT_REVIEW', 'enrollment', id, `Cashier reviewed and approved fees (₱${totalAmount.toFixed(2)}). Forwarded to Dean.`]
    );

    res.json({ success: true, message: 'Enrollment fees reviewed and approved. Forwarded to Dean for approval.' });
  } catch (error) {
    console.error('Approve enrollment review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Cashier rejects enrollment review -> sends back to registrar
export const rejectEnrollmentReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const userId = req.user?.id;

    const enrollments = await query('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollments[0].status !== 'Cashier Review') {
      return res.status(400).json({ success: false, message: 'Enrollment is not in Cashier Review status' });
    }

    await run(
      `UPDATE enrollments SET 
        status = 'For Registrar Assessment',
        remarks = ?,
        rejected_by = ?,
        rejected_at = datetime('now'),
        updated_at = datetime('now')
       WHERE id = ?`,
      [remarks || 'Returned by cashier for fee adjustment', userId, id]
    );

    // Send notification
    await sendEnrollmentNotification(enrollments[0].student_id, parseInt(id as string), 'For Registrar Assessment');

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_REJECT_ENROLLMENT_REVIEW', 'enrollment', id, `Cashier returned enrollment to registrar: ${remarks || 'No reason given'}`]
    );

    res.json({ success: true, message: 'Enrollment returned to registrar for re-assessment.' });
  } catch (error) {
    console.error('Reject enrollment review error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get fee structure (per-unit tuition rate and fixed fees per course)
export const getFees = async (req: AuthRequest, res: Response) => {
  try {
    const { course } = req.query;

    if (course) {
      // Get fees for specific course
      const fees = await query(
        'SELECT course, tuition_per_unit, registration, library, lab, id_fee, others FROM courses_fees WHERE course = ?',
        [course]
      );

      if (fees.length === 0) {
        return res.status(404).json({ success: false, message: 'Course fees not found' });
      }

      const fee = fees[0];
      return res.json({
        success: true,
        data: {
          course: fee.course,
          tuition_per_unit: fee.tuition_per_unit,
          registration: fee.registration,
          library: fee.library,
          lab: fee.lab,
          id_fee: fee.id_fee,
          others: fee.others
        }
      });
    } else {
      // Get all course fees
      let allFees = await query(
        'SELECT course, tuition_per_unit, registration, library, lab, id_fee, others FROM courses_fees ORDER BY course'
      );

      // Auto-seed if table is empty
      if (allFees.length === 0) {
        const defaultCourses = ['BSIT', 'BSCS'];
        // Also check subjects table for additional courses
        try {
          const subjectCourses = await query('SELECT DISTINCT course FROM subjects WHERE course IS NOT NULL AND course != ""');
          for (const sc of subjectCourses) {
            if (!defaultCourses.includes(sc.course)) {
              defaultCourses.push(sc.course);
            }
          }
        } catch (_) {}
        
        for (const c of defaultCourses) {
          await run(
            `INSERT OR IGNORE INTO courses_fees (course, tuition_per_unit, registration, library, lab, id_fee, others) VALUES (?, 700.00, 1500.00, 500.00, 2000.00, 200.00, 300.00)`,
            [c]
          );
        }
        
        allFees = await query(
          'SELECT course, tuition_per_unit, registration, library, lab, id_fee, others FROM courses_fees ORDER BY course'
        );
      }

      const feesData = allFees.map((f: any) => ({
        course: f.course,
        tuition_per_unit: f.tuition_per_unit,
        registration: f.registration,
        library: f.library,
        lab: f.lab,
        id_fee: f.id_fee,
        others: f.others,
        total_fixed_fees: f.registration + f.library + f.lab + f.id_fee + f.others
      }));

      res.json({ success: true, data: feesData });
    }
  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update fee structure (per-unit tuition rate and fixed fees per course)
export const updateFees = async (req: AuthRequest, res: Response) => {
  try {
    const { course, tuition_per_unit, registration, library, lab, id_fee, others } = req.body;
    const userId = req.user?.id;

    // Validate inputs
    if (
      !course || tuition_per_unit === undefined || registration === undefined || library === undefined ||
      lab === undefined || id_fee === undefined || others === undefined
    ) {
      return res.status(400).json({ success: false, message: 'Course and all fee fields are required' });
    }

    // Validate all are non-negative numbers
    if (
      isNaN(tuition_per_unit) || isNaN(registration) || isNaN(library) ||
      isNaN(lab) || isNaN(id_fee) || isNaN(others) ||
      tuition_per_unit < 0 || registration < 0 || library < 0 ||
      lab < 0 || id_fee < 0 || others < 0
    ) {
      return res.status(400).json({ success: false, message: 'All fees must be valid non-negative numbers' });
    }

    // Check if course fees entry exists
    const existingFee = await query('SELECT id FROM courses_fees WHERE course = ?', [course]);

    if (existingFee.length === 0) {
      // Insert new course fee
      await run(
        `INSERT INTO courses_fees (course, tuition_per_unit, registration, library, lab, id_fee, others, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [course, tuition_per_unit, registration, library, lab, id_fee, others]
      );
    } else {
      // Update existing course fee
      await run(
        `UPDATE courses_fees SET 
          tuition_per_unit = ?, registration = ?, library = ?, lab = ?, id_fee = ?, others = ?, updated_at = datetime('now')
         WHERE course = ?`,
        [tuition_per_unit, registration, library, lab, id_fee, others, course]
      );
    }

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_UPDATE_FEES', 'courses_fees', 0, `Cashier updated fees for ${course} - Tuition: ₱${tuition_per_unit}/unit, Registration: ₱${registration}, Library: ₱${library}, Lab: ₱${lab}, ID: ₱${id_fee}, Others: ₱${others}`]
    );

    res.json({ success: true, message: `Fee structure for ${course} updated successfully` });
  } catch (error) {
    console.error('Update fees error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const addInstallmentPenalty = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { penalty_amount, reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!penalty_amount || isNaN(penalty_amount) || penalty_amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid penalty amount' });
    }

    // Get the installment payment
    const paymentRows = await query(
      `SELECT ip.*, e.total_amount, e.enrollment_date, e.created_at as enrollment_created_at
       FROM installment_payments ip
       JOIN enrollments e ON ip.enrollment_id = e.id
       WHERE ip.id = ?`,
      [paymentId]
    );
    const payment = paymentRows && paymentRows[0] ? paymentRows[0] : null;

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Installment payment not found' });
    }

    // Update penalty_amount on the installment payment
    const currentPenalty = payment.penalty_amount || 0;
    const newPenalty = currentPenalty + parseFloat(penalty_amount);

    await run(
      `UPDATE installment_payments 
       SET penalty_amount = ?, notes = COALESCE(notes, '') || ?  , updated_at = datetime('now') 
       WHERE id = ?`,
      [newPenalty, (payment.notes ? '\n' : '') + `Penalty ₱${parseFloat(penalty_amount).toFixed(2)}: ${reason || 'Late payment'}`, paymentId]
    );

    // Send notification to student directly (not using sendEnrollmentNotification since period is not a status)
    try {
      await run(
        `INSERT INTO notifications (student_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, 0, datetime('now'))`,
        [
          payment.student_id,
          'Late Payment Penalty Added',
          `A late payment penalty of ₱${parseFloat(penalty_amount).toFixed(2)} has been added to your ${payment.period} installment. Reason: ${reason || 'Late payment'}. Please settle the additional amount.`,
          'warning'
        ]
      );
    } catch (notifErr) {
      console.error('Failed to send penalty notification:', notifErr);
      // Don't fail the whole operation for a notification error
    }

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_ADD_PENALTY', 'installment_payment', paymentId, `Added penalty ₱${parseFloat(penalty_amount).toFixed(2)} to ${payment.period}: ${reason || 'Late payment'}`]
    );

    res.json({ success: true, message: `Penalty of ₱${parseFloat(penalty_amount).toFixed(2)} added successfully`, penalty_amount: newPenalty });
  } catch (error) {
    console.error('Add installment penalty error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPenaltyFeeConfig = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'installment_penalty_fee' LIMIT 1`
    );
    const penaltyFee = rows && rows[0] ? parseFloat(rows[0].setting_value) : 500.00;
    res.json({ success: true, data: { penalty_fee: penaltyFee } });
  } catch (error) {
    console.error('Get penalty fee config error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updatePenaltyFeeConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { penalty_fee } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (penalty_fee === undefined || isNaN(penalty_fee) || penalty_fee < 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid penalty fee amount' });
    }

    // Upsert the penalty fee setting
    await run(
      `INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
       VALUES ('installment_penalty_fee', ?, 'Penalty fee applied automatically to overdue installment payments', datetime('now'))
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`,
      [penalty_fee.toString(), penalty_fee.toString()]
    );

    // Log activity
    await run(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CASHIER_UPDATE_PENALTY_FEE', 'system_settings', 0, `Updated installment penalty fee to ₱${parseFloat(penalty_fee).toFixed(2)}`]
    );

    res.json({ success: true, message: `Penalty fee updated to ₱${parseFloat(penalty_fee).toFixed(2)}` });
  } catch (error) {
    console.error('Update penalty fee config error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default { listPendingTransactions, listTransactions, processTransaction, cashierReport, listTuitionAssessments, approveTuitionAssessment, listInstallmentPayments, approveInstallmentPayment, rejectInstallmentPayment, listEnrollmentsForReview, updateEnrollmentFees, approveEnrollmentReview, rejectEnrollmentReview, getFees, updateFees, addInstallmentPenalty, getPenaltyFeeConfig, updatePenaltyFeeConfig };
