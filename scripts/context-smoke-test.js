const API_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
const stamp = Date.now();

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  return { status: response.status, body: await response.json() };
}

async function run() {
  const results = [];
  const expect = (name, actual, expected) => results.push({ name, expected, actual, passed: actual === expected });
  async function account(label) {
    const email = `context-${label}-${stamp}@bob.local`; const password = 'password123';
    await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: `Context ${label}`, email, password }) });
    return (await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })).body.token;
  }
  const tokenA = await account('a'); const tokenB = await account('b');
  const authA = { Authorization: `Bearer ${tokenA}` }; const authB = { Authorization: `Bearer ${tokenB}` };
  const context = '# Gestion de bibliothèque\n\n- Livres\n- Membres\n- Emprunts\n';
  expect('création sans token', (await request('/projects', { method: 'POST', body: JSON.stringify({ name: 'Refusé', context }) })).status, 401);
  const created = await request('/projects', { method: 'POST', headers: authA, body: JSON.stringify({ name: 'Projet contexte', description: 'Test', context }) });
  expect('création avec contexte', created.status, 201); const id = created.body.project.id;
  expect('contenu exact conservé', created.body.project.context, context);
  expect('récupération contexte', (await request(`/projects/${id}`, { headers: authA })).body.project.context, context);
  expect('isolation lecture', (await request(`/projects/${id}`, { headers: authB })).status, 404);
  const modified = 'Contexte modifié depuis le formulaire.';
  const updated = await request(`/projects/${id}`, { method: 'PATCH', headers: authA, body: JSON.stringify({ context: modified }) });
  expect('modification contexte', updated.status, 200);
  expect('nouveau contexte retourné', updated.body.project.context, modified);
  expect('isolation modification', (await request(`/projects/${id}`, { method: 'PATCH', headers: authB, body: JSON.stringify({ context: 'Intrusion' }) })).status, 404);
  const legacy = await request('/projects', { method: 'POST', headers: authA, body: JSON.stringify({ name: 'Projet sans contexte' }) });
  expect('projet sans contexte', legacy.status, 201);
  expect('contexte absent nullable', legacy.body.project.context, null);
  const list = await request('/projects', { headers: authA });
  expect('indicateur contexte vrai', list.body.projects.find((project) => project.id === id).hasContext, true);
  expect('indicateur contexte faux', list.body.projects.find((project) => project.id === legacy.body.project.id).hasContext, false);

  console.table(results); const failed = results.filter((item) => !item.passed);
  console.log(`${results.length - failed.length}/${results.length} scénarios contexte réussis`);
  if (failed.length) process.exitCode = 1;
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
