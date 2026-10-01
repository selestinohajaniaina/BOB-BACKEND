const { Diagram, Project } = require('../models');
const diagramService = require('../services/diagram.service');
const { InvalidDiagramResponseError } = diagramService;
const { AIServiceError } = require('../services/ai.service');

const publicFields = ['id', 'projectId', 'name', 'type', 'prompt', 'plantUml', 'createdAt', 'updatedAt'];
function parseId(value) { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; }
async function ownedProject(projectId, userId) { return Project.findOne({ where: { id: projectId, userId } }); }

async function list(req, res, next) {
  try {
    const projectId = parseId(req.params.projectId);
    if (!projectId) return res.status(400).json({ message: 'Identifiant de projet invalide' });
    if (!await ownedProject(projectId, req.auth.userId)) return res.status(404).json({ message: 'Projet introuvable' });
    const diagrams = await Diagram.findAll({ where: { projectId }, attributes: publicFields, order: [['updatedAt', 'DESC']] });
    return res.json({ diagrams });
  } catch (error) { return next(error); }
}

async function getOne(req, res, next) {
  try {
    const projectId = parseId(req.params.projectId); const diagramId = parseId(req.params.diagramId);
    if (!projectId || !diagramId) return res.status(400).json({ message: 'Identifiant invalide' });
    if (!await ownedProject(projectId, req.auth.userId)) return res.status(404).json({ message: 'Projet introuvable' });
    const diagram = await Diagram.findOne({ where: { id: diagramId, projectId } });
    if (!diagram) return res.status(404).json({ message: 'Diagramme introuvable' });
    return res.json({ diagram: Object.fromEntries(publicFields.map((field) => [field, diagram[field]])) });
  } catch (error) { return next(error); }
}

async function create(req, res, next) {
  try {
    const projectId = parseId(req.params.projectId);
    const type = req.body.type;
    const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!projectId) return res.status(400).json({ message: 'Identifiant de projet invalide' });
    if (type !== 'use_case') return res.status(400).json({ message: 'Type de diagramme non supporté' });
    if (prompt.length > 4000) return res.status(400).json({ message: 'La demande ne doit pas dépasser 4000 caractères' });
    const project = await ownedProject(projectId, req.auth.userId);
    if (!project) return res.status(404).json({ message: 'Projet introuvable' });
    const plantUml = await diagramService.generateUseCase(project, prompt);
    const diagram = await Diagram.create({ projectId, name: "Diagramme de cas d'utilisation", type, prompt, plantUml });
    return res.status(201).json({ message: 'Diagramme généré avec succès', diagram: Object.fromEntries(publicFields.map((field) => [field, diagram[field]])) });
  } catch (error) {
    if (error instanceof AIServiceError) return res.status(502).json({ message: 'La génération du diagramme a échoué. Veuillez réessayer.' });
    if (error instanceof InvalidDiagramResponseError) return res.status(502).json({ message: 'La réponse IA ne contient pas un diagramme PlantUML valide' });
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const projectId = parseId(req.params.projectId); const diagramId = parseId(req.params.diagramId);
    if (!projectId || !diagramId) return res.status(400).json({ message: 'Identifiant invalide' });
    if (!await ownedProject(projectId, req.auth.userId)) return res.status(404).json({ message: 'Projet introuvable' });
    const deleted = await Diagram.destroy({ where: { id: diagramId, projectId } });
    if (!deleted) return res.status(404).json({ message: 'Diagramme introuvable' });
    return res.json({ message: 'Diagramme supprimé avec succès' });
  } catch (error) { return next(error); }
}

module.exports = { list, getOne, create, remove };
