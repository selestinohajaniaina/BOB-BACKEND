module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('diagrams')) return;
    await queryInterface.createTable('diagrams', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      projectId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(160), allowNull: false },
      type: { type: Sequelize.STRING(30), allowNull: false },
      prompt: { type: Sequelize.TEXT, allowNull: false },
      plantUml: { type: Sequelize.TEXT, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('diagrams', ['projectId'], { name: 'diagrams_project_id_idx' });
  },
  async down(queryInterface) { await queryInterface.dropTable('diagrams'); }
};
