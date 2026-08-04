const pool = require('../config/db');

exports.getSales = async (req, res) => {
  try {
    const { rows: sales } = await pool.query(
      `SELECT s.*, p.name as project_name
       FROM sales_records s
       JOIN projects p ON s.project_id = p.id
       ORDER BY s.sale_date DESC`
    );
    const { rows: total } = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM sales_records');
    res.json({ total: total[0].total, sales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
};

exports.addSale = async (req, res) => {
  const { project_id, amount, currency, sale_date, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO sales_records (project_id, amount, currency, sale_date, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [project_id, amount, currency || 'KES', sale_date, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Add sale failed' });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    await pool.query('DELETE FROM sales_records WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};
