// Optional: fills the database with sample data. Run with: npm run seed
const { run, get, ready, db } = require('./db');

(async () => {
  await ready;
  const chefs = [['Asha Rao', 'asha@kitchenkeys.com'], ['Ravi Kumar', 'ravi@kitchenkeys.com'], ['Meera Nair', 'meera@kitchenkeys.com']];
  const stations = [['Station A', 'Italian'], ['Station B', 'Indian'], ['Station C', 'Chinese'], ['Station D', 'Italian']];
  for (const [n, e] of chefs) await run('INSERT OR IGNORE INTO chefs (name, email) VALUES (?, ?)', [n, e]);
  for (const [n, c] of stations) await run('INSERT OR IGNORE INTO stations (name, cuisine) VALUES (?, ?)', [n, c]);
  const count = await get('SELECT COUNT(*) AS n FROM bookings');
  if (count.n === 0) {
    const rows = [[1, 1, '2026-11-20', '18:00-20:00'], [2, 1, '2026-11-20', '20:00-22:00'], [3, 1, '2026-11-21', '18:00-20:00'],
                  [1, 2, '2026-11-21', '10:00-12:00'], [2, 2, '2026-11-22', '10:00-12:00'], [3, 3, '2026-11-22', '14:00-16:00']];
    for (const r of rows) await run('INSERT INTO bookings (chef_id, station_id, booking_date, time_slot) VALUES (?, ?, ?, ?)', r);
  }
  console.log('Sample data ready.');
  db.close();
})();
