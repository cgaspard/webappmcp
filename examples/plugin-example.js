// Example of using the WebApp MCP plugin system
const express = require('express');
const { webappMCP } = require('@cgaspard/webappmcp');
// Import framework plugins
const vuePlugin = require('@cgaspard/webappmcp-vue').default;
const reactPlugin = require('@cgaspard/webappmcp-react').default;

const app = express();

// Example custom plugin for a todo application
const todoPlugin = {
  name: 'todo-plugin',
  description: 'Custom tools for todo application',
  tools: [
    {
      name: 'todo_get_stats',
      description: 'Get statistics about todos',
      inputSchema: {
        type: 'object',
        properties: {
          includeCompleted: {
            type: 'boolean',
            description: 'Include completed todos in stats',
          },
        },
      },
      handler: async (args, context) => {
        // This example shows how to use the context to execute client tools
        const { executeClientTool, log } = context;
        
        log('Getting todo statistics...');
        
        try {
          // Execute JavaScript in the browser to get todo data
          const result = await executeClientTool('execute_javascript', {
            code: `
              const todos = JSON.parse(localStorage.getItem('todos') || '[]');
              const total = todos.length;
              const completed = todos.filter(t => t.completed).length;
              const pending = total - completed;
              return { total, completed, pending };
            `,
            returnValue: true,
          });
          
          return {
            stats: result.result,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          throw new Error(`Failed to get todo stats: ${error.message}`);
        }
      },
    },
    {
      name: 'todo_clear_completed',
      description: 'Clear all completed todos',
      handler: async (args, context) => {
        const { executeClientTool, log } = context;
        
        log('Clearing completed todos...');
        
        try {
          const result = await executeClientTool('execute_javascript', {
            code: `
              const todos = JSON.parse(localStorage.getItem('todos') || '[]');
              const activeTodos = todos.filter(t => !t.completed);
              localStorage.setItem('todos', JSON.stringify(activeTodos));
              window.dispatchEvent(new Event('storage'));
              return { removed: todos.length - activeTodos.length, remaining: activeTodos.length };
            `,
            returnValue: true,
          });
          
          return {
            message: `Cleared ${result.result.removed} completed todos`,
            remaining: result.result.remaining,
          };
        } catch (error) {
          throw new Error(`Failed to clear completed todos: ${error.message}`);
        }
      },
    },
  ],
};

// Example plugin for database operations
const databasePlugin = {
  name: 'database-plugin',
  description: 'Custom tools for database operations',
  tools: [
    {
      name: 'db_get_user',
      description: 'Get user information from database',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User ID to lookup',
          },
        },
        required: ['userId'],
      },
      handler: async (args, context) => {
        const { log } = context;
        const { userId } = args;
        
        log(`Looking up user ${userId} in database...`);
        
        // This is where you would normally query your database
        // For this example, we'll return mock data
        return {
          id: userId,
          name: 'John Doe',
          email: 'john.doe@example.com',
          createdAt: '2024-01-01T00:00:00Z',
        };
      },
    },
  ],
};

// Configure middleware with plugins
// Choose which plugins to include based on your needs
app.use(webappMCP({
  wsPort: 4835,
  transport: 'sse',
  debug: true,
  plugins: [
    // Include framework plugin if using Vue or React
    // vuePlugin,     // Uncomment if using Vue
    // reactPlugin,   // Uncomment if using React
    
    // Include your custom plugins
    todoPlugin,
    databasePlugin,
  ],
}));

// Your app routes here
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WebApp MCP Plugin Example</title>
      </head>
      <body>
        <h1>WebApp MCP Plugin Example</h1>
        <p>This example demonstrates how to use the plugin system.</p>
        <p>The following custom tools are available:</p>
        <ul>
          <li>todo_get_stats - Get statistics about todos</li>
          <li>todo_clear_completed - Clear all completed todos</li>
          <li>db_get_user - Get user information from database</li>
        </ul>
        <script src="http://localhost:4835/webapp-mcp-client.js"></script>
        <script>
          // Initialize some test data
          if (!localStorage.getItem('todos')) {
            localStorage.setItem('todos', JSON.stringify([
              { id: 1, text: 'Learn WebApp MCP', completed: true },
              { id: 2, text: 'Build awesome tools', completed: false },
              { id: 3, text: 'Share with the world', completed: false },
            ]));
          }
        </script>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on port 4835`);
  console.log(`MCP SSE endpoint available at http://localhost:${PORT}/mcp/sse`);
});