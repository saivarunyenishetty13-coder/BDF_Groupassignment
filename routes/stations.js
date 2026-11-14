// Parts 3, 4 and 5: station endpoints, search, and the "Top three" twist.
const express = require('express');
const { run, get, all } = require('../db');
const { validateStation, checkId, validateBody } = require('../middleware/validate');

const router = express.Router();

// GET /stations                  -> 200 list
// GET /stations?cuisine=italian  -> search by cuisine (case-insensitive, partial match)
// GET /stations?name=wok         -> search by name
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.cuisine) { where.push('cuisine LIKE ?'); params.push(`%${req.query.cuisine}%`); }
    if (req.query.name)    { where.push('name LIKE ?');    params.push(`%${req.query.name}%`); }
    const sql = 'SELECT * FROM stations' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY id';
    res.status(200).json(await all(sql, params));
  } catch (e) { next(e); }
});

// TWIST (Part 5): GET /stations/top
// The 3 stations that appear in the most bookings, with their counts.
// JOIN links stations to bookings, GROUP BY counts per station,
// ORDER BY count DESC puts the busiest first, and ties are listed alphabetically by name.
// NOTE: this route must stay ABOVE "/:id", otherwise "top" would be read as an id.
router.get('/top', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT s.id, s.name, s.cuisine, COUNT(b.id) AS booking_count
      FROM stations s
      JOIN bookings b ON b.station_id = s.id
      GROUP BY s.id, s.name, s.cuisine
      ORDER BY booking_count DESC, s.name COLLATE NOCASE ASC
      LIMIT 3`);
    res.status(200).json(rows);
  } catch (e) { next(e); }
});

// GET /stations/:id -> 200 or 404
router.get('/:id', checkId, async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM stations WHERE id = ?', [req.id]);
    if (!row) return res.status(404).json({ error: 'Station not found' });
    res.status(200).json(row);
  } catch (e) { next(e); }
});

// POST /stations -> 201, 400 invalid, 409 duplicate name
router.post('/', validateBody(validateStation), async (req, res, next) => {
  try {
    const { lastID } = await run('INSERT INTO stations (name, cuisine) VALUES (?, ?)', [
      req.body.name.trim(),
      req.body.cuisine.trim(),
    ]);
    res.status(201).json(await get('SELECT * FROM stations WHERE id = ?', [lastID]));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'A station with this name already exists' });
    next(e);
  }
});

// PUT /stations/:id -> 200, 400 invalid, 404, 409 duplicate name
router.put('/:id', checkId, validateBody(validateStation), async (req, res, next) => {
  try {
    const { changes } = await run('UPDATE stations SET name = ?, cuisine = ? WHERE id = ?', [
      req.body.name.trim(),
      req.body.cuisine.trim(),
      req.id,
    ]);
    if (changes === 0) return res.status(404).json({ error: 'Station not found' });
    res.status(200).json(await get('SELECT * FROM stations WHERE id = ?', [req.id]));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'A station with this name already exists' });
    next(e);
  }
});

// DELETE /stations/:id -> 200, 404, 409 when the station still has bookings
router.delete('/:id', checkId, async (req, res, next) => {
  try {
    const { changes } = await run('DELETE FROM stations WHERE id = ?', [req.id]);
    if (changes === 0) return res.status(404).json({ error: 'Station not found' });
    res.status(200).json({ message: 'Station deleted' });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Station has bookings and cannot be deleted' });
    next(e);
  }
});

module.exports = router;
