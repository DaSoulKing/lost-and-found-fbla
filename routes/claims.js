// routes/claims.js - claim and verification endpoints
//
//  POST /api/claims/question   ask AI for a verification question
//  POST /api/claims            submit a claim with an answer

const express = require('express');
const router  = express.Router();
const db      = require('../db/queries');


// fallback questions when n8n is not configured, keyed by category
const fallbackQuestions = {
  Electronics:  'Describe any stickers, cases, or damage visible on the device.',
  Clothing:     'Is there any text, logo, or label on this item? Describe it.',
  Bags:         'What is inside the main compartment of the bag right now?',
  Stationery:   'Are there any names, initials, or markings on this item? What do they say?',
  Sports:       'Describe any personalization or wear marks on this item.',
  Other:        'Describe any unique identifying feature about this item.',
};

const getDefaultQuestion = (category) =>
  fallbackQuestions[category] || 'Describe a unique feature of this item that only its owner would know.';


// POST /api/claims/question
// body: { item_id }
// returns: { question: "..." }
// called by the frontend before showing step 2 of the claim form
router.post('/question', async (req, res) => {
  try {
    const { item_id } = req.body;

    if (!item_id) {
      return res.status(400).json({ error: 'item_id is required.' });
    }

    // fetch item details so we can give context to n8n / AI
    const { rows } = await db.getItemById(item_id);
    if (!rows.length || rows[0].status === 'rejected') {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const item = rows[0];

    // try n8n webhook first
    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    if (n8nUrl) {
      try {
        // call the n8n workflow, it calls Claude and returns a question
        const n8nRes = await fetch(n8nUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            item_id:     item.id,
            title:       item.title,
            description: item.description,
            category:    item.category,
          }),
          // don't wait more than 8 seconds
          signal: AbortSignal.timeout(8000),
        });

        if (n8nRes.ok) {
          const data = await n8nRes.json();
          if (data.question) {
            return res.json({ question: data.question, source: 'ai' });
          }
        }
      } catch (n8nErr) {
        // n8n failed, log it but fall through to the fallback
        console.warn('n8n webhook failed, using fallback question:', n8nErr.message);
      }
    }

    // fallback if n8n is not set or failed
    const question = getDefaultQuestion(item.category);
    res.json({ question, source: 'fallback' });

  } catch (err) {
    console.error('POST /api/claims/question error:', err.message);
    res.status(500).json({ error: 'Failed to generate verification question.' });
  }
});


// POST /api/claims
// body: { item_id, claimant_name, claimant_email, extra_notes,
//         verification_question, verification_answer }
router.post('/', async (req, res) => {
  try {
    const { item_id, claimant_name, claimant_email, extra_notes, verification_question, verification_answer } = req.body;

    if (!item_id || !claimant_name || !claimant_email || !verification_answer) {
      return res.status(400).json({ error: 'item_id, claimant_name, claimant_email, and verification_answer are all required.' });
    }

    // make sure the item exists and is claimable
    const { rows: itemRows } = await db.getItemById(item_id);
    if (!itemRows.length || itemRows[0].status === 'rejected') {
      return res.status(404).json({ error: 'Item not found or not available for claiming.' });
    }

    const { rows } = await db.insertClaim({
      item_id, claimant_name, claimant_email,
      extra_notes, verification_question, verification_answer,
    });

    res.status(201).json({ message: 'Claim submitted. An admin will review your answer and contact you.', claim: rows[0] });
  } catch (err) {
    console.error('POST /api/claims error:', err.message);
    res.status(500).json({ error: 'Failed to submit claim.' });
  }
});


module.exports = router;