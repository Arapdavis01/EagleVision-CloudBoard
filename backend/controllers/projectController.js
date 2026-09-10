const pool = require('../config/db');

// ==================== BASIC PROJECT CRUD ====================

exports.getAll = async (req, res) => {
  const { search } = req.query;
  let query = `SELECT * FROM projects`;
  const params = [];
  if (search) {
    query += ` WHERE name ILIKE $1 OR client ILIKE $1 OR tags ILIKE $1`;
    params.push(`%${search}%`);
  }
  query += ` ORDER BY created_at DESC`;
  const { rows } = await pool.query(query, params);
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  const {
    name, client, live_url, github, hosting, location, description,
    tech_stack, tags, next_review_date, thumbnail_url, status,
    project_type, domain_name, registrar, expiry_date, auto_renew,
    for_sale, asking_price
  } = req.body;

  const isForSale = for_sale === true || for_sale === 'true';
  const askingPrice = asking_price ? parseFloat(asking_price) : null;
  const autoRenew = auto_renew === true || auto_renew === 'true';

  const { rows } = await pool.query(
    `INSERT INTO projects
     (name, client, live_url, github, hosting, location, description, tech_stack, tags,
      next_review_date, thumbnail_url, status, project_type, domain_name, registrar, expiry_date,
      auto_renew, for_sale, asking_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [name, client, live_url, github, hosting, location, description,
     JSON.stringify(tech_stack || []), tags || '', next_review_date, thumbnail_url,
     status || 'Planning', project_type || 'Other', domain_name || null, registrar || null,
     expiry_date || null, autoRenew, isForSale, askingPrice]
  );
  res.status(201).json(rows[0]);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const {
    name, client, live_url, github, hosting, location, description,
    tech_stack, tags, next_review_date, thumbnail_url, status,
    project_type, domain_name, registrar, expiry_date, auto_renew,
    for_sale, asking_price
  } = req.body;

  const isForSale = for_sale === true || for_sale === 'true';
  const askingPrice = asking_price ? parseFloat(asking_price) : null;
  const autoRenew = auto_renew === true || auto_renew === 'true';

  const { rows } = await pool.query(
    `UPDATE projects SET
     name = $1, client = $2, live_url = $3, github = $4, hosting = $5, location = $6,
     description = $7, tech_stack = $8, tags = $9, next_review_date = $10,
     thumbnail_url = $11, status = $12, last_updated = NOW(),
     project_type = $13, domain_name = $14, registrar = $15, expiry_date = $16,
     auto_renew = $17, for_sale = $18, asking_price = $19
     WHERE id = $20 RETURNING *`,
    [name, client, live_url, github, hosting, location, description,
     JSON.stringify(tech_stack || []), tags || '', next_review_date, thumbnail_url,
     status, project_type || 'Other', domain_name || null, registrar || null,
     expiry_date || null, autoRenew, isForSale, askingPrice, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
  res.json(rows[0]);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Project not found' });
  res.json({ message: 'Project deleted' });
};

// ==================== PUBLIC STATUS PAGE ====================

exports.getPublicStatus = async (req, res) => {
  const { token } = req.params;
  const { rows } = await pool.query('SELECT * FROM projects WHERE public_token = $1', [token]);
  if (rows.length === 0) return res.status(404).json({ error: 'Invalid token' });
  const project = rows[0];
  // Optionally include latest uptime log
  const { rows: logs } = await pool.query(
    'SELECT * FROM uptime_logs WHERE project_id = $1 ORDER BY checked_at DESC LIMIT 1',
    [project.id]
  );
  res.json({ project, latest_uptime: logs[0] || null });
};

// ==================== PROJECT UPDATES (SERVICE RECORD) ====================

// Get all updates for a specific project (with plan info if linked)
exports.getProjectUpdates = async (req, res) => {
  const { projectId } = req.params;
  const { sort } = req.query;
  try {
    let orderBy = 'pu.created_at DESC';
    
    switch (sort) {
      case 'date-asc':
        orderBy = 'pu.created_at ASC';
        break;
      case 'date-desc':
        orderBy = 'pu.created_at DESC';
        break;
      case 'cost-asc':
        orderBy = 'pu.cost ASC NULLS LAST';
        break;
      case 'cost-desc':
        orderBy = 'pu.cost DESC NULLS LAST';
        break;
      default:
        orderBy = 'pu.created_at DESC';
    }

    const { rows } = await pool.query(
      `SELECT pu.*, 
              sp.id as plan_id, 
              sp.title as plan_title, 
              sp.status as plan_status,
              sp.priority as plan_priority
       FROM project_updates pu
       LEFT JOIN service_plans sp ON sp.update_id = pu.id
       WHERE pu.project_id = $1
       ORDER BY ${orderBy}`,
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project updates' });
  }
};

// Create a new update for a project
exports.createProjectUpdate = async (req, res) => {
  const { projectId } = req.params;
  const { update_type, title, description, cost } = req.body;

  if (!title || !update_type) {
    return res.status(400).json({ error: 'Update type and title are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO project_updates (project_id, update_type, title, description, cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, update_type, title, description || null, cost || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project update' });
  }
};

// Update an existing project update entry
exports.updateProjectUpdate = async (req, res) => {
  const { id } = req.params;
  const { update_type, title, description, cost } = req.body;

  if (!title || !update_type) {
    return res.status(400).json({ error: 'Update type and title are required' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE project_updates SET
       update_type = $1, title = $2, description = $3, cost = $4
       WHERE id = $5
       RETURNING *`,
      [update_type, title, description || null, cost || null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Update not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update project update' });
  }
};

// Delete a project update entry
exports.deleteProjectUpdate = async (req, res) => {
  const { id } = req.params;
  try {
    // First, unlink any service plans that reference this update
    await pool.query('UPDATE service_plans SET update_id = NULL WHERE update_id = $1', [id]);
    
    // Then delete the update
    const { rowCount } = await pool.query('DELETE FROM project_updates WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Update not found' });
    res.json({ message: 'Update deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project update' });
  }
};

