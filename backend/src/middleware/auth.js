// Shared-password gate for hosted deployments. With APP_PASSWORD unset
// (local dev) the gate is disabled and every request passes through.
//
// Sessions are stateless: a cookie holds `<expiryMillis>.<HMAC(expiry)>`
// signed with a key derived from APP_PASSWORD — nothing to store server-side,
// and changing the password invalidates every outstanding session.
const crypto = require('crypto');
const { APP_PASSWORD } = require('../config');

const COOKIE_NAME = 'cmreview_auth';
const SESSION_DAYS = 30;

const isEnabled = () => Boolean(APP_PASSWORD);
const hmacKey = () => crypto.createHash('sha256').update(`cmreview-auth:${APP_PASSWORD}`).digest();
const sign = (exp) => crypto.createHmac('sha256', hmacKey()).update(String(exp)).digest('base64url');

function makeToken(now = Date.now()) {
  const exp = now + SESSION_DAYS * 24 * 3600 * 1000;
  return `${exp}.${sign(exp)}`;
}

function isValidToken(token, now = Date.now()) {
  const [expStr, sig] = String(token || '').split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= now || !sig) return false;
  const expected = Buffer.from(sign(exp));
  const provided = Buffer.from(sig);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function cookieToken(req) {
  for (const part of String(req.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i !== -1 && part.slice(0, i).trim() === COOKIE_NAME) return part.slice(i + 1).trim();
  }
  return null;
}

function requireAuth(req, res, next) {
  if (!isEnabled() || isValidToken(cookieToken(req))) return next();
  res.status(401).json({ error: 'Password required' });
}

function authStatus(req, res) {
  res.json({
    authRequired: isEnabled(),
    authenticated: !isEnabled() || isValidToken(cookieToken(req)),
  });
}

function login(req, res) {
  if (!isEnabled()) return res.json({ success: true });
  const provided = Buffer.from(String(req.body?.password || ''));
  const expected = Buffer.from(APP_PASSWORD);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.cookie(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
    path: '/',
  });
  res.json({ success: true });
}

module.exports = { requireAuth, authStatus, login, makeToken, isValidToken, isEnabled, COOKIE_NAME };
