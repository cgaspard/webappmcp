# WebApp MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with web applications through DOM inspection, user interaction simulation, and application state management.

## Features

- 🔍 **DOM Inspection** - Query and inspect DOM elements using CSS selectors
- 🖱️ **User Interaction** - Simulate clicks, typing, scrolling, and other user actions
- 📸 **Visual Capture** - Take screenshots of pages or specific elements
- 🔧 **State Access** - Read application state, local storage, and console logs
- 🚀 **Framework Support** - Works with React, Vue, Angular, and vanilla JavaScript
- 🔒 **Secure** - Built-in authentication and permission controls

## Installation

```bash
npm install @cgaspard/webappmcp
```

## Quick Start

### 1. Add to your Express application

```javascript
import express from 'express';
import { webappMCP } from '@cgaspard/webappmcp';

const app = express();

// Configure the MCP middleware
app.use(webappMCP({
  transport: 'sse',
  wsPort: 4835,
  appPort: 3000,  // Tell middleware what port Express will use
  cors: {
    origin: true,
    credentials: true
  }
}));

app.listen(3000);
// The middleware will display the correct MCP URL when initialized
```

### 2. Add client to your frontend

```html
<script src="https://unpkg.com/@cgaspard/webappmcp/dist/browser.min.js"></script>
<script>
  const mcpClient = new WebAppMCP.WebAppMCPClient({
    serverUrl: 'ws://localhost:4835',
    autoConnect: true
  });
  
  mcpClient.connect();
</script>
```

Or with npm:

```javascript
import { WebAppMCPClient } from '@cgaspard/webappmcp';

const mcpClient = new WebAppMCPClient({
  serverUrl: 'ws://localhost:4835',
  autoConnect: true
});

mcpClient.connect();
```

### 3. Configure your AI assistant

#### Claude Desktop App

Add using the command line (example for basic todos app):
```bash
claude mcp add webapp-sse sse:http://localhost:4834/mcp/sse
```

For any of the example apps, use the same standardized port:
- **All Examples**: `http://localhost:4834/mcp/sse`

Or manually edit your configuration (example for basic todos app):
```json
{
  "mcpServers": {
    "webapp-sse": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:4834/mcp/sse"
      }
    }
  }
}
```

#### Claude Code CLI

Add to your Claude Code configuration (`~/.config/claude-code/settings.json`):
```json
{
  "mcpServers": {
    "webapp": {
      "transport": {
        "type": "sse", 
        "url": "http://localhost:4834/mcp/sse"
      }
    }
  }
}
```

#### Cline (VS Code Extension)

Add to your Cline MCP settings in VS Code:
```json
{
  "webapp": {
    "transport": {
      "type": "sse",
      "url": "http://localhost:4834/mcp/sse"
    }
  }
}
```

#### Continue.dev

Add to your Continue configuration (`~/.continue/config.json`):
```json
{
  "models": [...],
  "mcpServers": {
    "webapp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:4834/mcp/sse"
      }
    }
  }
}
```

#### Zed Editor

Add to your Zed assistant panel settings:
```json
{
  "mcpServers": {
    "webapp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:4834/mcp/sse"
      }
    }
  }
}
```

## Available Tools

All tools are prefixed with `webapp_` to prevent naming conflicts with other MCP servers.

### DOM Inspection
- `webapp_dom_query` - Find elements using CSS selectors
- `webapp_dom_get_properties` - Get element properties and attributes
- `webapp_dom_get_text` - Extract text content
- `webapp_dom_get_html` - Get HTML structure
- `webapp_dom_manipulate` - Modify DOM elements (setAttribute, addClass, etc.)

### User Interactions
- `webapp_interaction_click` - Click on elements
- `webapp_interaction_type` - Type text into inputs
- `webapp_interaction_scroll` - Scroll page or elements
- `webapp_interaction_hover` - Hover over elements

### Visual Capture
- `webapp_capture_screenshot` - Take full page screenshots
- `webapp_capture_element_screenshot` - Capture specific elements

