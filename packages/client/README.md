# @cgaspard/webappmcp-client

Browser client for WebApp MCP integration - connects web applications to AI assistants through WebSocket communication.

## Installation

```bash
npm install @cgaspard/webappmcp-client
```

## Quick Start

### ES Modules

```javascript
import { WebAppMCPClient } from '@cgaspard/webappmcp-client';

const client = new WebAppMCPClient({
  serverUrl: 'ws://localhost:3101',
  autoConnect: true
});

client.connect();
```

### Script Tag

```html
<script src="https://unpkg.com/@cgaspard/webappmcp-client/dist/webappmcp-client.min.js"></script>
<script>
  const client = new WebAppMCP.WebAppMCPClient({
    serverUrl: 'ws://localhost:3101',
    autoConnect: true
  });
  
  client.connect();
</script>
```

### React Integration

```jsx
import { useEffect } from 'react';
import { WebAppMCPClient } from '@cgaspard/webappmcp-client';

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

## Configuration Options

```javascript
const client = new WebAppMCPClient({
  serverUrl: 'ws://localhost:3101',    // WebSocket server URL
  autoConnect: true,                   // Auto-connect on instantiation
  reconnect: true,                     // Auto-reconnect on disconnect
  reconnectInterval: 5000,             // Reconnect interval in ms
  maxReconnectAttempts: 10,            // Max reconnection attempts
  debug: false                         // Enable debug logging
});
```

## Features

- **Automatic Connection Management**: Handles WebSocket connections with auto-reconnect
- **DOM Operation Handling**: Processes requests from MCP server to interact with DOM
- **Framework Agnostic**: Works with React, Vue, Angular, or vanilla JavaScript
- **Real-time Communication**: Bidirectional communication with MCP server
- **Error Handling**: Robust error handling and connection recovery

## Events

```javascript
client.on('connected', () => {
  console.log('Connected to MCP server');
});

client.on('disconnected', () => {
  console.log('Disconnected from MCP server');
});

client.on('error', (error) => {
  console.error('MCP client error:', error);
});
```

## License

MIT