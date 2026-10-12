import { validateTrip } from '../js/trip-contract.js';
import { legacyTrips } from '../js/trip-library.js';

// Run with a private, reviewed extraction. No travel documents or owner identity
// are committed here. Re-running never overwrites an edited or archived trip.
export async function importLegacy(db,entries,ownerId) {
  if(!ownerId || !Array.isArray(entries) || entries.length!==legacyTrips.length)throw Error('Expected the complete reviewed legacy catalog and verified owner');
  const ids=new Set(),statements=[];
  for(const entry of entries) {
    const trip=validateTrip(entry.trip).trip,meta=legacyTrips.find(item=>item.href===entry.catalog?.href);
    if(!meta || trip.id!==meta.href.slice(0,-1) || ids.has(trip.id) || !/^[a-f0-9]{64}$/.test(entry.sourceHash) || JSON.stringify(meta)!==JSON.stringify(entry.catalog))throw Error('Unexpected legacy mapping');ids.add(trip.id);
    const key='legacy-import-v1:'+trip.id,document=JSON.stringify(trip);
    const existing=await db.prepare('SELECT create_key, owner_id FROM booktrip_trips WHERE id = ?').bind(trip.id).first();
    if(existing && (existing.create_key!==key || existing.owner_id!==ownerId))throw Error('Trip ID or owner collision');
    statements.push(db.prepare('INSERT OR IGNORE INTO booktrip_trips (id,owner_id,create_key,document) VALUES (?,?,?,?)').bind(trip.id,ownerId,key,document));
    statements.push(db.prepare('INSERT OR IGNORE INTO booktrip_legacy (trip_id,original_href,catalog_json,initial_document,source_hash) VALUES (?,?,?,?,?)').bind(trip.id,meta.href,JSON.stringify(meta),document,entry.sourceHash));
    statements.push(db.prepare('INSERT OR IGNORE INTO booktrip_lifecycle (trip_id) VALUES (?)').bind(trip.id));
  }
  return db.batch(statements);
}
