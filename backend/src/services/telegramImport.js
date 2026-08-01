const fs = require('fs');
const pool = require('../db/pool');

function extractText(text) {
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) {
    return text.map((part) => (typeof part === 'string' ? part : part.text || '')).join('');
  }
  return '';
}

async function importTelegramFile(filePath, userId) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`File not found: ${filePath}`);
    err.code = 'FILE_NOT_FOUND';
    throw err;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const messages = data.messages || [];

  let imported = 0;
  let skipped = 0;

  for (const msg of messages) {
    if (msg.type !== 'message') continue;
    const text = extractText(msg.text).trim();
    if (!text) {
      skipped += 1;
      continue;
    }

    const result = await pool.query(
      `INSERT INTO cards (front, source, telegram_message_id, user_id)
       VALUES ($1, 'telegram', $2, $3)
       ON CONFLICT (user_id, telegram_message_id) DO NOTHING
       RETURNING id`,
      [text, msg.id, userId]
    );
    if (result.rows.length) imported += 1;
    else skipped += 1;
  }

  return { imported, skipped };
}

module.exports = { importTelegramFile, extractText };
