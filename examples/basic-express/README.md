# WebApp MCP Basic Example

This example demonstrates how to integrate WebApp MCP with a basic Express application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open http://localhost:3000 in your browser

4. Configure your AI assistant to use the MCP server:

Add to your Claude configuration:
```json
{
  "mcpServers": {
    "webapp": {
      "command": "npx",
      "args": ["@cgaspard/webappmcp-server", "--ws-port", "3101"],
      "env": {
        "MCP_AUTH_TOKEN": "demo-token"
      }
    }
  }
}
```

## Available MCP Tools

Once connected, your AI assistant can:

- **Query DOM elements**: Find buttons, inputs, and other elements
- **Click buttons**: Simulate user clicks
- **Type text**: Fill in form fields
- **Read content**: Extract text from the page
- **Access state**: Read JavaScript variables like `window.demoApp`
- **Monitor console**: See console logs
- **Take screenshots**: Capture the page or specific elements

## Example Commands

Ask your AI assistant to:

- "Click the 'Click Me!' button"
- "Type 'Hello World' in the text input"
- "Load the data by clicking the Load Data button"
- "What's the current click count?"
- "Toggle the content visibility"
- "What items are displayed in the list?"