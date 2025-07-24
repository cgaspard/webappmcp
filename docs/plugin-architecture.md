# WebApp MCP Plugin Architecture

## Overview

WebApp MCP uses a modular plugin architecture that allows developers to extend functionality through separate npm packages. This design provides:

- **Smaller core package**: Only include the features you need
- **Framework-specific optimizations**: Each plugin can be tailored to its framework
- **Easy extensibility**: Create custom plugins for your specific needs
- **Better maintainability**: Plugins can be updated independently
- **Type safety**: Full TypeScript support for plugins

## Available Plugins

### @cgaspard/webappmcp-vue

Vue.js plugin providing Vue Router integration and Vue-specific tools.

```bash
npm install @cgaspard/webappmcp-vue
```

**Tools provided:**
- `vue_get_current_route` - Get current Vue Router route
- `vue_navigate` - Navigate using Vue Router
- `vue_list_routes` - List all available routes
- `vue_get_component_tree` - Inspect component hierarchy

### @cgaspard/webappmcp-react

React plugin providing React Router and Next.js integration.

```bash
npm install @cgaspard/webappmcp-react
```

**Tools provided:**
- `react_get_current_route` - Get current route (React Router/Next.js)
- `react_navigate` - Navigate programmatically
- `react_get_component_tree` - Inspect React components
- `react_get_state` - Get component state (when exposed)

## Using Plugins

Add plugins to your middleware configuration:

```javascript
const { webappMCP } = require('@cgaspard/webappmcp');
const vuePlugin = require('@cgaspard/webappmcp-vue').default;
const reactPlugin = require('@cgaspard/webappmcp-react').default;

// For a Vue app
app.use(webappMCP({
  wsPort: 4835,
  transport: 'sse',
  plugins: [vuePlugin]
}));

// For a React app
app.use(webappMCP({
  wsPort: 4835,
  transport: 'sse',
  plugins: [reactPlugin]
}));

// You can use multiple plugins
app.use(webappMCP({
  wsPort: 4835,
  transport: 'sse',
  plugins: [vuePlugin, customPlugin, databasePlugin]
}));
```

## Creating Custom Plugins

A plugin is an object that implements the `WebAppMCPPlugin` interface:

```typescript
import type { 
  WebAppMCPPlugin, 
  PluginTool, 
  PluginContext,
  PluginInitContext 
} from '@cgaspard/webappmcp';

export const myPlugin: WebAppMCPPlugin = {
  name: 'my-plugin',
  description: 'Description of what your plugin does',
  
  // Server-side tools
  tools: [
    {
      name: 'my_tool',
      description: 'What this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Parameter description'
          }
        },
        required: ['param1']
      },
      handler: async (args, context) => {
        const { executeClientTool, getClients, log } = context;
        
        // Your tool implementation
        log('Executing my tool...');
        
        // Execute JavaScript in the browser
        const result = await executeClientTool('execute_javascript', {
          code: 'return document.title',
          returnValue: true
        });
        
        return { title: result.result };
      }
    }
  ],
  
  // Client-side extensions (optional)
  clientExtensions: [
    {
      code: `
        // JavaScript code to inject into the client
        window.myPluginLoaded = true;
        
        // Register handlers or set up monitoring
        if (window.WebAppMCPClient) {
          window.WebAppMCPClient.registerPluginHandler('my_client_tool', async (args) => {
            // Client-side tool implementation
            return { result: 'success' };
          });
        }
      `,
      timing: 'onConnect' // or 'onDemand'
    }
  ],
  
  // Initialization hook (optional)
  initialize: async (context) => {
    context.log('My plugin initialized');
    // Perform any setup needed
  }
};
```

### Plugin Context

Tool handlers receive a context object with these utilities:

```typescript
interface PluginContext {
  // Execute a tool in the connected browser
  executeClientTool: (toolName: string, args: any, clientId?: string) => Promise<any>;
  
  // Get list of connected clients
  getClients: () => Array<{ id: string; url: string; connectedAt: Date; type: string }>;
  
  // Log messages (respects debug setting)
  log: (...args: any[]) => void;
}
```

### Client Extensions

Client extensions allow you to inject JavaScript code into connected browsers:

```typescript
interface ClientExtension {
  // JavaScript code to inject
  code: string;
  
  // When to inject
  timing?: 'onConnect' | 'onDemand';
  
  // Dependencies (future use)
  dependencies?: string[];
}
```

## Real-World Plugin Examples

### Database Plugin

```javascript
const databasePlugin = {
  name: 'database-plugin',
  description: 'Database operations for WebApp MCP',
  
  tools: [
    {
      name: 'db_query_users',
      description: 'Query users from database',
      inputSchema: {
        type: 'object',
        properties: {
          filters: { type: 'object' },
          limit: { type: 'number', default: 10 }
        }
      },
      handler: async (args, context) => {
        const { filters = {}, limit = 10 } = args;
        const { log } = context;
        
        log(`Querying users with filters:`, filters);
        
        // Your database query
        const users = await db.users.find(filters).limit(limit);
        
        return {
          count: users.length,
          users: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email
          }))
        };
      }
    }
  ]
};
```

