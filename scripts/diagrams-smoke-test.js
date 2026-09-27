require('dotenv').config();

const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../app');
const sequelize = require('../config/database');
const runMigrations = require('../config/migrate');
const aiService = require('../services/ai.service');
const { validateSvg } = require('../services/plantuml-renderer.service');
const { Diagram } = require('../models');

async function run() {
  assert.throws(() => validateSvg('<svg><script>alert(1)</script></svg>'), /contenu interdit/);
  await sequelize.authenticate();
  await runMigrations();
  const renderRequests = [];
  const renderServer = http.createServer((req, res) => {
    renderRequests.push(req.url);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
  });
  renderServer.listen(0, '127.0.0.1');
  await new Promise((resolve) => renderServer.once('listening', resolve));
  process.env.PLANTUML_SERVER_URL = `http://127.0.0.1:${renderServer.address().port}/plantuml`;
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
    const withoutPrompt = await request(`/projects/${projectId}/diagrams`, { method: 'POST', headers: authA, body: JSON.stringify({ type: 'use_case' }) });
    assert.equal(withoutPrompt.status, 201, 'description facultative');
    assert.match(withoutPrompt.body.diagram.svg, /^<svg/); assert.equal('plantUml' in withoutPrompt.body.diagram, false, 'PlantUML non exposé');

    const generated = await request(`/projects/${projectId}/diagrams`, { method: 'POST', headers: authA, body: JSON.stringify({ type: 'use_case', prompt: 'Montrer les interactions principales' }) });
    assert.equal(generated.status, 201); assert.equal(generated.body.diagram.type, 'use_case');
    assert.match(generated.body.diagram.svg, /^<svg/); assert.equal('plantUml' in generated.body.diagram, false, 'PlantUML non exposé');
    assert.ok(renderRequests.every((path) => /^\/plantuml\/svg\/[A-Za-z0-9_-]+$/.test(path)), 'PlantUML encodé côté backend');
    const stored = await Diagram.findByPk(generated.body.diagram.id);
    assert.match(stored.plantUml, /^@startuml/); assert.match(stored.plantUml, /@enduml$/); assert.ok(!stored.plantUml.includes('```'), 'le Markdown est retiré en base');
    assert.match(calls[1].systemPrompt, /cas d'utilisation/i); assert.match(calls[1].userPrompt, /Bibliothèque/); assert.match(calls[1].userPrompt, /Gestion des prêts/); assert.match(calls[1].userPrompt, /membre et bibliothécaire/); assert.match(calls[1].userPrompt, /interactions principales/);

    const diagramId = generated.body.diagram.id;
    assert.equal((await request(`/projects/${projectId}/diagrams`, { headers: authA })).body.diagrams.length, 2, 'diagrammes persistés');
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { headers: authA })).status, 200, 'lecture autorisée');
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { headers: authB })).status, 404, 'isolation de la lecture');
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { method: 'DELETE', headers: authB })).status, 404, 'isolation de la suppression');

    const invalid = await request(`/projects/${projectId}/diagrams`, { method: 'POST', headers: authA, body: JSON.stringify({ type: 'use_case', prompt: 'REPONSE_INVALIDE' }) });
    assert.equal(invalid.status, 502); assert.match(invalid.body.message, /PlantUML valide/);
    assert.equal((await request(`/projects/${projectId}/diagrams/${diagramId}`, { method: 'DELETE', headers: authA })).status, 200, 'suppression autorisée');
    assert.equal((await request(`/projects/${projectId}/diagrams`, { headers: authA })).body.diagrams.length, 1, 'suppression persistée');
    console.log('Scénarios diagrammes et rendu SVG réussis');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => renderServer.close(resolve));
    await sequelize.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
