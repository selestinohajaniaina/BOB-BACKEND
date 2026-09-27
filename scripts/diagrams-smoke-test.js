require('dotenv').config();

const assert = require('node:assert/strict');
const app = require('../app');
const sequelize = require('../config/database');
const runMigrations = require('../config/migrate');
const aiService = require('../services/ai.service');

async function run() {
  await sequelize.authenticate();
  await runMigrations();
  const calls = [];
  aiService.generateText = async (request) => {
    calls.push(request);
    if (request.userPrompt.includes('REPONSE_INVALIDE')) return 'Je ne peux pas produire ce diagramme.';
    return '```plantuml\n@startuml\nleft to right direction\nactor Utilisateur\nrectangle BOB {\n  usecase "Gérer ses projets" as UC1\n}\nUtilisateur --> UC1\n@enduml\n```';
  };

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const apiUrl = `http://127.0.0.1:${server.address().port}/api`;
  const stamp = Date.now();

  async function request(path, options = {}) {
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    return { status: response.status, body: await response.json() };
  }
  async function account(label) {
    const email = `diagram-${label}-${stamp}@bob.local`; const password = 'password123';
    await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: `Diagram ${label}`, email, password }) });
    const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    return { Authorization: `Bearer ${login.body.token}` };
  }

  try {
    const authA = await account('a'); const authB = await account('b');
    const created = await request('/projects', { method: 'POST', headers: authA, body: JSON.stringify({ name: 'Bibliothèque', description: 'Gestion des prêts', context: 'Acteurs : membre et bibliothécaire.' }) });
    assert.equal(created.status, 201); const projectId = created.body.project.id;

    assert.equal((await request(`/projects/${projectId}/diagrams`)).status, 401, 'route protégée');
    assert.equal((await request('/projects/999999999/diagrams', { headers: authA })).status, 404, 'projet inexistant');
    assert.equal((await request(`/projects/${projectId}/diagrams`, { headers: authB })).status, 404, 'isolation de la liste');
    assert.equal((await request(`/projects/${projectId}/diagrams`, { method: 'POST', headers: authA, body: JSON.stringify({ type: 'class', prompt: 'Classes' }) })).status, 400, 'type refusé');
    assert.equal((await request(`/projects/${projectId}/diagrams`, { method: 'POST', headers: authA, body: JSON.stringify({ type: 'use_case', prompt: '   ' }) })).status, 400, 'demande vide refusée');

    const generated = await request(`/projects/${projectId}/diagrams`, { method: 'POST', headers: authA, body: JSON.stringify({ type: 'use_case', prompt: 'Montrer les interactions principales' }) });
    assert.equal(generated.status, 201); assert.equal(generated.body.diagram.type, 'use_case');
    assert.match(generated.body.diagram.plantUml, /^@startuml/); assert.match(generated.body.diagram.plantUml, /@enduml$/);
    assert.ok(!generated.body.diagram.plantUml.includes('```'), 'le Markdown est retiré');
    assert.match(calls[0].systemPrompt, /cas d'utilisation/i); assert.match(calls[0].userPrompt, /Bibliothèque/); assert.match(calls[0].userPrompt, /Gestion des prêts/); assert.match(calls[0].userPrompt, /membre et bibliothécaire/); assert.match(calls[0].userPrompt, /interactions principales/);

    const diagramId = generated.body.diagram.id;
    assert.equal((await request(`/projects/${projectId}/diagrams`, { headers: authA })).body.diagrams.length, 1, 'diagramme persisté');
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { headers: authA })).status, 200, 'lecture autorisée');
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { headers: authB })).status, 404, 'isolation de la lecture');
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { method: 'DELETE', headers: authB })).status, 404, 'isolation de la suppression');

    const invalid = await request(`/projects/${projectId}/diagrams`, { method: 'POST', headers: authA, body: JSON.stringify({ type: 'use_case', prompt: 'REPONSE_INVALIDE' }) });
    assert.equal(invalid.status, 502); assert.match(invalid.body.message, /PlantUML valide/);
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { method: 'DELETE', headers: authA })).status, 200, 'suppression autorisée');
    assert.equal((await request(`/projects/${projectId}/diagrams`, { headers: authA })).body.diagrams.length, 0, 'suppression persistée');
    console.log('18/18 scénarios diagrammes réussis');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
