const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://projeto_lms:tJl%26A3z8r4%C2%A3J@10.85.3.24:5432/db_projeto_lms?sslmode=disable',
  connectionTimeoutMillis: 5000,
});

console.log('Attempting to connect to 10.85.3.24:5432...');

client.connect()
  .then(() => {
    console.log('Successfully connected to Postgres!');
    return client.query('SELECT current_database(), current_user, version()');
  })
  .then(res => {
    console.log('Connection details:', res.rows[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error('--- CONNECTION ERROR ---');
    console.error('Code:', err.code);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
