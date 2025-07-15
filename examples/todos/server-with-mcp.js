const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { webappMCP } = require('@webappmcp/middleware');

const app = express();
const port = process.env.PORT || 4834;

// Middleware - exclude MCP SSE endpoint from body parsing
app.use((req, res, next) => {
  // Skip body parsing for MCP SSE endpoint
  if (req.path === '/mcp/sse') {
    return next();
  }
  bodyParser.json()(req, res, next);
});
app.use(express.static('public'));

// Serve the WebApp MCP client library
app.get('/webappmcp-client.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../../packages/client/dist/webappmcp-client.min.js'));
});

// Configure WebApp MCP middleware
// Both SSE and stdio transports are always available
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
  mcpEndpointPath: '/mcp/sse'  // SSE endpoint path
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
  console.log(`Todos app listening at http://localhost:${port}`);
  console.log(`WebApp MCP WebSocket server at ws://localhost:4835`);
  console.log(`MCP SSE endpoint at http://localhost:${port}/mcp/sse`);
  console.log(`Auth token: ${process.env.MCP_AUTH_TOKEN || 'demo-token'}`);
  console.log('\nBoth SSE and stdio MCP transports are running!');
  console.log('- SSE: Configure your AI assistant to use the SSE endpoint above');
  console.log('- Stdio: Run with --mcp-stdio flag for Claude CLI integration');
});