const express = require('express');
const path = require('path');

// IMPORTANT: Load WebApp MCP middleware BEFORE Winston to ensure interception
const { webappMCP } = require('../../packages/webappmcp');

// Now load Winston after the middleware module is loaded
const winston = require('winston');

// Create Winston logger with multiple transports
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    // File transport (this bypasses stdout/stderr)
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

const app = express();

// Add WebApp MCP middleware with server log capture enabled
app.use(webappMCP({
  wsPort: 4840,
  appPort: 3005,
  authentication: {
    enabled: true,
    token: 'test-winston-token'
  },
  captureServerLogs: true,
  serverLogLimit: 1000,
  debug: true
}));

// Serve static files
app.use(express.static('public'));

// Test endpoint that uses Winston logger
app.get('/test-logs', (req, res) => {
  // Test different log levels with Winston
  logger.error('Winston ERROR: Test error message');
  logger.warn('Winston WARN: Test warning message');
  logger.info('Winston INFO: Test info message');
  logger.debug('Winston DEBUG: Test debug message');
  
  // Also test regular console logs
  console.log('Console LOG: Regular console.log message');
  console.error('Console ERROR: Regular console.error message');
  
  res.json({ 
    message: 'Logs generated using Winston and console',
    timestamp: new Date().toISOString()
  });
});

// Generate some startup logs
logger.info('[STARTUP] Winston test server initializing...');
logger.info('[STARTUP] Winston transports configured: Console, File');
logger.warn('[STARTUP] Running in test mode with Winston');

// Also use console for comparison
console.log('[STARTUP] Console: Server initialized successfully');
console.info('[STARTUP] Console: All systems operational');
console.warn('[STARTUP] Console: Running in development mode');

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  logger.info(`Winston test server listening on port ${PORT}`);
  console.log(`Server accessible at http://localhost:${PORT}`);
  console.log(`Test logs endpoint: http://localhost:${PORT}/test-logs`);
  console.log(`MCP SSE endpoint: http://localhost:${PORT}/mcp/sse`);
});