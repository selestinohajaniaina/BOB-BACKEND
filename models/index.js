const User = require('./User');
const Project = require('./Project');

User.hasMany(Project, { foreignKey: 'userId', as: 'projects', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

module.exports = { User, Project };