### State Management
- `webapp_state_get_variable` - Access JavaScript variables
- `webapp_state_local_storage` - Read/write local storage
- `webapp_console_get_logs` - Retrieve browser console logs
- `webapp_console_save_to_file` - Save browser logs to file

### Server-Side Tools
- `webapp_console_get_server_logs` - Retrieve Node.js server logs
- `webapp_server_execute_js` - Execute JavaScript on the server (sandboxed)
- `webapp_server_get_system_info` - Get process and system information
- `webapp_server_get_env` - Inspect environment variables (masked)

### Diagnostic Tools
- `webapp_list_clients` - List connected browser clients
- `webapp_javascript_inject` - Execute JavaScript code in the browser
- `webapp_execute_javascript` - Execute JavaScript with async support

## Terminology Guide

When working with AI assistants using WebApp MCP, use these terms for clarity:

### Recommended Terms
- **"the connected web app"** - The web page being controlled (preferred)
- **"the browser client"** - The frontend/browser instance
- **"the target application"** - Formal term for the controlled app
- **"the MCP client"** - When discussing the MCP connection

### Example Usage
✅ **Good:**
- "Click the submit button in the connected web app"
- "Take a screenshot of the browser client"
- "Get the current route from the target application"

❌ **Avoid:**
- "Click the button" (ambiguous)
- "Check the page" (which page?)
- "Get the state" (from where?)

## Configuration Options

```javascript
webappMCP({
  // Transport type: 'sse' (default), 'stdio', 'socket', or 'none'
  transport: 'sse',
  
  // Express app port (defaults to process.env.PORT || 3000)
  appPort: 3000,
  
  // WebSocket port for client connections
  wsPort: 4835,
  
  // MCP SSE endpoint path
  mcpEndpointPath: '/mcp/sse',
  
  // Authentication settings
  authentication: {
    enabled: true,
    token: 'your-secure-token'
  },
  
  // Permission controls
  permissions: {
    read: true,        // Allow DOM reading
    write: true,       // Allow DOM modifications
    screenshot: true,  // Allow screenshots
    state: true        // Allow state access
  },
  
  // CORS settings
  cors: {
    origin: '*',
    credentials: true
  },
  
  // Screenshot storage directory (relative to project root)
  screenshotDir: '.webappmcp/screenshots',
  
  // Debug logging
  debug: false,
  
  // Server-side console log capture
  captureServerLogs: true,     // Enable/disable all server log capture (default: true)
  serverLogLimit: 1000,         // Maximum logs to keep in memory (default: 1000)

  // Winston logger (RECOMMENDED: pass your logger directly)
  winstonLogger: logger,       // Optional Winston logger instance for direct integration

  // Granular log capture configuration
  logCapture: {
    console: false,   // Capture console.log/warn/error/info (disable if using Winston)
    streams: false,   // Capture stdout/stderr streams (disable if using Winston)
    winston: true,    // Capture Winston logs via transport (default: true)
    bunyan: false,    // Capture Bunyan logs (default: true)
    pino: false,      // Capture Pino logs (default: true)
    debug: false,     // Capture debug library logs (default: true)
    log4js: false     // Capture log4js logs (default: true)
  }
});
```

### Server Log Capture

WebApp MCP can capture server-side console logs and logging library output, making them accessible through the MCP tools. This is especially useful for debugging and monitoring.

#### Features

- **Multi-layer capture**: Intercepts logs at library, console, and stream levels
- **Winston support**: Direct integration via manual configuration (recommended)
- **Circular buffer**: Keeps only the most recent logs (configurable limit)
- **Selective capture**: Choose which log sources to capture
- **Performance-friendly**: Disable specific interceptors for better performance

#### Winston Integration (Recommended)

The best way to capture Winston logs is to pass your logger directly:

```javascript
const winston = require('winston');

// Create Winston logger
const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()]
});

// Pass it to the middleware
const mcpMiddleware = app.use(webappMCP({
  winstonLogger: logger,  // Direct integration (recommended!)
  captureServerLogs: true,
  logCapture: {
    console: false,  // Disable console capture
    winston: true    // Winston capture via winstonLogger param
  }
}));

// Alternative: Attach logger after setup (if created elsewhere)
// mcpMiddleware.attachWinston(logger);
```

