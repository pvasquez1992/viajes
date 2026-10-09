import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { filterActivities, summarize, monthlyDistances, loadActivities, pace } from '../js/exercise-data.js';
import { createHandler, createAccessVerifier } from '../functions/api/ejercicio/[[path]].js';

const activity = (id, localDate, overrides = {}) => ({ id, localDate, startedAt: `${localDate}T10:00:00Z`, name: 'Mañana en el parque', sport: 'running', distanceMeters: 5000, durationSeconds: 1800, ...overrides });
const data = [activity('1', '2026-01-31'), activity('2', '2026-03-01', { sport: 'cycling', distanceMeters: 12000, elevationGainMeters: 200 })];
test('inclusive dates, accent-insensitive search and sport filters agree with totals', () => {
  assert.equal(filterActivities(data, { search: 'manana', from: '2026-01-31', to: '2026-01-31' }).length, 1);
  assert.equal(filterActivities(data, { sport: 'cycling' })[0].id, '2');
  assert.deepEqual(summarize(data), { count: 2, distance: 17000, seconds: 3600, elevation: 200 });
  assert.equal(summarize([data[0]]).elevation, null);
  assert.deepEqual(monthlyDistances(data), [{ month: '2026-01', distance: 5 }, { month: '2026-02', distance: 0 }, { month: '2026-03', distance: 12 }]);
  assert.equal(pace({ sport: 'running', averageSpeedMps: 1000 / 359.8 }), '6:00 /km');
});
test('pagination loads every page, deduplicates and rejects a stuck cursor', async () => {
  const calls = [];
  const result = await loadActivities(async url => {
    calls.push(url); const last = url.endsWith('offset=100');
    return Response.json({ data: last ? data : [data[0]], pagination: { total: 2, nextOffset: last ? null : 100 } });
  });
  assert.deepEqual(result.map(a => a.id), ['2', '1']);
  assert.equal(calls.length, 2);
  await assert.rejects(loadActivities(async () => Response.json({ data, pagination: { total: 2, nextOffset: 0 } })), /completar/);
  await assert.rejects(loadActivities(async () => new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } })), error => error.status === 401);
});

const env = { GARMIN_API_KEY: 'server-only-test-key', ACCESS_TEAM_DOMAIN: 'test.cloudflareaccess.com', ACCESS_AUD: 'expected-audience' };
const context = (path = 'activities', headers = {}) => ({ request: new Request('https://booktrip.test/api/ejercicio/activities?limit=100', { headers }), env, params: { path } });
test('proxy denies guests, missing configuration and unrecognized destinations without contacting Garmin', async () => {
  let calls = 0;
  const handler = createHandler({ fetchUpstream: async () => { calls++; return Response.json({}); } });
  assert.equal((await handler(context())).status, 401);
  assert.equal((await handler({ ...context(), env: {} })).status, 503);
  const trusted = createHandler({ authorize: async () => true, fetchUpstream: async () => { calls++; return Response.json({}); } });
  assert.equal((await trusted(context('../https://evil.test'))).status, 404);
  assert.equal(calls, 0);
});
test('proxy keeps bearer on the server and sanitizes upstream errors', async () => {
  const handler = createHandler({ authorize: async () => true, fetchUpstream: async (url, options) => {
    assert.equal(url.href, 'https://my-garmin-api.pvasquez1992.workers.dev/api/activities?limit=100');
    assert.equal(options.headers.Authorization, 'Bearer server-only-test-key');
    assert.equal(options.redirect, 'error');
    return Response.json({ data });
  } });
  const response = await handler(context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.ok(!(await response.text()).includes(env.GARMIN_API_KEY));
  const broken = createHandler({ authorize: async () => true, fetchUpstream: async () => new Response('secret diagnostic', { status: 401 }) });
  assert.equal((await broken(context())).status, 502);
});
test('Access requires a signed unexpired application JWT for the correct issuer and audience', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const verify = createAccessVerifier({ getKeySet: () => createLocalJWKSet({ keys: [{ ...jwk, kid: 'test' }] }) });
  const sign = overrides => new SignJWT({ type: 'app', ...overrides }).setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer('https://test.cloudflareaccess.com').setAudience(env.ACCESS_AUD).setSubject('owner').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const valid = await sign({});
  assert.equal(await verify(context('activities', { 'Cf-Access-Jwt-Assertion': valid }).request, env), true);
  assert.equal(await verify(context('activities', { Cookie: `CF_Authorization=${valid}` }).request, env), true);
  assert.equal(await verify(context('activities', { 'Cf-Access-Jwt-Assertion': valid }).request, { ...env, ACCESS_AUD: 'other' }), false);
  assert.equal(await verify(context('activities', { 'Cf-Access-Jwt-Assertion': await sign({ type: 'org' }) }).request, env), false);
  const expired = await new SignJWT({ type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer('https://test.cloudflareaccess.com').setAudience(env.ACCESS_AUD).setSubject('owner').setExpirationTime(1).sign(privateKey);
  assert.equal(await verify(context('activities', { 'Cf-Access-Jwt-Assertion': expired }).request, env), false);
  assert.equal(await verify(context('activities', { 'Cf-Access-Jwt-Assertion': `${valid.slice(0, -10)}AAAAAAAAAA` }).request, env), false);
});
