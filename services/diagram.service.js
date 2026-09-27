const aiService = require('./ai.service');

class InvalidDiagramResponseError extends Error {
  constructor(message) { super(message); this.name = 'InvalidDiagramResponseError'; }
}

const USE_CASE_SYSTEM_PROMPT = `Tu es un architecte logiciel expert en UML et PlantUML.
Produis uniquement un diagramme UML de cas d'utilisation valide en syntaxe PlantUML.
Le résultat doit commencer par @startuml et finir par @enduml.
Utilise des acteurs, des cas d'utilisation et une frontière de système lorsque pertinent.
N'ajoute aucune explication, aucun commentaire conversationnel et aucune clôture Markdown.`;

function buildUseCaseRequest(project, prompt) {
  const sections = [
    `Nom du projet :\n${project.name}`,
    `Description :\n${project.description || 'Non renseignée'}`,
    `Contexte détaillé :\n${project.context || 'Non renseigné'}`
  ];
  if (prompt) sections.push(`Demande spécifique :\n${prompt}`);
  return sections.join('\n\n');
}

function extractAndValidatePlantUml(response) {
  if (typeof response !== 'string') throw new InvalidDiagramResponseError('Réponse IA invalide');
  const match = response.match(/@startuml\b[\s\S]*?@enduml/i);
  if (!match) throw new InvalidDiagramResponseError('La réponse IA ne contient pas de bloc PlantUML complet');
  const plantUml = match[0].trim();
  if (!/\b(actor|usecase)\b|\([^\n()]+\)/i.test(plantUml)) throw new InvalidDiagramResponseError('La réponse IA ne décrit pas un diagramme de cas d’utilisation');
  if (/<script\b|javascript:/i.test(plantUml)) throw new InvalidDiagramResponseError('Le code PlantUML contient un contenu interdit');
  return plantUml;
}

async function generateUseCase(project, prompt) {
  const response = await aiService.generateText({ systemPrompt: USE_CASE_SYSTEM_PROMPT, userPrompt: buildUseCaseRequest(project, prompt) });
  return extractAndValidatePlantUml(response);
}

module.exports = { generateUseCase, extractAndValidatePlantUml, buildUseCaseRequest, USE_CASE_SYSTEM_PROMPT, InvalidDiagramResponseError };
