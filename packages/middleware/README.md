# @webappmcp/middleware

Express middleware for WebApp MCP integration - enables AI assistants to interact with web applications through the Model Context Protocol.

## Installation

```bash
npm install @webappmcp/middleware
```

## Quick Start

```javascript
import express from 'express';
import { webappMCP } from '@webappmcp/middleware';

const app = express();

// Add the WebApp MCP middleware
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

## Configuration Options

- `transport`: MCP transport type ('sse', 'stdio', 'socket', 'none')
- `mcpPort`: Port for MCP server (default: 3100)
- `wsPort`: Port for WebSocket server (default: 3101)
- `cors`: CORS configuration for WebSocket connections
- `authentication`: Optional authentication settings

## Features

- **DOM Inspection**: Query elements, get properties, traverse DOM tree
- **User Interactions**: Click, type, scroll, hover on elements
- **State Access**: Read JavaScript variables, localStorage, console logs
- **Visual Capture**: Take screenshots of pages or specific elements
- **Real-time Communication**: WebSocket-based client connections

## MCP Tools Available

- `dom_query` - Find elements using CSS selectors
- `dom_get_properties` - Get element properties and attributes
- `dom_get_text` - Extract text content
- `dom_get_html` - Get HTML structure
- `interaction_click` - Click on elements
- `interaction_type` - Type text into inputs
- `interaction_scroll` - Scroll page or elements
- `capture_screenshot` - Take full page screenshots
- `capture_element_screenshot` - Capture specific elements
- `state_get_variable` - Access JavaScript variables
- `state_local_storage` - Read/write local storage
- `console_get_logs` - Retrieve console logs
- `javascript_inject` - Execute JavaScript code

## License

MIT