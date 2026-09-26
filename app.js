const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

app.disable('x-powered-by');
app.use(cors({ origin: frontendUrl, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Route introuvable' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ message: 'Une erreur interne est survenue' });
});

module.exports = app;
