// routesAdmin.js - admin-only endpoints, all require the x-admin-key header
//
//  GET    /api/admin/stats        dashboard counts
//  GET    /api/admin/items        all items (filterable by status/search)
//  PATCH  /api/admin/items/:id    update item status
//  DELETE /api/admin/items/:id    delete an item
//  GET    /api/admin/claims       all claims (filterable)
//  PATCH  /api/admin/claims/:id   update claim status

const express   = require('express');
const router    = express.Router();
const db        = require('../db/queries');
const adminAuth = require('../middleware/auth');
const fs        = require('fs');
const path      = require('path');

// every route in this file requires the admin key
router.use(adminAuth);


// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await db.getStats();
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/admin/stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});


// GET /api/admin/items?status=pending&search=keyword
router.get('/items', async (req, res) => {
  try {
    const { status = '', search = '' } = req.query;
    const { rows } = await db.getAllItems(status, search);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/items error:', err.message);
    res.status(500).json({ error: 'Failed to fetch items.' });
  }
});


// PATCH /api/admin/items/:id
// body: { status: "approved" | "rejected" | "claimed" }
router.patch('/items/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'approved', 'rejected', 'claimed'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const { rows } = await db.updateItemStatus(req.params.id, status);

    if (!rows.length) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    res.json({ message: `Item marked as ${status}.`, item: rows[0] });
  } catch (err) {
    console.error('PATCH /api/admin/items/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update item status.' });
  }
});


// DELETE /api/admin/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const { rows } = await db.deleteItem(req.params.id);

    if (!rows.length) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // also delete the uploaded photo from disk if there was one
    if (rows[0].photo_path) {
      const fullPath = path.join(__dirname, '..', rows[0].photo_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    res.json({ message: 'Item deleted.' });
  } catch (err) {
    console.error('DELETE /api/admin/items/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});


// GET /api/admin/claims?status=pending
router.get('/claims', async (req, res) => {
  try {
    const { status = '' } = req.query;
    const { rows } = await db.getAllClaims(status);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/claims error:', err.message);
    res.status(500).json({ error: 'Failed to fetch claims.' });
  }
});


// PATCH /api/admin/claims/:id
// body: { status: "approved" | "rejected" }
router.patch('/claims/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "approved" or "rejected".' });
    }

    const { rows } = await db.updateClaimStatus(req.params.id, status);

    if (!rows.length) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    // if claim approved, also mark the item as claimed
    if (status === 'approved') {
      await db.updateItemStatus(rows[0].item_id, 'claimed');
    }

    res.json({ message: `Claim ${status}.`, claim: rows[0] });
  } catch (err) {
    console.error('PATCH /api/admin/claims/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update claim status.' });
  }
});


module.exports = router;