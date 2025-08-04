require('dotenv').config();

module.exports = {
  connection: process.env.DB_CONNECTION || 'postgresql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'postgres',
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  schema: process.env.DB_SCHEMA || 'public',
  url: process.env.DATABASE_URL,
}; 