const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

module.exports = { requireAuth };
