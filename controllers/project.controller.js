const { Project } = require('../models');
const { literal } = require('sequelize');

const MAX_NAME = 120;
const MAX_DESCRIPTION = 2000;
const MAX_CONTEXT = 512 * 1024;
const projectFields = ['id', 'name', 'description', 'context', 'createdAt', 'updatedAt'];
const listFields = ['id', 'name', 'description', 'createdAt', 'updatedAt'];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validate(data, partial = false) {
  const errors = [];
  if (!partial || Object.hasOwn(data, 'name')) {
    if (typeof data.name !== 'string' || !data.name.trim()) errors.push('Le nom du projet est obligatoire');
    else if (data.name.trim().length > MAX_NAME) errors.push(`Le nom ne peut pas dépasser ${MAX_NAME} caractères`);
  }
  if (Object.hasOwn(data, 'description') && data.description !== null && typeof data.description !== 'string') errors.push('La description doit être un texte');
  if (typeof data.description === 'string' && data.description.trim().length > MAX_DESCRIPTION) errors.push(`La description ne peut pas dépasser ${MAX_DESCRIPTION} caractères`);
  if (Object.hasOwn(data, 'context') && data.context !== null && typeof data.context !== 'string') errors.push('Le contexte doit être un texte');
  if (typeof data.context === 'string' && Buffer.byteLength(data.context, 'utf8') > MAX_CONTEXT) errors.push('Le contexte ne doit pas dépasser 512 Kio');
  if (partial && !['name', 'description', 'context'].some((field) => Object.hasOwn(data, field))) errors.push('Aucune donnée modifiable fournie');
  return errors;
}

function contextChanges(data) { return Object.hasOwn(data, 'context') ? { context: typeof data.context === 'string' && data.context.trim() ? data.context : null } : {}; }

async function list(req, res, next) {
  try {
    const rows = await Project.findAll({ where: { userId: req.auth.userId }, attributes: [...listFields, [literal('"context" IS NOT NULL'), 'hasContext']], order: [['updatedAt', 'DESC']] });
    const projects = rows.map((project) => project.toJSON());
    return res.json({ projects });
  } catch (error) { return next(error); }
}

async function getOne(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identifiant de projet invalide' });
    const project = await Project.findOne({ where: { id, userId: req.auth.userId }, attributes: projectFields });
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    return res.json({ project });
  } catch (error) { return next(error); }
}

async function create(req, res, next) {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const project = await Project.create({ userId: req.auth.userId, name: req.body.name.trim(), description: req.body.description?.trim() || null, ...contextChanges(req.body) });
    const publicProject = await Project.findByPk(project.id, { attributes: projectFields });
    return res.status(201).json({ message: 'Projet créé avec succès', project: publicProject });
  } catch (error) { return next(error); }
}

async function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identifiant de projet invalide' });
    const errors = validate(req.body, true);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const project = await Project.findOne({ where: { id, userId: req.auth.userId } });
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    const changes = {};
    if (Object.hasOwn(req.body, 'name')) changes.name = req.body.name.trim();
    if (Object.hasOwn(req.body, 'description')) changes.description = req.body.description?.trim() || null;
    Object.assign(changes, contextChanges(req.body));
    await project.update(changes);
    return res.json({ message: 'Projet modifié avec succès', project: Object.fromEntries(projectFields.map((field) => [field, project[field]])) });
  } catch (error) { return next(error); }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identifiant de projet invalide' });
    const deleted = await Project.destroy({ where: { id, userId: req.auth.userId } });
    if (!deleted) return res.status(404).json({ message: 'Projet introuvable' });
    return res.json({ message: 'Projet supprimé avec succès' });
  } catch (error) { return next(error); }
}

module.exports = { list, getOne, create, update, remove };