#### Configuration Examples

```javascript
// Winston-only capture (recommended for production)
const logger = winston.createLogger({ /* ... */ });

app.use(webappMCP({
  winstonLogger: logger,
  captureServerLogs: true,
  logCapture: {
    console: false,
    streams: false,
    winston: true
  }
}));

// Console only (lightweight, development)
app.use(webappMCP({
  captureServerLogs: true,
  logCapture: {
    console: true,
    streams: false,
    winston: false
  }
}));

// Attach Winston from separate module
const mcpMiddleware = app.use(webappMCP({ captureServerLogs: true }));
const logger = require('./config/logger');
mcpMiddleware.attachWinston(logger);  // Attach after the fact
```

## Examples

Check out the [Todos App Example](examples/todos) - a fully functional todo application that demonstrates all WebApp MCP features.

### Common Use Cases

```javascript
// Add a new todo
await webapp.interaction.type({ 
  selector: '#new-todo',
  text: 'Buy groceries'
});
await webapp.interaction.click({ selector: '#add-todo' });

// Toggle todo completion
await webapp.interaction.click({ selector: '.todo-checkbox' });

// Filter todos
await webapp.interaction.click({ selector: '[data-filter="active"]' });

// Access application state
const todos = await webapp.state.getVariable({ 
  path: 'window.todosApp.todos' 
});
```

## Security

WebApp MCP Server includes several security features:

- **Authentication** - Token-based authentication for MCP connections
- **Rate Limiting** - Prevent abuse with configurable rate limits
- **Input Sanitization** - All DOM queries are sanitized to prevent XSS
- **Permission Control** - Fine-grained control over allowed operations
- **HTTPS Support** - Secure WebSocket connections

## Framework Integration

### React
```javascript
import { useEffect } from 'react';
import { WebAppMCPClient } from '@cgaspard/webappmcp';

function App() {
  useEffect(() => {
    const client = new WebAppMCPClient({
      serverUrl: 'ws://localhost:4835',
      autoConnect: true
    });
    
    client.connect();
    
    return () => client.disconnect();
  }, []);
  
  return <div>Your app content</div>;
}
```

### Vue
```javascript
import { WebAppMCPClient } from '@cgaspard/webappmcp';

export default {
  mounted() {
    this.mcpClient = new WebAppMCPClient({
      serverUrl: 'ws://localhost:4835',
      autoConnect: true
    });
    
    this.mcpClient.connect();
  },
  
  beforeUnmount() {
    if (this.mcpClient) {
      this.mcpClient.disconnect();
    }
  }
}
```

### Angular
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebAppMCPClient } from '@cgaspard/webappmcp';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  private mcpClient: WebAppMCPClient;
  
  ngOnInit() {
    this.mcpClient = new WebAppMCPClient({
      serverUrl: 'ws://localhost:4835',
      autoConnect: true
    });
    
    this.mcpClient.connect();
  }
  
  ngOnDestroy() {
    if (this.mcpClient) {
      this.mcpClient.disconnect();
    }
  }
}
```

## Development

```bash
# Clone the repository
git clone https://github.com/cgaspard/webappmcp.git
cd webappmcp

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

## VS Code Integration

This project includes full VS Code support for easy development and debugging. See [VS_CODE_SETUP.md](VS_CODE_SETUP.md) for details.

Quick start with VS Code:
1. Open the project in VS Code
2. Press `F5` to launch both the demo app and MCP server
3. Visit http://localhost:3456 to see the demo

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [cgaspard](https://github.com/cgaspard)

## Support

- 📚 [Documentation](https://github.com/cgaspard/webappmcp/wiki)
- 🐛 [Issue Tracker](https://github.com/cgaspard/webappmcp/issues)
- 💬 [Discussions](https://github.com/cgaspard/webappmcp/discussions)

---

Built with ❤️ to make AI-powered web automation accessible to everyone.