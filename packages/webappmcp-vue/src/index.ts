import type { WebAppMCPPlugin, PluginTool, PluginContext, PluginInitContext } from '@cgaspard/webappmcp';

export const vuePlugin: WebAppMCPPlugin = {
  name: 'vue-plugin',
  description: 'Vue.js and Vue Router tools for WebApp MCP',
  
  tools: [
    {
      name: 'vue_get_current_route',
      description: 'Get the current route information from Vue Router',
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
        log('Getting current Vue route...');
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            // Try Vue 3 first
            const vueApp = window.__vueApp || window.app;
            if (vueApp && vueApp.config && vueApp.config.globalProperties && vueApp.config.globalProperties.$router) {
              const router = vueApp.config.globalProperties.$router;
              const route = router.currentRoute.value;
              return {
                type: 'vue3',
                path: route.path,
                name: route.name,
                params: route.params,
                query: route.query,
                fullPath: route.fullPath,
                meta: route.meta,
                matched: route.matched.map(m => ({ path: m.path, name: m.name }))
              };
            }
            
            // Try Vue 2
            if (window.Vue && window.Vue.$router) {
              const router = window.Vue.$router;
              const route = router.currentRoute;
              return {
                type: 'vue2',
                path: route.path,
                name: route.name,
                params: route.params,
                query: route.query,
                fullPath: route.fullPath,
                meta: route.meta,
                matched: route.matched.map(m => ({ path: m.path, name: m.name }))
              };
            }
            
            return { error: 'Vue Router not detected' };
          `,
          returnValue: true,
        }, args.clientId);
        
        return result.result;
      },
    },
    {
      name: 'vue_navigate',
      description: 'Navigate to a different route using Vue Router',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The route path to navigate to',
          },
          name: {
            type: 'string',
            description: 'The route name to navigate to (alternative to path)',
          },
          params: {
            type: 'object',
            description: 'Route parameters',
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
      },
      handler: async (args: any, context: PluginContext) => {
        const { executeClientTool, log } = context;
        const { path, name, params = {}, query = {}, replace = false } = args;
        
        log(`Navigating to ${path || name}...`);
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            // Build route object
            const route = {};
            if (${JSON.stringify(path)}) route.path = ${JSON.stringify(path)};
            if (${JSON.stringify(name)}) route.name = ${JSON.stringify(name)};
            if (${JSON.stringify(params)}) route.params = ${JSON.stringify(params)};
            if (${JSON.stringify(query)}) route.query = ${JSON.stringify(query)};
            
            // Try Vue 3 first
            const vueApp = window.__vueApp || window.app;
            if (vueApp && vueApp.config && vueApp.config.globalProperties && vueApp.config.globalProperties.$router) {
              const router = vueApp.config.globalProperties.$router;
              await router[${replace} ? 'replace' : 'push'](route);
              return { success: true, type: 'vue3' };
            }
            
            // Try Vue 2
            if (window.Vue && window.Vue.$router) {
              const router = window.Vue.$router;
              await router[${replace} ? 'replace' : 'push'](route);
              return { success: true, type: 'vue2' };
            }
            
            return { error: 'Vue Router not detected' };
          `,
          returnValue: true,
          async: true,
        }, args.clientId);
        
        return result.result;
      },
    },
    {
      name: 'vue_list_routes',
      description: 'List all available routes in Vue Router',
      inputSchema: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Client ID to list routes from (optional)',
          },
        },
      },
      handler: async (args: any, context: PluginContext) => {
        const { executeClientTool, log } = context;
        log('Listing Vue routes...');
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            const routes = [];
            
            // Extract route info recursively
            function extractRoutes(routeList, parentPath = '') {
              routeList.forEach(route => {
                const fullPath = parentPath + (route.path.startsWith('/') ? route.path : '/' + route.path);
                routes.push({
                  path: fullPath,
                  name: route.name,
                  component: route.component?.name || 'Anonymous',
                  meta: route.meta || {},
                  props: route.props,
                  beforeEnter: !!route.beforeEnter
                });
                if (route.children) {
                  extractRoutes(route.children, fullPath);
                }
              });
            }
            
            // Try Vue 3 first
            const vueApp = window.__vueApp || window.app;
            if (vueApp && vueApp.config && vueApp.config.globalProperties && vueApp.config.globalProperties.$router) {
              const router = vueApp.config.globalProperties.$router;
              if (router.options && router.options.routes) {
                extractRoutes(router.options.routes);
                return { type: 'vue3', routes, count: routes.length };
              }
            }
            
            // Try Vue 2
            if (window.Vue && window.Vue.$router) {
              const router = window.Vue.$router;
              if (router.options && router.options.routes) {
                extractRoutes(router.options.routes);
                return { type: 'vue2', routes, count: routes.length };
              }
            }
            
            return { error: 'Vue Router not detected or no routes found' };
          `,
          returnValue: true,
        }, args.clientId);
        
        return result.result;
      },
    },
    {
      name: 'vue_get_component_tree',
      description: 'Get the Vue component tree',
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
        
        log('Getting Vue component tree...');
        
        const result = await executeClientTool('execute_javascript', {
          code: `
            function getComponentTree(instance, depth = 0, maxDepth = ${maxDepth}) {
              if (!instance || depth > maxDepth) return null;
              
              const tree = {
                name: instance.$options.name || instance.$options._componentTag || 'Anonymous',
                props: instance.$props ? Object.keys(instance.$props) : [],
                data: instance.$data ? Object.keys(instance.$data) : [],
                computed: instance.$options.computed ? Object.keys(instance.$options.computed) : [],
                children: []
              };
              
              if (instance.$children) {
                tree.children = instance.$children
                  .map(child => getComponentTree(child, depth + 1, maxDepth))
                  .filter(Boolean);
              }
              
              return tree;
            }
            
            // Try Vue 3 first
            const vueApp = window.__vueApp || window.app;
            if (vueApp) {
              // Vue 3 structure is different, get root component
              const rootInstance = vueApp._instance;
              if (rootInstance) {
                return {
                  type: 'vue3',
                  tree: { name: 'App', message: 'Vue 3 component tree inspection requires Vue DevTools' }
                };
              }
            }
            
            // Try Vue 2
            if (window.Vue) {
              const rootInstances = document.querySelectorAll('[data-v-]');
              if (rootInstances.length > 0) {
                const vueInstance = rootInstances[0].__vue__;
                if (vueInstance) {
                  return {
                    type: 'vue2',
                    tree: getComponentTree(vueInstance.$root)
                  };
                }
              }
            }
            
            return { error: 'Vue application not detected' };
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
        // Vue plugin client extension
        if (typeof window !== 'undefined' && window.WebAppMCPClient) {
          const client = window.WebAppMCPClient;
          
          // Register Vue-specific handlers
          client.registerPluginHandler('vue_get_current_route', async (args) => {
            // This is handled by the server-side tool
            return { error: 'This tool should be called server-side' };
          });
          
          // Monitor route changes
          function setupRouteMonitoring() {
            // Vue 3
            const vueApp = window.__vueApp || window.app;
            if (vueApp && vueApp.config && vueApp.config.globalProperties && vueApp.config.globalProperties.$router) {
              const router = vueApp.config.globalProperties.$router;
              router.afterEach((to, from) => {
                if (client && client.devTools) {
                  client.devTools.logMCPEvent('Vue route changed', {
                    from: from.fullPath,
                    to: to.fullPath,
                    name: to.name
                  });
                }
              });
              return;
            }
            
            // Vue 2
            if (window.Vue && window.Vue.$router) {
              const router = window.Vue.$router;
              router.afterEach((to, from) => {
                if (client && client.devTools) {
                  client.devTools.logMCPEvent('Vue route changed', {
                    from: from.fullPath,
                    to: to.fullPath,
                    name: to.name
                  });
                }
              });
            }
          }
          
          // Set up monitoring once Vue is ready
          if (document.readyState === 'complete') {
            setTimeout(setupRouteMonitoring, 100);
          } else {
            window.addEventListener('load', () => setTimeout(setupRouteMonitoring, 100));
          }
        }
      `,
      timing: 'onConnect',
    },
  ],
  
  initialize: async (context: PluginInitContext) => {
    context.log('Vue plugin initialized');
  },
};

export default vuePlugin;