// server.js - entry point, wires everything together

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes - must come BEFORE the catch-all below
app.use('/api/items',  require('./routes/items'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/admin',  require('./routes/admin'));

// 404 for unknown /api/* routes
// stops API misses from falling through to the HTML catch-all
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// catch-all for non-API GET requests
// serves index.html so direct links to /listings.html etc. work
// NOTE: must come AFTER all /api routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
  console.log('ADMIN_KEY loaded:', process.env.ADMIN_KEY);
});