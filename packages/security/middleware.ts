import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ValidationService } from './validation';

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Input validation middleware
export const validateInput = (req, res, next) => {
  const { body, query, params } = req;

  try {
    // Sanitize body
    if (body && typeof body === 'object') {
      for (const key in body) {
        if (typeof body[key] === 'string') {
          body[key] = ValidationService.sanitizeString(body[key]);
        }
      }
    }

    // Sanitize query parameters
    if (query) {
      for (const key in query) {
        if (typeof query[key] === 'string') {
          query[key] = ValidationService.sanitizeString(query[key]);
        }
      }
    }

    // Sanitize route parameters
    if (params) {
      for (const key in params) {
        if (typeof params[key] === 'string') {
          params[key] = ValidationService.sanitizeString(params[key]);
        }
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: 'Invalid input format',
      message: 'Input validation failed'
    });
  }
};

// API key validation middleware
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide a valid API key in X-API-Key header'
    });
  }

  if (!ValidationService.validateApiKey(apiKey)) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'API key format is invalid'
    });
  }

  // In production, you'd validate against your database
  req.apiKey = apiKey;
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log basic request info
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);

  // Log response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};