module.exports = {
  async up(queryInterface, Sequelize) {
    const description = await queryInterface.describeTable('diagrams');
    if (!description.svg) await queryInterface.addColumn('diagrams', 'svg', { type: Sequelize.TEXT, allowNull: true });
  },
  async down(queryInterface) { await queryInterface.removeColumn('diagrams', 'svg'); }
};
