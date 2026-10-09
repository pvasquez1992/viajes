import { createRemoteJWKSet, jwtVerify } from 'jose';

const keySets = new Map();
const allowed = /^(activities(?:\/[1-9]\d{0,19})?|daily-stats|sports|stats)$/;

function remoteKeys(issuer) {
  if (!keySets.has(issuer)) keySets.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
  return keySets.get(issuer);
}

export function createAccessVerifier({ getKeySet = remoteKeys } = {}) {
  return async function verifyAccess(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)) return false;
  const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || cookie;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getKeySet(issuer), {
      issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'],
      requiredClaims: ['exp', 'sub'],
    });
    return payload.type === 'app';
  } catch {
    return false;
  }
  };
}

export const verifyAccess = createAccessVerifier();

export function createHandler({ authorize = verifyAccess, fetchUpstream } = {}) {
  return async ({ request, env, params }) => {
    if (request.method !== 'GET') return error(405, 'method_not_allowed', 'Solo se permiten consultas GET.', { Allow: 'GET' });
    if (!env.GARMIN_API_KEY || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
      return error(503, 'not_configured', 'La conexión de actividades todavía no está disponible.');
    }
    if (!await authorize(request, env)) return error(401, 'unauthorized', 'Inicia sesión para consultar tus actividades.');
    const route = Array.isArray(params.path) ? params.path.join('/') : params.path || '';
    if (!allowed.test(route)) return error(404, 'not_found', 'Consulta no encontrada.');
    const incoming = new URL(request.url);
    const destination = new URL(`/api/${route}`, 'https://my-garmin-api.pvasquez1992.workers.dev');
    destination.search = incoming.search;
    const call = fetchUpstream || env.GARMIN_API?.fetch.bind(env.GARMIN_API);
    if (!call) return error(503, 'not_configured', 'La conexión de actividades todavía no está disponible.');
    try {
      const response = await call(destination, {
        method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(12000),
        headers: { Accept: 'application/json', Authorization: `Bearer ${env.GARMIN_API_KEY}` },
      });
      if (!response.headers.get('Content-Type')?.includes('application/json') || (response.status >= 300 && response.status < 400) || response.status >= 500 || response.status === 401 || response.status === 403) {
        return error(502, 'upstream_error', 'No pudimos consultar las actividades. Inténtalo de nuevo.');
      }
      return new Response(response.body, { status: response.status, headers: {
        'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      } });
    } catch {
      return error(502, 'upstream_error', 'No pudimos consultar las actividades. Inténtalo de nuevo.');
    }
  };
}

function error(status, code, message, extra = {}) {
  return Response.json({ error: { code, message } }, { status, headers: {
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...extra,
  } });
}

export const onRequest = createHandler();
