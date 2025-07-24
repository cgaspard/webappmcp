# @cgaspard/webappmcp-react

React plugin for WebApp MCP that provides React Router and Next.js navigation tools.

## Installation

```bash
npm install @cgaspard/webappmcp @cgaspard/webappmcp-react
```

## Usage

Add the React plugin to your WebApp MCP configuration:

```javascript
const { webappMCP } = require('@cgaspard/webappmcp');
const reactPlugin = require('@cgaspard/webappmcp-react').default;

app.use(webappMCP({
  wsPort: 4835,
  transport: 'sse',
  plugins: [reactPlugin]
}));
```

## Available Tools

### react_get_current_route
Get the current route information from React Router or Next.js.

```javascript
// React Router v6 response
{
  type: 'react-router-v6',
  pathname: '/products/123',
  search: '?category=electronics',
  hash: '#reviews',
  state: null,
  key: 'default'
}

// Next.js response
{
  type: 'nextjs',
  pathname: '/products/[id]',
  query: { id: '123', category: 'electronics' },
  asPath: '/products/123?category=electronics',
  route: '/products/[id]',
  locale: 'en'
}
```

### react_navigate
Navigate to a different route using React Router or Next.js.

```javascript
// Simple navigation
{
  path: '/products'
}

// With query parameters
{
  path: '/search',
  query: { q: 'laptop', category: 'electronics' }
}

// Replace history entry
{
  path: '/login',
  replace: true
}
```

### react_get_component_tree
Get information about the React component tree.

```javascript
// Returns component tree info
{
  type: 'react-devtools',
  message: 'React DevTools detected',
  rendererCount: 1,
  info: 'Full component tree inspection requires React DevTools browser extension'
}
```

### react_get_state
Get state from exposed React components.

```javascript
// Returns component state and props
{
  name: 'UserProfile',
  state: { isLoading: false, user: {...} },
  props: { userId: '123' },
  hooks: {}
}
```

## React Router v6 Integration

For React Router v6 apps, use the provided hook to enable full routing support:

```jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enable WebApp MCP routing support
  useEffect(() => {
    if (window.useWebAppMCPRouter) {
      window.useWebAppMCPRouter(navigate, location);
    }
  }, [navigate, location]);
  
  return <YourApp />;
}
```

## Exposing Components

To allow MCP tools to inspect component state:

```jsx
import { useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Expose component to WebApp MCP
  useEffect(() => {
    if (window.registerReactComponent) {
      window.registerReactComponent('UserProfile', {
        state: { user, isLoading },
        props: { userId }
      });
    }
  }, [user, isLoading, userId]);
  
  return <div>...</div>;
}
```

## Features

- **Multi-router support**: Works with React Router (v5, v6) and Next.js
- **Route monitoring**: Automatically tracks navigation events
- **Component inspection**: Expose component state for debugging
- **TypeScript support**: Fully typed for better development experience
- **No configuration needed**: Detects router type automatically

## Client-Side Extensions

The plugin automatically:
- Detects and monitors React Router and Next.js navigation
- Provides hooks for React Router v6 integration
- Logs route changes to DevTools
- Enables component state inspection

## Compatibility

- React Router v5.x and v6.x
- Next.js 10.x and above
- React 16.8+ (with hooks)
- Works with Create React App

## Advanced Usage

### Custom Route Monitoring

```javascript
// In your React app
window.addEventListener('load', () => {
  if (window.WebAppMCPClient) {
    // Custom route tracking logic
    history.listen((location) => {
      window.WebAppMCPClient.devTools?.logMCPEvent('Custom route', {
        path: location.pathname,
        customData: getCustomRouteData()
      });
    });
  }
});
```

## License

MIT