const express = require('express');
const path = require('path');
const { webappMCP } = require('@webappmcp/middleware');

const app = express();
const port = process.env.PORT || 3456;

// Configure WebApp MCP middleware
app.use(webappMCP({
  wsPort: 3101,
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN || 'demo-token'
  },
  permissions: {
    read: true,
    write: true,
    screenshot: true,
    state: true
  }
}));

// Serve static files
app.use(express.static('public'));

// Example API endpoint
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from WebApp MCP!',
    timestamp: new Date().toISOString(),
    items: [
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item 2', value: 200 },
      { id: 3, name: 'Item 3', value: 300 }
    ]
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
  console.log(`WebApp MCP WebSocket server at ws://localhost:3101`);
  console.log(`Auth token: ${process.env.MCP_AUTH_TOKEN || 'demo-token'}`);
});