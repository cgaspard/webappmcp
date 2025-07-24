# @cgaspard/webappmcp-vue

Vue.js plugin for WebApp MCP that provides Vue Router tools and Vue-specific functionality.

## Installation

```bash
npm install @cgaspard/webappmcp @cgaspard/webappmcp-vue
```

## Usage

Add the Vue plugin to your WebApp MCP configuration:

```javascript
const { webappMCP } = require('@cgaspard/webappmcp');
const vuePlugin = require('@cgaspard/webappmcp-vue').default;

app.use(webappMCP({
  wsPort: 4835,
  transport: 'sse',
  plugins: [vuePlugin]
}));
```

## Available Tools

### vue_get_current_route
Get the current route information from Vue Router.

```javascript
// Returns current route details
{
  type: 'vue3',
  path: '/users/123',
  name: 'user-detail',
  params: { id: '123' },
  query: { tab: 'profile' },
  fullPath: '/users/123?tab=profile',
  meta: {},
  matched: [{ path: '/users', name: 'users' }, { path: '/users/:id', name: 'user-detail' }]
}
```

### vue_navigate
Navigate to a different route using Vue Router.

```javascript
// Navigate by path
{
  path: '/products',
  query: { category: 'electronics' }
}

// Navigate by name
{
  name: 'product-list',
  params: { category: 'electronics' }
}

// Replace current entry
{
  path: '/login',
  replace: true
}
```

### vue_list_routes
List all available routes in Vue Router.

```javascript
// Returns all route definitions
{
  type: 'vue3',
  routes: [
    {
      path: '/',
      name: 'home',
      component: 'HomeView',
      meta: {},
      props: false,
      beforeEnter: false
    },
    // ... more routes
  ],
  count: 10
}
```

### vue_get_component_tree
Get the Vue component tree (Vue 2 only, Vue 3 requires DevTools).

```javascript
// Returns component hierarchy
{
  type: 'vue2',
  tree: {
    name: 'App',
    props: [],
    data: ['user', 'isLoading'],
    computed: ['isAuthenticated'],
    children: [
      {
        name: 'Header',
        props: ['user'],
        data: [],
        computed: [],
        children: []
      }
    ]
  }
}
```

## Features

- **Automatic Vue version detection**: Works with both Vue 2 and Vue 3
- **Route change monitoring**: Tracks navigation events in DevTools
- **No configuration needed**: Just add the plugin and it works
- **TypeScript support**: Fully typed for better development experience

## Client-Side Extensions

The plugin automatically injects client-side code that:
- Monitors route changes and logs them to DevTools
- Provides helper functions for Vue-specific operations
- Sets up communication between the MCP server and Vue application

## Compatibility

- Vue 2.x with Vue Router 3.x
- Vue 3.x with Vue Router 4.x
- Works with Nuxt.js applications

## License

MIT