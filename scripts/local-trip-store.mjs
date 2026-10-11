// Local development and tests only. Production uses the Cloudflare D1 binding.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function localTripDatabase(filename=':memory:') {
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(readFileSync(new URL('../migrations/0001_booktrip.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0002_booktrip_removals.sql',import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../migrations/0003_booktrip_permissions.sql',import.meta.url),'utf8'));
  function prepare(sql) {
    const statement=db.prepare(sql); let values=[];
    return {
      bind(...input) {values=input;return this;},
      async first() {return statement.get(...values) || null;},
      async all() {return {results:statement.all(...values)};},
      async run() {const result=statement.run(...values);return {success:true,meta:{changes:Number(result.changes)}};}
    };
  }
  return {
    prepare,
    async batch(statements) {
      db.exec('BEGIN');
      try {const results=[];for(const statement of statements) results.push(await statement.run());db.exec('COMMIT');return results;}
      catch(error) {db.exec('ROLLBACK');throw error;}
    },
    close() {db.close();}
  };
}
