const User = require('./User');
const Project = require('./Project');
const Diagram = require('./Diagram');

User.hasMany(Project, { foreignKey: 'userId', as: 'projects', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
Project.hasMany(Diagram, { foreignKey: 'projectId', as: 'diagrams', onDelete: 'CASCADE' });
Diagram.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

module.exports = { User, Project, Diagram };
