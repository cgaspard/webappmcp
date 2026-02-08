const express = require('express');
const path = require('path');
const winston = require('winston');
const { webappMCP } = require('@cgaspard/webappmcp');

const app = express();
const PORT = process.env.PORT || 4834;

// Create Winston logger BEFORE middleware setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Parse command line arguments
const args = process.argv.slice(2);
let transport = 'sse';

if (args.includes('--stdio')) {
  transport = 'stdio';
} else if (args.includes('--sse')) {
  transport = 'sse';
} else if (args.includes('--socket')) {
  transport = 'socket';
} else if (args.includes('--none')) {
  transport = 'none';
}

// Add Express logging middleware (commented out to reduce noise)
// app.use((req, res, next) => {
//   const timestamp = new Date().toISOString();
//   console.log(`[Express] ${timestamp} ${req.method} ${req.url}`);
//   console.log(`[Express] Headers:`, req.headers);
//   if (req.body && Object.keys(req.body).length > 0) {
//     console.log(`[Express] Body:`, req.body);
//   }
//   next();
// });

// Configure WebApp MCP middleware with manual Winston configuration (recommended)
app.use(webappMCP({
  wsPort: 4835,
  appPort: PORT,
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN || 'demo-token'
  },
  transport: transport,
  mcpEndpointPath: '/mcp/sse',
  debug: true,
  captureServerLogs: true,
  serverLogLimit: 500,
  winstonLogger: logger,  // Pass Winston logger directly (recommended!)
  // Winston-only capture - disable other interceptors
  logCapture: {
    console: false,  // DISABLE console capture
    streams: false,  // DISABLE stream capture
    winston: true,   // ENABLE Winston capture (but handled via winstonLogger param)
    bunyan: false,
    pino: false,
    debug: false,
    log4js: false
  }
}));

// Add API endpoints with mixed logging
app.get('/api/test-logs', (req, res) => {
  // Console logs - should NOT be captured
  console.log('[CONSOLE-API] Test logs endpoint hit');
  console.info('[CONSOLE-API] Processing test log request...');
  console.warn('[CONSOLE-API] This is a warning - just for testing!');
  
  // Winston logs - SHOULD be captured
  logger.info('[WINSTON-API] Test logs endpoint hit');
  logger.info('[WINSTON-API] Processing test log request...');
  logger.warn('[WINSTON-API] This is a warning - just for testing!');
  
  // Log objects
  console.log('[CONSOLE-API] Request details (console):', {
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
  
  logger.info('[WINSTON-API] Request details (winston):', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Simulate different scenarios
  const randomNum = Math.random();
  if (randomNum < 0.3) {
    console.error('[CONSOLE-API] Simulated error (console)!', { randomNum });
    logger.error('[WINSTON-API] Simulated error (winston)!', { randomNum });
  }
  
  res.json({ 
    message: 'Mixed logs generated! Check MCP to see only Winston logs.',
    randomNum,
    timestamp: new Date().toISOString()
  });
});

// Add a periodic log generator with BOTH loggers
setInterval(() => {
  const messages = [
    'Server health check',
    'Memory usage check',
    'Active connections check',
    'Cache cleanup'
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  // Console log - should NOT be captured
  console.info(`[CONSOLE-CRON] ${randomMessage} - ${new Date().toISOString()}`);
  
  // Winston log - SHOULD be captured
  logger.info(`[WINSTON-CRON] ${randomMessage} - ${new Date().toISOString()}`);
}, 30000); // Every 30 seconds

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the WebApp MCP client library
app.get('/webappmcp-client.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../packages/webappmcp/dist/browser.min.js'));
});

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Vue Todos app listening at http://localhost:${PORT}`);
  console.log(`WebApp MCP WebSocket server at ws://localhost:4835`);
  console.log(`MCP transport: ${transport}`);
  console.log(`Auth token: ${process.env.MCP_AUTH_TOKEN || 'demo-token'}`);
  
  // Test BOTH Winston and console logs
  console.log('[CONSOLE] This is a regular console.log - should NOT be captured');
  console.error('[CONSOLE] This is console.error - should NOT be captured');
  
  logger.info('[WINSTON] Server initialized successfully - should BE captured');
  logger.warn('[WINSTON] Running in development mode - should BE captured');
  logger.error('[WINSTON] Test error message - should BE captured');
  
  // Mixed logging
  console.log('[CONSOLE] Server configuration (console):', {
    port: PORT,
    wsPort: 4835,
    transport
  });
  
  logger.info('[WINSTON] Server configuration (winston):', {
    port: PORT,
    wsPort: 4835,
    transport,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime()
  });
  
  console.log('\n=== LOG CAPTURE TEST ===');
  console.log('Console logs: DISABLED (should not appear in MCP)');
  console.log('Winston logs: ENABLED (should appear in MCP)');
  console.log('========================\n');
});