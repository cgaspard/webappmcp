const express = require('express');
const path = require('path');
const { webappMCP } = require('@cgaspard/webappmcp-middleware');

const app = express();
const PORT = process.env.PORT || 4838;

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

// Configure WebApp MCP middleware
app.use(webappMCP({
  wsPort: 4839,
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN || 'demo-token'
  },
  transport: transport,
  mcpEndpointPath: '/mcp/sse'
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
  console.log(`WebApp MCP WebSocket server at ws://localhost:4839`);
  console.log(`MCP transport: ${transport}`);
  console.log(`Auth token: ${process.env.MCP_AUTH_TOKEN || 'demo-token'}`);
});