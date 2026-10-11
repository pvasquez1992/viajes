import { SignJWT, jwtVerify } from 'jose';
import { TripError, validateTrip } from '../../js/trip-contract.js';

function key(secret) {
  if(typeof secret!=='string' || secret.length<32) throw new TripError('La protección del chat no está configurada.',503,'not_configured');
  return new TextEncoder().encode(secret);
}
export async function sealRemoval(trip,identity,secret,now=Date.now()) {
  validateTrip(trip);
  return new SignJWT({purpose:'remove-trip',trip}).setProtectedHeader({alg:'HS256',typ:'JWT'}).setSubject(identity.id).setIssuedAt(Math.floor(now/1000)).setExpirationTime(Math.floor(now/1000)+600).sign(key(secret));
}
export async function openRemoval(token,identity,secret,now=Date.now()) {
  if(typeof token!=='string' || token.length>130000) throw new TripError('Confirmación de eliminación inválida.');
  const signingKey=key(secret);
  try {
    const {payload}=await jwtVerify(token,signingKey,{algorithms:['HS256'],typ:'JWT',subject:identity.id,currentDate:new Date(now)});
    if(payload.purpose!=='remove-trip' || typeof payload.exp!=='number') throw Error('Wrong purpose');
    return validateTrip(payload.trip).trip;
  } catch {throw new TripError('La confirmación venció o no es válida. Pide eliminar el viaje de nuevo.',409,'confirmation_expired');}
}
