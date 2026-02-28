// db/queries.js - all SQL queries live here as exported functions
// routes import these, no raw SQL anywhere else

const pool = require('./pool');


// get all approved items, newest first
// optionally filter by search keyword and/or category
const getApprovedItems = (search = '', category = '') => {
  const params = [];
  let   where  = `WHERE status = 'approved'`;

  if (category) {
    params.push(category);
    where += ` AND LOWER(category) = LOWER($${params.length})`;
  }

  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    where += ` AND (title ILIKE $${n} OR description ILIKE $${n})`;
  }

  return pool.query(
    `SELECT * FROM items ${where} ORDER BY created_at DESC`,
    params
  );
};

// get every item regardless of status (admin only)
const getAllItems = (status = '', search = '') => {
  const params = [];
  let   where  = 'WHERE 1=1';

  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    where += ` AND (title ILIKE $${n} OR description ILIKE $${n})`;
  }

  return pool.query(
    `SELECT * FROM items ${where} ORDER BY created_at DESC`,
    params
  );
};

// get one item by id
const getItemById = (id) =>
  pool.query('SELECT * FROM items WHERE id = $1', [id]);

// insert a new item (comes in as pending)
const insertItem = ({ title, description, category, location_found, date_found, photo_path, finder_name, finder_email }) =>
  pool.query(
    `INSERT INTO items
      (title, description, category, location_found, date_found, photo_path, finder_name, finder_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [title, description, category, location_found, date_found, photo_path || null, finder_name || null, finder_email || null]
  );

// update item status, used by admin to approve or reject
const updateItemStatus = (id, status) =>
  pool.query(
    'UPDATE items SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );

// delete an item (cascades to its claims too)
const deleteItem = (id) =>
  pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);


// get all claims (admin only), newest first, with item title joined in
const getAllClaims = (status = '') => {
  const params = [];
  let   where  = 'WHERE 1=1';

  if (status) {
    params.push(status);
    where += ` AND c.status = $${params.length}`;
  }

  return pool.query(
    `SELECT c.*, i.title AS item_title
     FROM claims c
     JOIN items i ON i.id = c.item_id
     ${where}
     ORDER BY c.created_at DESC`,
    params
  );
};

// get claims for a single item
const getClaimsByItem = (itemId) =>
  pool.query('SELECT * FROM claims WHERE item_id = $1 ORDER BY created_at DESC', [itemId]);

// insert a new claim
const insertClaim = ({ item_id, claimant_name, claimant_email, extra_notes, verification_question, verification_answer }) =>
  pool.query(
    `INSERT INTO claims
      (item_id, claimant_name, claimant_email, extra_notes, verification_question, verification_answer)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [item_id, claimant_name, claimant_email, extra_notes || null, verification_question || null, verification_answer || null]
  );

// update claim status, admin approves or rejects
const updateClaimStatus = (id, status) =>
  pool.query(
    'UPDATE claims SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );


// dashboard counts
const getStats = () =>
  pool.query(`
    SELECT
      COUNT(*)                                        AS total,
      COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
      COUNT(*) FILTER (WHERE status = 'approved')    AS approved,
      COUNT(*) FILTER (WHERE status = 'claimed')     AS claimed,
      (SELECT COUNT(*) FROM claims WHERE status = 'pending') AS open_claims
    FROM items
  `);


module.exports = {
  getApprovedItems,
  getAllItems,
  getItemById,
  insertItem,
  updateItemStatus,
  deleteItem,
  getAllClaims,
  getClaimsByItem,
  insertClaim,
  updateClaimStatus,
  getStats,
};