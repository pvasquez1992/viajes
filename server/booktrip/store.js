import { TripError, validateTrip, catalogEntry } from '../../js/trip-contract.js';

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
      const row = await db.prepare('SELECT response_json FROM booktrip_receipts WHERE request_key = ? AND owner_id = ?').bind(key,identity.id).first();
      return row ? JSON.parse(row.response_json) : null;
    },
    async save(trip, identity, current, key, response) {
      ready(); validateTrip(trip);
      const document = JSON.stringify(trip);
      const write = current
        ? db.prepare("UPDATE booktrip_trips SET document = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND owner_id = ? AND document = ? AND NOT EXISTS (SELECT 1 FROM booktrip_receipts WHERE request_key = ?)").bind(document,trip.id,identity.id,JSON.stringify(current.trip),key)
        : db.prepare('INSERT OR IGNORE INTO booktrip_trips (id, owner_id, create_key, document) VALUES (?, ?, ?, ?)').bind(trip.id,identity.id,key,document);
      const record = db.prepare('INSERT OR IGNORE INTO booktrip_receipts (request_key, owner_id, trip_id, response_json) SELECT ?, ?, id, ? FROM booktrip_trips WHERE id = ? AND owner_id = ? AND document = ?').bind(key,identity.id,JSON.stringify(response),trip.id,identity.id,document);
      await db.batch([write,record]);
      const saved = await this.receipt(key,identity);
      if (!saved) throw new TripError('El viaje cambió desde otra conversación. Abre una conversación nueva para evitar reemplazar esos cambios.',409,'trip_changed');
      return saved;
    },
    async catalog(identity) {
      ready();
      const {results} = await db.prepare('SELECT document, owner_id FROM booktrip_trips ORDER BY created_at DESC').all();
      return results.map(row => ({...catalogEntry(JSON.parse(row.document)),...(identity?{editable:row.owner_id===identity.id}:{})}));
    },
    async getEditable(id, identity) {
      ready();
      const row = await db.prepare('SELECT document FROM booktrip_trips WHERE id = ? AND owner_id = ?').bind(id,identity.id).first();
      return row ? validateTrip(JSON.parse(row.document)).trip : null;
    },
    async get(id) {
      ready();
      const row = await db.prepare('SELECT document FROM booktrip_trips WHERE id = ?').bind(id).first();
      return row ? validateTrip(JSON.parse(row.document)).trip : null;
    }
  };
}
