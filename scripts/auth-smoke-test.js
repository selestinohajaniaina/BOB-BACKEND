require('dotenv').config();
const { Client } = require('pg');

const api = `http://127.0.0.1:${process.env.PORT || 3000}`;
const results = [];

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const body = await response.json();
  return { status: response.status, body };
}

function expect(name, result, status, predicate = () => true) {
  const passed = result.status === status && predicate(result.body);
  results.push({ name, expected: status, actual: result.status, passed });
  if (!passed) throw new Error(`${name} a échoué : ${JSON.stringify(result)}`);
}

async function run() {
  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  await db.connect();
  await db.query('TRUNCATE TABLE users RESTART IDENTITY');

  const credentials = { name: 'Selestino', email: 'selestino@example.com', password: 'password123' };
  const json = (data) => ({ method: 'POST', body: JSON.stringify(data) });

  const register = await request('/api/auth/register', json(credentials));
  expect('register: succès', register, 201, (body) => body.user?.email === credentials.email && !body.user.password);
  expect('register: email utilisé', await request('/api/auth/register', json(credentials)), 409);
  expect('register: champs manquants', await request('/api/auth/register', json({ email: credentials.email })), 400);
  expect('register: email invalide', await request('/api/auth/register', json({ ...credentials, email: 'invalide' })), 400);
  expect('register: mot de passe court', await request('/api/auth/register', json({ ...credentials, email: 'court@example.com', password: 'court' })), 400);

  const stored = await db.query('SELECT id, password FROM users WHERE email = $1', [credentials.email]);
  const hashIsSafe = /^\$2[aby]\$/.test(stored.rows[0].password) && stored.rows[0].password !== credentials.password;
  if (!hashIsSafe) throw new Error('Le mot de passe stocké n’est pas un hash bcrypt');

  const login = await request('/api/auth/login', json({ email: credentials.email, password: credentials.password }));
  expect('login: succès', login, 200, (body) => Boolean(body.token) && !body.user.password);
  expect('login: mauvais mot de passe', await request('/api/auth/login', json({ email: credentials.email, password: 'incorrect' })), 401);
  expect('login: email inexistant', await request('/api/auth/login', json({ email: 'absent@example.com', password: credentials.password })), 401);
  expect('login: champs manquants', await request('/api/auth/login', json({ email: credentials.email })), 400);

  const authorization = { Authorization: `Bearer ${login.body.token}` };
  expect('me: token valide', await request('/api/auth/me', { headers: authorization }), 200, (body) => body.user?.email === credentials.email && !body.user.password);
  expect('me: token absent', await request('/api/auth/me'), 401);
  expect('me: token invalide', await request('/api/auth/me', { headers: { Authorization: 'Bearer invalide' } }), 401);

  await db.query('DELETE FROM users WHERE id = $1', [stored.rows[0].id]);
  expect('me: utilisateur inexistant', await request('/api/auth/me', { headers: authorization }), 404);

  await db.end();
  console.table(results);
  console.log(`Hash bcrypt vérifié : ${hashIsSafe}`);
  console.log(`${results.length}/${results.length} scénarios réussis`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
