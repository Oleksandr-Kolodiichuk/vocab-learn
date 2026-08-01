const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { search, flagged } = req.query;
    const params = [req.userId];
    let query = 'SELECT * FROM cards WHERE user_id = $1';
    if (search) {
      params.push(`%${search}%`);
      query += ' AND (front ILIKE $2 OR back ILIKE $2)';
    }
    if (flagged === 'true') {
      query += ' AND flagged = true';
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { front, back } = req.body;
    if (!front || !front.trim()) {
      return res.status(400).json({ error: 'front is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO cards (front, back, source, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [front.trim(), back?.trim() || null, 'manual', req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { front, back, flagged } = req.body;
    const { rows } = await pool.query(
      `UPDATE cards
       SET front = COALESCE($1, front), back = COALESCE($2, back), flagged = COALESCE($3, flagged)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [front, back, flagged, req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/all', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cards WHERE user_id = $1', [req.userId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cards WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
