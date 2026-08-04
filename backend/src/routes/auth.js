const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { rows } = await pool.query(
      `INSERT INTO users (google_sub, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_sub) DO UPDATE
         SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture
       RETURNING *`,
      [payload.sub, payload.email, payload.name, payload.picture]
    );
    const user = rows[0];

    await pool.query(
      `INSERT INTO sets (user_id, name)
       SELECT $1, 'Meine Wörter'
       WHERE NOT EXISTS (SELECT 1 FROM sets WHERE user_id = $1)`,
      [user.id]
    );

    const token = jwt.sign({ userId: user.id }, process.env.SESSION_SECRET, { expiresIn: '30d' });
    res.cookie('session', token, COOKIE_OPTIONS);
    res.json({ id: user.id, email: user.email, name: user.name, picture: user.picture });
  } catch (err) {
    if (err.message?.includes('Token used too late') || err.message?.includes('Wrong recipient')) {
      return res.status(401).json({ error: 'invalid google token' });
    }
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, picture FROM users WHERE id = $1', [
      req.userId,
    ]);
    if (!rows[0]) return res.status(401).json({ error: 'unauthorized' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('session', COOKIE_OPTIONS);
  res.status(204).end();
});

module.exports = router;
