import type { WebAppMCPPlugin, PluginTool, PluginContext, PluginInitContext } from '@cgaspard/webappmcp';

export const reactPlugin: WebAppMCPPlugin = {
  name: 'react-plugin',
  description: 'React and React Router tools for WebApp MCP',
  
  tools: [
    {
      name: 'react_get_current_route',
      description: 'Get the current route information (React Router v6 or Next.js)',
      inputSchema: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Client ID to get route from (optional)',
          },
        },
      },
      handler: async (args: any, context: PluginContext) => {
        const { executeClientTool, log } = context;
        log('Getting current React route...');
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            // Try Next.js first
            if (window.next && window.next.router) {
              const router = window.next.router;
              return {
                type: 'nextjs',
                pathname: router.pathname,
                query: router.query,
                asPath: router.asPath,
                route: router.route,
                basePath: router.basePath,
                locale: router.locale,
                isReady: router.isReady
              };
            }
            
            // Try React Router v6
            if (window.__reactRouterVersion === 6) {
              // React Router v6 doesn't expose router globally by default
              // We need to check if our extension has captured it
              if (window.__reactRouterData) {
                return {
                  type: 'react-router-v6',
                  ...window.__reactRouterData
                };
              }
            }
            
            // Try React Router v5 and below
            if (window.__REACT_ROUTER__) {
              const history = window.__REACT_ROUTER__.history;
              return {
                type: 'react-router-legacy',
                pathname: history.location.pathname,
                search: history.location.search,
                hash: history.location.hash,
                state: history.location.state,
                key: history.location.key
              };
            }
            
            // Fallback to window location
            return {
              type: 'none',
              pathname: window.location.pathname,
              search: window.location.search,
              hash: window.location.hash,
              href: window.location.href
            };
          `,
          returnValue: true,
        }, args.clientId);
        
        return result.result;
      },
    },
    {
      name: 'react_navigate',
      description: 'Navigate to a different route (React Router or Next.js)',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The route path to navigate to',
          },
          query: {
            type: 'object',
            description: 'Query parameters',
          },
          replace: {
            type: 'boolean',
            description: 'Replace the current entry in history',
          },
          clientId: {
            type: 'string',
            description: 'Client ID to navigate (optional)',
          },
        },
        required: ['path'],
      },
      handler: async (args: any, context: PluginContext) => {
        const { executeClientTool, log } = context;
        const { path, query = {}, replace = false } = args;
        
        log(`Navigating to ${path}...`);
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            const path = ${JSON.stringify(path)};
            const query = ${JSON.stringify(query)};
            const replace = ${replace};
            
            // Try Next.js first
            if (window.next && window.next.router) {
              const router = window.next.router;
              const url = {
                pathname: path,
                query: query
              };
              await router[replace ? 'replace' : 'push'](url, undefined, { shallow: false });
              return { success: true, type: 'nextjs' };
            }
            
            // Try React Router v6
            if (window.__reactRouterNavigate) {
              const url = new URL(path, window.location.origin);
              Object.entries(query).forEach(([key, value]) => {
                url.searchParams.set(key, String(value));
              });
              window.__reactRouterNavigate(url.pathname + url.search, { replace });
              return { success: true, type: 'react-router-v6' };
            }
            
            // Try React Router v5 and below
            if (window.__REACT_ROUTER__ && window.__REACT_ROUTER__.history) {
              const history = window.__REACT_ROUTER__.history;
              const url = new URL(path, window.location.origin);
              Object.entries(query).forEach(([key, value]) => {
                url.searchParams.set(key, String(value));
              });
              history[replace ? 'replace' : 'push'](url.pathname + url.search);
              return { success: true, type: 'react-router-legacy' };
            }
            
            // Fallback to native navigation
            const url = new URL(path, window.location.origin);
            Object.entries(query).forEach(([key, value]) => {
              url.searchParams.set(key, String(value));
            });
            if (replace) {
              window.location.replace(url.toString());
            } else {
              window.location.href = url.toString();
            }
            return { success: true, type: 'native' };
          `,
          returnValue: true,
          async: true,
        }, args.clientId);
        
        return result.result;
      },
    },
    {
      name: 'react_get_component_tree',
      description: 'Get the React component tree (requires React DevTools)',
      inputSchema: {
        type: 'object',
        properties: {
          maxDepth: {
            type: 'number',
            description: 'Maximum depth to traverse',
            default: 5,
          },
          clientId: {
            type: 'string',
            description: 'Client ID to get component tree from (optional)',
          },
        },
      },
      handler: async (args: any, context: PluginContext) => {
        const { executeClientTool, log } = context;
        const { maxDepth = 5 } = args;
        
        log('Getting React component tree...');
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            // This requires React DevTools to be installed
            if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
              const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
              const renderers = Array.from(hook.renderers || new Map());
              
              if (renderers.length > 0) {
                return {
                  type: 'react-devtools',
                  message: 'React DevTools detected',
                  rendererCount: renderers.length,
                  info: 'Full component tree inspection requires React DevTools browser extension'
                };
              }
            }
            
            // Try to find React root
            const reactRoot = document.getElementById('root') || document.querySelector('[data-reactroot]');
            if (reactRoot && reactRoot._reactRootContainer) {
              return {
                type: 'react-dom',
                hasRoot: true,
                rootElement: reactRoot.tagName.toLowerCase() + (reactRoot.id ? '#' + reactRoot.id : '')
              };
            }
            
            return {
              type: 'none',
              message: 'React component tree not accessible. Install React DevTools for full inspection.'
            };
          `,
          returnValue: true,
        }, args.clientId);
        
        return result.result;
      },
    },
    {
      name: 'react_get_state',
      description: 'Get React component state (requires component to be exposed)',
      inputSchema: {
        type: 'object',
        properties: {
          componentName: {
            type: 'string',
            description: 'Name of the component to inspect',
          },
          clientId: {
            type: 'string',
            description: 'Client ID to get state from (optional)',
          },
        },
      },
      handler: async (args: any, context: PluginContext) => {
        const { executeClientTool, log } = context;
        const { componentName } = args;
        
        log(`Getting state for component: ${componentName}`);
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            // Check if components are exposed via our plugin
            if (window.__reactComponents && window.__reactComponents['${componentName}']) {
              const component = window.__reactComponents['${componentName}'];
              return {
                name: '${componentName}',
                state: component.state || {},
                props: component.props || {},
                hooks: component.hooks || {}
              };
            }
            
            return {
              error: 'Component not found. Components must be explicitly exposed to WebApp MCP.'
            };
          `,
          returnValue: true,
        }, args.clientId);
        
        return result.result;
      },
    },
  ],
  
  clientExtensions: [
    {
      code: `
        // React plugin client extension
        if (typeof window !== 'undefined') {
          window.__reactComponents = window.__reactComponents || {};
          
          // Helper to capture React Router v6 navigation
          if (!window.__reactRouterNavigate) {
            // This will be set by apps using our React Hook
            window.__reactRouterData = null;
            window.__reactRouterNavigate = null;
          }
          
          // Monitor route changes for various routers
          function setupRouteMonitoring() {
            // Next.js route monitoring
            if (window.next && window.next.router) {
              const router = window.next.router;
              router.events.on('routeChangeComplete', (url) => {
                if (window.WebAppMCPClient && window.WebAppMCPClient.devTools) {
                  window.WebAppMCPClient.devTools.logMCPEvent('Next.js route changed', {
                    url,
                    pathname: router.pathname,
                    query: router.query
                  });
                }
              });
            }
            
            // React Router legacy monitoring
            if (window.__REACT_ROUTER__ && window.__REACT_ROUTER__.history) {
              const history = window.__REACT_ROUTER__.history;
              history.listen((location) => {
                if (window.WebAppMCPClient && window.WebAppMCPClient.devTools) {
                  window.WebAppMCPClient.devTools.logMCPEvent('React Router changed', {
                    pathname: location.pathname,
                    search: location.search,
                    hash: location.hash
                  });
                }
              });
            }
          }
          
          // Set up monitoring once React is ready
          if (document.readyState === 'complete') {
            setTimeout(setupRouteMonitoring, 100);
          } else {
            window.addEventListener('load', () => setTimeout(setupRouteMonitoring, 100));
          }
          
          // Expose a function for React apps to register components
          window.registerReactComponent = function(name, component) {
            window.__reactComponents[name] = component;
            if (window.WebAppMCPClient && window.WebAppMCPClient.devTools) {
              window.WebAppMCPClient.devTools.logMCPEvent('React component registered', { name });
            }
          };
          
          // Hook for React Router v6
          window.useWebAppMCPRouter = function(navigate, location) {
            window.__reactRouterNavigate = navigate;
            window.__reactRouterData = {
              pathname: location.pathname,
              search: location.search,
              hash: location.hash,
              state: location.state,
              key: location.key
            };
            
            // Log navigation
            React.useEffect(() => {
              if (window.WebAppMCPClient && window.WebAppMCPClient.devTools) {
                window.WebAppMCPClient.devTools.logMCPEvent('React Router v6 changed', {
                  pathname: location.pathname,
                  search: location.search
                });
              }
            }, [location]);
          };
        }
      `,
      timing: 'onConnect',
    },
  ],
  
  initialize: async (context: PluginInitContext) => {
    context.log('React plugin initialized');
  },
};

export default reactPlugin;

// Export helper hook for React apps
export const useWebAppMCP = () => {
  if (typeof window !== 'undefined' && (window as any).useWebAppMCPRouter) {
    return (window as any).useWebAppMCPRouter;
  }
  return null;
};