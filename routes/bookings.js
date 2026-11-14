// Part 3: REST endpoints for bookings, including the join endpoint.
const express = require('express');
const { run, get, all } = require('../db');
const { validateBooking, checkId, validateBody } = require('../middleware/validate');

const router = express.Router();

// Bookings joined with the chef name and the station name.
const JOINED = `
  SELECT b.id AS booking_id,
         c.name AS chef_name,
         s.name AS station_name,
         s.cuisine,
         b.booking_date,
         b.time_slot
  FROM bookings b
  JOIN chefs c    ON c.id = b.chef_id
  JOIN stations s ON s.id = b.station_id`;

// JOIN ENDPOINT: GET /bookings/details -> 200 (optional ?date=YYYY-MM-DD)
// Must stay above "/:id".
router.get('/details', async (req, res, next) => {
  try {
    const rows = req.query.date
      ? await all(`${JOINED} WHERE b.booking_date = ? ORDER BY b.booking_date, b.time_slot, b.id`, [req.query.date])
      : await all(`${JOINED} ORDER BY b.booking_date, b.time_slot, b.id`);
    res.status(200).json(rows);
  } catch (e) { next(e); }
});

// GET /bookings -> 200 (optional ?chef_id= and ?station_id= filters)
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.chef_id)    { where.push('chef_id = ?');    params.push(Number(req.query.chef_id)); }
    if (req.query.station_id) { where.push('station_id = ?'); params.push(Number(req.query.station_id)); }
    const sql = 'SELECT * FROM bookings' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY id';
    res.status(200).json(await all(sql, params));
  } catch (e) { next(e); }
});

// GET /bookings/:id -> 200 or 404
router.get('/:id', checkId, async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM bookings WHERE id = ?', [req.id]);
    if (!row) return res.status(404).json({ error: 'Booking not found' });
    res.status(200).json(row);
  } catch (e) { next(e); }
});

// Checks that the chef and the station exist. Returns an error message or null.
async function missingReference(body) {
  if (!(await get('SELECT id FROM chefs WHERE id = ?', [body.chef_id]))) return 'Chef not found';
  if (!(await get('SELECT id FROM stations WHERE id = ?', [body.station_id]))) return 'Station not found';
  return null;
}

// POST /bookings -> 201, 400 invalid body, 404 unknown chef or station
router.post('/', validateBody(validateBooking), async (req, res, next) => {
  try {
    const missing = await missingReference(req.body);
    if (missing) return res.status(404).json({ error: missing });
    const { lastID } = await run(
      'INSERT INTO bookings (chef_id, station_id, booking_date, time_slot) VALUES (?, ?, ?, ?)',
      [req.body.chef_id, req.body.station_id, req.body.booking_date.trim(), req.body.time_slot.trim()]
    );
    res.status(201).json(await get('SELECT * FROM bookings WHERE id = ?', [lastID]));
  } catch (e) { next(e); }
});

// PUT /bookings/:id -> 200, 400 invalid, 404 booking, chef or station not found
router.put('/:id', checkId, validateBody(validateBooking), async (req, res, next) => {
  try {
    if (!(await get('SELECT id FROM bookings WHERE id = ?', [req.id]))) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const missing = await missingReference(req.body);
    if (missing) return res.status(404).json({ error: missing });
    await run(
      'UPDATE bookings SET chef_id = ?, station_id = ?, booking_date = ?, time_slot = ? WHERE id = ?',
      [req.body.chef_id, req.body.station_id, req.body.booking_date.trim(), req.body.time_slot.trim(), req.id]
    );
    res.status(200).json(await get('SELECT * FROM bookings WHERE id = ?', [req.id]));
  } catch (e) { next(e); }
});

// DELETE /bookings/:id -> 200 or 404
router.delete('/:id', checkId, async (req, res, next) => {
  try {
    const { changes } = await run('DELETE FROM bookings WHERE id = ?', [req.id]);
    if (changes === 0) return res.status(404).json({ error: 'Booking not found' });
    res.status(200).json({ message: 'Booking deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
