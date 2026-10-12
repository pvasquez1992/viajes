import { SignJWT, jwtVerify } from 'jose';
import { TripError, validateTrip } from '../../js/trip-contract.js';

function key(secret) {
  if(typeof secret!=='string' || secret.length<32) throw new TripError('La protección del chat no está configurada.',503,'not_configured');
  return new TextEncoder().encode(secret);
}
export async function sealRemoval(trip,identity,secret,now=Date.now(),generation=0) {
  validateTrip(trip);
  return new SignJWT({purpose:'remove-trip',trip,generation}).setProtectedHeader({alg:'HS256',typ:'JWT'}).setSubject(identity.id).setIssuedAt(Math.floor(now/1000)).setExpirationTime(Math.floor(now/1000)+600).sign(key(secret));
}
export async function openRemoval(token,identity,secret,now=Date.now()) {
  return (await openRemovalState(token,identity,secret,now)).trip;
}
export async function openRemovalState(token,identity,secret,now=Date.now()) {
  if(typeof token!=='string' || token.length>130000) throw new TripError('Confirmación de eliminación inválida.');
  const signingKey=key(secret);
  try {
    const {payload}=await jwtVerify(token,signingKey,{algorithms:['HS256'],typ:'JWT',subject:identity.id,currentDate:new Date(now)});
    if(payload.purpose!=='remove-trip' || typeof payload.exp!=='number') throw Error('Wrong purpose');
    const generation=payload.generation ?? 0;if(!Number.isInteger(generation) || generation<0) throw Error('generation');
    return {trip:validateTrip(payload.trip).trip,generation};
  } catch {throw new TripError('La confirmación venció o no es válida. Pide eliminar el viaje de nuevo.',409,'confirmation_expired');}
}
export async function sealRestore(id,generation,removedAt,identity,secret,now=Date.now()) {
  return new SignJWT({purpose:'restore-trip',id,generation,removedAt}).setProtectedHeader({alg:'HS256',typ:'JWT'}).setSubject(identity.id).setIssuedAt(Math.floor(now/1000)).setExpirationTime(Math.floor(now/1000)+600).sign(key(secret));
}
export async function openRestore(token,identity,secret,now=Date.now()) {
  try {
    if(typeof token!=='string' || token.length>4000) throw Error('token');
    const {payload}=await jwtVerify(token,key(secret),{algorithms:['HS256'],typ:'JWT',subject:identity.id,currentDate:new Date(now)});
    if(payload.purpose!=='restore-trip' || !/^[a-z0-9][a-z0-9-]{2,63}$/.test(payload.id) || !Number.isInteger(payload.generation) || payload.generation<0 || typeof payload.removedAt!=='string')throw Error('purpose');
    return payload;
  }catch{throw new TripError('La restauración venció o no es válida. Actualiza Eliminados.',409,'restore_expired');}
}
