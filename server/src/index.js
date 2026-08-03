require('dotenv').config();
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth').router;
const projectRoutes = require('./routes/projects');

const app = express();
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Fallback to index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
