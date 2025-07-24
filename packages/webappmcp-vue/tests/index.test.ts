import vuePlugin from '../src/index';
import type { PluginContext } from '@cgaspard/webappmcp';

describe('Vue Plugin', () => {
  let mockContext: PluginContext;
  let mockExecuteClientTool: jest.Mock;
  let mockGetClients: jest.Mock;
  let mockLog: jest.Mock;

  beforeEach(() => {
    mockExecuteClientTool = jest.fn();
    mockGetClients = jest.fn(() => []);
    mockLog = jest.fn();
    
    mockContext = {
      executeClientTool: mockExecuteClientTool,
      getClients: mockGetClients,
      log: mockLog
    };
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin metadata', () => {
      expect(vuePlugin.name).toBe('vue-plugin');
      expect(vuePlugin.description).toBe('Vue.js and Vue Router tools for WebApp MCP');
      expect(vuePlugin.tools).toBeDefined();
      expect(vuePlugin.tools?.length).toBeGreaterThan(0);
      expect(vuePlugin.clientExtensions).toBeDefined();
      expect(vuePlugin.initialize).toBeDefined();
    });

    it('should have all expected tools', () => {
      const toolNames = vuePlugin.tools?.map(t => t.name) || [];
      expect(toolNames).toContain('vue_get_current_route');
      expect(toolNames).toContain('vue_navigate');
      expect(toolNames).toContain('vue_list_routes');
      expect(toolNames).toContain('vue_get_component_tree');
    });
  });

  describe('vue_get_current_route', () => {
    it('should get current route from Vue Router', async () => {
      const tool = vuePlugin.tools?.find(t => t.name === 'vue_get_current_route');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'vue3',
          path: '/users/123',
          name: 'user-detail',
          params: { id: '123' },
          query: { tab: 'profile' },
          fullPath: '/users/123?tab=profile'
        }
      });

      const result = await tool!.handler({}, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Getting current Vue route...');
      expect(mockExecuteClientTool).toHaveBeenCalledWith(
        'execute_javascript',
        expect.objectContaining({
          code: expect.stringContaining('router.currentRoute'),
          returnValue: true
        }),
        undefined
      );
      expect(result).toEqual({
        type: 'vue3',
        path: '/users/123',
        name: 'user-detail',
        params: { id: '123' },
        query: { tab: 'profile' },
        fullPath: '/users/123?tab=profile'
      });
    });

    it('should handle no Vue Router detected', async () => {
      const tool = vuePlugin.tools?.find(t => t.name === 'vue_get_current_route');
      
      mockExecuteClientTool.mockResolvedValue({
        result: { error: 'Vue Router not detected' }
      });

      const result = await tool!.handler({}, mockContext);
      expect(result).toEqual({ error: 'Vue Router not detected' });
    });
  });

  describe('vue_navigate', () => {
    it('should navigate using Vue Router', async () => {
      const tool = vuePlugin.tools?.find(t => t.name === 'vue_navigate');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: { success: true, type: 'vue3' }
      });

      const args = {
        path: '/products',
        query: { category: 'electronics' }
      };

      const result = await tool!.handler(args, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Navigating to /products...');
      expect(mockExecuteClientTool).toHaveBeenCalledWith(
        'execute_javascript',
        expect.objectContaining({
          code: expect.stringContaining("router[false ? 'replace' : 'push']"),
          returnValue: true,
          async: true
        }),
        undefined
      );
      expect(result).toEqual({ success: true, type: 'vue3' });
    });

    it('should support navigation by name', async () => {
      const tool = vuePlugin.tools?.find(t => t.name === 'vue_navigate');
      
      const args = {
        name: 'product-list',
        params: { category: 'electronics' }
      };

      mockExecuteClientTool.mockResolvedValue({
        result: { success: true, type: 'vue3' }
      });

      const result = await tool!.handler(args, mockContext);
      
      expect(mockLog).toHaveBeenCalledWith('Navigating to product-list...');
      expect(result).toEqual({ success: true, type: 'vue3' });
    });

    it('should support replace navigation', async () => {
      const tool = vuePlugin.tools?.find(t => t.name === 'vue_navigate');
      
      const args = {
        path: '/login',
        replace: true
      };

      mockExecuteClientTool.mockResolvedValue({
        result: { success: true, type: 'vue3' }
      });

      await tool!.handler(args, mockContext);
      
      expect(mockExecuteClientTool).toHaveBeenCalledWith(
        'execute_javascript',
        expect.objectContaining({
          code: expect.stringContaining("router[true ? 'replace' : 'push']")
        }),
        undefined
      );
    });
  });

  describe('vue_list_routes', () => {
    it('should list all Vue routes', async () => {
      const tool = vuePlugin.tools?.find(t => t.name === 'vue_list_routes');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'vue3',
          routes: [
            { path: '/', name: 'home', component: 'HomeView' },
            { path: '/about', name: 'about', component: 'AboutView' }
          ],
          count: 2
        }
      });

      const result = await tool!.handler({}, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Listing Vue routes...');
      expect(result).toHaveProperty('routes');
      expect(result).toHaveProperty('count', 2);
    });
  });

  describe('vue_get_component_tree', () => {
    it('should get component tree for Vue 2', async () => {
      const tool = vuePlugin.tools?.find(t => t.name === 'vue_get_component_tree');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'vue2',
          tree: {
            name: 'App',
            props: [],
            data: ['user', 'isLoading'],
            computed: ['isAuthenticated'],
            children: []
          }
        }
      });

      const result = await tool!.handler({ maxDepth: 3 }, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Getting Vue component tree...');
      expect(result).toHaveProperty('type', 'vue2');
      expect(result).toHaveProperty('tree');
    });
  });

  describe('Client Extensions', () => {
    it('should have client extension code', () => {
      expect(vuePlugin.clientExtensions).toBeDefined();
      expect(vuePlugin.clientExtensions!.length).toBeGreaterThan(0);
      
      const extension = vuePlugin.clientExtensions![0];
      expect(extension.code).toContain('Vue plugin client extension');
      expect(extension.code).toContain('setupRouteMonitoring');
      expect(extension.timing).toBe('onConnect');
    });
  });

  describe('Plugin Initialization', () => {
    it('should initialize properly', async () => {
      const mockInitContext = {
        log: jest.fn(),
        config: {
          wsPort: 4835,
          transport: 'sse' as const
        }
      };

      await vuePlugin.initialize!(mockInitContext);
      
      expect(mockInitContext.log).toHaveBeenCalledWith('Vue plugin initialized');
    });
  });
});