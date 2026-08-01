const express = require('express');
const path = require('path');
const { importTelegramFile } = require('../services/telegramImport');

const router = express.Router();

router.post('/telegram', async (req, res, next) => {
  try {
    const filePath =
      process.env.TELEGRAM_EXPORT_PATH ||
      path.join(__dirname, '..', '..', '..', 'telegram-export', 'result.json');
    const { imported, skipped } = await importTelegramFile(filePath, req.userId);
    res.json({ imported, skipped });
  } catch (err) {
    if (err.code === 'FILE_NOT_FOUND') {
      return res.status(404).json({ error: 'result.json wurde in telegram-export/ nicht gefunden' });
    }
    next(err);
  }
});

module.exports = router;
