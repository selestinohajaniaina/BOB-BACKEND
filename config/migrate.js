const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const migrations = [
  ['202609260000-create-users', require('../migrations/202609260000-create-users')],
  ['202609260001-create-projects', require('../migrations/202609260001-create-projects')],
  ['202609270000-add-project-context', require('../migrations/202609270000-add-project-context')],
  ['202609270001-remove-project-context-metadata', require('../migrations/202609270001-remove-project-context-metadata')],
  ['202609270002-create-diagrams', require('../migrations/202609270002-create-diagrams')]
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
