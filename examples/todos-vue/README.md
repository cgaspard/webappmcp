# Vue Todos - WebApp MCP Demo

A Vue 3-based todo application demonstrating WebApp MCP integration.

## Features

- Full todo management (add, toggle, delete, clear completed)
- Vue 3 Composition API
- Vite for fast development
- WebApp MCP integration for AI interaction
- LocalStorage persistence

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. For development:
```bash
npm run dev
```

3. For production with MCP:
```bash
npm run build
npm run serve -- --sse
```

## MCP Transport Options

- `--sse` - Use SSE transport (default)
- `--stdio` - Use stdio transport
- `--socket` - Use Unix socket transport
- `--none` - Disable MCP transport

## Ports

- Development: http://localhost:5174
- Production: http://localhost:4838
- WebSocket: ws://localhost:4839