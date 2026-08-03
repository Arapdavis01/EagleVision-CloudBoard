const express = require('express');
const pool = require('../db');
const { authenticate } = require('./auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET all projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Project" ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new project
router.post('/', async (req, res) => {
  const { name, ownerName, ownerContact, location, status, hostingProvider, deploymentMethod,
          dbProvider, dbHost, dbName, dbPort, dbUser, dbPassword, dbConnectionString, dbNotes,
          gitRepoUrl, liveUrl, techStack, version, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "Project" ("name", "ownerName", "ownerContact", "location", "status", "hostingProvider", "deploymentMethod",
        "dbProvider", "dbHost", "dbName", "dbPort", "dbUser", "dbPassword", "dbConnectionString", "dbNotes",
        "gitRepoUrl", "liveUrl", "techStack", "version", "notes")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [name, ownerName, ownerContact, location, status, hostingProvider, deploymentMethod,
       dbProvider, dbHost, dbName, dbPort, dbUser, dbPassword, dbConnectionString, dbNotes,
       gitRepoUrl, liveUrl, techStack, version, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
