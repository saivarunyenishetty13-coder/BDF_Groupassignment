// Part 2: Database. SQLite connection, 3 related tables and small promise helpers.
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'kitchenkeys.db');
const db = new sqlite3.Database(DB_FILE);

// sqlite3 uses callbacks; these wrappers let the routes use async/await.
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );
const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

// Resolves once the tables exist. server.js and the tests await this.
const ready = (async () => {
  await run('PRAGMA foreign_keys = ON'); // make the relations real
  await run(`
    CREATE TABLE IF NOT EXISTS chefs (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    )`);
  await run(`
    CREATE TABLE IF NOT EXISTS stations (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT NOT NULL UNIQUE,
      cuisine TEXT NOT NULL
    )`);
  await run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      chef_id      INTEGER NOT NULL REFERENCES chefs(id),
      station_id   INTEGER NOT NULL REFERENCES stations(id),
      booking_date TEXT NOT NULL,
      time_slot    TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
})();

module.exports = { db, run, get, all, ready };
