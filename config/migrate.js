const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const migrations = [
  ['202609260000-create-users', require('../migrations/202609260000-create-users')],
  ['202609260001-create-projects', require('../migrations/202609260001-create-projects')]
];

async function runMigrations() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.createTable('SequelizeMeta', { name: { type: DataTypes.STRING, allowNull: false, primaryKey: true } }).catch((error) => {
    if (error.original?.code !== '42P07') throw error;
  });
  const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta"');
  const applied = new Set(rows.map((row) => row.name));
  for (const [name, migration] of migrations) {
    if (applied.has(name)) continue;
    await sequelize.transaction(async (transaction) => {
      await migration.up(queryInterface, DataTypes, { transaction });
      await queryInterface.bulkInsert('SequelizeMeta', [{ name }], { transaction });
    });
    console.log(`Migration appliquée : ${name}`);
  }
}

module.exports = runMigrations;
