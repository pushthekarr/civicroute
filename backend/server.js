require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { load } = require('./src/db/init');
load(); // ensures data.json + seed departments exist on boot

const complaintsRouter = require('./src/routes/complaints');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim());
app.disable('x-powered-by');
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'CivicRoute backend' }));
app.use('/api/complaints', complaintsRouter);

app.use((err, req, res, next) => {
  if (err.name === 'MulterError') return res.status(400).json({ error: 'Please upload a JPG, PNG, or WebP image smaller than 5 MB.' });
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Request body must be valid JSON.' });
  if (err.message === 'Origin is not allowed by CORS') return res.status(403).json({ error: 'This site is not permitted to call the API.' });
  console.error('Unhandled request error:', err.message);
  return res.status(500).json({ error: 'We could not process that request. Please try again.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CivicRoute backend running on port ${PORT}`));
