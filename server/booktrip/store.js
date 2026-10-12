import { TripError, validateTrip, catalogEntry } from '../../js/trip-contract.js';
import { editPredicate, editArgs, removePredicate, removeArgs, roleExpression, roleArgs } from './permissions.js';

export async function requestKey(input, identity) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({owner:identity.id,input})));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
}
export function createTripStore(env) {
  // Primary sessions keep a write followed by a read consistent across locations.
  const db = env.BOOKTRIP_DB?.withSession?.('first-primary') || env.BOOKTRIP_DB;
  function ready() {
    if (!db?.prepare || !db?.batch) throw new TripError('Todavía falta conectar el almacenamiento de viajes.',503,'storage_not_configured');
  }
  return {
    async receipt(key, identity) {
      ready();
      const row = await db.prepare('SELECT response_json, trip_id FROM booktrip_receipts WHERE request_key = ? AND owner_id = ?').bind(key,identity.id).first();
      if(row && await this.isRemoved(row.trip_id)) throw new TripError('Este viaje fue eliminado del libro. Empieza una conversación nueva.',410,'trip_removed');
      if(row && !await this.getEditable(row.trip_id,identity)) throw new TripError('Ya no tienes permiso para editar este viaje.',403,'editing_forbidden');
      return row ? JSON.parse(row.response_json) : null;
    },
    async save(trip, identity, current, key, response) {
      ready(); validateTrip(trip);
      if(!current && identity.role==='viewer') throw new TripError('Tu rol permite consultar o editar viajes asignados, pero no crear otros.',403,'creation_forbidden');
      const document = JSON.stringify(trip);
      const write = current
        ? db.prepare(`UPDATE booktrip_trips SET document = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND ${editPredicate} AND document = ? AND COALESCE((SELECT generation FROM booktrip_lifecycle WHERE trip_id = booktrip_trips.id),0) = ? AND NOT EXISTS (SELECT 1 FROM booktrip_receipts WHERE request_key = ?) AND NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = booktrip_trips.id)`).bind(document,trip.id,...editArgs(identity),JSON.stringify(current.trip),current.generation || 0,key)
        : db.prepare(`INSERT OR IGNORE INTO booktrip_trips (id, owner_id, create_key, document) SELECT ?, ?, ?, ? WHERE ${roleExpression} IN ('admin','creator')`).bind(trip.id,identity.id,key,document,...roleArgs(identity));
      const record = db.prepare(`INSERT OR IGNORE INTO booktrip_receipts (request_key, owner_id, trip_id, response_json) SELECT ?, ?, id, ? FROM booktrip_trips WHERE id = ? AND ${editPredicate} AND document = ? AND COALESCE((SELECT generation FROM booktrip_lifecycle WHERE trip_id = booktrip_trips.id),0) = ? AND NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = booktrip_trips.id)`).bind(key,identity.id,JSON.stringify(response),trip.id,...editArgs(identity),document,current?.generation || 0);
      await db.batch([write,record]);
      const saved = await this.receipt(key,identity);
      if (!saved) throw new TripError('El viaje cambió desde otra conversación. Abre una conversación nueva para evitar reemplazar esos cambios.',409,'trip_changed');
      return saved;
    },
    async catalog(identity) {
      ready();
      const {results} = identity
        ? await db.prepare(`SELECT document, ${editPredicate} AS editable, ${removePredicate} AS removable FROM booktrip_trips WHERE NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = booktrip_trips.id) ORDER BY created_at DESC`).bind(...editArgs(identity),...removeArgs(identity)).all()
        : await db.prepare('SELECT document FROM booktrip_trips WHERE NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = booktrip_trips.id) ORDER BY created_at DESC').all();
      const legacy=await db.prepare('SELECT trip_id, catalog_json FROM booktrip_legacy').all();
      const metadata=new Map(legacy.results.map(row=>[row.trip_id,JSON.parse(row.catalog_json)]));
      return results.map(row => {const trip=JSON.parse(row.document),original=metadata.get(trip.id);return {...catalogEntry(trip),...(original?{href:original.href,id:trip.id,featured:original.featured,phase:original.phase,tags:original.tags}:{}),...(identity?{editable:Boolean(row.editable),removable:Boolean(row.removable)}:{})};});
    },
    async getEditable(id, identity) {
      ready();
      const row = await db.prepare(`SELECT document FROM booktrip_trips WHERE id = ? AND ${editPredicate} AND NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = booktrip_trips.id)`).bind(id,...editArgs(identity)).first();
      return row ? validateTrip(JSON.parse(row.document)).trip : null;
    },
    async get(id) {
      ready();
      const row = await db.prepare('SELECT document FROM booktrip_trips WHERE id = ? AND NOT EXISTS (SELECT 1 FROM booktrip_removals WHERE trip_id = booktrip_trips.id)').bind(id).first();
      return row ? validateTrip(JSON.parse(row.document)).trip : null;
    },
    async isRemoved(id) {
      ready();
      return Boolean(await db.prepare('SELECT trip_id FROM booktrip_removals WHERE trip_id = ?').bind(id).first());
    },
    async generation(id) {ready();return (await db.prepare('SELECT generation FROM booktrip_lifecycle WHERE trip_id = ?').bind(id).first())?.generation || 0;},
    async legacyHrefs() {ready();return (await db.prepare('SELECT original_href FROM booktrip_legacy').all()).results.map(row=>row.original_href);},
    async legacyInfo(id) {ready();return db.prepare('SELECT original_href FROM booktrip_legacy WHERE trip_id = ?').bind(id).first();},
    async original(href) {ready();return db.prepare('SELECT t.id, l.original_href, t.document != l.initial_document AS modified FROM booktrip_legacy l JOIN booktrip_trips t ON t.id = l.trip_id WHERE l.original_href = ?').bind(href).first();},
    async archived(identity,id) {
      ready();const where=id?' AND booktrip_trips.id = ?':'';
      const result=await db.prepare(`SELECT booktrip_trips.document, r.removed_at FROM booktrip_trips JOIN booktrip_removals r ON r.trip_id = booktrip_trips.id WHERE ${removePredicate.replaceAll('owner_id','booktrip_trips.owner_id')}${where} ORDER BY r.removed_at DESC`).bind(...removeArgs(identity),...(id?[id]:[])).all();
      return result.results.map(row=>({trip:validateTrip(JSON.parse(row.document)).trip,removedAt:row.removed_at}));
    },
    async restore(id,identity,generation,removedAt) {
      ready();
      const condition=`EXISTS (SELECT 1 FROM booktrip_trips JOIN booktrip_removals r ON r.trip_id = booktrip_trips.id WHERE booktrip_trips.id = booktrip_lifecycle.trip_id AND r.removed_at = ? AND ${removePredicate.replaceAll('owner_id','booktrip_trips.owner_id')})`;
      const update=db.prepare(`UPDATE booktrip_lifecycle SET generation = generation + 1 WHERE trip_id = ? AND generation = ? AND ${condition}`).bind(id,generation,removedAt,...removeArgs(identity));
      const remove=db.prepare(`DELETE FROM booktrip_removals WHERE trip_id = ? AND removed_at = ? AND EXISTS (SELECT 1 FROM booktrip_lifecycle WHERE trip_id = ? AND generation = ?) AND EXISTS (SELECT 1 FROM booktrip_trips WHERE id = ? AND ${removePredicate})`).bind(id,removedAt,id,generation+1,id,...removeArgs(identity));
      await db.batch([update,remove]);
      if(await this.isRemoved(id) || await this.generation(id)!==generation+1 || !await this.getEditable(id,identity)) throw new TripError('La restauración venció o el viaje cambió. Actualiza Eliminados.',409,'archive_changed');
      return this.get(id);
    },
    async remove(trip,identity,generation=0) {
      ready();validateTrip(trip);
      const state=db.prepare(`INSERT OR IGNORE INTO booktrip_lifecycle (trip_id) SELECT id FROM booktrip_trips WHERE id = ? AND ${removePredicate} AND document = ?`).bind(trip.id,...removeArgs(identity),JSON.stringify(trip));
      const mark=db.prepare(`INSERT OR IGNORE INTO booktrip_removals (trip_id,owner_id) SELECT id,owner_id FROM booktrip_trips WHERE id = ? AND ${removePredicate} AND document = ? AND EXISTS (SELECT 1 FROM booktrip_lifecycle WHERE trip_id = booktrip_trips.id AND generation = ?)`).bind(trip.id,...removeArgs(identity),JSON.stringify(trip),generation);
      const [,result]=await db.batch([state,mark]);
      if(result.meta?.changes) return;
      const removed=await db.prepare(`SELECT r.trip_id FROM booktrip_removals r JOIN booktrip_trips ON booktrip_trips.id = r.trip_id WHERE r.trip_id = ? AND ${removePredicate.replaceAll('owner_id','booktrip_trips.owner_id')}`).bind(trip.id,...removeArgs(identity)).first();
      if(!removed || await this.generation(trip.id)!==generation) throw new TripError('El viaje cambió desde que pediste eliminarlo. Revísalo y solicita la eliminación de nuevo.',409,'trip_changed');
    }
  };
}
