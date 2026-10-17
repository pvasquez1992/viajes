import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyTrips } from '../js/trip-library.js';
import { getTripCover, tripCovers } from '../js/trip-covers.js';

test('all eight legacy destinations have a matching postcard cover', () => {
  assert.equal(legacyTrips.length, 8);
  for (const trip of legacyTrips) {
    const cover = getTripCover(trip);
    assert.ok(cover, trip.href);
    assert.ok(cover.alt.length > 10);
    assert.match(cover.src, /^(https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/|\/)/);
  }
});

test('new D1 trips use a deliberate themed fallback, not an unrelated photo', () => {
  assert.equal(getTripCover({href:'trips/a-new-destination/'}), null);
});

test('all Wikimedia photographs include author, source and licensing information', () => {
  for (const cover of Object.values(tripCovers).filter(x => x.source)) {
    assert.ok(cover.credit);
    assert.match(cover.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    if (cover.license.startsWith('CC BY')) {
      assert.match(cover.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\//);
    } else {
      assert.match(cover.license, /dominio público/i);
      if (cover.license.startsWith('CC0')) {
        assert.equal(cover.licenseUrl, 'https://creativecommons.org/publicdomain/zero/1.0/');
      }
    }
  }
});
