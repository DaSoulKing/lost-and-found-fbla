// routes/items.js - public item endpoints
//
//  GET  /api/items        list approved items (supports search/filter)
//  GET  /api/items/:id    get one item
//  POST /api/items        submit a new found item (with photo)

const express = require('express');
const router  = express.Router();
const db      = require('../db/queries');
const upload  = require('../middleware/upload');

// GET /api/items
// query params: ?search=keyword&category=Electronics
router.get('/', async (req, res) => {
  try {
    const { search = '', category = '' } = req.query;
    const { rows } = await db.getApprovedItems(search, category);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/items error:', err.message);
    res.status(500).json({ error: 'Failed to fetch items.' });
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.getItemById(req.params.id);
    if (!rows.length) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    // don't expose pending/rejected items to public
    const item = rows[0];
    if (item.status !== 'approved' && item.status !== 'claimed') {
      return res.status(404).json({ error: 'Item not found.' });
    }
    res.json(item);
  } catch (err) {
    console.error('GET /api/items/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch item.' });
  }
});

// POST /api/items
// multipart/form-data because of the optional photo upload
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { title, description, category, location_found, date_found, finder_name, finder_email } = req.body;
    // basic required field check
    if (!title || !description || !category || !location_found || !date_found) {
      return res.status(400).json({ error: 'title, description, category, location_found, and date_found are all required.' });
    }
    // if a file was uploaded, store its relative path
    const photo_path = req.file ? `uploads/${req.file.filename}` : null;
    const { rows } = await db.insertItem({
      title, description, category, location_found, date_found,
      photo_path, finder_name, finder_email,
    });
    res.status(201).json({ message: 'Item submitted for review.', item: rows[0] });
  } catch (err) {
    console.error('POST /api/items error:', err.message);
    res.status(500).json({ error: 'Failed to submit item.' });
  }
});

module.exports = router;