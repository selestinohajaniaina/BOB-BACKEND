const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true, len: [1, 120] } },
  description: { type: DataTypes.TEXT, allowNull: true, validate: { len: [0, 2000] } }
}, { tableName: 'projects', timestamps: true });

module.exports = Project;
