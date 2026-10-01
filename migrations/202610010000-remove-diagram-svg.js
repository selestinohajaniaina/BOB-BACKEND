module.exports = {
  async up(queryInterface, _Sequelize, options = {}) {
    const description = await queryInterface.describeTable('diagrams', options);
    if (description.svg) await queryInterface.removeColumn('diagrams', 'svg', options);
  },
  async down(queryInterface, Sequelize, options = {}) {
    const description = await queryInterface.describeTable('diagrams', options);
    if (!description.svg) await queryInterface.addColumn('diagrams', 'svg', { type: Sequelize.TEXT, allowNull: true }, options);
  }
};
