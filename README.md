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
npm install @webappmcp/server
```

## Quick Start

### 1. Add to your Express application

```javascript
import express from 'express';
import { webappMCP } from '@webappmcp/middleware';

const app = express();

// Configure the MCP middleware
app.use(webappMCP({
  mcpPort: 3100,
  wsPort: 3101,
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN
  }
}));

app.listen(3000);
```

### 2. Add client to your frontend

```html
<script src="https://unpkg.com/@webappmcp/client"></script>
<script>
  const mcpClient = new WebAppMCPClient({
    serverUrl: 'ws://localhost:3101',
    authToken: 'your-auth-token'
  });
  
  mcpClient.connect();
</script>
```

Or with npm:

```javascript
import { WebAppMCPClient } from '@webappmcp/client';

const mcpClient = new WebAppMCPClient({
  serverUrl: 'ws://localhost:3101',
  authToken: 'your-auth-token'
});

mcpClient.connect();
```

### 3. Configure your AI assistant

Add the MCP server to your AI assistant configuration:

```json
{
  "mcpServers": {
    "webapp": {
      "command": "npx",
      "args": ["@webappmcp/server", "--port", "3100"],
      "env": {
        "MCP_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

## Available Tools

### DOM Inspection
- `dom.query` - Find elements using CSS selectors
- `dom.getProperties` - Get element properties and attributes
- `dom.getText` - Extract text content
- `dom.getHTML` - Get HTML structure

### User Interactions
- `interaction.click` - Click on elements
- `interaction.type` - Type text into inputs
- `interaction.scroll` - Scroll page or elements
- `interaction.hover` - Hover over elements

### Visual Capture
- `capture.screenshot` - Take full page screenshots
- `capture.elementScreenshot` - Capture specific elements

### State Management
- `state.getVariable` - Access JavaScript variables
- `state.localStorage` - Read/write local storage
- `console.getLogs` - Retrieve console logs

## Configuration Options

```javascript
webappMCP({
  // MCP server port
  mcpPort: 3100,
  
  // WebSocket port for client connections
  wsPort: 3101,
  
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
  }
});
```

## Examples

### Query DOM Elements
```javascript
// AI Assistant can use:
const buttons = await webapp.dom.query({ selector: 'button.primary' });
```

### Simulate User Interactions
```javascript
// Click a button
await webapp.interaction.click({ selector: '#submit-button' });

// Type into an input
await webapp.interaction.type({ 
  selector: '#email-input',
  text: 'user@example.com'
});
```

### Capture Screenshots
```javascript
// Full page screenshot
const screenshot = await webapp.capture.screenshot();

// Element screenshot
const elementShot = await webapp.capture.elementScreenshot({
  selector: '.product-card'
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
import { useWebAppMCP } from '@webappmcp/react';

function App() {
  const mcp = useWebAppMCP({
    serverUrl: 'ws://localhost:3101'
  });
  
  return <div>Your app content</div>;
}
```

### Vue
```javascript
import { WebAppMCPPlugin } from '@webappmcp/vue';

app.use(WebAppMCPPlugin, {
  serverUrl: 'ws://localhost:3101'
});
```

### Angular
```typescript
import { WebAppMCPModule } from '@webappmcp/angular';

@NgModule({
  imports: [WebAppMCPModule.forRoot({
    serverUrl: 'ws://localhost:3101'
  })]
})
export class AppModule { }
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