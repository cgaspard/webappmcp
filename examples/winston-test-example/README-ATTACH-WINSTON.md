# Winston Logger Attachment - Usage Patterns

The WebApp MCP middleware now supports **three ways** to integrate Winston logging:

## ✅ Pattern 1: Pass Logger Directly (Recommended)

Create your Winston logger **before** setting up the middleware and pass it via config:

```javascript
const winston = require('winston');
const { webappMCP } = require('@cgaspard/webappmcp');

// 1. Create Winston logger FIRST
const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()]
});

// 2. Pass it directly to the middleware
app.use(webappMCP({
  winstonLogger: logger,  // ✅ Direct integration
  captureServerLogs: true,
  logCapture: {
    winston: true
  }
}));

// 3. Use your logger normally
logger.info('Server started!');
```

**Benefits:**
- Simple and straightforward
- Logger and middleware setup in same place
- Immediate integration

---

## ✅ Pattern 2: Attach After Setup (New!)

Create logger in a **separate module** and attach it after middleware setup:

```javascript
// server.js
const { webappMCP } = require('@cgaspard/webappmcp');
const { logger } = require('./logger-config'); // Logger from another file

// Setup middleware first
const mcpMiddleware = app.use(webappMCP({
  captureServerLogs: true,
  logCapture: { winston: true }
}));

// Attach Winston logger later (can be done from anywhere!)
mcpMiddleware.attachWinston(logger);
```

**Benefits:**
- Logger configuration lives in separate module
- Flexible - can attach from anywhere in your code
- Works with existing logger setup patterns
- No need to refactor your logging architecture

**Use this when:**
- Logger is configured in a separate file (`logger.js`, `config/logger.js`, etc.)
- Using a dependency injection pattern
- Logger instance is created asynchronously
- Working with existing codebases where logger setup is separate

---

## ⚠️ Pattern 3: Automatic Interception (Not Recommended)

Let the middleware try to find and intercept Winston automatically:

```javascript
app.use(webappMCP({
  captureServerLogs: true,
  logCapture: { winston: true }  // Will try to auto-detect
}));

// Create logger after middleware
const logger = winston.createLogger({ /* ... */ });
```

**Why not recommended:**
- Timing issues - may not find your logger
- Less reliable than explicit attachment
- Harder to debug when it doesn't work

---

## API Reference

### `middleware.attachWinston(logger)`

Attaches a Winston logger instance to the MCP middleware for log capture.

**Parameters:**
- `logger` (any): Winston logger instance to attach

**Returns:**
- `boolean`: `true` if successful, `false` if failed or already attached

**Example:**
```javascript
const success = mcpMiddleware.attachWinston(logger);
if (success) {
  console.log('✅ Winston attached successfully');
} else {
  console.error('❌ Failed to attach Winston');
}
```

**Notes:**
- Can only attach one logger (subsequent calls are ignored)
- Logger must have an `add()` method (standard Winston API)
- Will create and add a WebAppMCPTransport to your logger

---

## Configuration Options

```javascript
webappMCP({
  // Option 1: Pass logger directly
  winstonLogger: logger,

  // Enable server log capture
  captureServerLogs: true,

  // Maximum logs to store in memory
  serverLogLimit: 1000,

  // Control what gets captured
  logCapture: {
    console: false,   // Disable console.log capture
    winston: true,    // Enable Winston capture
    streams: false,   // Disable stdout/stderr capture
    bunyan: false,
    pino: false,
    debug: false,
    log4js: false
  }
})
```

---

## Common Use Cases

### Use Case 1: Microservice with Shared Logger Module

```javascript
// config/logger.js (shared across services)
const winston = require('winston');
module.exports = winston.createLogger({ /* ... */ });

// server.js
const logger = require('./config/logger');
const mcpMiddleware = app.use(webappMCP({ /* ... */ }));
mcpMiddleware.attachWinston(logger);  // ✅ Works perfectly
```

### Use Case 2: Async Logger Initialization

```javascript
// Setup middleware immediately
const mcpMiddleware = app.use(webappMCP({ /* ... */ }));

// Initialize logger asynchronously
async function initLogger() {
  const logger = await createCustomLogger();
  mcpMiddleware.attachWinston(logger);  // ✅ Attach when ready
}
initLogger();
```

### Use Case 3: Multiple Loggers (Different Instances)

```javascript
// Setup middleware
const mcpMiddleware = app.use(webappMCP({ /* ... */ }));

// Attach your main application logger
const appLogger = winston.createLogger({ /* ... */ });
mcpMiddleware.attachWinston(appLogger);

// Other loggers can still be used, but won't be captured
const debugLogger = winston.createLogger({ /* ... */ });
```

---

## Troubleshooting

### "Winston logger already attached, skipping"
You tried to attach a second logger. This is expected - only one logger can be attached per middleware instance.

### "Failed to create Winston transport"
The `winston-transport` package is not available. Make sure Winston is installed:
```bash
npm install winston
```

### Logs not appearing in MCP
1. Check `captureServerLogs: true` is set
2. Verify `logCapture.winston: true` is enabled
3. Ensure `attachWinston()` returned `true`
4. Try calling `logger.info('test')` and check MCP tools

---

## Examples

See the example files:
- `separate-logger-example.js` - Logger in separate module with `attachWinston()`
- `logger-config.js` - Typical logger configuration module
- `../todos-vue/server.js` - Direct logger passing pattern

Run the example:
```bash
cd examples/winston-test-example
node separate-logger-example.js
```
