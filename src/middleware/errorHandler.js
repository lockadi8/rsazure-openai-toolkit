const logger = require('../utils/logger');
const config = require('../../config');

class ErrorHandler {
  // Main error handling middleware
  handle = (error, req, res, next) => {
    // Log the error
    logger.logError(error, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    // Handle different types of errors
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error, res);
    }

    if (error.name === 'CastError') {
      return this.handleCastError(error, res);
    }

    if (error.code === 11000) {
      return this.handleDuplicateKeyError(error, res);
    }

    if (error.name === 'JsonWebTokenError') {
      return this.handleJWTError(error, res);
    }

    if (error.name === 'TokenExpiredError') {
      return this.handleJWTExpiredError(error, res);
    }

    if (error.name === 'MulterError') {
      return this.handleMulterError(error, res);
    }

    if (error.statusCode) {
      return this.handleCustomError(error, res);
    }

    // Default server error
    return this.handleServerError(error, res);
  };

  // Handle Mongoose validation errors
  handleValidationError = (error, res) => {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));

    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors,
    });
  };

  // Handle Mongoose cast errors (invalid ObjectId, etc.)
  handleCastError = (error, res) => {
    return res.status(400).json({
      error: 'Invalid Data Format',
      message: `Invalid ${error.path}: ${error.value}`,
      field: error.path,
    });
  };

  // Handle MongoDB duplicate key errors
  handleDuplicateKeyError = (error, res) => {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];

    return res.status(409).json({
      error: 'Duplicate Entry',
      message: `${field} '${value}' already exists`,
      field,
      value,
    });
  };

  // Handle JWT errors
  handleJWTError = (error, res) => {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Please provide a valid authentication token',
    });
  };

  // Handle JWT expired errors
  handleJWTExpiredError = (error, res) => {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Your session has expired. Please login again',
    });
  };

  // Handle Multer file upload errors
  handleMulterError = (error, res) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File Too Large',
        message: 'File size exceeds the maximum allowed limit',
        maxSize: error.limit,
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too Many Files',
        message: 'Number of files exceeds the maximum allowed limit',
        maxCount: error.limit,
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected File',
        message: `Unexpected field: ${error.field}`,
      });
    }

    return res.status(400).json({
      error: 'File Upload Error',
      message: error.message,
    });
  };

  // Handle custom application errors
  handleCustomError = (error, res) => {
    return res.status(error.statusCode).json({
      error: error.name || 'Application Error',
      message: error.message,
      ...(error.data && { data: error.data }),
    });
  };

  // Handle generic server errors
  handleServerError = (error, res) => {
    const isDevelopment = config.server.env === 'development';

    return res.status(500).json({
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'Something went wrong on our end',
      ...(isDevelopment && { stack: error.stack }),
    });
  };

  // Handle async errors
  asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // Create custom error
  createError = (message, statusCode = 500, name = 'ApplicationError', data = null) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.name = name;
    if (data) error.data = data;
    return error;
  };

  // Handle 404 errors
  notFound = (req, res, next) => {
    const error = this.createError(
      `Route ${req.originalUrl} not found`,
      404,
      'NotFoundError'
    );
    next(error);
  };

  // Handle uncaught exceptions
  handleUncaughtException = () => {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      
      // Graceful shutdown
      process.exit(1);
    });
  };

  // Handle unhandled promise rejections
  handleUnhandledRejection = () => {
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      
      // Graceful shutdown
      process.exit(1);
    });
  };

  // Initialize error handlers
  init = () => {
    this.handleUncaughtException();
    this.handleUnhandledRejection();
  };
}

module.exports = new ErrorHandler();
