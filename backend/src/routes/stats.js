const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        (SELECT count(*) FROM cards WHERE user_id = $1) AS total,
        (SELECT count(*) FROM cards WHERE user_id = $1 AND due_at <= now()) AS due,
        (SELECT count(*) FROM cards WHERE user_id = $1 AND (back IS NULL OR back = '')) AS untranslated,
        (SELECT count(*) FROM cards WHERE user_id = $1 AND flagged = true) AS flagged
      `,
      [req.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
