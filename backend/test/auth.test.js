// APP_PASSWORD must be set before the module (and config) are required.
process.env.APP_PASSWORD = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../src/middleware/auth');

const DAY = 24 * 3600 * 1000;

function fakeRes() {
  const res = {
    statusCode: 200,
    body: null,
    cookies: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    cookie(name, value, opts) { this.cookies[name] = { value, opts }; return this; },
  };
  return res;
}

const reqWithCookie = (token) => ({
  get: (h) => (h.toLowerCase() === 'cookie' && token != null ? `${auth.COOKIE_NAME}=${token}` : undefined),
  secure: false,
});

test('token roundtrip validates', () => {
  const token = auth.makeToken();
  assert.equal(auth.isValidToken(token), true);
});

test('expired token is rejected', () => {
  const token = auth.makeToken(Date.now() - 60 * DAY);
  assert.equal(auth.isValidToken(token), false);
});

test('tampered and garbage tokens are rejected', () => {
  const token = auth.makeToken();
  const [exp, sig] = token.split('.');
  assert.equal(auth.isValidToken(`${Number(exp) + 1}.${sig}`), false);
  assert.equal(auth.isValidToken('garbage'), false);
  assert.equal(auth.isValidToken(''), false);
  assert.equal(auth.isValidToken(null), false);
});

test('requireAuth blocks without a valid cookie and passes with one', () => {
  let passed = false;
  const res = fakeRes();
  auth.requireAuth(reqWithCookie(null), res, () => { passed = true; });
  assert.equal(passed, false);
  assert.equal(res.statusCode, 401);

  const res2 = fakeRes();
  auth.requireAuth(reqWithCookie(auth.makeToken()), res2, () => { passed = true; });
  assert.equal(passed, true);
});

test('login rejects a wrong password and sets a cookie for the right one', () => {
  const bad = fakeRes();
  auth.login({ ...reqWithCookie(null), body: { password: 'nope' } }, bad);
  assert.equal(bad.statusCode, 401);

  const good = fakeRes();
  auth.login({ ...reqWithCookie(null), body: { password: 'test-secret' } }, good);
  assert.equal(good.statusCode, 200);
  assert.equal(auth.isValidToken(good.cookies[auth.COOKIE_NAME].value), true);
  assert.equal(good.cookies[auth.COOKIE_NAME].opts.httpOnly, true);
});

test('authStatus reports required + authenticated states', () => {
  const anon = fakeRes();
  auth.authStatus(reqWithCookie(null), anon);
  assert.deepEqual(anon.body, { authRequired: true, authenticated: false });

  const authed = fakeRes();
  auth.authStatus(reqWithCookie(auth.makeToken()), authed);
  assert.deepEqual(authed.body, { authRequired: true, authenticated: true });
});
