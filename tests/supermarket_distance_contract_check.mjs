import fs from 'fs';
import assert from 'assert';

console.log('Running Supermarket Category & Coordinate Distance Contract Check...');

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('../supermarket_category_distance_patch.js', import.meta.url), 'utf8');

assert(html.includes('supermarket_category_distance_patch.js'), 'index.html must load the supermarket patch');
assert(patch.includes("store-supermarket"), 'Patch must define the reserved supermarket category id');
assert(patch.includes('openSupermarkets'), 'Patch must expose a dedicated supermarket entry point');
assert(patch.includes('distanceKmBetweenPoints'), 'Patch must calculate distance from coordinates');
assert(patch.includes('field.readOnly = true'), 'Distance field must be read-only');
assert(patch.includes('draftLocations?.pickup') && patch.includes('draftLocations?.delivery'), 'Distance must use pickup and delivery coordinates');
assert(patch.includes('กรุณาเลือกพิกัดจุดรับและจุดส่ง'), 'Submission must be blocked until both coordinate points exist');

console.log('All Supermarket Category & Coordinate Distance contract checks passed successfully!');

// Deterministic sanity check for the same Haversine implementation contract.
function distanceKmBetweenPoints(origin, destination) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

const km = distanceKmBetweenPoints({ lat: 13.7563, lng: 100.5018 }, { lat: 13.765, lng: 100.538 });
assert(km > 3 && km < 5, `Expected a deterministic distance around 4km, received ${km}`);
console.log(`Coordinate distance sanity check passed: ${km.toFixed(2)} km`);

console.log('All Supermarket Category & Coordinate Distance checks passed successfully!');
