/**
 * Logger Helper
 *
 * This file simply imports and re-exports the configured Winston logger instance.
 * This provides a consistent path for accessing the logger throughout the
 * application, e.g., `require('@/app/Helpers/Logger')`.
 *
 * It decouples the application code from the logger's configuration file.
 */
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const config = require('../config/logging');

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: config.level,
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [],
});

if (config.channel !== 'null') {
  logger.add(new transports.Console());
}

module.exports = logger; 