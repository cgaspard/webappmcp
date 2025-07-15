# VS Code Setup for WebApp MCP Server

This guide helps you run and debug the WebApp MCP Server using VS Code.

## Quick Start

1. **Open the project in VS Code**:
   ```bash
   code /Users/cgaspard/Projects/cgaspard/webappmcp
   ```

2. **Install dependencies** (if not already done):
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Tasks: Run Task"
   - Select "Install Dependencies"

3. **Launch the application**:
   - Press `F5` or go to Run → Start Debugging
   - Select "Full Stack: Demo + MCP Server"
   - This will:
     - Build all packages
     - Start the Express demo server on http://localhost:3456
     - Start the MCP server ready for connections

## Available Launch Configurations

### 1. Full Stack: Demo + MCP Server
- Launches both the demo Express app and MCP server
- Perfect for testing the complete system
- Access the demo at http://localhost:3456

### 2. Launch WebApp MCP Demo
- Only launches the Express demo application
- Use when you want to test just the web app

### 3. Debug MCP Server
- Launches only the MCP server for debugging
- Use when testing MCP protocol directly

### 4. Test WebSocket Client
- Runs the WebSocket test client
- Useful for testing WebSocket connectivity

## Available Tasks

Press `Cmd+Shift+P` → "Tasks: Run Task" to see all available tasks:

- **Build All Packages** - Builds all TypeScript packages
- **Start Demo Server** - Starts the demo Express server
- **Watch All** - Starts TypeScript watch mode for development
- **Stop All Services** - Stops all running Node.js services

## Debugging Tips

1. **Set breakpoints** in TypeScript files:
   - Click in the gutter next to line numbers
   - The debugger will stop at breakpoints when hit

2. **View console output**:
   - Debug Console shows MCP server output
   - Terminal shows Express server logs

3. **Inspect variables**:
   - Hover over variables while debugging
   - Use the Variables panel in the Debug sidebar

## Testing with Claude

Once the servers are running:

1. **Configure Claude** with this MCP configuration:
   ```json
   {
     "mcpServers": {
       "webapp": {
         "command": "node",
         "args": ["/Users/cgaspard/Projects/cgaspard/webappmcp/packages/server/dist/index.js"],
         "env": {
           "MCP_AUTH_TOKEN": "demo-token",
           "WS_PORT": "3101"
         }
       }
     }
   }
   ```

2. **Test by asking Claude**:
   - "Use the webapp MCP server to click the 'Click Me!' button"
   - "What's displayed on the webpage at localhost:3456?"
   - "Type 'Hello from Claude' in the text input"

## Troubleshooting

### Port already in use
If you see "EADDRINUSE" errors:
1. Run the "Stop All Services" task
2. Or manually: `pkill -f "node.*server.js"`

### Build errors
1. Run "Install Dependencies" task
2. Run "Build All Packages" task
3. Check TypeScript errors in Problems panel

### WebSocket connection issues
1. Ensure MCP_AUTH_TOKEN matches in all configs
2. Check firewall isn't blocking port 3101
3. Verify the demo server is running on port 3456