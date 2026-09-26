const API_URL = process.env.API_URL || 'http://127.0.0.1:3000/api';
const stamp = Date.now();
const password = 'password123';
const newPassword = 'new-password123';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function run() {
  const emailA = `settings-a-${stamp}@bob.local`;
  const emailB = `settings-b-${stamp}@bob.local`;
  const results = [];
  const expect = (name, actual, expected) => results.push({ name, expected, actual, passed: actual === expected });

  const registerA = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Settings A', email: emailA, password }) });
  expect('inscription A', registerA.status, 201);
  const loginA = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: emailA, password }) });
  expect('connexion A', loginA.status, 200);
  const tokenA = loginA.body.token;
  const authA = { Authorization: `Bearer ${tokenA}` };

  const registerB = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Settings B', email: emailB, password }) });
  expect('inscription B', registerB.status, 201);

  expect('profil sans token', (await request('/auth/me')).status, 401);
  const profile = await request('/auth/me', { headers: authA });
  expect('récupération profil', profile.status, 200);
  expect('hash non exposé', Object.hasOwn(profile.body.user || {}, 'password'), false);
  expect('profil invalide', (await request('/auth/me', { method: 'PATCH', headers: authA, body: JSON.stringify({ name: '', email: 'bad' }) })).status, 400);
  expect('email déjà utilisé', (await request('/auth/me', { method: 'PATCH', headers: authA, body: JSON.stringify({ name: 'Settings A', email: emailB }) })).status, 409);
  const updatedEmail = `settings-updated-${stamp}@bob.local`;
  const updated = await request('/auth/me', { method: 'PATCH', headers: authA, body: JSON.stringify({ name: 'Settings Updated', email: updatedEmail }) });
  expect('profil modifié', updated.status, 200);
  expect('id imposé ignoré', (await request('/auth/me', { method: 'PATCH', headers: authA, body: JSON.stringify({ id: registerB.body.user.id, name: 'Settings Updated', email: updatedEmail }) })).status, 200);

  expect('ancien mot de passe incorrect', (await request('/auth/me/password', { method: 'PATCH', headers: authA, body: JSON.stringify({ currentPassword: 'incorrect', newPassword, confirmPassword: newPassword }) })).status, 400);
  expect('nouveau mot de passe court', (await request('/auth/me/password', { method: 'PATCH', headers: authA, body: JSON.stringify({ currentPassword: password, newPassword: 'court', confirmPassword: 'court' }) })).status, 400);
  expect('confirmation différente', (await request('/auth/me/password', { method: 'PATCH', headers: authA, body: JSON.stringify({ currentPassword: password, newPassword, confirmPassword: 'different123' }) })).status, 400);
  expect('mot de passe modifié', (await request('/auth/me/password', { method: 'PATCH', headers: authA, body: JSON.stringify({ currentPassword: password, newPassword, confirmPassword: newPassword }) })).status, 200);
  expect('ancien login refusé', (await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: updatedEmail, password }) })).status, 401);
  expect('nouveau login accepté', (await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: updatedEmail, password: newPassword }) })).status, 200);

  console.table(results);
  const failed = results.filter((item) => !item.passed);
  console.log(`${results.length - failed.length}/${results.length} scénarios paramètres réussis`);
  if (failed.length) process.exitCode = 1;
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
