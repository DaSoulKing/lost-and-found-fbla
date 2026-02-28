// middleware/auth.js - blocks non-admins from hitting admin routes
// frontend sends the key in the x-admin-key header

const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing admin key.' });
  }
  next();
};

module.exports = adminAuth;