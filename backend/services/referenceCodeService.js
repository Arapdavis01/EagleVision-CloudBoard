const pool = require('../config/db');

/**
 * Generate a unique reference code in the format:
 *   SYS-YYYY-NNNN
 * Example: SYS-2026-0042
 *
 * Sequential within the year. Resets every year.
 */
async function generateReferenceCode() {
  const year = new Date().getFullYear();
  const prefix = `SYS-${year}-`;

  try {
    // Find the highest number for this year
    const { rows } = await pool.query(
      `SELECT reference_code 
       FROM system_requests 
       WHERE reference_code LIKE $1
       ORDER BY id DESC 
       LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;

    if (rows.length > 0) {
      // Extract the numeric suffix and increment
      const lastCode = rows[0].reference_code;
      const lastNumber = parseInt(lastCode.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    // Pad to 4 digits
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${prefix}${paddedNumber}`;
  } catch (err) {
    console.error('Failed to generate reference code:', err);
    // Fallback: use timestamp-based code to avoid duplicates
    const fallback = Date.now().toString().slice(-6);
    return `${prefix}${fallback}`;
  }
}

module.exports = { generateReferenceCode };