// ==================== REVIEW & UPDATE (COMBINED ACTION) ====================

// Create a project update AND update the project's next_review_date/status
exports.reviewAndUpdate = async (req, res) => {
  const { projectId } = req.params;
  const { update_type, title, description, cost, next_review_date, status } = req.body;

  if (!title || !update_type) {
    return res.status(400).json({ error: 'Update type and title are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert new project update
    const { rows: updateRows } = await client.query(
      `INSERT INTO project_updates (project_id, update_type, title, description, cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, update_type, title, description || null, cost || null]
    );

    // 2. Update project next_review_date and status (if provided)
    await client.query(
      `UPDATE projects
       SET next_review_date = $1,
           status = COALESCE($2, status),
           last_updated = NOW()
       WHERE id = $3`,
      [next_review_date || null, status || null, projectId]
    );

    await client.query('COMMIT');
    res.status(201).json(updateRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to complete review & update' });
  } finally {
    client.release();
  }
};

// ==================== PROJECT HEALTH SCORE ====================

// Calculate and get project health score
exports.getProjectHealth = async (req, res) => {
  const { projectId } = req.params;

  try {
    // Get project details
    const { rows: projectRows } = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectRows[0];

    // Get update statistics
    const { rows: updateStats } = await pool.query(
      `SELECT 
        COUNT(*) as total_updates,
        MAX(created_at) as last_update_date,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(cost), 0) as avg_cost
       FROM project_updates
       WHERE project_id = $1`,
      [projectId]
    );

    const stats = updateStats[0];

    // Get overdue plans count
    const { rows: overdueRows } = await pool.query(
      `SELECT COUNT(*) as overdue_count
       FROM service_plans
       WHERE project_id = $1 
         AND status = 'planned' 
         AND target_date < CURRENT_DATE`,
      [projectId]
    );

    const overdueCount = parseInt(overdueRows[0].overdue_count) || 0;

    // Get active (in-progress) plans count
    const { rows: activeRows } = await pool.query(
      `SELECT COUNT(*) as active_count
       FROM service_plans
       WHERE project_id = $1 AND status = 'in_progress'`,
      [projectId]
    );

    const activeCount = parseInt(activeRows[0].active_count) || 0;

    // Get total plans count
    const { rows: planRows } = await pool.query(
      `SELECT COUNT(*) as total_plans
       FROM service_plans
       WHERE project_id = $1`,
      [projectId]
    );

    const totalPlans = parseInt(planRows[0].total_plans) || 0;

    // Calculate days since last update
    const lastUpdate = stats.last_update_date ? new Date(stats.last_update_date) : null;
    const now = new Date();
    const daysSinceLastUpdate = lastUpdate 
      ? Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24))
      : 999;

    // Check if there's a recent update (within last 14 days)
    const hasRecentUpdate = daysSinceLastUpdate <= 14;

    // Check if next review is overdue
    const nextReviewDate = project.next_review_date ? new Date(project.next_review_date) : null;
    const isReviewOverdue = nextReviewDate && nextReviewDate < now;

    // Calculate health score (0-100)
    let score = 100;

    // Deduct for overdue plans (up to 30 points)
    score -= Math.min(overdueCount * 10, 30);

    // Deduct for inactivity (up to 30 points)
    if (daysSinceLastUpdate > 90) {
      score -= 30;
    } else if (daysSinceLastUpdate > 60) {
      score -= 20;
    } else if (daysSinceLastUpdate > 30) {
      score -= 10;
    }

    // Deduct for overdue review (10 points)
    if (isReviewOverdue) {
      score -= 10;
    }

    // Deduct for stale project status (Archived) (10 points)
    if (project.status === 'Archived') {
      score -= 10;
    }

    // Add bonus for recent activity (5 points)
    if (hasRecentUpdate) {
      score += 5;
    }

    // Add bonus for active plans (up to 5 points)
    if (activeCount > 0) {
      score += 5;
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Determine health level
    let level, color, icon;
    if (score >= 80) {
      level = 'Excellent';
      color = '#10b981';
      icon = 'fa-check-circle';
    } else if (score >= 60) {
      level = 'Good';
      color = '#3b82f6';
      icon = 'fa-thumbs-up';
    } else if (score >= 40) {
      level = 'Fair';
      color = '#f59e0b';
      icon = 'fa-exclamation-triangle';
    } else {
      level = 'Poor';
      color = '#ef4444';
      icon = 'fa-times-circle';
    }

    res.json({
      score,
      level,
      color,
      icon,
      metrics: {
        totalUpdates: parseInt(stats.total_updates) || 0,
        totalCost: parseFloat(stats.total_cost) || 0,
        avgCost: parseFloat(stats.avg_cost) || 0,
        overdueCount,
        activeCount,
        totalPlans,
        daysSinceLastUpdate,
        hasRecentUpdate,
        isReviewOverdue,
        lastUpdateDate: stats.last_update_date,
        nextReviewDate: project.next_review_date,
        projectStatus: project.status
      }
    });
  } catch (err) {
    console.error('Failed to calculate project health:', err);
    res.status(500).json({ error: 'Failed to calculate project health' });
  }
};

// ==================== PROJECT COST ANALYTICS ====================

// Get cost analytics for a project
exports.getProjectCostAnalytics = async (req, res) => {
  const { projectId } = req.params;
  const { months = 6 } = req.query;

  try {
    // Get updates grouped by month
    const { rows: updates } = await pool.query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as update_count,
        COALESCE(SUM(cost), 0) as total_cost
       FROM project_updates
       WHERE project_id = $1
         AND created_at >= NOW() - INTERVAL '${parseInt(months)} months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      [projectId]
    );

    // Get update type breakdown
    const { rows: typeBreakdown } = await pool.query(
      `SELECT 
        update_type,
        COUNT(*) as count,
        COALESCE(SUM(cost), 0) as total_cost
       FROM project_updates
       WHERE project_id = $1
       GROUP BY update_type
       ORDER BY total_cost DESC`,
      [projectId]
    );

    // Get plan cost summary
    const { rows: planSummary } = await pool.query(
      `SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(estimated_cost), 0) as total_estimated_cost
       FROM service_plans
       WHERE project_id = $1
       GROUP BY status`,
      [projectId]
    );

    // Get total costs
    const { rows: totals } = await pool.query(
      `SELECT 
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(*) as total_updates
       FROM project_updates
       WHERE project_id = $1`,
      [projectId]
    );

    // Format monthly data for chart
    const labels = [];
    const values = [];
    
    updates.forEach(u => {
      const date = new Date(u.month);
      labels.push(date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
      values.push(parseFloat(u.total_cost));
    });

    res.json({
      monthly: {
        labels,
        values,
        raw: updates
      },
      byType: typeBreakdown.map(t => ({
        type: t.update_type,
        count: parseInt(t.count),
        totalCost: parseFloat(t.total_cost)
      })),
      byPlanStatus: planSummary.map(p => ({
        status: p.status,
        count: parseInt(p.count),
        totalEstimatedCost: parseFloat(p.total_estimated_cost)
      })),
      totals: {
        totalCost: parseFloat(totals[0].total_cost),
        totalUpdates: parseInt(totals[0].total_updates)
      }
    });
  } catch (err) {
    console.error('Failed to fetch cost analytics:', err);
    res.status(500).json({ error: 'Failed to fetch cost analytics' });
  }
};
