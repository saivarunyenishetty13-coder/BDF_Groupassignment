// Part 4: Validation. Each validator returns an error message, or null when the input is fine.

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

function validateChef(body) {
  if (!body || typeof body !== 'object') return 'Request body is required';
  if (!isText(body.name)) return 'name is required and must be a non-empty text';
  if (body.name.trim().length > 100) return 'name must be at most 100 characters';
  if (!isText(body.email)) return 'email is required and must be a non-empty text';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return 'email is not a valid email address';
  return null;
}

function validateStation(body) {
  if (!body || typeof body !== 'object') return 'Request body is required';
  if (!isText(body.name)) return 'name is required and must be a non-empty text';
  if (body.name.trim().length > 100) return 'name must be at most 100 characters';
  if (!isText(body.cuisine)) return 'cuisine is required and must be a non-empty text';
  if (body.cuisine.trim().length > 50) return 'cuisine must be at most 50 characters';
  return null;
}

function validateBooking(body) {
  if (!body || typeof body !== 'object') return 'Request body is required';
  if (!Number.isInteger(body.chef_id) || body.chef_id < 1) return 'chef_id is required and must be a positive whole number';
  if (!Number.isInteger(body.station_id) || body.station_id < 1) return 'station_id is required and must be a positive whole number';
  if (!isText(body.booking_date) || !/^\d{4}-\d{2}-\d{2}$/.test(body.booking_date.trim()))
    return 'booking_date is required in YYYY-MM-DD format';
  const d = new Date(body.booking_date.trim() + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== body.booking_date.trim())
    return 'booking_date is not a real calendar date';
  if (!isText(body.time_slot) || !/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(body.time_slot.trim()))
    return 'time_slot is required in HH:MM-HH:MM format, for example 18:00-20:00';
  const [start, end] = body.time_slot.trim().split('-');
  if (start >= end) return 'time_slot must end after it starts';
  return null;
}

// Express middleware: turns ":id" into a number or answers 400.
function checkId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'id must be a positive whole number' });
  }
  req.id = id;
  next();
}

// Express middleware factory: runs a validator on req.body and answers 400 with its message.
const validateBody = (validator) => (req, res, next) => {
  const message = validator(req.body);
  if (message) return res.status(400).json({ error: message });
  next();
};

module.exports = { validateChef, validateStation, validateBooking, checkId, validateBody };
