// Part 3: REST endpoints for chefs.
const express = require('express');
const { run, get, all } = require('../db');
const { validateChef, checkId, validateBody } = require('../middleware/validate');

const router = express.Router();

// GET /chefs            -> 200 list
// GET /chefs?name=asha  -> search by name (partial, case-insensitive)
router.get('/', async (req, res, next) => {
  try {
    const { name } = req.query;
    const rows = name
      ? await all('SELECT * FROM chefs WHERE name LIKE ? ORDER BY name', [`%${name}%`])
      : await all('SELECT * FROM chefs ORDER BY id');
    res.status(200).json(rows);
  } catch (e) { next(e); }
});

// GET /chefs/:id -> 200 or 404
router.get('/:id', checkId, async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM chefs WHERE id = ?', [req.id]);
    if (!row) return res.status(404).json({ error: 'Chef not found' });
    res.status(200).json(row);
  } catch (e) { next(e); }
});

// POST /chefs -> 201, 400 invalid, 409 duplicate email
router.post('/', validateBody(validateChef), async (req, res, next) => {
  try {
    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const { lastID } = await run('INSERT INTO chefs (name, email) VALUES (?, ?)', [name, email]);
    res.status(201).json(await get('SELECT * FROM chefs WHERE id = ?', [lastID]));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'A chef with this email already exists' });
    next(e);
  }
});

// PUT /chefs/:id -> 200, 400 invalid, 404, 409 duplicate email
router.put('/:id', checkId, validateBody(validateChef), async (req, res, next) => {
  try {
    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const { changes } = await run('UPDATE chefs SET name = ?, email = ? WHERE id = ?', [name, email, req.id]);
    if (changes === 0) return res.status(404).json({ error: 'Chef not found' });
    res.status(200).json(await get('SELECT * FROM chefs WHERE id = ?', [req.id]));
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'A chef with this email already exists' });
    next(e);
  }
});

// DELETE /chefs/:id -> 200, 404, 409 when the chef still has bookings
router.delete('/:id', checkId, async (req, res, next) => {
  try {
    const { changes } = await run('DELETE FROM chefs WHERE id = ?', [req.id]);
    if (changes === 0) return res.status(404).json({ error: 'Chef not found' });
    res.status(200).json({ message: 'Chef deleted' });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'Chef has bookings and cannot be deleted' });
    next(e);
  }
});

module.exports = router;
