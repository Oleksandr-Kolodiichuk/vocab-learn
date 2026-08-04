const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit');
const pool = require('../db/pool');

const router = express.Router();

const FONT_DIR = path.dirname(require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'));
const FONT_REGULAR = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, count(c.id)::int AS card_count
       FROM sets s
       LEFT JOIN cards c ON c.set_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.created_at ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO sets (user_id, name) VALUES ($1, $2) RETURNING *, 0 AS card_count',
      [req.userId, name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const { rows } = await pool.query(
      'UPDATE sets SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM sets WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.userId,
    ]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/export-pdf', async (req, res, next) => {
  try {
    const onlyFlagged = req.query.onlyFlagged === 'true';
    const { rows: setRows } = await pool.query('SELECT * FROM sets WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.userId,
    ]);
    const set = setRows[0];
    if (!set) return res.status(404).json({ error: 'not found' });

    let query = 'SELECT front, back FROM cards WHERE set_id = $1 AND user_id = $2';
    const params = [set.id, req.userId];
    if (onlyFlagged) query += ' AND flagged = true';
    query += ' ORDER BY created_at ASC';
    const { rows: cards } = await pool.query(query, params);

    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont('body', FONT_REGULAR);
    doc.registerFont('bold', FONT_BOLD);

    const safeName = set.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'set';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    doc.pipe(res);

    doc.font('bold').fontSize(18).text(set.name);
    doc.moveDown(0.2);
    doc
      .font('body')
      .fontSize(10)
      .fillColor('#666')
      .text(
        `${onlyFlagged ? 'Nur unbekannte Wörter' : 'Alle Wörter'} · ${cards.length} Karten · ${new Date().toLocaleDateString('de-DE')}`
      );
    doc.fillColor('#000');
    doc.moveDown(1);

    if (cards.length === 0) {
      doc.font('body').fontSize(12).text('Keine Karten.');
    } else {
      cards.forEach((card, i) => {
        doc.font('bold').fontSize(12).text(`${i + 1}. ${card.front}`);
        doc
          .font('body')
          .fontSize(11)
          .fillColor('#444')
          .text(card.back || '(keine Übersetzung)', { indent: 16 });
        doc.fillColor('#000');
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
