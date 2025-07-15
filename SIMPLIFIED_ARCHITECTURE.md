# Simplified WebApp MCP Architecture

## One Process, No Complexity! 🎉

The WebApp MCP Server now runs as a single integrated process. No more separate MCP server to manage!

## How It Works

```
┌─────────────────┐     ┌─────────────────────────────────┐     ┌─────────────────┐
│   AI Assistant  │────▶│   Your Express App              │────▶│   Browser       │
│   (Claude)      │◀────│   - Web Server (4834)           │◀────│   - UI          │
└─────────────────┘     │   - WebSocket (4835)            │     │   - DOM         │
         ↑              │   - MCP Server (integrated)      │     └─────────────────┘
         │              └─────────────────────────────────┘
         │                           │
         └───────────────────────────┘
              MCP Protocol (stdio)
```

## Configuration

Simply add `startMCPServer: true` to your middleware configuration:

```javascript
app.use(webappMCP({
  wsPort: 4835,
  authentication: {
    enabled: true,
    token: 'demo-token'
  },
  startMCPServer: true  // ← This is all you need!
}));
```

## Running Your App

### For Development (VS Code)
1. Press F5
2. Select "Todos App with Integrated MCP"
3. That's it! Everything starts in one process.

### For Production
```bash
node server-with-mcp.js
```

### For AI Assistant Configuration

Configure Claude to run your app directly:

```json
{
  "mcpServers": {
    "webapp": {
      "command": "node",
      "args": ["/path/to/your/app/server-with-mcp.js"],
      "env": {
        "MCP_AUTH_TOKEN": "demo-token"
      }
    }
  }
}
```

## Benefits

1. **Single Process** - No coordination between multiple processes
2. **No Port Conflicts** - The MCP server connects to its own WebSocket
3. **Simpler Deployment** - Just run your Express app
4. **Easier Debugging** - Everything in one console
5. **Lower Resource Usage** - One Node.js process instead of two

## Migration from Separate MCP Server

If you were using the separate MCP server:

**Before:**
- Run Express app
- Run MCP server separately
- Manage two processes

**Now:**
- Just run your Express app with `startMCPServer: true`
- Done!

## How the Integration Works

1. Your Express app starts normally
2. The middleware creates a WebSocket server
3. When `startMCPServer: true`, it also starts an MCP server
4. The MCP server connects to its own WebSocket server
5. AI commands flow: Claude → MCP → WebSocket → Browser

Everything runs in the same Node.js process, making it much simpler to manage!