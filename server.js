const app = require('./app');
const { ready } = require('./db');

const PORT = process.env.PORT || 3000;

ready
  .then(() => {
    app.listen(PORT, () => console.log(`KitchenKeys API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not set up the database:', err);
    process.exit(1);
  });
