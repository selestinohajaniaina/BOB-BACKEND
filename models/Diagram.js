const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Diagram = sequelize.define('Diagram', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(160), allowNull: false, validate: { notEmpty: true } },
  type: { type: DataTypes.STRING(30), allowNull: false, validate: { isIn: [['use_case']] } },
  prompt: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  plantUml: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } }
}, { tableName: 'diagrams', timestamps: true });

module.exports = Diagram;
