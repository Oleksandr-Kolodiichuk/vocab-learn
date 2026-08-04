require('dotenv').config();
const path = require('path');
const pool = require('../src/db/pool');
const { importTelegramFile } = require('../src/services/telegramImport');

async function main() {
  const filePath =
    process.argv[2] ||
    process.env.TELEGRAM_EXPORT_PATH ||
    path.join(__dirname, '..', '..', 'telegram-export', 'result.json');
  const userEmail = process.argv[3] || process.env.TELEGRAM_IMPORT_USER_EMAIL;

  if (!userEmail) {
    console.error('Specify the target user email: npm run import:telegram -- <file> <email>');
    console.error('(or set TELEGRAM_IMPORT_USER_EMAIL) — the user must have signed in via Google at least once.');
    process.exit(1);
  }

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    const user = rows[0];
    if (!user) {
      console.error(`No user found with email ${userEmail}. Sign in via Google in the app first.`);
      process.exit(1);
    }

    const { rows: setRows } = await pool.query(
      'SELECT id FROM sets WHERE user_id = $1 ORDER BY id LIMIT 1',
      [user.id]
    );
    let setId = setRows[0]?.id;
    if (!setId) {
      const { rows: created } = await pool.query(
        "INSERT INTO sets (user_id, name) VALUES ($1, 'Meine Wörter') RETURNING id",
        [user.id]
      );
      setId = created[0].id;
    }

    const { imported, skipped } = await importTelegramFile(filePath, user.id, setId);
    console.log(`Imported: ${imported}, skipped: ${skipped}`);
  } catch (err) {
    if (err.code === 'FILE_NOT_FOUND') {
      console.error(err.message);
      console.error('Export your channel from Telegram Desktop (Settings -> Export chat history, JSON format)');
      console.error('and place result.json in the telegram-export/ folder, or pass a path as an argument.');
      process.exit(1);
    }
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
