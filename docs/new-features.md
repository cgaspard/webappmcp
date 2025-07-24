# New Features Documentation

## Plugin Architecture

WebApp MCP now uses a modular plugin architecture that allows framework-specific functionality to be added as separate npm packages. This approach provides:

### Supported Frameworks
- Vue Router (Vue 2 & Vue 3)
- React Router
- Next.js Router
- Angular Router
- SvelteKit
- Native browser navigation (fallback)

### Available Routing Tools

#### routing_get_current
Get information about the current route.

```javascript
// Returns current route information based on detected framework
{
  type: 'vue3',
  path: '/users/123',
  name: 'user-detail',
  params: { id: '123' },
  query: { tab: 'profile' },
  fullPath: '/users/123?tab=profile'
}
```

#### routing_navigate
Navigate to a different route programmatically.

```javascript
// Navigate with path and query parameters
{
  path: '/products',
  query: { category: 'electronics', sort: 'price' }
}
```

#### routing_list_routes
List all available routes in the application (where supported).

```javascript
// Returns array of route definitions
{
  type: 'vue3',
  routes: [
    {
      path: '/',
      name: 'home',
      component: 'HomeView',
      meta: {}
    },
    // ... more routes
  ],
  routeCount: 10
}
```

#### routing_get_history
Get browser navigation history information.

```javascript
// Returns history state
{
  entries: [...],
  currentIndex: 5,
  length: 6,
  canGoBack: true,
  canGoForward: false
}
```

## Plugin System

The plugin system allows you to add custom application-specific tools to WebApp MCP. This is perfect for exposing business logic, database operations, or any custom functionality as MCP tools.

### Creating a Plugin

A plugin is an object with the following structure:

```javascript
const myPlugin = {
  name: 'my-plugin',
  description: 'Description of what this plugin does',
  tools: [
    {
      name: 'tool_name',
      description: 'What this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Description of param1'
          }
        },
        required: ['param1']
      },
      handler: async (args, context) => {
        // Tool implementation
        return result;
      }
    }
  ]
};
```

### Plugin Context

Each tool handler receives a context object with these utilities:

```javascript
{
  // Execute a tool in the connected browser
  executeClientTool: (toolName, args, clientId?) => Promise<any>,
  
  // Get list of connected clients
  getClients: () => Array<{ id, url, connectedAt, type }>,
  
  // Log messages (respects debug setting)
  log: (...args) => void
}
```

### Example: Todo Application Plugin

```javascript
const todoPlugin = {
  name: 'todo-plugin',
  description: 'Custom tools for todo application',
  tools: [
    {
      name: 'todo_batch_update',
      description: 'Update multiple todos at once',
      inputSchema: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            items: { type: 'number' },
            description: 'IDs of todos to update'
          },
          updates: {
            type: 'object',
            description: 'Properties to update'
          }
        },
        required: ['ids', 'updates']
      },
      handler: async (args, context) => {
        const { ids, updates } = args;
        const { executeClientTool, log } = context;
        
        log(`Updating ${ids.length} todos...`);
        
        // Execute JavaScript in the browser
        const result = await executeClientTool('execute_javascript', {
          code: `
            const todos = JSON.parse(localStorage.getItem('todos') || '[]');
            const updatedCount = todos.reduce((count, todo) => {
              if (${JSON.stringify(ids)}.includes(todo.id)) {
                Object.assign(todo, ${JSON.stringify(updates)});
                return count + 1;
              }
              return count;
            }, 0);
            localStorage.setItem('todos', JSON.stringify(todos));
            return { updatedCount, totalTodos: todos.length };
          `,
          returnValue: true
        });
        
        return {
          success: true,
          updatedCount: result.result.updatedCount,
          message: `Updated ${result.result.updatedCount} todos`
        };
      }
    }
  ]
};
```

### Example: Database Plugin

```javascript
const databasePlugin = {
  name: 'database-plugin',
  description: 'Database operations',
  tools: [
    {
      name: 'db_query',
      description: 'Execute a database query',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          filters: { type: 'object', description: 'Query filters' },
          limit: { type: 'number', description: 'Result limit' }
        },
        required: ['table']
      },
      handler: async (args, context) => {
        const { table, filters = {}, limit = 10 } = args;
        const { log } = context;
        
        log(`Querying ${table} with filters:`, filters);
        
        // Your actual database query logic here
        const results = await db.query(table, filters, limit);
        
        return {
          count: results.length,
          data: results
        };
      }
    }
  ]
};
```

### Using Plugins

Add plugins to your middleware configuration:

```javascript
const { webappMCP } = require('@cgaspard/webappmcp');

app.use(webappMCP({
  wsPort: 4835,
  transport: 'sse',
  debug: true,
  plugins: [
    todoPlugin,
    databasePlugin,
    analyticsPlugin,
    // ... more plugins
  ]
}));
```

### Best Practices

1. **Namespace your tool names**: Use a prefix to avoid conflicts (e.g., `myapp_tool_name`)
2. **Validate inputs**: Always validate arguments in your handlers
3. **Handle errors gracefully**: Return meaningful error messages
4. **Use the context wisely**: Leverage `executeClientTool` for browser operations
5. **Document your tools**: Provide clear descriptions and schemas
6. **Keep handlers focused**: Each tool should do one thing well

### Advanced Example: Multi-Client Support

```javascript
{
  name: 'broadcast_message',
  description: 'Send a message to all connected clients',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Message to broadcast' }
    },
    required: ['message']
  },
  handler: async (args, context) => {
    const { message } = args;
    const { getClients, executeClientTool, log } = context;
    
    const clients = getClients();
    log(`Broadcasting to ${clients.length} clients`);
    
    const results = await Promise.all(
      clients
        .filter(c => c.type === 'browser')
        .map(client => 
          executeClientTool('execute_javascript', {
            code: `alert('${message}')`,
            returnValue: false
          }, client.id)
        )
    );
    
    return {
      success: true,
      clientsNotified: results.length
    };
  }
}
```

## Screenshot Improvements

The screenshot tools now save images to disk and return file paths instead of base64 data URLs:

```javascript
// capture_screenshot now returns:
{
  path: '/tmp/webappmcp-screenshots/screenshot-2024-12-19T10-30-45-123Z.png',
  width: 1920,
  height: 1080,
  format: 'png'
}
```

This makes it easier for AI assistants to work with screenshots by providing direct file paths that can be read by file reading tools.