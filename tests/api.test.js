// Automated tests. Run with: npm test
// They use an in-memory database, so your real kitchenkeys.db is never touched.
process.env.DB_FILE = ':memory:';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');
const { ready } = require('../db');

let server;
let base;

before(async () => {
  await ready;
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
const book = (chef_id, station_id, n = 1) =>
  call('POST', '/bookings', { chef_id, station_id, booking_date: '2026-11-20', time_slot: `0${n}:00-0${n + 1}:00` });

let chefId;
const stationIds = {};

test('setup: create a chef and four stations', async () => {
  const chef = await call('POST', '/chefs', { name: 'Asha', email: 'asha@example.com' });
  assert.equal(chef.status, 201);
  chefId = chef.body.id;
  for (const [name, cuisine] of [['Bravo', 'Italian'], ['Alpha', 'Indian'], ['Delta', 'Chinese'], ['Charlie', 'Italian']]) {
    const s = await call('POST', '/stations', { name, cuisine });
    assert.equal(s.status, 201);
    stationIds[name] = s.body.id;
  }
});

// ---------- Twist: Top three ----------
test('Before any booking: /stations/top is empty, 200', async () => {
  const r = await call('GET', '/stations/top');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, []);
});

test('Test 1: creating several bookings returns 201 each', async () => {
  // Alpha x3, Bravo x2, Charlie x2, Delta x1
  const plan = [['Alpha', 3], ['Bravo', 2], ['Charlie', 2], ['Delta', 1]];
  let n = 1;
  for (const [name, times] of plan) {
    for (let i = 0; i < times; i++) {
      const r = await book(chefId, stationIds[name], n++ % 8);
      assert.equal(r.status, 201);
    }
  }
});

test('Test 2: /stations/top returns 200, 3 stations, highest count first, ties alphabetical', async () => {
  const r = await call('GET', '/stations/top');
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 3);
  assert.deepEqual(r.body.map((s) => [s.name, s.booking_count]), [['Alpha', 3], ['Bravo', 2], ['Charlie', 2]]);
});

test('Test 3: only 2 stations used returns 200 with just 2', async () => {
  const a = await call('POST', '/stations', { name: 'Echo', cuisine: 'Thai' });
  const b = await call('POST', '/stations', { name: 'Foxtrot', cuisine: 'Thai' });
  await book(chefId, a.body.id);
  await book(chefId, b.body.id);
  // Remove everything else to leave exactly 2 used stations
  for (const row of (await call('GET', '/bookings')).body) {
    if (![a.body.id, b.body.id].includes(row.station_id)) await call('DELETE', `/bookings/${row.id}`);
  }
  const r = await call('GET', '/stations/top');
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 2);
});

// ---------- CRUD, status codes, validation, join, search ----------
test('stations: get all, get one, update, delete', async () => {
  assert.equal((await call('GET', '/stations')).status, 200);
  assert.equal((await call('GET', `/stations/${stationIds.Delta}`)).status, 200);
  assert.equal((await call('GET', '/stations/9999')).status, 404);
  const up = await call('PUT', `/stations/${stationIds.Delta}`, { name: 'Delta', cuisine: 'Korean' });
  assert.equal(up.status, 200);
  assert.equal(up.body.cuisine, 'Korean');
  assert.equal((await call('PUT', '/stations/9999', { name: 'X', cuisine: 'Y' })).status, 404);
  const tmp = await call('POST', '/stations', { name: 'Temp', cuisine: 'Greek' });
  assert.equal((await call('DELETE', `/stations/${tmp.body.id}`)).status, 200);
  assert.equal((await call('DELETE', `/stations/${tmp.body.id}`)).status, 404);
});

test('validation gives 400 with a clear message', async () => {
  const s = await call('POST', '/stations', { name: '', cuisine: 'Italian' });
  assert.equal(s.status, 400);
  assert.match(s.body.error, /name/);
  assert.equal((await call('PUT', `/stations/${stationIds.Delta}`, { name: 'Delta' })).status, 400);
  assert.equal((await call('GET', '/stations/abc')).status, 400);
  const b = await call('POST', '/bookings', { chef_id: chefId, station_id: stationIds.Alpha, booking_date: '20-11-2026', time_slot: '10:00-12:00' });
  assert.equal(b.status, 400);
  assert.match(b.body.error, /booking_date/);
  assert.equal((await call('POST', '/chefs', { name: 'Bad', email: 'nope' })).status, 400);
});

test('booking with unknown chef or station gives 404', async () => {
  assert.equal((await book(9999, stationIds.Alpha)).status, 404);
  assert.equal((await book(chefId, 9999)).status, 404);
});

test('station that has bookings cannot be deleted (409)', async () => {
  const used = (await call('GET', '/bookings')).body[0].station_id;
  const del = await call('DELETE', `/stations/${used}`);
  assert.equal(del.status, 409);
});

test('join endpoint returns chef name and station name', async () => {
  const r = await call('GET', '/bookings/details');
  assert.equal(r.status, 200);
  assert.ok(r.body.length > 0);
  assert.equal(r.body[0].chef_name, 'Asha');
  assert.ok(r.body[0].station_name);
});

test('search by query parameter', async () => {
  const r = await call('GET', '/stations?cuisine=thai');
  assert.equal(r.status, 200);
  assert.ok(r.body.length >= 2);
  assert.ok(r.body.every((s) => s.cuisine.toLowerCase() === 'thai'));
});

test('invalid JSON body gives 400', async () => {
  const res = await fetch(base + '/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
});
