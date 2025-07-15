# WebApp MCP Architecture

## Why Two Separate Processes?

The WebApp MCP system uses two separate processes for a clean separation of concerns:

### 1. Web Application (Port 4834)
- Your actual web application (Express server)
- Serves the frontend (HTML/CSS/JS)
- Handles business logic (API endpoints)
- Includes WebSocket server (Port 4835) via middleware
- This is what users interact with in their browser

### 2. MCP Server (Separate Process)
- Implements the Model Context Protocol
- This is what AI assistants (like Claude) connect to
- Acts as a bridge between AI and your web app
- Connects to the WebSocket server to execute commands
- Runs using stdio (standard input/output) communication

## How They Work Together

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Assistant  │────▶│   MCP Server    │────▶│  WebSocket      │────▶│   Web App       │
│   (Claude)      │◀────│   (stdio)       │◀────│  (Port 4835)    │◀────│  (Port 4834)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **AI Assistant** sends MCP protocol commands
2. **MCP Server** translates these to WebSocket messages
3. **WebSocket Server** (part of web app) executes in browser context
4. **Web App** performs the actual DOM operations

## Port Configuration

- **4834**: Web application (HTTP)
- **4835**: WebSocket server for MCP communication

These ports were chosen to be unique and avoid conflicts with common services.

## VS Code Launch Configurations

### "Launch Todos App" (Web Only)
- Starts just the web application
- Good for testing the web app independently
- Access at http://localhost:4834

### "Debug MCP Server (For AI Assistant)"
- Starts just the MCP server
- Used when you want to debug MCP protocol issues
- Requires the web app to be running separately

### "Full Stack: Todos + MCP Server" (Recommended)
- Starts both processes together
- This is what you want for full AI integration
- Web app at http://localhost:4834
- MCP server ready for AI connections

## Configuration for AI Assistants

When configuring Claude or other AI assistants, use:

```json
{
  "mcpServers": {
    "webapp": {
      "command": "node",
      "args": ["/path/to/packages/server/dist/index.js"],
      "env": {
        "MCP_AUTH_TOKEN": "demo-token",
        "WS_PORT": "4835"
      }
    }
  }
}
```

The MCP server will automatically connect to the WebSocket server running on port 4835.