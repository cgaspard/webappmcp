# @cgaspard/webappmcp-server

Standalone MCP server for web application interaction - enables AI assistants to control web applications through the Model Context Protocol.

## Installation

```bash
npm install -g @cgaspard/webappmcp-server
```

## Usage

### Command Line

```bash
# Start the MCP server
webappmcp-server --port 3100 --ws-port 3101

# Start with custom configuration
webappmcp-server --transport sse --cors-origin "http://localhost:3000"
```

### Programmatic Usage

```javascript
import { MCPServer } from '@cgaspard/webappmcp-server';

const server = new MCPServer({
  port: 3100,
  wsPort: 3101,
  transport: 'sse',
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true
  }
});

await server.start();
console.log('MCP server started on port 3100');
```

## Command Line Options

- `--port, -p`: MCP server port (default: 3100)
- `--ws-port, -w`: WebSocket server port (default: 3101)
- `--transport, -t`: Transport type (sse, stdio, socket)
- `--cors-origin`: CORS allowed origins
- `--socket-path`: Unix socket path (for socket transport)
- `--debug`: Enable debug logging

## MCP Tools

The server provides comprehensive tools for web application interaction:

### DOM Operations
- `dom_query` - Find elements using CSS selectors
- `dom_get_properties` - Get element properties and attributes
- `dom_get_text` - Extract text content from elements
- `dom_get_html` - Get HTML structure
- `dom_manipulate` - Modify DOM elements

### User Interactions
- `interaction_click` - Click on elements
- `interaction_type` - Type text into input fields
- `interaction_scroll` - Scroll page or specific elements
- `interaction_hover` - Hover over elements

### Application State
- `state_get_variable` - Access JavaScript object properties
- `state_local_storage` - Read/write browser localStorage
- `console_get_logs` - Retrieve console log messages

### Visual Capture
- `capture_screenshot` - Take full page screenshots
- `capture_element_screenshot` - Capture specific element screenshots

### Diagnostic Tools
- `webapp_list_clients` - List connected browser clients
- `javascript_inject` - Execute JavaScript code in browser

## Configuration with Claude CLI

Add to your Claude CLI configuration:

```json
{
  "mcpServers": {
    "webapp": {
      "command": "webappmcp-server",
      "args": ["--port", "3100", "--transport", "sse"],
      "env": {}
    }
  }
}
```

Or for SSE transport:

```json
{
  "mcpServers": {
    "webapp-sse": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3100/mcp/sse"
      }
    }
  }
}
```

## Security

- Enable authentication for production use
- Configure CORS appropriately for your domains
- Use HTTPS in production environments
- Consider rate limiting for API endpoints

## License

MIT