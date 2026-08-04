const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { search, flagged, setId } = req.query;
    const params = [req.userId];
    let query = 'SELECT * FROM cards WHERE user_id = $1';
    if (setId) {
      params.push(setId);
      query += ` AND set_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (front ILIKE $${params.length} OR back ILIKE $${params.length})`;
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
    const { front, back, setId } = req.body;
    if (!front || !front.trim()) {
      return res.status(400).json({ error: 'front is required' });
    }
    if (!setId) {
      return res.status(400).json({ error: 'setId is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO cards (front, back, source, user_id, set_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [front.trim(), back?.trim() || null, 'manual', req.userId, setId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/import-json', async (req, res, next) => {
  try {
    const { setId, cards } = req.body;
    if (!setId) {
      return res.status(400).json({ error: 'setId is required' });
    }
    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'cards must be an array' });
    }

    const { rows: setRows } = await pool.query('SELECT id FROM sets WHERE id = $1 AND user_id = $2', [
      setId,
      req.userId,
    ]);
    if (!setRows[0]) return res.status(404).json({ error: 'set not found' });

    let imported = 0;
    let skipped = 0;

    for (const item of cards) {
      const front = typeof item?.front === 'string' ? item.front.trim() : '';
      if (!front) {
        skipped += 1;
        continue;
      }
      const back = typeof item?.back === 'string' ? item.back.trim() || null : null;
      const flagged = item?.flagged === true;

      const { rows: existing } = await pool.query(
        'SELECT id FROM cards WHERE set_id = $1 AND lower(front) = lower($2)',
        [setId, front]
      );
      if (existing.length) {
        skipped += 1;
        continue;
      }

      await pool.query(
        'INSERT INTO cards (front, back, source, user_id, set_id, flagged) VALUES ($1, $2, $3, $4, $5, $6)',
        [front, back, 'json-import', req.userId, setId, flagged]
      );
      imported += 1;
    }

    res.json({ imported, skipped });
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
    const { setId } = req.query;
    if (setId) {
      await pool.query('DELETE FROM cards WHERE user_id = $1 AND set_id = $2', [req.userId, setId]);
    } else {
      await pool.query('DELETE FROM cards WHERE user_id = $1', [req.userId]);
    }
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
