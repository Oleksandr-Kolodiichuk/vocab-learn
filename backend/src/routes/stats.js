const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { setId } = req.query;
    const params = [req.userId];
    let setFilter = '';
    if (setId) {
      params.push(setId);
      setFilter = ' AND set_id = $2';
    }
    const { rows } = await pool.query(
      `
      SELECT
        (SELECT count(*) FROM cards WHERE user_id = $1${setFilter}) AS total,
        (SELECT count(*) FROM cards WHERE user_id = $1${setFilter} AND due_at <= now()) AS due,
        (SELECT count(*) FROM cards WHERE user_id = $1${setFilter} AND (back IS NULL OR back = '')) AS untranslated,
        (SELECT count(*) FROM cards WHERE user_id = $1${setFilter} AND flagged = true) AS flagged
      `,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
