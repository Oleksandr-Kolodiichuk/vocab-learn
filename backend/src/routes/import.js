const express = require('express');
const multer = require('multer');
const { importTelegramData } = require('../services/telegramImport');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/telegram', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    let data;
    try {
      data = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch {
      return res.status(400).json({ error: 'Ungültige JSON-Datei' });
    }

    const { imported, skipped } = await importTelegramData(data, req.userId);
    res.json({ imported, skipped });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
