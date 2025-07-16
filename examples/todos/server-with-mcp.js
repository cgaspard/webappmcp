const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { webappMCP } = require('@cgaspard/webappmcp-middleware');

const app = express();
const port = process.env.PORT || 4834;

// Add request logging middleware at the very beginning
app.use((req, res, next) => {
  console.log(`[Express] ${new Date().toISOString()} ${req.method} ${req.path}`);
  console.log(`[Express] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[Express] Query:`, req.query);
  next();
});

// Parse command line arguments
const args = process.argv.slice(2);
let transport = 'stdio'; // Default to stdio

if (args.includes('--stdio')) {
  if (args.includes('--sse') || args.includes('--socket')) {
    console.error('Error: Cannot use multiple transport flags');
    process.exit(1);
  }
  transport = 'stdio';
} else if (args.includes('--sse')) {
  if (args.includes('--socket')) {
    console.error('Error: Cannot use multiple transport flags');
    process.exit(1);
  }
  transport = 'sse';
} else if (args.includes('--socket')) {
  transport = 'socket';
} else if (args.includes('--none')) {
  transport = 'none';
}

// Middleware - exclude MCP SSE endpoint from body parsing
// Add comprehensive request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`[${timestamp}] Headers:`, JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${timestamp}] Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use((req, res, next) => {
  // Skip body parsing for MCP SSE endpoint
  if (req.path === '/mcp/sse') {
    console.log(`[SSE] Detected SSE endpoint request, skipping body parser`);
    return next();
  }
  bodyParser.json()(req, res, next);
});
app.use(express.static('public'));

// Serve the WebApp MCP client library
app.get('/webappmcp-client.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../packages/client/dist/webappmcp-client.min.js'));
});

// Configure WebApp MCP middleware with selected transport
app.use(webappMCP({
  wsPort: 4835,
  authentication: {
    enabled: true,
    token: process.env.MCP_AUTH_TOKEN || 'demo-token'
  },
  permissions: {
    read: true,
    write: true,
    screenshot: true,
    state: true
  },
  mcpEndpointPath: '/mcp/sse',  // SSE endpoint path
  transport: transport  // Use the selected transport
}));

// In-memory todos storage
let todos = [
  { id: 1, text: 'Install WebApp MCP Server', completed: true },
  { id: 2, text: 'Configure MCP with AI assistant', completed: false },
  { id: 3, text: 'Test DOM interaction tools', completed: false }
];
let nextId = 4;

// API Routes
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Todo text is required' });
  }
  
  const todo = {
    id: nextId++,
    text: text.trim(),
    completed: false
  };
  
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { text, completed } = req.body;
  
  const todo = todos.find(t => t.id === id);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  if (text !== undefined) {
    todo.text = text.trim();
  }
  if (completed !== undefined) {
    todo.completed = completed;
  }
  
  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  todos.splice(index, 1);
  res.status(204).send();
});

// Clear completed todos
app.post('/api/todos/clear-completed', (req, res) => {
  todos = todos.filter(todo => !todo.completed);
  res.json({ message: 'Completed todos cleared' });
});

// Start the Express server
app.listen(port, () => {
  if (transport === 'stdio') {
    // In stdio mode, use stderr for logging since stdout is used for MCP protocol
    console.error(`Todos app listening at http://localhost:${port}`);
    console.error(`WebApp MCP WebSocket server at ws://localhost:4835`);
    console.error(`MCP transport: stdio (for Claude CLI integration)`);
    console.error(`Auth token: ${process.env.MCP_AUTH_TOKEN || 'demo-token'}`);
  } else {
    console.log(`Todos app listening at http://localhost:${port}`);
    console.log(`WebApp MCP WebSocket server at ws://localhost:4835`);
    
    if (transport === 'sse') {
      console.log(`MCP SSE endpoint at http://localhost:${port}/mcp/sse`);
      console.log(`MCP transport: SSE`);
    } else if (transport === 'socket') {
      const socketPath = process.env.MCP_SOCKET_PATH || '/tmp/webapp-mcp.sock';
      console.log(`MCP Unix socket at ${socketPath}`);
      console.log(`MCP transport: Unix Socket`);
      console.log(`Configure Claude CLI with: claude mcp add webapp-socket "socat - UNIX-CONNECT:${socketPath}"`);
    } else if (transport === 'none') {
      console.log(`MCP transport: none (WebSocket only)`);
    }
    
    console.log(`Auth token: ${process.env.MCP_AUTH_TOKEN || 'demo-token'}`);
    console.log('\nUsage:');
    console.log('  --stdio : Enable stdio MCP transport (for Claude CLI)');
    console.log('  --sse   : Enable SSE MCP transport (default)');
    console.log('  --socket: Enable Unix socket MCP transport');
    console.log('  --none  : Disable MCP transport (WebSocket only)');
  }
});