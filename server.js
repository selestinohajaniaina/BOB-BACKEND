require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères');
}

const app = require('./app');
const sequelize = require('./config/database');
require('./models/User');

const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(port, () => console.log(`API BOB disponible sur http://localhost:${port}`));
  } catch (error) {
    console.error('Impossible de démarrer l’API :', error.message);
    process.exit(1);
  }
}

start();
