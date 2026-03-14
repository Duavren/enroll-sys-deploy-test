import { query, run } from '../database/connection';

export const migrateMissingInstallments = async () => {
  try {
    console.log('Starting migration: Creating missing installment periods...');

    // Find all enrollments with down payments already created
    const downPayments = await query(
      `SELECT DISTINCT enrollment_id, student_id, 
              (SELECT total_amount FROM enrollments WHERE id = installment_payments.enrollment_id) as total_amount
       FROM installment_payments 
       WHERE period = 'Down Payment'`
    );

    if (!downPayments || downPayments.length === 0) {
      console.log('No down payments found.');
      return;
    }

    let createdCount = 0;

    for (const payment of downPayments) {
      const enrollmentId = payment.enrollment_id;
      const studentId = payment.student_id;
      const totalAmount = payment.total_amount;

      // Check if this enrollment already has all 4 periods
      const existingPeriods = await query(
        `SELECT COUNT(*) as count FROM installment_payments 
         WHERE enrollment_id = ?`,
        [enrollmentId]
      );

      const periodCount = existingPeriods && existingPeriods[0] ? existingPeriods[0].count : 0;

      // If only 1 record exists (down payment), create the 3 remaining periods
      if (periodCount === 1) {
        const monthlyAmount = totalAmount / 4;
        const remainingPeriods = [
          { name: 'Prelim Period', amount: monthlyAmount },
          { name: 'Midterm Period', amount: monthlyAmount },
          { name: 'Finals Period', amount: monthlyAmount }
        ];

        for (const period of remainingPeriods) {
          await run(
            `INSERT INTO installment_payments 
             (enrollment_id, student_id, amount, period, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [enrollmentId, studentId, period.amount, period.name, 'Pending']
          );
          createdCount++;
        }

        console.log(`Created 3 remaining periods for enrollment ${enrollmentId}`);
      }
    }

    console.log(`Migration complete! Created ${createdCount} missing installment records.`);
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
};

// Run the migration
migrateMissingInstallments().catch(console.error);
