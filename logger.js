const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf((info) => {
      return `${info.level}: ${info.message}`;
    })
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console()
  ],
});

logger.info = (message) => logger.log({ level: 'info', message });
logger.error = (message) => logger.log({ level: 'error', message });

module.exports = { logger };
