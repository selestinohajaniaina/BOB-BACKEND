require('dotenv').config();
const api = `http://127.0.0.1:${process.env.PORT || 3000}`;
const stamp = Date.now();
const results = [];

async function request(path, method = 'GET', body, token) {
  const response = await fetch(`${api}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}
function check(name, result, status, predicate = () => true) {
  const passed = result.status === status && predicate(result.body); results.push({ name, expected: status, actual: result.status, passed });
  if (!passed) throw new Error(`${name}: ${JSON.stringify(result)}`);
}
async function user(label) {
  const data = { name: `User ${label}`, email: `projects-${label}-${stamp}@bob.local`, password: 'password123' };
  check(`${label}: inscription`, await request('/api/auth/register', 'POST', data), 201);
  const login = await request('/api/auth/login', 'POST', { email: data.email, password: data.password }); check(`${label}: connexion`, login, 200); return login.body.token;
}

async function run() {
  check('sans authentification', await request('/api/projects'), 401);
  const tokenA = await user('a'); const tokenB = await user('b');
  check('nom absent', await request('/api/projects', 'POST', { description: 'test' }, tokenA), 400);
  check('nom trop long', await request('/api/projects', 'POST', { name: 'x'.repeat(121) }, tokenA), 400);
  const createdA = await request('/api/projects', 'POST', { name: 'Projet A', description: 'Description A' }, tokenA); check('création A', createdA, 201); const idA = createdA.body.project.id;
  const createdB = await request('/api/projects', 'POST', { name: 'Projet B', description: 'Description B' }, tokenB); check('création B', createdB, 201); const idB = createdB.body.project.id;
  check('liste isolée A', await request('/api/projects', 'GET', null, tokenA), 200, (body) => body.projects.some((p) => p.id === idA) && !body.projects.some((p) => p.id === idB));
  check('détail A', await request(`/api/projects/${idA}`, 'GET', null, tokenA), 200);
  check('id invalide', await request('/api/projects/abc', 'GET', null, tokenA), 400);
  check('projet inexistant', await request('/api/projects/999999', 'GET', null, tokenA), 404);
  check('isolation GET', await request(`/api/projects/${idB}`, 'GET', null, tokenA), 404);
  check('isolation PATCH', await request(`/api/projects/${idB}`, 'PATCH', { name: 'Intrusion' }, tokenA), 404);
  check('isolation DELETE', await request(`/api/projects/${idB}`, 'DELETE', null, tokenA), 404);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const updated = await request(`/api/projects/${idA}`, 'PATCH', { name: 'Projet A modifié', description: 'Nouvelle description' }, tokenA); check('modification', updated, 200, (body) => body.project.name === 'Projet A modifié' && body.project.updatedAt !== body.project.createdAt);
  check('suppression', await request(`/api/projects/${idA}`, 'DELETE', null, tokenA), 200);
  check('suppression vérifiée', await request(`/api/projects/${idA}`, 'GET', null, tokenA), 404);
  await request(`/api/projects/${idB}`, 'DELETE', null, tokenB);
  console.table(results); console.log(`${results.length}/${results.length} scénarios projets réussis`);
}
run().catch((error) => { console.error(error); process.exit(1); });
