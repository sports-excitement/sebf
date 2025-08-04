require('dotenv').config();

module.exports = {
  name: process.env.APP_NAME || 'Sports Excitement',
  env: process.env.APP_ENV || 'development',
  debug: process.env.APP_DEBUG === 'true' || false,
  url: process.env.APP_URL || 'http://localhost',
  port: process.env.PORT || 3000,
  key: process.env.APP_KEY,
}; 