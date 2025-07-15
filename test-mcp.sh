#!/bin/bash

# Start the MCP server
export MCP_AUTH_TOKEN="demo-token"
export WS_PORT="3101"

echo "Starting WebApp MCP Server..."
echo "WebSocket port: $WS_PORT"
echo "Auth token: $MCP_AUTH_TOKEN"
echo ""
echo "Send commands to stdin, responses will appear on stdout"
echo "Example: {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"
echo ""

node packages/server/dist/index.js