### Analytics Plugin

```javascript
const analyticsPlugin = {
  name: 'analytics-plugin',
  description: 'Analytics tools for WebApp MCP',
  
  tools: [
    {
      name: 'analytics_track_event',
      description: 'Track a custom analytics event',
      inputSchema: {
        type: 'object',
        properties: {
          event: { type: 'string' },
          properties: { type: 'object' }
        },
        required: ['event']
      },
      handler: async (args, context) => {
        const { event, properties = {} } = args;
        const { executeClientTool, log } = context;
        
        log(`Tracking event: ${event}`);
        
        // Send to analytics in the browser
        const result = await executeClientTool('execute_javascript', {
          code: `
            if (window.gtag) {
              gtag('event', '${event}', ${JSON.stringify(properties)});
              return { provider: 'google-analytics', tracked: true };
            } else if (window.analytics) {
              analytics.track('${event}', ${JSON.stringify(properties)});
              return { provider: 'segment', tracked: true };
            }
            return { tracked: false, reason: 'No analytics provider found' };
          `,
          returnValue: true
        });
        
        return result.result;
      }
    }
  ],
  
  clientExtensions: [
    {
      code: `
        // Set up analytics event monitoring
        const originalGtag = window.gtag;
        if (originalGtag) {
          window.gtag = function(...args) {
            if (window.WebAppMCPClient?.devTools) {
              window.WebAppMCPClient.devTools.logMCPEvent('Analytics Event', {
                provider: 'google-analytics',
                args: args
              });
            }
            return originalGtag.apply(this, args);
          };
        }
      `,
      timing: 'onConnect'
    }
  ]
};
```

## Best Practices

1. **Namespace your tools**: Use a prefix to avoid conflicts (e.g., `myplugin_tool_name`)
2. **Validate inputs**: Always validate arguments in your handlers
3. **Handle errors gracefully**: Return meaningful error messages
4. **Use TypeScript**: Provides better type safety and IDE support
5. **Document your tools**: Provide clear descriptions and schemas
6. **Test thoroughly**: Include unit tests for your plugin
7. **Version carefully**: Follow semantic versioning

## Publishing Plugins

To publish your plugin:

1. Create a new npm package
2. Add `@cgaspard/webappmcp` as a peer dependency
3. Export your plugin as the default export
4. Include TypeScript definitions
5. Document usage in your README
6. Publish to npm

Example package.json:

```json
{
  "name": "@yourname/webappmcp-custom",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@cgaspard/webappmcp": ">=0.1.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Advanced Plugin Features

### Multi-Client Support

```javascript
{
  name: 'broadcast_notification',
  description: 'Send notification to all connected clients',
  handler: async (args, context) => {
    const { message } = args;
    const { getClients, executeClientTool } = context;
    
    const clients = getClients().filter(c => c.type === 'browser');
    
    const results = await Promise.all(
      clients.map(client => 
        executeClientTool('execute_javascript', {
          code: `
            if (Notification.permission === 'granted') {
              new Notification('${message}');
              return true;
            }
            return false;
          `,
          returnValue: true
        }, client.id)
      )
    );
    
    return {
      notified: results.filter(r => r.result === true).length,
      total: clients.length
    };
  }
}
```

### Conditional Tool Loading

```javascript
const plugin = {
  name: 'conditional-plugin',
  tools: [],
  
  initialize: async (context) => {
    const { config, log } = context;
    
    // Dynamically add tools based on configuration
    if (config.permissions?.write) {
      plugin.tools.push({
        name: 'dangerous_write_operation',
        description: 'Only available with write permissions',
        handler: async () => { /* ... */ }
      });
    }
    
    log(`Loaded ${plugin.tools.length} tools`);
  }
};
```

## Migrating from Built-in Routing

If you were using the previous built-in routing tools, migrate by installing the appropriate plugin:

```bash
# For Vue apps
npm install @cgaspard/webappmcp-vue

# For React apps
npm install @cgaspard/webappmcp-react
```

Then update your configuration to include the plugin. The tool names have changed slightly:

- `routing_get_current` → `vue_get_current_route` or `react_get_current_route`
- `routing_navigate` → `vue_navigate` or `react_navigate`
- `routing_list_routes` → `vue_list_routes`

## Future Plugin Ideas

- **@cgaspard/webappmcp-angular** - Angular and Angular Router support
- **@cgaspard/webappmcp-svelte** - Svelte and SvelteKit support
- **@cgaspard/webappmcp-testing** - Testing and assertion tools
- **@cgaspard/webappmcp-a11y** - Accessibility testing tools
- **@cgaspard/webappmcp-performance** - Performance monitoring tools

The plugin architecture makes WebApp MCP infinitely extensible while keeping the core package lean and focused.