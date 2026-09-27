module.exports = {
  async up(queryInterface, Sequelize, options = {}) {
    const table = await queryInterface.describeTable('projects');
    if (!table.context) await queryInterface.addColumn('projects', 'context', { type: Sequelize.TEXT, allowNull: true }, options);
  },
  async down(queryInterface, _Sequelize, options = {}) {
    const table = await queryInterface.describeTable('projects');
    if (table.context) await queryInterface.removeColumn('projects', 'context', options);
  }
};
