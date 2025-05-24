const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('../../config');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    level: config.logging.level,
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
];

// Add file transports if enabled
if (config.logging.file.enabled) {
  const logDir = path.resolve(config.logging.file.path);
  
  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      level: config.logging.level,
      format: fileFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
  
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      level: 'error',
      format: fileFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
  
  // Scraper log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'scraper-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      level: 'info',
      format: fileFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Add custom methods
logger.scraper = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'scraper' });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'api' });
};

logger.auth = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'auth' });
};

logger.database = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'database' });
};

logger.queue = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'queue' });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, service: 'performance' });
};

// Request logging middleware
logger.requestMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };
    
    if (req.user) {
      logData.userId = req.user.userId;
      logData.username = req.user.username;
    }
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

// Error logging helper
logger.logError = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  };
  
  if (error.statusCode && error.statusCode < 500) {
    logger.warn('Application Error', errorData);
  } else {
    logger.error('Application Error', errorData);
  }
};

// Performance logging helper
logger.logPerformance = (operation, duration, metadata = {}) => {
  logger.performance(`${operation} completed`, {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

// Scraper logging helpers
logger.logScrapeStart = (target, metadata = {}) => {
  logger.scraper(`Starting scrape: ${target}`, {
    target,
    action: 'start',
    ...metadata,
  });
};

logger.logScrapeSuccess = (target, itemsScraped, duration, metadata = {}) => {
  logger.scraper(`Scrape completed: ${target}`, {
    target,
    action: 'success',
    itemsScraped,
    duration: `${duration}ms`,
    ...metadata,
  });
};

logger.logScrapeError = (target, error, metadata = {}) => {
  logger.error(`Scrape failed: ${target}`, {
    target,
    action: 'error',
    error: error.message,
    stack: error.stack,
    ...metadata,
  });
};

// Database logging helpers
logger.logDatabaseOperation = (operation, collection, duration, metadata = {}) => {
  logger.database(`Database operation: ${operation}`, {
    operation,
    collection,
    duration: `${duration}ms`,
    ...metadata,
  });
};

// Queue logging helpers
logger.logJobStart = (jobName, jobId, metadata = {}) => {
  logger.queue(`Job started: ${jobName}`, {
    jobName,
    jobId,
    action: 'start',
    ...metadata,
  });
};

logger.logJobSuccess = (jobName, jobId, duration, metadata = {}) => {
  logger.queue(`Job completed: ${jobName}`, {
    jobName,
    jobId,
    action: 'success',
    duration: `${duration}ms`,
    ...metadata,
  });
};

logger.logJobError = (jobName, jobId, error, metadata = {}) => {
  logger.error(`Job failed: ${jobName}`, {
    jobName,
    jobId,
    action: 'error',
    error: error.message,
    stack: error.stack,
    ...metadata,
  });
};

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
