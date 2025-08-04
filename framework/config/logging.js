require('dotenv').config();

module.exports = {
  level: process.env.LOG_LEVEL || 'debug',
  channel: process.env.LOG_CHANNEL || 'stack',
}; 