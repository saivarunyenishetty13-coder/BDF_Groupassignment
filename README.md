# KitchenKeys Cloud Kitchen API

BDF Group Assignment, Theme 18: Kitchen stations. Twist: **Top three**.

Bookings used to happen in a chat and clashed at peak hours. This REST API keeps a proper record of chefs, stations and bookings.

**Stack:** Node.js, Express, SQLite (`sqlite3` package), Postman.

## How to run

1. Install Node.js 18 or newer.
2. In this folder run:
   ```bash
   npm install
   npm start
   ```
3. The server runs at `http://localhost:3000`. The database file `kitchenkeys.db` is created on first start.
4. Optional sample data: `npm run seed` (stop the server first if it is running).
5. Run the automated tests: `npm test` (uses an in-memory database, your data is safe).

## Project structure

| File | Part | What it does |
| --- | --- | --- |
| `server.js`, `app.js` | 1 Server and routes | Starts Express, mounts the routes, handles errors |
| `db.js` | 2 Database | SQLite connection and the 3 tables |
| `routes/chefs.js`, `routes/stations.js`, `routes/bookings.js` | 3 REST endpoints | CRUD and the join endpoint |
| `middleware/validate.js` | 4 Validation and search | Input checks and clear error messages |
| `routes/stations.js` (`/top`) | 5 Twist rule | Top three stations |
| `postman/`, `README.md`, `tests/` | 6 Postman and README | Test collection, docs, automated tests |

## Database (3 related tables)

- `chefs` (id, name, email)
- `stations` (id, name, cuisine)
- `bookings` (id, chef_id -> chefs.id, station_id -> stations.id, booking_date, time_slot, created_at)

## Endpoints

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/stations` | 200 | |
| GET | `/stations?cuisine=italian` | 200 (search) | |
| GET | `/stations/:id` | 200 | 400, 404 |
| POST | `/stations` | 201 | 400, 409 duplicate name |
| PUT | `/stations/:id` | 200 | 400, 404, 409 |
| DELETE | `/stations/:id` | 200 | 404, 409 has bookings |
| **GET** | **`/stations/top`** | **200 (twist)** | |
| GET | `/bookings` | 200 | |
| GET | `/bookings/:id` | 200 | 400, 404 |
| **GET** | **`/bookings/details`** | **200 (join: chef name + station name)** | |
| POST | `/bookings` | 201 | 400, 404 unknown chef/station |
| PUT | `/bookings/:id` | 200 | 400, 404 |
| DELETE | `/bookings/:id` | 200 | 404 |
| GET, POST, PUT, DELETE | `/chefs`, `/chefs/:id` | 200 / 201 | 400, 404, 409 |

### Example bodies

```json
POST /chefs     { "name": "Asha Rao", "email": "asha@kitchenkeys.com" }
POST /stations  { "name": "Station A", "cuisine": "Italian" }
POST /bookings  { "chef_id": 1, "station_id": 1, "booking_date": "2026-11-20", "time_slot": "18:00-20:00" }
```

Errors are always JSON, for example `{ "error": "name is required and must be a non-empty text" }`.

## Twist: Top three

`GET /stations/top` returns the 3 stations that appear in the most bookings, with their counts, using a join and `GROUP BY`. Ties are listed alphabetically.

```sql
SELECT s.id, s.name, s.cuisine, COUNT(b.id) AS booking_count
FROM stations s
JOIN bookings b ON b.station_id = s.id
GROUP BY s.id, s.name, s.cuisine
ORDER BY booking_count DESC, s.name COLLATE NOCASE ASC
LIMIT 3
```

| Test | Action | Expected |
| --- | --- | --- |
| Test 1 | Create several bookings | 201 each |
| Test 2 | `GET /stations/top` | 200, 3 stations, highest count first |
| Test 3 | Only 2 stations used | 200, just 2 |

The route is declared before `/stations/:id` so that "top" is not read as an id. The inner join means stations with no bookings never appear.

## Postman

1. Import `postman/KitchenKeys.postman_collection.json`.
2. Start from an empty database (stop the server, delete `kitchenkeys.db`, run `npm start`).
3. Run the folders in order with the Collection Runner. Folder 3 is the twist (Tests 1 to 3). The collection variable `baseUrl` is `http://localhost:3000`.

## Design notes

- Foreign keys are switched on, so a booking can never point to a missing chef or station.
- All SQL uses `?` placeholders (no SQL injection).
- A station or chef with bookings cannot be deleted (409), which protects the history.
