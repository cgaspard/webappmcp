const express = require('express');
const path = require('path');
const { webappMCP } = require('@cgaspard/webappmcp');

const app = express();
const PORT = process.env.PORT || 4834;

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

// Configure WebApp MCP middleware
app.use(webappMCP({
  wsPort: 4835,
  appPort: PORT,  // Tell the middleware what port we're using
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN || 'demo-token'
  },
  transport: transport,
  mcpEndpointPath: '/mcp/sse',
  debug: false,
  captureServerLogs: true,  // Enable server log capture
  serverLogLimit: 500  // Store up to 500 log entries
}));

// Add API endpoints with logging
app.get('/api/test-logs', (req, res) => {
  console.log('[API] Test logs endpoint hit');
  console.info('[API] Processing test log request...');
  console.warn('[API] This is a warning - just for testing!');
  
  // Log an object
  console.log('[API] Request details:', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Simulate different scenarios
  const randomNum = Math.random();
  if (randomNum < 0.3) {
    console.error('[API] Simulated error condition occurred!', { randomNum });
  }
  
  res.json({ 
    message: 'Logs generated successfully!',
    randomNum,
    timestamp: new Date().toISOString()
  });
});

// Add a periodic log generator
setInterval(() => {
  const messages = [
    'Server health check',
    'Memory usage check',
    'Active connections check',
    'Cache cleanup'
  ];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  console.info(`[CRON] ${randomMessage} - ${new Date().toISOString()}`);
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
  
  // Test different log levels on startup
  console.log('[STARTUP] Server initialized successfully');
  console.info('[STARTUP] All systems operational');
  console.warn('[STARTUP] Running in development mode');
  
  // Log server configuration
  console.log('[CONFIG] Server configuration:', {
    port: PORT,
    wsPort: 4835,
    transport,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime()
  });
});