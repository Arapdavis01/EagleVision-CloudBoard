const pool = require('../config/db');
const { generateReferenceCode } = require('../services/referenceCodeService');

// ============================================================
// PUBLIC — Submit a new system request (no auth)
// ============================================================
exports.submitRequest = async (req, res) => {
  const {
    full_name,
    email,
    phone,
    company,
    location,
    system_type,
    title,
    description,
    features,
    target_users,
    budget_range,
    timeline,
    reference_urls,
    attachment_url,
    source,
  } = req.body;

  // Validate required fields
  if (!full_name || !email || !system_type || !title || !description) {
    return res.status(400).json({
      error: 'Please fill in all required fields.',
    });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    // Generate a unique reference code
    const referenceCode = await generateReferenceCode();

    const { rows } = await pool.query(
      `INSERT INTO system_requests
        (reference_code, full_name, email, phone, company, location,
         system_type, title, description, features, target_users,
         budget_range, timeline, reference_urls, attachment_url, source)
       VALUES
        ($1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16)
       RETURNING id, reference_code, created_at`,
      [
        referenceCode,
        full_name,
        email,
        phone || null,
        company || null,
        location || null,
        system_type,
        title,
        description,
        features || null,
        target_users || null,
        budget_range || null,
        timeline || null,
        reference_urls || null,
        attachment_url || null,
        source || 'website',
      ]
    );

    res.status(201).json({
      reference_code: rows[0].reference_code,
      message: 'Request received. We will be in touch shortly.',
    });
  } catch (err) {
    console.error('Failed to submit system request:', err);
    res.status(500).json({ error: 'Failed to submit request. Please try again.' });
  }
};

// ============================================================
// ADMIN — Get all requests (with filters)
// ============================================================
exports.getAllRequests = async (req, res) => {
  const { status, priority, search, project_id, sort } = req.query;

  let query = `
    SELECT sr.*,
           p.name AS project_name
    FROM system_requests sr
    LEFT JOIN projects p ON sr.project_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    query += ` AND sr.status = $${params.length}`;
  }

  if (priority && priority !== 'all') {
    params.push(priority);
    query += ` AND sr.priority = $${params.length}`;
  }

  if (project_id) {
    params.push(project_id);
    query += ` AND sr.project_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (
      sr.reference_code ILIKE $${params.length}
      OR sr.full_name ILIKE $${params.length}
      OR sr.email ILIKE $${params.length}
      OR sr.company ILIKE $${params.length}
      OR sr.title ILIKE $${params.length}
    )`;
  }

  // Sorting
  switch (sort) {
    case 'oldest':
      query += ` ORDER BY sr.created_at ASC`;
      break;
    case 'priority':
      query += ` ORDER BY 
        CASE sr.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        sr.created_at DESC`;
      break;
    default:
      query += ` ORDER BY sr.created_at DESC`;
  }

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch system requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
};

// ============================================================
// ADMIN — Get a single request
// ============================================================
exports.getRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT sr.*, p.name AS project_name
       FROM system_requests sr
       LEFT JOIN projects p ON sr.project_id = p.id
       WHERE sr.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to fetch request:', err);
    res.status(500).json({ error: 'Failed to fetch request.' });
  }
};

// ============================================================
// ADMIN — Update a request (status, priority, admin_notes)
// ============================================================
exports.updateRequest = async (req, res) => {
  const { id } = req.params;
  const { status, priority, admin_notes } = req.body;

  try {
    const updates = [];
    const params = [];

    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (priority !== undefined) {
      params.push(priority);
      updates.push(`priority = $${params.length}`);
    }
    if (admin_notes !== undefined) {
      params.push(admin_notes);
      updates.push(`admin_notes = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE system_requests 
       SET ${updates.join(', ')},
           reviewed_at = NOW()
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to update request:', err);
    res.status(500).json({ error: 'Failed to update request.' });
  }
};

// ============================================================
// ADMIN — Approve a request (quick action)
// ============================================================
exports.approveRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `UPDATE system_requests
       SET status = 'approved',
           reviewed_at = NOW(),
           reviewed_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.adminId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to approve request:', err);
    res.status(500).json({ error: 'Failed to approve request.' });
  }
};

// ============================================================
// ADMIN — Reject a request
// ============================================================
exports.rejectRequest = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE system_requests
       SET status = 'rejected',
           admin_notes = COALESCE($1, admin_notes),
           reviewed_at = NOW(),
           reviewed_by = $2
       WHERE id = $3
       RETURNING *`,
      [reason || null, req.adminId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to reject request:', err);
    res.status(500).json({ error: 'Failed to reject request.' });
  }
};

// ============================================================
// ADMIN — Mark request as converted to a project
// ============================================================
exports.markAsConverted = async (req, res) => {
  const { id } = req.params;
  const { project_id } = req.body;

  if (!project_id) {
    return res.status(400).json({ error: 'Project ID is required.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE system_requests
       SET status = 'converted',
           project_id = $1,
           reviewed_at = NOW(),
           reviewed_by = $2
       WHERE id = $3
       RETURNING *`,
      [project_id, req.adminId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to mark request as converted:', err);
    res.status(500).json({ error: 'Failed to update request.' });
  }
};

// ============================================================
// ADMIN — Delete a request
// ============================================================
exports.deleteRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM system_requests WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.json({ message: 'Request deleted.' });
  } catch (err) {
    console.error('Failed to delete request:', err);
    res.status(500).json({ error: 'Failed to delete request.' });
  }
};

// ============================================================
// ADMIN — Stats for dashboard
// ============================================================
exports.getStats = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'new') AS new_count,
        COUNT(*) FILTER (WHERE status = 'reviewing') AS reviewing,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) FILTER (WHERE status = 'converted') AS converted,
        COUNT(*) FILTER (WHERE priority = 'high' AND status != 'converted') AS high_priority,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week
      FROM system_requests
    `);

    res.json(rows[0]);
  } catch (err) {
    console.error('Failed to fetch request stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};
