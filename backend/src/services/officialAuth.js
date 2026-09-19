const crypto = require('crypto');

const COOKIE_NAME = 'civicroute_official_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function base64url(value) { return Buffer.from(value).toString('base64url'); }
function unbase64url(value) { return Buffer.from(value, 'base64url').toString('utf8'); }
function safeEqual(left, right) {
  const a = Buffer.from(String(left || '')); const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function sessionSecret() { return process.env.OFFICIAL_SESSION_SECRET; }
function configuredOfficial() { return { username: process.env.OFFICIAL_USERNAME, password: process.env.OFFICIAL_PASSWORD }; }
function sign(payload) { return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url'); }

function credentialsAreValid(username, password) {
  const official = configuredOfficial();
  return Boolean(official.username && official.password && safeEqual(username, official.username) && safeEqual(password, official.password));
}
function createSession(username) {
  if (!sessionSecret()) throw new Error('Official sessions are not configured.');
  const payload = base64url(JSON.stringify({ username, exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}
function verifySession(token) {
  if (!token || !sessionSecret()) return null;
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(unbase64url(payload));
    return data.exp > Date.now() && data.username === configuredOfficial().username ? data : null;
  } catch { return null; }
}
function readCookie(req) {
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => part.trim().split(/=(.*)/s)).filter(([key]) => key));
  return cookies[COOKIE_NAME];
}
function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Max-Age=${SESSION_TTL_MS / 1000}; Path=/api/official; HttpOnly; SameSite=Lax${secure}`);
}
function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/api/official; HttpOnly; SameSite=Lax`); }
function requireOfficial(req, res, next) {
  const session = verifySession(readCookie(req));
  if (!session) return res.status(401).json({ error: 'Official authentication is required.' });
  req.official = session;
  return next();
}

module.exports = { credentialsAreValid, createSession, readCookie, setSessionCookie, clearSessionCookie, requireOfficial, configuredOfficial };
