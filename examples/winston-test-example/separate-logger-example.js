/**
 * Example: Winston logger created in a separate module
 *
 * This demonstrates how to attach a Winston logger that's created
 * in a different file from where the middleware is set up.
 */

const express = require('express');
const { webappMCP } = require('@cgaspard/webappmcp');

// Simulate logger being in a separate module
const { logger } = require('./logger-config');

const app = express();
const PORT = process.env.PORT || 4836;

// Setup middleware WITHOUT passing logger initially
const mcpMiddleware = app.use(webappMCP({
  wsPort: 4835,
  appPort: PORT,
  transport: 'sse',
  captureServerLogs: true,
  serverLogLimit: 500,
  // Winston capture enabled but no logger provided yet
  logCapture: {
    console: false,
    winston: true,
    streams: false,
  }
}));

// Later, after middleware is set up, attach the Winston logger
// This can be done from anywhere in your application!
mcpMiddleware.attachWinston(logger);

console.log('✅ Winston logger attached after middleware setup!');

// API endpoint that generates logs
app.get('/api/test', (req, res) => {
  logger.info('[Winston] API request received');
  logger.debug('[Winston] Processing request...', {
    path: req.path,
    method: req.method
  });

  res.json({
    message: 'Check the MCP server logs!',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`[Winston] Server started on port ${PORT}`);
  logger.info(`[Winston] MCP endpoint: http://localhost:${PORT}/mcp/sse`);

  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 MCP SSE endpoint: http://localhost:${PORT}/mcp/sse`);
  console.log(`\n💡 Winston logs will be captured via MCP!`);
});
