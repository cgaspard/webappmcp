# WebApp MCP Server - Development Guide

## Project Overview

This project creates an MCP (Model Context Protocol) server that enables AI assistants to interact with web applications through a comprehensive set of tools. The server acts as a bridge between AI models and web applications, providing DOM inspection, user interaction simulation, and application state management capabilities.

## Core Architecture

### 1. MCP Server Component
- Node.js-based MCP server that exposes tools for web application interaction
- Communicates with both backend Express middleware and frontend client
- Manages WebSocket connections for real-time DOM access

### 2. Express Middleware
- Installable as npm package dependency
- Integrates with existing Express applications
- Handles MCP server requests and routes them to appropriate handlers
- Manages WebSocket server for client connections

### 3. Frontend Client Library
- Framework-agnostic JavaScript library
- Supports React, Vue, Angular, and vanilla JS applications
- Establishes WebSocket connection to backend
- Executes DOM operations requested by MCP server
- Captures and transmits application state

## Key Features

### DOM Inspection Tools
- Query elements using CSS selectors
- Get element properties, attributes, and computed styles
- Traverse DOM tree (parents, children, siblings)
- Get text content and HTML structure
- Monitor DOM mutations

### User Interaction Simulation
- Click elements
- Type text into input fields
- Submit forms
- Hover over elements
- Scroll page or elements
- Drag and drop operations

### Application State Access
- Read JavaScript object properties
- Access component state (framework-specific)
- Monitor console logs
- Intercept network requests
- Access local storage and session storage

### Visual Capture
- Take full page screenshots
- Capture specific element screenshots
- Record user interaction sequences
- Get element bounding boxes and positions

## Implementation Details

### Package Structure
```
webappmcp/
├── packages/
│   ├── server/          # MCP server implementation
│   ├── middleware/      # Express middleware
│   └── client/          # Frontend client library
├── examples/            # Example applications
└── docs/               # Documentation
```

### MCP Tools to Implement

1. **dom.query** - Find elements using CSS selectors
2. **dom.getProperties** - Get element properties and attributes
3. **dom.getText** - Extract text content
4. **dom.getHTML** - Get HTML structure
5. **interaction.click** - Click on elements
6. **interaction.type** - Type text into inputs
7. **interaction.scroll** - Scroll page or elements
8. **capture.screenshot** - Take screenshots
9. **capture.elementScreenshot** - Capture specific elements
10. **state.getVariable** - Access JavaScript variables
11. **state.localStorage** - Read/write local storage
12. **console.getLogs** - Retrieve console logs

### Security Considerations

- Implement authentication for MCP server connections
- Sanitize all DOM queries to prevent XSS
- Rate limit requests to prevent abuse
- Allow configuration of permitted operations
- Implement CORS properly for WebSocket connections
- Provide option to run in read-only mode

### Configuration

Users will configure the middleware with:
```javascript
import { webappMCP } from '@cgaspard/webappmcp-middleware';

app.use(webappMCP({
  // MCP server configuration
  mcpPort: 3100,
  
  // WebSocket configuration
  wsPort: 3101,
  
  // Security settings
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN
  },
  
  // Allowed operations
  permissions: {
    read: true,
    write: true,
    screenshot: true
  }
}));
```

Frontend integration:
```javascript
import { WebAppMCPClient } from '@cgaspard/webappmcp-client';

const mcpClient = new WebAppMCPClient({
  serverUrl: 'ws://localhost:3101',
  authToken: 'your-auth-token'
});

mcpClient.connect();
```

## Development Phases

### Phase 1: Basic Infrastructure
- Set up monorepo structure
- Implement basic MCP server
- Create Express middleware
- Build WebSocket communication layer

### Phase 2: DOM Operations
- Implement DOM query tools
- Add element property access
- Build DOM traversal capabilities

### Phase 3: User Interactions
- Add click and type operations
- Implement scroll functionality
- Support form interactions

### Phase 4: Advanced Features
- Screenshot capabilities
- State management access
- Console log monitoring
- Network request interception

### Phase 5: Framework Support
- React component state access
- Vue reactive data access
- Angular service integration
- Framework-specific optimizations

## Testing Strategy

- Unit tests for each MCP tool
- Integration tests with Express apps
- E2E tests with example applications
- Performance benchmarks
- Security vulnerability testing

## Future Enhancements

- Record and replay user sessions
- AI-guided test generation
- Performance profiling tools
- Accessibility testing tools
- Multi-browser support
- Mobile device emulation

## Dependencies

- @modelcontextprotocol/sdk - MCP SDK
- express - Web framework
- ws - WebSocket library
- puppeteer - For screenshot capabilities
- jsdom - For server-side DOM operations

## Success Criteria

1. Easy npm installation and setup
2. Minimal configuration required
3. Works with existing applications without major changes
4. Secure by default
5. Comprehensive tool coverage for web automation
6. Good performance with minimal overhead
7. Clear documentation and examples

This document serves as the source of truth for the WebApp MCP Server project. All implementation decisions should align with the architecture and goals outlined here.