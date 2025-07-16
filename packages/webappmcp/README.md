# @cgaspard/webappmcp

WebApp MCP (Model Context Protocol) - A comprehensive toolkit for enabling AI assistants to interact with web applications through DOM inspection, user interaction simulation, and state management.

## Installation

```bash
npm install @cgaspard/webappmcp
```

For global CLI usage:
```bash
npm install -g @cgaspard/webappmcp
```

## Quick Start

### Express Middleware

```javascript
import express from 'express';
import { webappMCP } from '@cgaspard/webappmcp';

const app = express();

// Add WebApp MCP middleware
app.use(webappMCP({
  transport: 'sse',
  mcpPort: 3100,
  wsPort: 3101,
  cors: {
    origin: true,
    credentials: true
  }
}));

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('MCP SSE endpoint: http://localhost:3000/mcp/sse');
  console.log('WebSocket server: ws://localhost:3101');
});
```

### Browser Client

#### ES Modules
```javascript
import { WebAppMCPClient } from '@cgaspard/webappmcp';

const client = new WebAppMCPClient({
  serverUrl: 'ws://localhost:3101',
  autoConnect: true
});

client.connect();
```

#### Script Tag
```html
<script src="https://unpkg.com/@cgaspard/webappmcp/dist/browser.min.js"></script>
<script>
  const client = new WebAppMCP.WebAppMCPClient({
    serverUrl: 'ws://localhost:3101',
    autoConnect: true
  });
  
  client.connect();
</script>
```

### Standalone Server

```bash
# Run the standalone MCP server
webappmcp-server --port 3100 --ws-port 3101
```

## Features

### MCP Tools Available

- **DOM Operations**
  - `dom_query` - Find elements using CSS selectors
  - `dom_get_properties` - Get element properties and attributes
  - `dom_get_text` - Extract text content
  - `dom_get_html` - Get HTML structure
  - `dom_manipulate` - Modify DOM elements

- **User Interactions**
  - `interaction_click` - Click on elements
  - `interaction_type` - Type text into inputs
  - `interaction_scroll` - Scroll page or elements
  - `interaction_hover` - Hover over elements

- **State Management**
  - `state_get_variable` - Access JavaScript variables
  - `state_local_storage` - Read/write localStorage
  - `console_get_logs` - Retrieve console logs

- **Visual Capture**
  - `capture_screenshot` - Take full page screenshots
  - `capture_element_screenshot` - Capture specific elements

- **Diagnostic Tools**
  - `webapp_list_clients` - List connected browser clients
  - `javascript_inject` - Execute JavaScript code
  - `execute_javascript` - Execute JavaScript with async support

## Framework Integration

### React
```jsx
import { useEffect } from 'react';
import { WebAppMCPClient } from '@cgaspard/webappmcp';

function App() {
  useEffect(() => {
    const client = new WebAppMCPClient({
      serverUrl: 'ws://localhost:3101',
      autoConnect: true
    });
    
    client.connect();
    
    return () => client.disconnect();
  }, []);
  
  return <div>Your React App</div>;
}
```

### Vue
```javascript
import { WebAppMCPClient } from '@cgaspard/webappmcp';

export default {
  mounted() {
    this.mcpClient = new WebAppMCPClient({
      serverUrl: 'ws://localhost:3101',
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

## Configuration

### Middleware Options
```javascript
{
  transport: 'sse',          // 'sse', 'stdio', 'socket', 'none'
  mcpPort: 3100,            // MCP server port
  wsPort: 3101,             // WebSocket server port
  cors: {                   // CORS configuration
    origin: true,
    credentials: true
  },
  authentication: {         // Optional auth
    enabled: false,
    token: 'your-token'
  },
  debug: false              // Enable debug logging (default: false)
}
```

### Client Options
```javascript
{
  serverUrl: 'ws://localhost:3101',    // WebSocket URL
  autoConnect: true,                   // Auto-connect on init
  reconnect: true,                     // Auto-reconnect
  reconnectInterval: 5000,             // Reconnect interval (ms)
  maxReconnectAttempts: 10,           // Max reconnect attempts
  enableDevTools: false,               // Show DevTools overlay
  debug: false                         // Enable debug logging (default: false)
}
```

## MCP Client Configuration

### Claude Desktop App

Add using the command line:
```bash
claude mcp add webapp-sse sse:http://localhost:3000/mcp/sse
```

Or manually edit your configuration:
```json
{
  "mcpServers": {
    "webapp-sse": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse"
      }
    }
  }
}
```

### Claude Code CLI

Add to your Claude Code configuration (`~/.config/claude-code/settings.json`):
```json
{
  "mcpServers": {
    "webapp": {
      "transport": {
        "type": "sse", 
        "url": "http://localhost:3000/mcp/sse"
      }
    }
  }
}
```

### Cline (VS Code Extension)

Add to your Cline MCP settings in VS Code:
```json
{
  "webapp": {
    "transport": {
      "type": "sse",
      "url": "http://localhost:3000/mcp/sse"
    }
  }
}
```

### Continue.dev

Add to your Continue configuration (`~/.continue/config.json`):
```json
{
  "models": [...],
  "mcpServers": {
    "webapp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse"
      }
    }
  }
}
```

### Zed Editor

Add to your Zed assistant panel settings:
```json
{
  "mcpServers": {
    "webapp": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse"
      }
    }
  }
}
```

## Examples

See the `examples` directory for complete working examples with:
- Basic Express integration
- Todo app with vanilla JavaScript
- React Todo app
- Vue.js Todo app

## License

MIT