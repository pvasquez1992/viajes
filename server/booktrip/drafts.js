import { TripError, validateTrip } from '../../js/trip-contract.js';
const encoder = new TextEncoder();
const b64 = bytes => {
  let raw='';for(let offset=0;offset<bytes.length;offset+=32768)raw+=String.fromCharCode(...bytes.subarray(offset,offset+32768));
  return btoa(raw).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};
const bytes = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
async function key(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new TripError('La protección de la conversación todavía no está configurada.',503,'not_configured');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']);
}
export async function sealDraft(trip, identity, secret, research = [], now = Date.now(), generation=0) {
  validateTrip(trip);
  const content=encoder.encode(JSON.stringify({ trip, owner:identity.id, expires:now+86400000, research,generation }));
  if(content.length>90000)throw new TripError('El viaje y sus fuentes son demasiado extensos. Reduce las descripciones.',413,'too_large');
  const payload = b64(content);
  return `${payload}.${b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload))))}`;
}
export async function openDraft(token, identity, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 130000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new TripError('Contexto de conversación inválido.');
  const [payload, signature] = token.split('.');
  try {
    if (!await crypto.subtle.verify('HMAC',await key(secret),bytes(signature),encoder.encode(payload))) throw Error('signature');
    const data = JSON.parse(new TextDecoder().decode(bytes(payload)));
    if (data.owner !== identity.id || !Number.isFinite(data.expires) || data.expires <= now) throw Error('expired');
    validateTrip(data.trip);
    if(data.generation!==undefined && (!Number.isInteger(data.generation) || data.generation<0)) throw Error('generation');
    return data;
  } catch (error) {
    if (error.code === 'not_configured') throw error;
    throw new TripError('El contexto de conversación venció o pertenece a otra sesión. Empieza otra conversación; tu viaje guardado se conserva.',409,'draft_expired');
  }
}
