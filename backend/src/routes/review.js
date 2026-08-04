const express = require('express');
const pool = require('../db/pool');
const { sm2 } = require('../services/srs');

const router = express.Router();

router.get('/due', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const { setId } = req.query;
    const params = [req.userId];
    let query = 'SELECT * FROM cards WHERE user_id = $1 AND due_at <= now()';
    if (setId) {
      params.push(setId);
      query += ` AND set_id = $${params.length}`;
    }
    params.push(limit);
    query += ` ORDER BY due_at ASC LIMIT $${params.length}`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:id', async (req, res, next) => {
  try {
    const { quality } = req.body;
    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ error: 'quality must be a number between 0 and 5' });
    }

    const { rows } = await pool.query('SELECT * FROM cards WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.userId,
    ]);
    const card = rows[0];
    if (!card) return res.status(404).json({ error: 'not found' });

    const next5 = sm2(card, quality);
    const { rows: updated } = await pool.query(
      `UPDATE cards
       SET ease_factor = $1, interval_days = $2, repetitions = $3, due_at = $4, last_reviewed_at = now()
       WHERE id = $5
       RETURNING *`,
      [next5.ease_factor, next5.interval_days, next5.repetitions, next5.due_at, card.id]
    );
    await pool.query('INSERT INTO review_log (card_id, quality) VALUES ($1, $2)', [card.id, quality]);

    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
