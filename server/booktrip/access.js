import { createRemoteJWKSet, jwtVerify } from 'jose';
const keySets = new Map();
export function createIdentityVerifier({ getKeySet = issuer => {
  if (!keySets.has(issuer)) keySets.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
  return keySets.get(issuer);
} } = {}) {
  return async (request, env) => {
    if (!env.ACCESS_AUD || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN || '')) return null;
    const token = request.headers.get('Cf-Access-Jwt-Assertion') || request.headers.get('Cookie')?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
    if (!token) return null;
    try {
      const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
      const { payload } = await jwtVerify(token, getKeySet(issuer), { issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp','sub'] });
      if (payload.type !== 'app') return null;
      return { id: payload.sub, name: typeof payload.email === 'string' ? payload.email.split('@')[0].slice(0,60) : 'Viajero' };
    } catch { return null; }
  };
}
export const verifyIdentity = createIdentityVerifier();
