require('dotenv').config();
const express = require('express');
const cors = require('cors');
require('./src/db/init'); // ensures DB + seed data exist on boot

const complaintsRouter = require('./src/routes/complaints');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'CivicRoute backend' }));
app.use('/api/complaints', complaintsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CivicRoute backend running on port ${PORT}`));
