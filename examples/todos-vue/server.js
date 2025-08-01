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
  debug: false
}));

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
});