// Part 1: Express app, routes and error handling. server.js starts it; the tests import it.
const express = require('express');

const chefs = require('./routes/chefs');
const stations = require('./routes/stations');
const bookings = require('./routes/bookings');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'KitchenKeys Cloud Kitchen API',
    endpoints: ['/chefs', '/stations', '/stations/top', '/bookings', '/bookings/details'],
  });
});

app.use('/chefs', chefs);
app.use('/stations', stations);
app.use('/bookings', bookings);

// Unknown route -> 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler: bad JSON -> 400, anything else -> 500 (with a safe message)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
