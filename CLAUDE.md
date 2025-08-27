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

### Available MCP Tools

#### Browser-Side Tools
1. **dom_query** - Find elements using CSS selectors
2. **dom_get_properties** - Get element properties and attributes
3. **dom_get_text** - Extract text content
4. **dom_get_html** - Get HTML structure
5. **interaction_click** - Click on elements
6. **interaction_type** - Type text into inputs
7. **interaction_scroll** - Scroll page or elements
8. **capture_screenshot** - Take full page screenshots
9. **capture_element_screenshot** - Capture specific elements
10. **state_get_variable** - Access JavaScript variables
11. **state_local_storage** - Read/write local storage
12. **console_get_logs** - Retrieve browser console logs

#### Server-Side Tools (NEW)
13. **console_get_server_logs** - Retrieve Node.js server console logs with filtering
14. **server_execute_js** - Execute JavaScript code on the server (sandboxed)
15. **server_get_system_info** - Get process, memory, CPU, and OS information
16. **server_get_env** - Inspect environment variables (with sensitive data masking)

### Security Considerations

- Implement authentication for MCP server connections
- Sanitize all DOM queries to prevent XSS
- Rate limit requests to prevent abuse
- Allow configuration of permitted operations
- Implement CORS properly for WebSocket connections
- Provide option to run in read-only mode

#### Server-Side Security Features
- **Production Safety**: Server tools automatically disabled when `NODE_ENV=production`
- **Sandboxed Execution**: JavaScript execution uses VM isolation with limited module access
- **Sensitive Data Masking**: Automatic masking of tokens, keys, passwords in environment variables
- **Timeout Protection**: Execution timeouts prevent infinite loops and runaway code
- **Permission Controls**: Granular enable/disable options for server features

### Server Log Capture System

#### Overview
The middleware includes a sophisticated multi-layer log capture system that intercepts server-side logs from various sources, making them accessible through MCP tools.

#### Architecture
1. **Library-specific interceptors**: Direct integration with Winston, Bunyan, Pino, log4js, and debug
2. **Console method interception**: Captures console.log/warn/error/info as fallback
3. **Stream interception**: Ultimate fallback capturing stdout/stderr writes
4. **Circular buffer storage**: Memory-efficient storage with configurable limits

#### Log Capture Configuration
```javascript
{
  captureServerLogs: true,     // Master switch for all log capture
  serverLogLimit: 1000,        // Max logs in circular buffer
  logCapture: {
    console: true,    // Intercept console methods
    streams: true,    // Intercept stdout/stderr
    winston: true,    // Add transport to Winston loggers
    bunyan: true,     // Hook Bunyan emit
    pino: true,       // Add Pino transport
    debug: true,      // Intercept debug library
    log4js: true      // Add log4js appender
  }
}
```

#### Winston Integration Details
- **Automatic Transport Addition**: Detects Winston and adds WebAppMCPTransport
- **Logger Creation Interception**: Hooks winston.createLogger to add transport to new loggers
- **File Transport Support**: Captures logs even when Winston writes to files
- **Metadata Preservation**: Maintains Winston's log metadata and context

#### Performance Considerations
- **Selective Interception**: Can disable specific interceptors to reduce overhead
- **Circular Buffer**: Prevents unbounded memory growth
- **Lazy Loading**: Interceptors only activate when libraries are detected
- **Production Mode**: Can use minimal capture (console only) for better performance

### Configuration

Users will configure the middleware with:
```javascript
import { webappMCP } from '@cgaspard/webappmcp';

app.use(webappMCP({
  // WebSocket configuration
  wsPort: 4835,
  
  // Security settings
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN
  },
  
  // Transport mode
  transport: 'sse', // 'sse', 'stdio', 'socket', or 'none'
  
  // Allowed operations
  permissions: {
    read: true,
    write: true,
    screenshot: true,
    serverExec: false  // Allow server-side JS execution (disabled in production)
  },
  
  // Server-side features
  captureServerLogs: true,  // Enable server console log capture
  serverLogLimit: 1000,     // Max server logs to store
  serverTools: false,       // Enable server-side tools (disabled in production)
  
  // Granular log capture control (all default to true)
  logCapture: {
    console: true,    // Console methods
    streams: true,    // stdout/stderr
    winston: true,    // Winston transport
    bunyan: true,     // Bunyan hooks
    pino: true,       // Pino transport
    debug: true,      // Debug library
    log4js: true      // log4js appender
  }
}));
```

Frontend integration:
```javascript
import { WebAppMCPClient } from '@cgaspard/webappmcp';

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

## Terminology and Usage Guidelines

### How to Refer to the Connected Application

When using WebApp MCP with an AI assistant, use these terms to clearly refer to the application being controlled:

#### Recommended Terms:
1. **"the connected web app"** - Most clear and descriptive, preferred for general use
2. **"the browser client"** - When specifically referring to the frontend/browser instance
3. **"the target application"** - More formal, good for documentation and technical discussions
4. **"the MCP client"** - Technical term, best when discussing the MCP connection specifically

#### Example Usage:

**Good examples:**
- "Click the submit button in the connected web app"
- "Take a screenshot of the browser client" 
- "Get the current route from the target application"
- "Check if the MCP client has any console errors"

**Avoid ambiguous references:**
- ❌ "Click the button on the page" (which page?)
- ❌ "Check the DOM" (whose DOM?)
- ❌ "Get the state" (what state from where?)

#### Why This Matters:
- **Clarity**: Distinguishes between the MCP server, Express backend, and the actual web page
- **Precision**: Helps AI assistants understand exactly which system to interact with
- **Consistency**: Reduces confusion in multi-system environments

### Architecture Clarity

When discussing the system, be specific about which component you mean:
- **MCP Server**: The server exposing tools to AI assistants
- **Express App/Backend**: The Node.js server running your application
- **Connected Web App/Browser Client**: The actual web page open in a browser
- **WebSocket Connection**: The real-time connection between browser and backend

This document serves as the source of truth for the WebApp MCP Server project. All implementation decisions should align with the architecture and goals outlined here.