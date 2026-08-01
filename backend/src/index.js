require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter = require('./routes/auth');
const cardsRouter = require('./routes/cards');
const reviewRouter = require('./routes/review');
const statsRouter = require('./routes/stats');
const importRouter = require('./routes/import');
const { requireAuth } = require('./middleware/auth');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.SESSION_SECRET) {
  console.error('GOOGLE_CLIENT_ID and SESSION_SECRET must be set');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/cards', requireAuth, cardsRouter);
app.use('/api/review', requireAuth, reviewRouter);
app.use('/api/stats', requireAuth, statsRouter);
app.use('/api/import', requireAuth, importRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on port ${port}`));
