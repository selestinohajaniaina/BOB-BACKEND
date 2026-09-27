module.exports = {
  async up(queryInterface, _Sequelize, options = {}) {
    const table = await queryInterface.describeTable('projects');
    if (table.contextFileName) await queryInterface.removeColumn('projects', 'contextFileName', options);
    if (table.contextSource) await queryInterface.removeColumn('projects', 'contextSource', options);
  },
  async down() {
    // Colonnes abandonnées intentionnellement : aucune restauration nécessaire.
  }
};
