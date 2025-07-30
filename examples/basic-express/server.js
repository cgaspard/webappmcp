const express = require('express');
const path = require('path');
const { webappMCP } = require('@cgaspard/webappmcp');

const app = express();
const port = process.env.PORT || 4834;

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
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN || 'demo-token'
  },
  permissions: {
    read: true,
    write: true,
    screenshot: true,
    state: true
  },
  debug: false
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
  console.log(`WebApp MCP WebSocket server at ws://localhost:4835`);
  console.log(`Auth token: ${process.env.MCP_AUTH_TOKEN || 'demo-token'}`);
});