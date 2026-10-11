import { TripError } from '../../js/trip-contract.js';
import { isBootstrapAdmin } from './access.js';

export const roles = ['admin','creator','viewer'];
export const normalizedEmail = value => typeof value==='string'?value.trim().toLowerCase():'';
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length<=254;
export async function authorizeIdentity(identity,env) {
  const email=normalizedEmail(identity.email);
  const bootstrapAdmin=isBootstrapAdmin(identity,env);
  let role=bootstrapAdmin?'admin':'viewer';
  if(env.BOOKTRIP_DB?.prepare) {
    const member=await env.BOOKTRIP_DB.prepare('SELECT role FROM booktrip_users WHERE email = ?').bind(email).first();
    if(role!=='admin' && member) role=member.role;
    if(member) await env.BOOKTRIP_DB.prepare('UPDATE booktrip_users SET user_id = ? WHERE email = ? AND (user_id IS NULL OR user_id != ?)').bind(identity.id,email,identity.id).run();
  }
  const canCreateTrip=role==='admin' || role==='creator';
  const grants=!canCreateTrip && env.BOOKTRIP_DB?.prepare?await env.BOOKTRIP_DB.prepare('SELECT 1 AS allowed FROM booktrip_trip_access a JOIN booktrip_trips t ON t.id = a.trip_id WHERE a.email = ? AND NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = t.id) LIMIT 1').bind(email).first():null;
  return {...identity,email,role,bootstrapAdmin,canCreate:canCreateTrip,canChat:canCreateTrip || Boolean(grants)};
}
// These predicates are executed again in the write transaction. A revoked grant
// cannot be recovered with an old conversation, confirmation or save receipt.
export const roleExpression = "(CASE WHEN ? = 1 THEN 'admin' ELSE COALESCE((SELECT role FROM booktrip_users WHERE email = ?), ?) END)";
export const roleArgs = identity => [identity.bootstrapAdmin?1:0,normalizedEmail(identity.email),identity.role || 'creator'];
export const editPredicate = `(${roleExpression} = 'admin' OR (${roleExpression} = 'creator' AND owner_id = ?) OR EXISTS (SELECT 1 FROM booktrip_trip_access a WHERE a.trip_id = booktrip_trips.id AND a.email = ?))`;
export const editArgs = identity => [...roleArgs(identity),...roleArgs(identity),identity.id,normalizedEmail(identity.email)];
export const removePredicate = `(${roleExpression} = 'admin' OR (${roleExpression} = 'creator' AND owner_id = ?))`;
export const removeArgs = identity => [...roleArgs(identity),...roleArgs(identity),identity.id];

export async function permissionPanel(env,identity) {
  const db=env.BOOKTRIP_DB;
  if(!db?.prepare) throw new TripError('Falta conectar el almacenamiento.',503,'storage_not_configured');
  const members=await db.prepare('SELECT email, role FROM booktrip_users ORDER BY email').all();
  const trips=await db.prepare('SELECT t.id, t.document, u.email AS owner FROM booktrip_trips t LEFT JOIN booktrip_users u ON u.user_id = t.owner_id WHERE NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = t.id) ORDER BY t.created_at DESC').all();
  const grants=await db.prepare('SELECT a.trip_id, a.email FROM booktrip_trip_access a WHERE NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = a.trip_id) ORDER BY a.email').all();
  return {members:members.results,bootstrapAdmin:normalizedEmail(env.BOOKTRIP_CREATOR_EMAIL),self:identity.email,trips:trips.results.map(row=>{const trip=JSON.parse(row.document);return {id:row.id,title:trip.title,owner:row.owner || 'Cuenta creadora anterior',editors:grants.results.filter(grant=>grant.trip_id===row.id).map(grant=>grant.email)};})};
}
export async function changePermission(input,env,identity) {
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new TripError('Permiso inválido.');
  const email=normalizedEmail(input.email);
  if(!validEmail(email)) throw new TripError('Escribe el correo completo de Cloudflare Access.');
  const db=env.BOOKTRIP_DB;
  if(input.action==='role' && Object.keys(input).sort().join(',')==='action,email,role' && roles.includes(input.role)) {
    if(email===normalizedEmail(env.BOOKTRIP_CREATOR_EMAIL) || email===identity.email) throw new TripError('Tu cuenta administradora conserva su rol.',403,'protected_admin');
    await db.prepare('INSERT INTO booktrip_users (email, role) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role').bind(email,input.role).run();
  } else if(input.action==='trip-access' && Object.keys(input).sort().join(',')==='action,email,permission,tripId' && ['edit','view'].includes(input.permission) && /^[a-z0-9][a-z0-9-]{2,63}$/.test(input.tripId)) {
    const trip=await db.prepare('SELECT owner_id FROM booktrip_trips WHERE id = ? AND NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = booktrip_trips.id)').bind(input.tripId).first();
    if(!trip) throw new TripError('El viaje ya no está disponible.',404,'not_found');
    const owner=await db.prepare('SELECT email FROM booktrip_users WHERE user_id = ?').bind(trip.owner_id).first();
    if(owner?.email===email) throw new TripError('El permiso del creador depende de su rol general.');
    if(input.permission==='edit') await db.prepare("INSERT OR IGNORE INTO booktrip_trip_access (trip_id,email,permission) VALUES (?,?,'edit')").bind(input.tripId,email).run();
    else await db.prepare('DELETE FROM booktrip_trip_access WHERE trip_id = ? AND email = ?').bind(input.tripId,email).run();
  } else throw new TripError('Permiso inválido.');
  return permissionPanel(env,identity);
}
